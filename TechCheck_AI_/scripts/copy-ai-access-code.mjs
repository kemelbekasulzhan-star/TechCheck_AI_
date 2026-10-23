import { spawnSync } from 'node:child_process';

try {
  process.loadEnvFile('.env.local');
  const code = process.env.TECHCHECK_ACCESS_TOKEN;
  if (!code) throw new Error('missing-code');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Set-Clipboard -Value ([Console]::In.ReadToEnd())'], {
    input: code, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'],
  });
  if (result.status !== 0) throw new Error('clipboard-failed');
  console.log('Access code copied. Paste into TechCheck: Ctrl+V. The OpenAI API key was not copied.');
} catch {
  console.error('Could not copy the access code. Check local settings and clipboard access.');
  process.exitCode = 1;
}
