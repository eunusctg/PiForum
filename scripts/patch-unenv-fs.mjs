#!/usr/bin/env node
/**
 * PiForum — Patch unenv fs shim for Cloudflare Workers
 * =====================================================
 * Prisma 6.x's runtime calls `fs.readdir` and `fs.promises.readdir` to
 * detect OpenSSL/libssl on Linux. On Cloudflare Workers, the unenv fs
 * shim throws "[unenv] fs.readdir is not implemented yet!".
 *
 * Prisma's caller catches the error and re-throws UNLESS the error code
 * is "ENOENT" (in which case it skips OpenSSL detection gracefully):
 *
 *   try { return (await fs.readdir(path)).find(...) }
 *   catch (e) { if (e.code === 'ENOENT') return; throw e }
 *
 * So we patch the unenv fs shim to make `readdir` and `readdirSync`
 * throw an ENOENT error. Prisma then silently skips OpenSSL detection
 * and continues with the driver adapter path (no Rust engine needed).
 *
 * Run via postinstall after every `bun install` / `npm install`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const FILES = [
  'node_modules/unenv/dist/runtime/node/internal/fs/promises.mjs',
  'node_modules/unenv/dist/runtime/node/internal/fs/fs.mjs',
]

let patched = 0

for (const file of FILES) {
  if (!existsSync(file)) {
    console.log(`[patch-unenv-fs] skipping (not found): ${file}`)
    continue
  }

  let src = readFileSync(file, 'utf8')
  if (src.includes('__PIFORUM_PATCHED__')) {
    console.log(`[patch-unenv-fs] already patched: ${file}`)
    continue
  }

  // Replace the readdir export with one that throws ENOENT.
  // The unenv promises.mjs has:
  //   export const readdir = /* @__PURE__ */ notImplementedAsync("fs.readdir");
  // The fs.mjs has:
  //   export const readdir = callbackify(fsp.readdir);
  //
  // We patch the promises.mjs version (the source of truth) to throw ENOENT.
  // The fs.mjs callbackify wrapper will then propagate the ENOENT error to
  // the callback.
  if (file.endsWith('promises.mjs')) {
    // unenv's promises.mjs uses notImplemented (sync thrower), not notImplementedAsync
    src = src.replace(
      /export const readdir\s*=\s*\/\*[^*]*\*\/\s*notImplemented(?:Async)?\(["']fs\.readdir["']\)\s*;?/,
      `// __PIFORUM_PATCHED__
export const readdir = async (_path, _options) => {
  const err = new Error("ENOENT: no such file or directory, scandir '" + _path + "'");
  err.code = "ENOENT";
  err.errno = -2;
  err.syscall = "scandir";
  err.path = _path;
  throw err;
};`,
    )
    src = src.replace(
      /export const readdirSync\s*=\s*\/\*[^*]*\*\/\s*notImplemented(?:Async)?\(["']fs\.readdirSync["']\)\s*;?/,
      `// __PIFORUM_PATCHED__
export const readdirSync = (_path) => {
  const err = new Error("ENOENT: no such file or directory, scandir '" + _path + "'");
  err.code = "ENOENT";
  err.errno = -2;
  err.syscall = "scandir";
  err.path = _path;
  throw err;
};`,
    )
  }

  // fs.mjs: also patch readdirSync if present (some unenv versions)
  if (file.endsWith('fs.mjs')) {
    src = src.replace(
      /export const readdirSync\s*=\s*\/\*[^*]*\*\/\s*notImplemented\(["']fs\.readdirSync["']\)\s*;?/,
      `// __PIFORUM_PATCHED__
export const readdirSync = (_path) => {
  const err = new Error("ENOENT: no such file or directory, scandir '" + _path + "'");
  err.code = "ENOENT";
  throw err;
};`,
    )
  }

  if (src.includes('__PIFORUM_PATCHED__')) {
    writeFileSync(file, src, 'utf8')
    console.log(`[patch-unenv-fs] patched: ${file}`)
    patched++
  } else {
    console.log(`[patch-unenv-fs] no readdir export found in: ${file}`)
  }
}

console.log(`[patch-unenv-fs] done (${patched} file(s) patched).`)
