// PiForum Dev Server — persistent monitor with auto-restart
// Starts the Next.js dev server as a child process and restarts it
// if it crashes.  This approach keeps the server alive because the
// Node.js parent process doesn't get killed when the bash shell exits.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 20;
const RETRY_DELAY = 3000;
let retryCount = 0;
let child = null;
let shuttingDown = false;

function startServer() {
  if (shuttingDown) return;

  console.log(`[monitor] Starting Next.js dev server (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

  child = spawn('node', [
    '--max-old-space-size=2048',
    'node_modules/next/dist/bin/next',
    'dev', '-p', '3000'
  ], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  const log = fs.createWriteStream('/home/z/my-project/dev.log', {
    flags: retryCount === 0 ? 'w' : 'a'
  });

  child.stdout.on('data', (data) => {
    const msg = data.toString();
    process.stdout.write(msg);
    log.write(msg);
  });

  child.stderr.on('data', (data) => {
    const msg = data.toString();
    process.stderr.write(msg);
    log.write(msg);
  });

  child.on('close', (code, signal) => {
    const msg = `\n[monitor] Server exited with code=${code} signal=${signal}\n`;
    process.stdout.write(msg);
    log.write(msg);
    log.end();
    child = null;

    if (!shuttingDown) {
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        console.log(`[monitor] Restarting in ${RETRY_DELAY/1000}s...`);
        setTimeout(startServer, RETRY_DELAY);
      } else {
        console.log('[monitor] Max retries reached, giving up.');
        process.exit(1);
      }
    }
  });

  child.on('error', (err) => {
    const msg = `\n[monitor] Failed to start: ${err.message}\n`;
    process.stdout.write(msg);
    log.write(msg);
  });

  // Reset retry count on successful start (if server stays up for 30s)
  const resetTimer = setTimeout(() => {
    if (child && !child.killed) {
      retryCount = 0; // Reset on stable run
    }
  }, 30000);

  child.on('close', () => clearTimeout(resetTimer));
}

// Handle signals
process.on('SIGTERM', () => {
  shuttingDown = true;
  if (child) child.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  shuttingDown = true;
  if (child) child.kill('SIGINT');
  process.exit(0);
});

// Start
startServer();

// Keep the process alive
setInterval(() => {
  // Write heartbeat
  try {
    fs.writeFileSync('/tmp/next-monitor.json', JSON.stringify({
      pid: child ? child.pid : null,
      alive: !!child,
      retries: retryCount,
      time: new Date().toISOString()
    }));
  } catch {}
}, 5000);
