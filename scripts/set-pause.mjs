#!/usr/bin/env node
/**
 * DLMS Community Safety Pause Management Script
 * 
 * Usage:
 *   npm run pause                    # Interactive menu
 *   npm run pause status             # View current pause status
 *   npm run pause off                # Lift the community pause immediately
 *   npm run pause on                 # Activate pause for default (1 week, until Saturday 28 Nov 2026, 8:00 AM IST)
 *   npm run pause +7d                # Set pause for 7 days
 *   npm run pause +3d                # Set pause for 3 days
 *   npm run pause off --git          # Lift pause and commit changes
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(ROOT_DIR, 'src', 'config', 'pauseConfig.ts');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getNowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function formatIST(dateObj) {
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

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[istDate.getUTCDay()];

  if (isToday) {
    return {
      displayDate: `today (${dayName})`,
      displayTime: timeStr,
      fullDisplay: `today, ${timeStr}`,
    };
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const day = istDate.getUTCDate();
  const month = months[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();

  return {
    displayDate: `${dayName}, ${day} ${month} ${year}`,
    displayTime: timeStr,
    fullDisplay: `${dayName}, ${day} ${month} ${year}, ${timeStr}`,
  };
}

function parseTargetTime(input) {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'off' || trimmed === 'disable' || trimmed === 'stop' || trimmed === 'lift') {
    return { enabled: false, date: new Date(0), displayDate: 'Disabled', displayTime: '' };
  }

  // Days relative: +7d, +1w, 7d, 1w
  const weekMatch = trimmed.match(/^\+?(\d+)\s*(w|week|weeks)$/);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    const target = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
    const formatted = formatIST(target);
    return { enabled: true, date: target, ...formatted };
  }

  const dayMatch = trimmed.match(/^\+?(\d+)\s*(d|day|days)$/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const formatted = formatIST(target);
    return { enabled: true, date: target, ...formatted };
  }

  // Hours: +12h, +24h
  const hourMatch = trimmed.match(/^\+?(\d+)\s*(h|hr|hours)$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const target = new Date(Date.now() + hours * 60 * 60 * 1000);
    const formatted = formatIST(target);
    return { enabled: true, date: target, ...formatted };
  }

  // Default 'on' -> 7 days until 8:00 AM IST on Saturday, 28 Nov 2026
  if (trimmed === 'on' || trimmed === 'enable' || trimmed === 'activate') {
    // 2026-11-28 08:00 IST = 2026-11-28 02:30 UTC
    const target = new Date("2026-11-28T02:30:00.000Z");
    const formatted = formatIST(target);
    return { enabled: true, date: target, ...formatted };
  }

  // Fallback: 7 days from now
  const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const formatted = formatIST(target);
  return { enabled: true, date: target, ...formatted };
}

function readCurrentConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  const content = fs.readFileSync(CONFIG_FILE, 'utf8');

  const enabledMatch = content.match(/enabled:\s*(true|false)/);
  const untilMatch = content.match(/until:\s*["']([^"']+)["']/);
  const displayDateMatch = content.match(/displayDate:\s*["']([^"']+)["']/);
  const displayTimeMatch = content.match(/displayTime:\s*["']([^"']+)["']/);

  return {
    enabled: enabledMatch ? enabledMatch[1] === 'true' : false,
    until: untilMatch ? untilMatch[1] : '',
    displayDate: displayDateMatch ? displayDateMatch[1] : '',
    displayTime: displayTimeMatch ? displayTimeMatch[1] : '',
  };
}

function updateConfigFile({ enabled, untilDate, displayDate, displayTime }) {
  const isoUntil = untilDate.toISOString();

  const newConfigContent = `export interface PauseConfig {
  enabled: boolean;
  until: string; // ISO 8601 UTC timestamp
  displayDate: string; // Human-readable date e.g. "Saturday, 28 November 2026"
  displayTime: string; // Human-readable time e.g. "8:00 AM IST"
  title: string;
  badge: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  author: string;
  supportEmail: string;
}

export const PAUSE_CONFIG: PauseConfig = {
  enabled: ${enabled},
  until: "${isoUntil}",
  displayDate: "${displayDate}",
  displayTime: "${displayTime}",
  title: "DLMS is taking a short break 💙",
  badge: "School Community & Well-Being Notice",
  salutation: "Dear students and teachers,",
  paragraphs: [
    "DLMS was built for all of us, to learn, share and grow together. Recently, a comment was posted on the platform that hurt a fellow member of our school family. This goes against the spirit of DLMS.",
    "Because we care about every one of you, the school has decided to pause DLMS for one week, until ${displayDate}. We'll use this time to make the platform safer.",
    "A single unkind comment can stay with someone long after it's deleted. Kindness costs nothing, and it is what makes a community strong.",
    "To everyone who uses DLMS respectfully, thank you. This break isn't a punishment for you. It's a promise that this space will be safe for you.",
    "If anything on DLMS ever upsets you, please tell a teacher or the school counsellor. Please also keep your passwords private.",
    "Your daily streak will be preserved and will resume on the reopening day. Don't worry!",
  ],
  closing: "With care,",
  author: "Team DLMS, PM SHRI KV AFS Sulur",
  supportEmail: "dlms@kvsulur.in",
};

/**
 * Returns true if community pause is currently enabled and the until timestamp has not elapsed.
 */
