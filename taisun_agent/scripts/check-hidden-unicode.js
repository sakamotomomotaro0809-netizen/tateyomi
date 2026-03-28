/**
 * Check for hidden/bidirectional Unicode characters
 *
 * Prevents security issues from invisible characters that can:
 * - Hide malicious code (bidi attacks)
 * - Cause unexpected behavior
 * - Create confusing diffs
 */

const fs = require("fs");
const path = require("path");

const ROOTS = ["src", "docs", "config", "scripts", ".github", ".claude", "tests"];
const EXT_OK = new Set([".ts", ".tsx", ".js", ".json", ".md", ".yml", ".yaml", ".txt", ".sh"]);

// Problematic Unicode characters:
// - U+FEFF: BOM (byte order mark)
// - U+200B-200F: Zero-width and directional characters
// - U+202A-202E: Bidi embedding/override
// - U+2066-2069: Bidi isolates
// - U+061C: Arabic letter mark
const re = /[\uFEFF\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C]/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "coverage") continue;
      walk(p, out);
    } else {
      const ext = path.extname(ent.name);
      if (EXT_OK.has(ext) || ent.name === "package.json" || ent.name === "jest.config.js") {
        out.push(p);
      }
    }
  }
  return out;
}

let bad = [];
for (const r of ROOTS) {
  for (const f of walk(r)) {
    const s = fs.readFileSync(f, "utf8");
    const matches = s.match(re);
    if (matches) {
      bad.push({ file: f, count: matches.length });
    }
  }
}

if (bad.length) {
  console.error("ERROR: Hidden/bidirectional Unicode characters detected:");
  for (const b of bad) {
    console.error(`  - ${b.file} (${b.count} character${b.count > 1 ? "s" : ""})`);
  }
  console.error("\nTo fix, remove these characters manually or run:");
  console.error('  node -e "const fs=require(\'fs\');const re=/[\\uFEFF\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\u061C]/g;const f=process.argv[1];fs.writeFileSync(f,fs.readFileSync(f,\'utf8\').replace(re,\'\'))" <file>');
  process.exit(1);
} else {
  console.log("OK: No hidden/bidirectional Unicode characters detected.");
}
