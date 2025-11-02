#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const options = {
  skipInstall: false,
  summaryFile: null
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--skip-install' || arg === '--skip-ci') {
    options.skipInstall = true;
    continue;
  }

  if (arg === '--summary-file') {
    options.summaryFile = args[index + 1];
    index += 1;
    continue;
  }

  if (arg.startsWith('--summary-file=')) {
    options.summaryFile = arg.split('=')[1];
  }
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  {
    key: 'install',
    name: 'Install dependencies',
    command: npmCmd,
    args: ['ci'],
    skip: () => options.skipInstall
  },
  {
    key: 'lint',
    name: 'Lint',
    command: npmCmd,
    args: ['run', 'lint']
  },
  {
    key: 'typecheck',
    name: 'Typecheck',
    command: npmCmd,
    args: ['run', 'typecheck']
  },
  {
    key: 'test',
    name: 'Test',
    command: npmCmd,
    args: ['test', '--', '--run']
  },
  {
    key: 'build',
    name: 'Build',
    command: npmCmd,
    args: ['run', 'build']
  }
];

const results = [];
let encounteredFailure = false;

for (const step of steps) {
  if (encounteredFailure) {
    results.push({
      key: step.key,
      name: step.name,
      status: 'skipped',
      durationMs: 0
    });
    continue;
  }

  if (typeof step.skip === 'function' && step.skip()) {
    results.push({
      key: step.key,
      name: step.name,
      status: 'skipped',
      durationMs: 0
    });
    continue;
  }

  console.log(`\n▶️  ${step.name}`);
  const start = performance.now();
  const exitCode = await runCommand(step.command, step.args);
  const durationMs = performance.now() - start;
  const status = exitCode === 0 ? 'passed' : 'failed';

  results.push({
    key: step.key,
    name: step.name,
    status,
    durationMs: Math.round(durationMs)
  });

  if (exitCode !== 0) {
    encounteredFailure = true;
  }
}

printSummary(results);

if (options.summaryFile) {
  const serialized = JSON.stringify(results, null, 2);
  try {
    writeFileSync(options.summaryFile, serialized, 'utf8');
  } catch (error) {
    console.error(`Failed to write summary file at ${options.summaryFile}:`, error);
  }
}

const hasFailures = results.some((result) => result.status === 'failed');
process.exit(hasFailures ? 1 : 0);

async function runCommand(command, commandArgs) {
  return await new Promise((resolve) => {
    const child = spawn(command, commandArgs, { stdio: 'inherit' });

    child.on('close', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }

      resolve(code ?? 0);
    });

    child.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
  });
}

function printSummary(stepResults) {
  if (!stepResults.length) {
    return;
  }

  const totalMs = stepResults.reduce((acc, step) => acc + step.durationMs, 0);

  console.log('\nSummary');
  console.log('-------');
  console.log('| Step | Status | Duration |');
  console.log('| --- | --- | --- |');

  for (const result of stepResults) {
    const icon = getStatusIcon(result.status);
    const label = getStatusLabel(result.status);
    const duration = formatDuration(result.durationMs);
    console.log(`| ${result.name} | ${icon} ${label} | ${duration} |`);
  }

  console.log(`| **Total** |  | ${formatDuration(totalMs)} |`);
}

function getStatusIcon(status) {
  switch (status) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'skipped':
    default:
      return '⏭️';
  }
}

function getStatusLabel(status) {
  if (!status) {
    return 'Unknown';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '0s';
  }

  const totalSeconds = durationMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(totalSeconds >= 10 ? 1 : 2)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
