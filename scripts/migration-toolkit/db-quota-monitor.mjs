#!/usr/bin/env node
/**
 * Database & Storage Usage Quota Monitor
 * Usage: npm run db:health
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'oebshkijofsusugrslii';
const psqlPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
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
    const rawSize = execSync(
      `"${psqlPath}" -h db.${projectRef}.supabase.co -U postgres -d postgres -t -A -F "|" -c "${sizeQuery}"`,
      { env: { ...process.env, PGPASSWORD: dbPassword }, encoding: 'utf8' }
    ).trim();

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
    const tableOutput = execSync(
      `"${psqlPath}" -h db.${projectRef}.supabase.co -U postgres -d postgres -c "${tableQuery}"`,
      { env: { ...process.env, PGPASSWORD: dbPassword }, encoding: 'utf8' }
    );
    console.log(tableOutput);

  } catch (err) {
    console.error('⚠️ Direct database inspection notice:', err.message);
  }
}

checkDatabaseSize();
