import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://nypjbdyfnsqhilozfwji.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cGpiZHlmbnNxaGlsb3pmd2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njg4Mjc5MywiZXhwIjoyMTAyNDU4NzkzfQ.v6aCZRFKIyytDyd81nrI2Yw2AxiWa0psR272tDAh3VE';

const NEW_URL = 'https://bgwvkpcqmroaokkmpwmb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnd3ZrcGNxbXJvYW9ra21wd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTE5OTEyMiwiZXhwIjoyMTA0Nzc1MTIyfQ.aJgwilef_nw_PNG9fEmgFacbu8kDbbnENdQyvKsj1dU';

const BUCKETS = [
  'avatars',
  'certificates',
  'community-media',
  'event-images',
  'event-submissions',
  'gallery-images',
  'study-materials',
];

const oldClient = createClient(OLD_URL, OLD_SERVICE_KEY);
const newClient = createClient(NEW_URL, NEW_SERVICE_KEY);

async function listAllFiles(bucket) {
  const files = [];
  const folders = [''];

  while (folders.length > 0) {
    const folder = folders.pop();
    const { data, error } = await oldClient.storage.from(bucket).list(folder, {
      limit: 1000,
      offset: 0,
    });

    if (error) {
      console.error(`  ✗ Error listing ${bucket}/${folder}:`, error.message);
      continue;
    }

    for (const item of data || []) {
      if (item.id === null) {
        folders.push(folder ? `${folder}/${item.name}` : item.name);
      } else {
        files.push(folder ? `${folder}/${item.name}` : item.name);
      }
    }
  }

  return files;
}

async function migrateFile(bucket, filePath) {
  const { data, error: downloadError } = await oldClient.storage
    .from(bucket)
    .download(filePath);

  if (downloadError) {
    console.error(`    ✗ Download failed: ${filePath} - ${downloadError.message}`);
    return false;
  }

  const { error: uploadError } = await newClient.storage
    .from(bucket)
    .upload(filePath, data, { upsert: true });

  if (uploadError) {
    console.error(`    ✗ Upload failed: ${filePath} - ${uploadError.message}`);
    return false;
  }

  return true;
}

async function migrateBucket(bucket) {
  console.log(`\n📦 Migrating bucket: ${bucket}`);
  const files = await listAllFiles(bucket);
  console.log(`  Found ${files.length} files`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const ok = await migrateFile(bucket, file);
    if (ok) {
      console.log(`  ✓ ${file}`);
      success++;
    } else {
      failed++;
    }
  }

  console.log(`  Done: ${success} success, ${failed} failed`);
  return { success, failed };
}

async function main() {
  console.log('🚀 Starting storage migration...');
  console.log(`   Old: ${OLD_URL}`);
  console.log(`   New: ${NEW_URL}\n`);

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const bucket of BUCKETS) {
    const { success, failed } = await migrateBucket(bucket);
    totalSuccess += success;
    totalFailed += failed;
  }

  console.log('\n═══════════════════════════════════');
  console.log(`✅ Migration complete!`);
  console.log(`   Total success: ${totalSuccess}`);
  console.log(`   Total failed:  ${totalFailed}`);
  console.log('═══════════════════════════════════');
}

main().catch(console.error);
