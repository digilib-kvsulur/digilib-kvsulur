#!/usr/bin/env node
/**
 * One-Click DLMS Maintenance Update Script
 * 
 * Usage:
 *   npm run maint                    # Interactive menu
 *   npm run maint +5m                # Extend by 5 minutes
 *   npm run maint +15m               # Extend by 15 minutes
 *   npm run maint +30m               # Extend by 30 minutes
 *   npm run maint 2:15pm             # Set until 2:15 PM today (IST)
 *   npm run maint 2:30pm "DB update" # Set time & reason
 *   npm run maint off                # Turn OFF maintenance mode
 *   npm run maint status             # View current maintenance status
 *   npm run maint +15m --git         # Update, commit & push in one go
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(ROOT_DIR, 'src', 'config', 'maintenanceConfig.ts');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getNowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function formatIST(dateObj) {
  // Format as: "today, 2:00 PM IST" or "20 Oct 2026, 2:00 PM IST"
  const istDate = new Date(dateObj.getTime() + IST_OFFSET_MS);
  const nowIST = getNowIST();

  const isToday =
    istDate.getUTCFullYear() === nowIST.getUTCFullYear() &&
    istDate.getUTCMonth() === nowIST.getUTCMonth() &&
    istDate.getUTCDate() === nowIST.getUTCDate();

  let hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm} IST`;

  if (isToday) {
    return `today, ${timeStr}`;
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = istDate.getUTCDate();
  const month = months[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  return `${day} ${month} ${year}, ${timeStr}`;
}

function parseTargetTime(input) {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'off' || trimmed === 'disable' || trimmed === 'stop') {
    return { enabled: false, date: new Date(0), display: 'Disabled' };
  }

  // Relative: +5m, +15m, +1h, 15m, etc.
  const relMatch = trimmed.match(/^\+?(\d+)\s*(m|min|mins|h|hr|hours)?$/);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = relMatch[2] || 'm';
    const minutes = unit.startsWith('h') ? val * 60 : val;
    const target = new Date(Date.now() + minutes * 60 * 1000);
    return { enabled: true, date: target, display: formatIST(target) };
  }

  // Noon / midnight
  if (trimmed === 'noon' || trimmed === '12 noon' || trimmed === '12:00 noon') {
    const nowIST = getNowIST();
    const utcMs = Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 12, 0) - IST_OFFSET_MS;
    const target = new Date(utcMs);
    return { enabled: true, date: target, display: formatIST(target) };
  }

  // Time format: "2pm", "2:15pm", "14:15", "2:30", "7:07 pm", etc.
  const timeMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    // Default: if no am/pm given and hours <= 7, assume PM (most maintenance is afternoon/evening)
    if (!ampm && hours >= 1 && hours <= 7) hours += 12;

    const nowIST = getNowIST();
    let utcMs = Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), hours, minutes) - IST_OFFSET_MS;
    // If the computed time is already in the past by > 1 hour, assume tomorrow
    if (utcMs < Date.now() - 60 * 60 * 1000) {
      utcMs += 24 * 60 * 60 * 1000;
    }
    const target = new Date(utcMs);
    return { enabled: true, date: target, display: formatIST(target) };
  }

  throw new Error(`Unable to parse time: "${input}". Examples: +15m, 2:30pm, 12 noon, off`);
}

function readCurrentConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  const content = fs.readFileSync(CONFIG_FILE, 'utf8');

  const enabledMatch = content.match(/enabled:\s*(true|false)/);
  const untilMatch = content.match(/until:\s*["']([^"']+)["']/);
  const displayMatch = content.match(/displayUntil:\s*["']([^"']+)["']/);
  const subheadingMatch = content.match(/subheading:\s*["']([^"']+)["']/);

  return {
    enabled: enabledMatch ? enabledMatch[1] === 'true' : false,
    until: untilMatch ? untilMatch[1] : '',
    displayUntil: displayMatch ? displayMatch[1] : '',
    subheading: subheadingMatch ? subheadingMatch[1] : '',
  };
}

function updateConfigFile({ enabled, untilDate, displayUntil, reason }) {
  const isoUntil = untilDate.toISOString();
  const author = 'G V Tanish Vettrivel';
  const authorRole = 'Developer · PM SHRI KV AFS Sulur';
  const supportEmail = 'dlms@kvsulur.in';

  let subheading;
  let modalBody;

  if (!enabled) {
    subheading = 'System is currently online and operational.';
    modalBody = 'No maintenance scheduled.';
  } else {
    const cleanReason = reason && reason.trim().length > 0
      ? reason.trim()
      : 'scheduled maintenance for essential system updates and improvements';

    subheading = `DLMS is currently undergoing ${cleanReason}. We'll be back online by: ${displayUntil}.`;
    modalBody = `DLMS is currently undergoing ${cleanReason}.\n\nThe site will be back online smoothly by ${displayUntil}.\n\nThank you for your patience and cooperation. 🙏`;
  }

  const newConfigContent = `export interface MaintenanceConfig {
  enabled: boolean;
  until: string; // ISO 8601 UTC timestamp
  displayUntil: string; // Human readable e.g. "today, 2:00 PM IST"
  heading: string;
  subheading: string;
  modalBody: string;
  author: string;
  authorRole: string;
  supportEmail: string;
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: ${enabled},
  until: "${isoUntil}",
  displayUntil: "${displayUntil}",
  heading: "Site Under Maintenance",
  subheading:
    ${JSON.stringify(subheading)},
  modalBody:
    ${JSON.stringify(modalBody)},
  author: "${author}",
  authorRole: "${authorRole}",
  supportEmail: "${supportEmail}",
};

/**
 * Returns true if maintenance is currently enabled and the until timestamp has not elapsed.
 */
