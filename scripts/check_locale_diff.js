const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'src');
const zhCN = require(path.join(base, 'locales', 'index.js')).default;
const enUS = require(path.join(base, 'locales', 'en-US.js')).default;
const jaJP = require(path.join(base, 'locales', 'ja-JP.js')).default;

// Flatten all leaf key paths
function flattenKeys(obj, prefix = '') {
  const keys = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [sk, sv] of flattenKeys(v, full)) keys.set(sk, sv);
    } else {
      keys.set(full, v);
    }
  }
  return keys;
}

const zhKeys = flattenKeys(zhCN);
const enKeys = flattenKeys(enUS);
const jaKeys = flattenKeys(jaJP);

// Keys in zh-CN but missing in en-US
const missingEn = [];
for (const [k, v] of zhKeys) {
  if (!enKeys.has(k)) missingEn.push({ key: k, zh: v });
}

// Keys in zh-CN but missing in ja-JP
const missingJa = [];
for (const [k, v] of zhKeys) {
  if (!jaKeys.has(k)) missingJa.push({ key: k, zh: v });
}

// Keys in en-US but missing in zh-CN
const extraEn = [];
for (const [k, v] of enKeys) {
  if (!zhKeys.has(k)) extraEn.push({ key: k, en: v });
}

// Keys in ja-JP but missing in zh-CN
const extraJa = [];
for (const [k, v] of jaKeys) {
  if (!zhKeys.has(k)) extraJa.push({ key: k, ja: v });
}

console.log('=== Keys in zh-CN missing in en-US ===');
missingEn.forEach(({ key, zh }) => console.log(`  ${key}: "${zh}"`));
console.log(`Total: ${missingEn.length}`);

console.log('\n=== Keys in zh-CN missing in ja-JP ===');
missingJa.forEach(({ key, zh }) => console.log(`  ${key}: "${zh}"`));
console.log(`Total: ${missingJa.length}`);

console.log('\n=== Keys in en-US not in zh-CN ===');
extraEn.forEach(({ key, en }) => console.log(`  ${key}: "${en}"`));
console.log(`Total: ${extraEn.length}`);

console.log('\n=== Keys in ja-JP not in zh-CN ===');
extraJa.forEach(({ key, ja }) => console.log(`  ${key}: "${ja}"`));
console.log(`Total: ${extraJa.length}`);
