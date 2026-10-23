import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const args = process.argv.slice(2);
const demo = args.includes('--demo');
const noBrowser = args.includes('--no-browser');
const portIndex = args.indexOf('--port');
const firstPort = portIndex < 0 ? 3000 : Number(args[portIndex + 1]);
if (!Number.isInteger(firstPort) || firstPort < 1024 || firstPort > 65525) throw new Error('Invalid local port.');

async function identify(port) {
  try {
    const url = `http://127.0.0.1:${port}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    if (!response.ok || !(await response.text()).includes('TechCheck')) return false;
    const status = await fetch(`${url}/api/extract`, { signal: AbortSignal.timeout(1200) });
    const data = await status.json();
    return status.ok && typeof data.configured === 'boolean' && (!demo || !data.configured);
  } catch { return false; }
}
async function available(port) {
  return new Promise(resolve => {
    const socket = net.createServer();
    socket.once('error', () => resolve(false));
    socket.listen(port, '127.0.0.1', () => socket.close(() => resolve(true)));
  });
}
function show(port, existing = false) {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`\nTechCheck is ready: ${url}`);
  console.log(existing ? 'An existing TechCheck server is already running.' : 'Keep this window open during the demonstration. Ctrl+C stops the server.');
  if (demo) console.log('Competition mode: external AI disabled. Use the built-in examples.');
  if (!noBrowser) {
    const opener = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${url}'`], { windowsHide: true, stdio: 'ignore' });
    opener.on('error', () => console.log('Open the address above in your browser.'));
  }
}

let selected;
for (let port = firstPort; port < firstPort + 10; port++) {
  if (await identify(port)) { show(port, true); process.exit(0); }
  if (await available(port)) { selected = port; break; }
}
if (!selected) throw new Error('No free local port. Close old TechCheck windows and try again.');
if (!existsSync('node_modules/next') || !existsSync('.next/BUILD_ID')) {
  console.error('Required files are missing. Use the complete competition folder. See START_HERE_RU.txt.');
  process.exit(1);
}
const child = spawn(process.execPath, ['--preserve-symlinks', path.join(root, 'scripts/next.mjs'), 'start', '--hostname', '127.0.0.1', '--port', String(selected)], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, ...(demo ? { TECHCHECK_AI_ENABLED: 'false' } : {}) },
});
let exited = false;
child.on('error', () => { exited = true; console.error('Could not start the local server.'); });
const finished = new Promise(resolve => child.once('close', code => { exited = true; resolve(code ?? 1); }));
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
let ready = false;
for (let attempt = 0; attempt < 60 && !exited; attempt++) {
  if (await identify(selected)) { ready = true; break; }
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (!ready) {
  child.kill();
  console.error('Server did not start. Read the message above or use competition/Offline-Demo.html.');
  process.exitCode = 1;
} else {
  show(selected);
  process.exitCode = await finished;
}
