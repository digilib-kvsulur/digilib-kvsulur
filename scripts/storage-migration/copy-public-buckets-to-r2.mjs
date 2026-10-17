#!/usr/bin/env node
/**
 * Copy selected public Supabase Storage buckets to Cloudflare R2.
 *
 * This is deliberately copy-only: it never removes source objects or updates
 * database URLs. Set R2_MIGRATION_CONFIRM_COPY=YES to perform the copy.
 */
import { createHash, createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), "scripts/migration-toolkit/.env"));

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const sourceUrl = new URL(process.env.SUPABASE_URL);
if (sourceUrl.protocol !== "https:" || !sourceUrl.hostname.endsWith(".supabase.co")) {
  throw new Error("SUPABASE_URL must be this tenant's HTTPS Supabase project URL.");
}
const projectRef = sourceUrl.hostname.split(".")[0];
const publicBaseUrl = new URL(process.env.R2_PUBLIC_BASE_URL);
if (publicBaseUrl.protocol !== "https:") {
  throw new Error("R2_PUBLIC_BASE_URL must be an HTTPS custom domain for public reads.");
}

const buckets = (process.env.R2_MIGRATION_BUCKETS || "community-media,event-images,gallery-images")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const bucketAllowlist = new Set(["community-media", "event-images", "gallery-images"]);
for (const bucket of buckets) {
  if (!bucketAllowlist.has(bucket)) {
    throw new Error(`Refusing bucket '${bucket}'. Only reviewed public buckets may be copied by this script.`);
  }
}

const confirmCopy = process.env.R2_MIGRATION_CONFIRM_COPY === "YES";
const listPageSize = 100;
const concurrency = Math.max(1, Math.min(Number(process.env.R2_MIGRATION_CONCURRENCY) || 3, 5));
const r2Endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const r2Bucket = process.env.R2_BUCKET_NAME;
const manifestPath = path.resolve(
  process.env.R2_MIGRATION_MANIFEST || `tmp/r2-copy-manifest-${projectRef}.json`,
);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sha256Hex = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value, encoding) => createHmac("sha256", key).update(value, "utf8").digest(encoding);
const awsEncode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
  `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
);
const encodeKey = (key) => key.split("/").map(awsEncode).join("/");

function authorization(method, key, payloadHash, extraHeaders = {}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${awsEncode(r2Bucket)}/${encodeKey(key)}`;
  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort()
    .map((name) => `${name}:${String(headers[name]).trim().replace(/\s+/g, " ")}\n`)
    .join("");
  const canonicalRequest = [method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, date);
  const regionKey = createHmac("sha256", dateKey).update("auto", "utf8").digest();
  const serviceKey = createHmac("sha256", regionKey).update("s3", "utf8").digest();
  const signingKey = createHmac("sha256", serviceKey).update("aws4_request", "utf8").digest();
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { headers: { ...headers, authorization: authorizationHeader }, canonicalUri };
}

async function putObject(key, bytes, contentType, checksum) {
  const payloadHash = sha256Hex(bytes);
  const signed = authorization("PUT", key, payloadHash, {
    "cache-control": "public, max-age=3600, s-maxage=86400",
    "content-type": contentType || "application/octet-stream",
    "x-amz-meta-sha256": checksum,
  });
  const response = await fetch(`${r2Endpoint}${signed.canonicalUri}`, {
    method: "PUT",
    headers: signed.headers,
    body: bytes,
  });
  if (!response.ok) {
    throw new Error(`R2 copy failed (${response.status}): ${await response.text()}`);
  }

  const head = authorization("HEAD", key, sha256Hex(""));
  const verify = await fetch(`${r2Endpoint}${head.canonicalUri}`, {
    method: "HEAD",
    headers: head.headers,
  });
  if (!verify.ok) throw new Error(`R2 verification failed (${verify.status}).`);
  const storedSize = Number(verify.headers.get("content-length"));
  const storedHash = verify.headers.get("x-amz-meta-sha256");
  if (storedSize !== bytes.byteLength || storedHash !== checksum) {
    throw new Error(`R2 verification mismatch for ${key} (size/hash).`);
  }
}

async function listFiles(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += listPageSize) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: listPageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Could not list ${bucket}/${prefix}: ${error.message}`);
    const entries = data || [];
    for (const entry of entries) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...await listFiles(bucket, objectPath));
      } else {
        files.push({ bucket, objectPath });
      }
    }
    if (entries.length < listPageSize) break;
  }
  return files;
}

async function runWithConcurrency(items, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log(`Tenant project: ${projectRef}`);
  console.log(`Public buckets: ${buckets.join(", ")}`);
  console.log("Mode: copy-only; source files and database URLs will not be changed.");
  const { data: sourceBuckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw new Error(`Could not inspect source bucket access: ${bucketError.message}`);
  for (const bucket of buckets) {
    const sourceBucket = sourceBuckets?.find((candidate) => candidate.id === bucket);
    if (!sourceBucket || sourceBucket.public !== true) {
      throw new Error(`Refusing to copy ${bucket}: it is missing or is not marked public in this tenant.`);
    }
  }

  const objects = [];
  for (const bucket of buckets) objects.push(...await listFiles(bucket));
  console.log(`Found ${objects.length} objects to copy.`);
  if (!confirmCopy) {
    console.log("Preflight complete; no objects were written. Set R2_MIGRATION_CONFIRM_COPY=YES to copy and verify them.");
    return;
  }

  const completed = [];
  const failures = [];
  await runWithConcurrency(objects, async ({ bucket, objectPath }, index) => {
    const key = `${projectRef}/${bucket}/${objectPath}`;
    try {
      const { data, error } = await supabase.storage.from(bucket).download(objectPath);
      if (error || !data) throw new Error(error?.message || "Storage download returned no data.");
      const bytes = Buffer.from(await data.arrayBuffer());
      const checksum = sha256Hex(bytes);
      await putObject(key, bytes, data.type, checksum);
      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      completed.push({
        bucket,
        objectPath,
        size: bytes.byteLength,
        sha256: checksum,
        sourceUrl: publicUrl.publicUrl,
        targetUrl: `${publicBaseUrl.toString().replace(/\/$/, "")}/${encodeKey(key)}`,
      });
      console.log(`[${index + 1}/${objects.length}] copied and verified ${bucket}/${objectPath}`);
    } catch (error) {
      failures.push({ bucket, objectPath, error: error instanceof Error ? error.message : String(error) });
      console.error(`[${index + 1}/${objects.length}] FAILED ${bucket}/${objectPath}: ${failures.at(-1).error}`);
    }
  });

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    tenantProjectRef: projectRef,
    r2Bucket,
    publicBaseUrl: publicBaseUrl.toString().replace(/\/$/, ""),
    copiedCount: completed.length,
    failedCount: failures.length,
    objects: completed.sort((a, b) => `${a.bucket}/${a.objectPath}`.localeCompare(`${b.bucket}/${b.objectPath}`)),
    failures,
  }, null, 2));

  console.log(`Manifest: ${manifestPath}`);
  console.log(`Copied and verified: ${completed.length}; failures: ${failures.length}.`);
  if (failures.length) process.exitCode = 2;
  else console.log("Copy phase complete. Supabase originals remain intact; do not switch URLs until the manifest is reviewed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
