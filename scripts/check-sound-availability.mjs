// Read-only, finite wrapper scan. This is NOT a global decoded-byte index.
// Original binaries stay in ignored .tools/research/sounds; output is JSON on stdout.
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectWave, sha256 } from './sound-research.mjs';

export const prefixes = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].map(type => `data:${type};base64,`);
const idPattern = /^0x[0-9a-f]{64}$/i;
const hashPattern = /^[0-9a-f]{64}$/i;

export function verifyMatch(record, expectedRawHash, expectedProtocolHash) {
  if (!idPattern.test(record?.transaction_hash || '')) throw new Error('Missing or malformed Ethscription ID');
  const uri = record.content_uri;
  if (typeof uri !== 'string' || sha256(Buffer.from(uri)) !== expectedProtocolHash) throw new Error('Returned Data URI does not match queried protocol hash');
  const comma = uri.indexOf(',');
  if (comma < 0 || !prefixes.includes(uri.slice(0, comma + 1))) throw new Error('Unexpected Data URI');
  const base64 = uri.slice(comma + 1), bytes = Buffer.from(base64, 'base64');
  if (bytes.toString('base64') !== base64 || sha256(bytes) !== expectedRawHash) throw new Error('Returned payload does not match original file');
  return {
    id: record.transaction_hash.toLowerCase(),
    number: record.ethscription_number,
    creator: record.creator,
    currentOwner: record.current_owner,
    createdAt: new Date(Number(record.block_timestamp) * 1000).toISOString(),
    blockNumber: Number(record.block_number),
    transactionIndex: Number(record.transaction_index),
    rawBytesVerified: true,
  };
}

export function safeScratchPath(path) {
  const root = resolve('.tools/research/sounds'), file = resolve(path);
  if (!file.startsWith(`${root}${sep}`)) throw new Error('Only ignored sound-research binaries can be inspected');
  return file;
}

async function check(prefix, bytes, rawHash) {
  const protocolSha256 = sha256(Buffer.from(prefix + bytes.toString('base64')));
  const url = `https://api.ethscriptions.com/v2/ethscriptions/exists/0x${protocolSha256}`;
  try {
    let response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const seconds = /^\d+$/.test(retryAfter || '') ? Number(retryAfter) : Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000);
      if (Number.isFinite(seconds) && seconds > 0 && seconds < 59) {
        await response.body?.cancel();
        await delay((seconds + 1) * 1000);
        response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      }
    }
    if (!response.ok) throw new Error(`Official API HTTP ${response.status}`);
    const json = await response.json(), result = json.result;
    if (typeof result?.exists !== 'boolean') throw new Error('Unexpected official API response');
    if (!result.exists) return { prefix, protocolSha256, status: 'not-found' };
    return { prefix, protocolSha256, status: 'found', ethscription: verifyMatch(result.ethscription, rawHash, protocolSha256) };
  } catch (error) {
    return { prefix, protocolSha256, status: 'unavailable', reason: error.message };
  }
}

export async function loadReferences() {
  const json = async file => JSON.parse(await readFile(`research/expedition-002/${file}.json`, 'utf8'));
  const [aol, windows, messaging] = await Promise.all(['aol', 'windows', 'messaging'].map(json));
  return [
    ...windows.targets.map(t => ({ id: t.id, sha256: t.sha256, protocolSha256: t.canonicalProtocolSha256, bytes: t.byteLength, scratchPath: t.scratchPath })),
    ...aol.targets.map(t => ({ id: t.id, sha256: t.sha256, protocolSha256: t.canonicalProtocolSha256, bytes: t.byteLength, scratchPath: `.tools/research/sounds/aol/aol10/${t.filename}` })),
    ...messaging.targets.map(t => ({ id: t.id, sha256: t.sha256, protocolSha256: t.protocolSha256, bytes: t.size, scratchPath: t.scratchPath })),
  ];
}

async function main() {
  const references = await loadReferences();
  const output = safeScratchPath('.tools/research/sounds/availability.json');
  const prior = process.argv.includes('--retry-unavailable') ? JSON.parse(await readFile(output, 'utf8')) : null;
  const priorById = new Map(prior?.targets.map(target => [target.id, target]) || []);
  const startedAt = new Date().toISOString();
  const results = [];
  for (const target of references) {
    if (!hashPattern.test(target.sha256)) throw new Error(`Invalid reference hash: ${target.id}`);
    const bytes = await readFile(safeScratchPath(target.scratchPath));
    const wave = inspectWave(bytes);
    if (wave.sha256 !== target.sha256 || wave.bytes !== target.bytes) throw new Error(`Reference mismatch: ${target.id}`);
    if (sha256(Buffer.from(prefixes[0] + bytes.toString('base64'))) !== target.protocolSha256) throw new Error(`Canonical protocol hash mismatch: ${target.id}`);
    const wrappers = [];
    // Avoid exhausting the public API's shared rate limit in a burst.
    for (const prefix of prefixes) {
      const earlier = priorById.get(target.id)?.wrappers.find(wrapper => wrapper.prefix === prefix);
      if (earlier && earlier.status !== 'unavailable') { wrappers.push(earlier); continue; }
      wrappers.push(await check(prefix, bytes, target.sha256));
      await delay(1200);
    }
    results.push({ id: target.id, rawSha256: target.sha256, checkedAt: new Date().toISOString(), wrappers });
    console.error(`${target.id}: ${wrappers.map(w => `${w.prefix.slice(5, -8)} ${w.status}`).join(', ')}`);
  }
  const canonicalFound = results.filter(t => t.wrappers[0].status === 'found').length;
  const canonicalNotFound = results.filter(t => t.wrappers[0].status === 'not-found').length;
  const snapshot = {
    schemaVersion: 1, startedAt: prior?.startedAt || startedAt, completedAt: new Date().toISOString(),
    source: 'https://api.ethscriptions.com/v2/ethscriptions/exists/0x{sha256-of-complete-data-uri}',
    limitation: 'Snapshot of four exact, uncompressed base64 Data URIs per file. Not a search across arbitrary wrappers, URI parameters, attachments, encodings or compressed representations. Not a guarantee of availability at transaction inclusion. Not a marketplace deposit or expedition assignment.',
    summary: { total: results.length, canonicalFound, canonicalNotFound, canonicalUnavailable: results.length - canonicalFound - canonicalNotFound },
    targets: results,
  };
  if (process.argv.includes('--save-snapshot') || prior) {
    await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n', { flag: prior ? 'w' : 'wx' });
    console.log(JSON.stringify({ output, ...snapshot.summary }));
  } else console.log(JSON.stringify(snapshot, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error); process.exitCode = 1; });
