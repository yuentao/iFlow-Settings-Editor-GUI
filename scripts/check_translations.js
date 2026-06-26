const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'src', 'main');

// 1. Extract all t() keys from main process files (excluding tests)
const usedKeys = new Set();
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    if (entry.name.endsWith('.test.js')) continue;
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) { walkDir(fp); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    for (const m of content.matchAll(/t\(['"]([^'"]+)['"]/g)) {
      const key = m[1];
      // Skip non-translation strings (HTTP methods, paths, etc.)
      if (/^[A-Z]{2,}$/.test(key)) continue; // DELETE, GET, etc.
      if (/^[.:/\\]/.test(key)) continue; // paths
      if (key === 'hex' || key === '\n') continue;
      if (key.includes('should ') || key.includes('should NOT')) continue; // test descriptions
      if (key.startsWith('../') || key.startsWith('./')) continue; // require paths
      usedKeys.add(key);
    }
  }
}
walkDir(base);

// 2. Load defaultTranslations
const transPath = path.join(base, 'utils', 'translations.js');
delete require.cache[transPath];
const { defaultTranslations } = require(transPath);

// 3. Flatten all leaf keys
function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sk of flattenKeys(v, full)) keys.add(sk);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

const availableKeys = flattenKeys(defaultTranslations);

// 4. Check each used key
function keyExists(key) {
  if (availableKeys.has(key)) return 'direct';
  if (availableKeys.has(`main.${key}`)) return 'main.*';
  return null;
}

const missing = [];
const fallback = [];
for (const k of [...usedKeys].sort()) {
  const via = keyExists(k);
  if (!via) missing.push(k);
  else if (via === 'main.*') fallback.push(k);
}

console.log('=== Missing translation keys (NOT found anywhere) ===');
missing.forEach(k => console.log(`  ${k}`));
console.log(`Total missing: ${missing.length}`);

console.log('\n=== Keys resolved via main.* fallback (t() fix handles these) ===');
fallback.forEach(k => console.log(`  ${k} -> main.${k}`));
console.log(`Total fallback: ${fallback.length}`);

console.log(`\nTotal t() keys used: ${usedKeys.size}`);