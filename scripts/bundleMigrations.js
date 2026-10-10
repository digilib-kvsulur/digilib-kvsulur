import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
console.log('Concatenating ' + files.length + ' migration files...');

let combined = `-- =============================================================================
-- DLMS COMPLETE TENANT DATABASE SCHEMA
-- Generated for PM SHRI KVS Digital Library Management System
-- Run this in your new Supabase project SQL Editor for all 67 tables and RPCs
-- =============================================================================

`;

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  combined += `-- >>> FILE: ${file}\n` + content + '\n\n';
}

const outputPath = path.join(__dirname, '..', 'supabase', 'complete_tenant_schema.sql');
fs.writeFileSync(outputPath, combined, 'utf8');
const stats = fs.statSync(outputPath);
console.log('Done! Created ' + outputPath + ' (' + (stats.size / 1024).toFixed(1) + ' KB)');