export function isMaintenanceActive(config: MaintenanceConfig = MAINTENANCE_CONFIG): boolean {
  if (!config.enabled) return false;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return false;
  return Date.now() < endMs;
}

/**
 * Returns remaining milliseconds until maintenance lifts.
 */
export function getMaintenanceRemainingMs(config: MaintenanceConfig = MAINTENANCE_CONFIG): number {
  if (!config.enabled) return 0;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - Date.now());
}
`;

  fs.writeFileSync(CONFIG_FILE, newConfigContent, 'utf8');
}

function handleGitCommit(message) {
  try {
    console.log('\n📦 Running git add & commit...');
    execSync('git add src/config/maintenanceConfig.ts', { stdio: 'inherit', cwd: ROOT_DIR });
    execSync(`git commit -m "${message}"`, { stdio: 'inherit', cwd: ROOT_DIR });
    console.log('🚀 Pushing to origin...');
    execSync('git push', { stdio: 'inherit', cwd: ROOT_DIR });
    console.log('✅ Successfully committed and pushed maintenance update!');
  } catch (err) {
    console.error('⚠️ Git commit/push failed:', err.message);
  }
}

async function runInteractive() {
  const current = readCurrentConfig();
  console.log('\n========================================');
  console.log('  🛠️  DLMS One-Click Maintenance Manager');
  console.log('========================================');
  if (current) {
    const endMs = new Date(current.until).getTime();
    const isActive = current.enabled && Date.now() < endMs;
    const remainingMin = Math.max(0, Math.round((endMs - Date.now()) / 60000));
    console.log(`Status    : ${isActive ? '🟡 ACTIVE' : '🟢 OFFLINE / LIFTED'}`);
    if (isActive) {
      console.log(`Until     : ${current.displayUntil} (~${remainingMin} mins remaining)`);
    }
  }
  console.log('----------------------------------------');
  console.log('Quick Actions:');
  console.log('  [1] +5 minutes');
  console.log('  [2] +10 minutes');
  console.log('  [3] +15 minutes');
  console.log('  [4] +30 minutes');
  console.log('  [5] +1 hour');
  console.log('  [6] Turn OFF maintenance');
  console.log('  [7] Custom time (e.g. 2:30pm, 7:15pm)');
  console.log('  [8] Quiz Championship League (set end time)');
  console.log('  [0] Exit');
  console.log('----------------------------------------');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  const choice = (await ask('Select option [1-8, 0]: ')).trim();

  let targetInput = '';
  let reasonInput = '';

  switch (choice) {
    case '1': targetInput = '+5m'; break;
    case '2': targetInput = '+10m'; break;
    case '3': targetInput = '+15m'; break;
    case '4': targetInput = '+30m'; break;
    case '5': targetInput = '+1h'; break;
    case '6': targetInput = 'off'; break;
    case '7':
      targetInput = (await ask('Enter time (e.g. 2:30pm, +20m): ')).trim();
      reasonInput = (await ask('Reason (optional, press Enter to keep default): ')).trim();
      break;
    case '8':
      targetInput = (await ask('Enter when the site should be back online (e.g. 2:30pm, +20m): ')).trim();
      reasonInput = 'idle to provide a better experience during the Quiz Championship League';
      break;
    case '0':
    default:
      console.log('Cancelled.');
      rl.close();
      return;
  }

  const parsed = parseTargetTime(targetInput);
  updateConfigFile({
    enabled: parsed.enabled,
    untilDate: parsed.date,
    displayUntil: parsed.display,
    reason: reasonInput,
  });

  console.log('\n🎉 Maintenance Config Updated Successfully!');
  console.log(`   Enabled: ${parsed.enabled}`);
  if (parsed.enabled) {
    console.log(`   Until:   ${parsed.display}`);
    console.log(`   UTC:     ${parsed.date.toISOString()}`);
  }

  const gitPush = (await ask('\nCommit and push to GitHub now? (y/N): ')).trim().toLowerCase();
  rl.close();

  if (gitPush === 'y' || gitPush === 'yes') {
    const msg = parsed.enabled
      ? `chore(maintenance): set maintenance until ${parsed.display}`
      : 'chore(maintenance): lift maintenance mode';
    handleGitCommit(msg);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return runInteractive();
  }

  const isGit = args.includes('--git');
  const filteredArgs = args.filter((a) => a !== '--git');

  const firstArg = filteredArgs[0].toLowerCase();

  if (firstArg === 'status') {
    const current = readCurrentConfig();
    const endMs = current ? new Date(current.until).getTime() : 0;
    const isActive = current?.enabled && Date.now() < endMs;
    const remainingMin = Math.max(0, Math.round((endMs - Date.now()) / 60000));
    console.log(`Maintenance Status : ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    if (isActive) {
      console.log(`Until              : ${current.displayUntil}`);
      console.log(`Time Left          : ~${remainingMin} mins`);
      console.log(`Notice             : ${current.subheading}`);
    }
    return;
  }

  const timeInput = filteredArgs[0];
  const reasonInput = filteredArgs.slice(1).join(' ');

  const parsed = parseTargetTime(timeInput);
  updateConfigFile({
    enabled: parsed.enabled,
    untilDate: parsed.date,
    displayUntil: parsed.display,
    reason: reasonInput,
  });

  console.log('✅ Maintenance configuration updated!');
  console.log(`   Mode  : ${parsed.enabled ? 'ACTIVE' : 'OFF'}`);
  if (parsed.enabled) {
    console.log(`   Until : ${parsed.display} (${parsed.date.toISOString()})`);
  }

  if (isGit) {
    const msg = parsed.enabled
      ? `chore(maintenance): set maintenance until ${parsed.display}`
      : 'chore(maintenance): lift maintenance mode';
    handleGitCommit(msg);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