export function isPauseActive(config: PauseConfig = PAUSE_CONFIG): boolean {
  if (!config.enabled) return false;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return false;
  return Date.now() < endMs;
}

/**
 * Returns remaining milliseconds until community pause lifts.
 */
export function getPauseRemainingMs(config: PauseConfig = PAUSE_CONFIG): number {
  if (!config.enabled) return 0;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - Date.now());
}
`;

  fs.writeFileSync(CONFIG_FILE, newConfigContent, 'utf8');
}

function handleGitCommit(commitMsg) {
  try {
    console.log(`\n📦 Committing: "${commitMsg}"...`);
    execSync(`git add "${CONFIG_FILE}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('🚀 Pushing to origin...');
    execSync('git push', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('🎉 Successfully pushed to GitHub!');
  } catch (err) {
    console.error('⚠️ Git operation failed:', err.message);
  }
}

async function runInteractive() {
  const current = readCurrentConfig();
  const endMs = current ? new Date(current.until).getTime() : 0;
  const isActive = current?.enabled && Date.now() < endMs;

  console.log('\n===========================================');
  console.log('💙 DLMS Community Safety Pause Controller');
  console.log('===========================================');
  console.log(`Current Status : ${isActive ? '🔵 ACTIVE (Paused for Safety)' : '⚪ INACTIVE (Platform Live)'}`);
  if (isActive) {
    console.log(`Reopening Date : ${current.displayDate} at ${current.displayTime}`);
    const remainingHrs = Math.max(0, Math.round((endMs - Date.now()) / (1000 * 60 * 60)));
    console.log(`Time Left      : ~${remainingHrs} hours remaining`);
  }
  console.log('-------------------------------------------');
  console.log('1) Enable pause for 1 week (until Saturday, 28 Nov 2026, 8:00 AM IST)');
  console.log('2) Lift pause immediately (make platform live)');
  console.log('3) Set custom duration (e.g. +3d, +7d)');
  console.log('4) Exit');
  console.log('-------------------------------------------');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q) => new Promise((resolve) => rl.question(q, resolve));

  const choice = (await question('Select an option (1-4): ')).trim();

  let targetInput = null;
  if (choice === '1') targetInput = 'on';
  else if (choice === '2') targetInput = 'off';
  else if (choice === '3') {
    targetInput = (await question('Enter duration (e.g. +7d, +3d, or off): ')).trim();
  } else {
    console.log('Cancelled.');
    rl.close();
    return;
  }

  const shouldGit = (await question('Commit and push to GitHub? (y/N): ')).trim().toLowerCase() === 'y';
  rl.close();

  const parsed = parseTargetTime(targetInput);
  updateConfigFile({
    enabled: parsed.enabled,
    untilDate: parsed.date,
    displayDate: parsed.displayDate,
    displayTime: parsed.displayTime,
  });

  console.log('\n✅ Community Pause configuration updated!');
  console.log(`   Status : ${parsed.enabled ? 'ACTIVE' : 'OFF'}`);
  if (parsed.enabled) {
    console.log(`   Until  : ${parsed.displayDate} at ${parsed.displayTime}`);
  }

  if (shouldGit) {
    const msg = parsed.enabled
      ? `chore(pause): activate safety pause until ${parsed.displayDate}`
      : 'chore(pause): lift community safety pause';
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
    console.log(`\nPause Status   : ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    if (isActive) {
      console.log(`Reopening Date : ${current.displayDate} at ${current.displayTime}`);
      const remainingHrs = Math.max(0, Math.round((endMs - Date.now()) / (1000 * 60 * 60)));
      console.log(`Time Left      : ~${remainingHrs} hours`);
    }
    return;
  }

  const parsed = parseTargetTime(firstArg);
  updateConfigFile({
    enabled: parsed.enabled,
    untilDate: parsed.date,
    displayDate: parsed.displayDate,
    displayTime: parsed.displayTime,
  });

  console.log('\n✅ Community Pause configuration updated!');
  console.log(`   Status : ${parsed.enabled ? 'ACTIVE' : 'OFF'}`);
  if (parsed.enabled) {
    console.log(`   Until  : ${parsed.displayDate} at ${parsed.displayTime}`);
  }

  if (isGit) {
    const msg = parsed.enabled
      ? `chore(pause): activate safety pause until ${parsed.displayDate}`
      : 'chore(pause): lift community safety pause';
    handleGitCommit(msg);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
