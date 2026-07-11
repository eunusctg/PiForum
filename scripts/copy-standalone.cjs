/**
 * Cross-platform copy helper for Next.js standalone output.
 * Works on Windows (CMD/PowerShell), macOS, and Linux.
 * Replaces the Unix-only `cp -r` commands that broke the build on Windows.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function copyIfExists(src, dest, label) {
  const srcAbs = path.join(ROOT, src);
  const destAbs = path.join(ROOT, dest);
  if (!fs.existsSync(srcAbs)) {
    console.warn(`[copy-standalone] SKIP ${label}: source not found (${src})`);
    return;
  }
  fs.cpSync(srcAbs, destAbs, { recursive: true, force: true });
  console.log(`[copy-standalone] OK   ${label}: ${src} -> ${dest}`);
}

// Mirror of the old: cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
copyIfExists(".next/static", ".next/standalone/.next/static", "static assets");
copyIfExists("public", ".next/standalone/public", "public assets");

console.log("[copy-standalone] Done.");
