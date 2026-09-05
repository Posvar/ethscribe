import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { artifacts } from '../src/huntData.js';

// Only the seven public seed artifacts are eligible. Never cache an open target.
const sources = {
  'original-bc-ico': 'https://raw.githubusercontent.com/bitcoin/bitcoin/4405b78d6059e536c36974088a8ed4d9f0f29898/rc/bitcoin.ico',
  'new-png-16': 'https://web.archive.org/web/20101222204928id_/http://www.bitcoin.org/download/bitcoin16.4.png',
  'new-png-20': 'https://web.archive.org/web/20101222205043id_/http://www.bitcoin.org/download/bitcoin20.4.png',
  'new-png-32': 'https://web.archive.org/web/20101222205146id_/http://www.bitcoin.org/download/bitcoin32.5.png',
  'new-png-48': 'https://web.archive.org/web/20101222205116id_/http://www.bitcoin.org/download/bitcoin48.5.png',
  'new-composite-ico': 'https://raw.githubusercontent.com/bitcoin/bitcoin/68b973a913fd1569d3a9a444d4233b15f7866e3e/rc/bitcoin.ico',
  'favicon-ico': 'https://raw.githubusercontent.com/bitcoin/bitcoin/68b973a913fd1569d3a9a444d4233b15f7866e3e/rc/favicon.ico',
};
const targetDirectory = new URL('../public/artifacts/expedition-001/', import.meta.url);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function verify(artifact, bytes) {
  if (bytes.length !== artifact.bytes || digest(bytes) !== artifact.sha256) {
    throw new Error(`${artifact.id}: downloaded bytes do not match the public manifest`);
  }
}

async function cache(artifact, origin) {
  if (artifact.status !== 'secured' || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
    throw new Error(`${artifact.id}: refusing to cache an unrecognized target`);
  }
  const destination = new URL(`${artifact.id}.${artifact.format.toLowerCase()}`, targetDirectory);
  try {
    const existing = await readFile(destination);
    verify(artifact, existing);
    return { id: artifact.id, bytes: existing.length, sha256: digest(existing), source: 'existing verified cache' };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const failures = [];
  for (const source of [origin, `https://ethscri.be/api/ethscriptions/media/${artifact.ethscriptionId}`]) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      verify(artifact, bytes);
      // Save only bytes that already passed both the digest and length checks.
      await writeFile(destination, bytes, { flag: 'wx' });
      verify(artifact, await readFile(destination));
      return { id: artifact.id, bytes: bytes.length, sha256: digest(bytes), source, file: fileURLToPath(destination) };
    } catch (error) {
      failures.push(`${source}: ${error.message}`);
    }
  }
  throw new Error(failures.join('\n'));
}

await mkdir(targetDirectory, { recursive: true });
const results = await Promise.allSettled(Object.entries(sources).map(([id, source]) => {
  const artifact = artifacts.find((entry) => entry.id === id);
  if (!artifact) throw new Error(`Missing public seed artifact: ${id}`);
  return cache(artifact, source);
}));
for (const result of results) {
  if (result.status === 'fulfilled') console.log(JSON.stringify(result.value));
  else {
    console.error(result.reason.message);
    process.exitCode = 1;
  }
}
