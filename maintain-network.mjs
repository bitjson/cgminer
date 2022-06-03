import { exec } from 'node:child_process';

const usageInfo = `
Run a command for <kill-after-seconds> seconds every <minimum-frequency-minutes> to <maximum-frequency-minutes> (a random delay). This is useful for cheaply maintaining a low-difficulty network. The first run of <command> will occur immediately.

Usage: node maintain-network.mjs <command> <minimum-frequency-minutes> <maximum-frequency-minutes> <kill-after-seconds>
Example: node maintain-network.mjs './cgminer -T -o http://localhost:28332 -u username -p password --base58-address "..." --coinbase-message "/Miner Name/" --shares 1' 10 30 10

`;
const [, , command, minFrequencyMin, maxFrequencyMin, killAfterSec] =
  process.argv;
const minFrequencyMs = Number(minFrequencyMin) * 60 * 1000;
const maxFrequencyMs = Number(maxFrequencyMin) * 60 * 1000;
const killAfterMs = Number(killAfterSec) * 1000;
if (isNaN(minFrequencyMs) || isNaN(maxFrequencyMs) || isNaN(killAfterMs)) {
  console.log(usageInfo);
  process.exit(0);
}

const timestamp = (message) => `[${new Date().toISOString()}]: ${message}`;
const log = (message) => console.log(timestamp(message));
const err = (message) => console.error(timestamp(message));

const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const controller = new AbortController();
const { signal } = controller;

const runCommand = () => {
  log(`Running command: ${command}`);
  const timeout = setTimeout(() => {
    controller.abort();
    err(
      `Command did not complete after ${killAfterSec} seconds and was killed. Has the difficulty increased?`
    );
  }, killAfterMs);
  exec(command, { signal }, (error, stdout, stderr) => {
    clearTimeout(timeout);
    if (stdout) log(stdout);
    if (stderr) err(stderr);
    if (error) err(`Exec error: ${error}`);
    const nextTimeout = randomIntFromInterval(minFrequencyMs, maxFrequencyMs);
    log(
      `Next run scheduled for ~${Math.round(
        nextTimeout / 1000
      )} seconds: ${new Date(Date.now() + nextTimeout).toISOString()}`
    );
    setTimeout(runCommand, nextTimeout);
  });
};

log(`
Starting network maintainer...

Command: ${command}
Run every: ${minFrequencyMin} to ${maxFrequencyMin} minutes
Kill after: ${killAfterSec} seconds
`);
log(`Command`);
log(`Press Ctrl+C to stop at any time.`);
runCommand();
