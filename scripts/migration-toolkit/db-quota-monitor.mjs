#!/usr/bin/env node
/**
 * Database & Storage Usage Quota Monitor
 * Usage: npm run db:health
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Read .env natively
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'auqeumvurobhrewgttun';
const findPsql = () => {
  const userProfile = process.env.USERPROFILE || '';
  const scoopPath = path.join(userProfile, 'scoop', 'apps', 'postgresql', 'current', 'bin', 'psql.exe');
  if (fs.existsSync(scoopPath)) return scoopPath;
  const stdPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
  if (fs.existsSync(stdPath)) return stdPath;
  return 'psql';
};
const psqlPath = findPsql();
const dbPassword = 'Pmshri@nep20';

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

async function checkDatabaseSize() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(` 📊 SUPABASE USAGE & QUOTA GUARDIAN: [${projectRef}] `);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const sizeQuery = "SELECT pg_size_pretty(pg_database_size(current_database())), pg_database_size(current_database());";

    function runPsql(query, extraArgs = '') {
      try {
        return execSync(
          `"${psqlPath}" -h db.${projectRef}.supabase.co -U postgres -d postgres ${extraArgs} -c "${query}"`,
          { env: { ...process.env, PGPASSWORD: dbPassword }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
      } catch (e) {
        // Fallback to pooler
        const poolerHosts = [
          'aws-0-ap-southeast-1.pooler.supabase.com',
          'aws-0-ap-northeast-2.pooler.supabase.com',
          'aws-0-ap-south-1.pooler.supabase.com'
        ];
        for (const host of poolerHosts) {
          try {
            return execSync(
              `"${psqlPath}" -h ${host} -p 5432 -U postgres.${projectRef} -d postgres ${extraArgs} -c "${query}"`,
              { env: { ...process.env, PGPASSWORD: dbPassword }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
          } catch (inner) {}
        }
        throw e;
      }
    }

    const rawSize = runPsql(sizeQuery, '-t -A -F "|"').trim();

    const [dbSizeStr, dbBytesStr] = rawSize.split('|');
    const dbMB = parseFloat(formatMB(parseInt(dbBytesStr, 10)));
    const quotaDB = 500.0;
    const pctUsed = ((dbMB / quotaDB) * 100).toFixed(1);

    console.log('🗄️  DATABASE USAGE (Free Tier Limit: 500 MB)');
    console.log(`   Total Size:     ${dbSizeStr} (${dbMB} MB / ${quotaDB} MB)`);
    console.log(`   Usage Ratio:    [${pctUsed}% used]`);

    if (dbMB > 400) {
      console.log('   ⚠️  WARNING: Database size is >80% of Free Tier quota! Run migration soon.');
    } else {
      console.log('   ✅ HEALTHY: Safe distance from Free Tier quota limits.\n');
    }

    console.log('📋 TOP LARGEST USER TABLES:');
    const tableQuery = `
      SELECT schemaname || '.' || relname AS table_name,
             pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
             n_live_tup AS row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 8;
    `;
    const tableOutput = runPsql(tableQuery);
    console.log(tableOutput);

  } catch (err) {
    console.error('⚠️ Direct database inspection notice:', err.message);
  }
}

checkDatabaseSize();
