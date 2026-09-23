#!/usr/bin/env node
/**
 * Release-channel integrity check for bbaz123/dsh-steward-releases.
 *
 * The three files in this repository are one contract:
 *   manifest.json   version + sha256 + url (what the app reads)
 *   DSH管家.bin     the payload the app downloads
 *   DSH管家.exe     the same bytes, for manual download
 *
 * If they ever disagree, every installed copy of the tool either misses an update
 * or downloads a file that fails its own hash check. This script fails fast in
 * both cases. It uses only Node built-ins, so it runs locally and in CI alike.
 *
 * Usage: node .github/verify-manifest.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXE = 'DSH管家.exe';
const BIN = 'DSH管家.bin';
const EXPECTED_URL = 'https://cdn.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/DSH管家.bin';

const problems = [];
const notes = [];
const check = (ok, message) => {
  if (ok) notes.push(`ok    ${message}`);
  else problems.push(message);
};
const read = (name) => readFileSync(join(repoRoot, name));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------- manifest ----
const manifestPath = join(repoRoot, 'manifest.json');
check(existsSync(manifestPath), 'manifest.json 存在');
if (!existsSync(manifestPath)) {
  report();
}

const manifestBytes = read('manifest.json');

// The tool's flagship diagnosis rule is "a JSON manifest that starts with a BOM",
// so the channel's own manifest must never ship one.
check(
  !(manifestBytes[0] === 0xef && manifestBytes[1] === 0xbb && manifestBytes[2] === 0xbf),
  'manifest.json 没有 UTF-8 BOM',
);

let manifest;
try {
  manifest = JSON.parse(manifestBytes.toString('utf8'));
  check(true, 'manifest.json 可以被 JSON.parse 解析');
} catch (err) {
  check(false, `manifest.json 解析失败：${err.message}`);
  report();
}

for (const field of ['name', 'version', 'url', 'sha256', 'notes']) {
  check(
    typeof manifest[field] === 'string' && manifest[field].trim().length > 0,
    `manifest.json 字段 ${field} 是非空字符串`,
  );
}

const version = String(manifest.version ?? '');
const declared = String(manifest.sha256 ?? '');
check(/^\d+\.\d+\.\d+$/.test(version), `版本号格式正确（${version} 形如 x.y.z）`);
check(/^[0-9a-f]{64}$/.test(declared), 'sha256 是 64 位小写十六进制');
check(manifest.url === EXPECTED_URL, `url 指向 jsDelivr 上的 ${BIN}`);

// ---------------------------------------------------------------- payload ----
for (const name of [EXE, BIN]) {
  check(existsSync(join(repoRoot, name)), `${name} 存在`);
}
if (!existsSync(join(repoRoot, EXE)) || !existsSync(join(repoRoot, BIN))) {
  report();
}

const exeBytes = read(EXE);
const binBytes = read(BIN);
const exeHash = sha256(exeBytes);
const binHash = sha256(binBytes);

check(exeHash === binHash, `${EXE} 与 ${BIN} 内容一致（同一份字节）`);
check(exeHash === declared, `${EXE} 实际 SHA256 与清单声明一致`);
check(binHash === declared, `${BIN} 实际 SHA256 与清单声明一致`);
check(exeBytes[0] === 0x4d && exeBytes[1] === 0x5a, `${EXE} 是 PE 文件（MZ 头）`);
check(binBytes[0] === 0x4d && binBytes[1] === 0x5a, `${BIN} 是 PE 文件（MZ 头）`);
check(exeBytes.length > 50_000, `二进制大小合理（${exeBytes.length} 字节）`);

// ------------------------------------------------------------- front page ----
const readmePath = join(repoRoot, 'README.md');
check(existsSync(readmePath), 'README.md 存在');
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, 'utf8');
  check(
    readme.includes(`version-${version}-`),
    `README 的版本徽章与 manifest 一致（version-${version}）`,
  );
  check(readme.includes('--diagnose'), 'README 记录了命令行用法');
}

const changelogPath = join(repoRoot, 'CHANGELOG.md');
check(existsSync(changelogPath), 'CHANGELOG.md 存在');
if (existsSync(changelogPath)) {
  const changelog = readFileSync(changelogPath, 'utf8');
  check(
    new RegExp(`^##\\s+${version.replace(/\./g, '\\.')}\\b`, 'm').test(changelog),
    `CHANGELOG 有 ${version} 的条目`,
  );
}

report();

function report() {
  console.log('release channel check\n');
  for (const line of notes) console.log(`  ${line}`);
  if (problems.length === 0) {
    console.log('\n结果：通过 —— 清单、两个二进制与版本信息自洽。');
    process.exit(0);
  }
  console.log('');
  for (const line of problems) console.log(`  ::error::${line}`);
  console.log(`\n结果：失败 —— ${problems.length} 项不一致，更新通道不可发布。`);
  process.exit(1);
}
