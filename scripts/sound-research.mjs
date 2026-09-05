// Local binary research only. Does not execute historical software or send transactions.
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function inspectWave(bytes) {
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Not a RIFF WAVE file');
  const declaredSize = bytes.readUInt32LE(4) + 8;
  if (declaredSize > bytes.length) throw new Error('Truncated RIFF');
  const chunks = [];
  let format = null, dataBytes = 0;
  for (let offset = 12; offset + 8 <= declaredSize;) {
    const id = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > declaredSize) throw new Error(`Truncated ${id} chunk`);
    chunks.push({ id, offset, bytes: size, sha256: sha256(bytes.subarray(start, start + size)) });
    if (id === 'fmt ') {
      if (size < 16) throw new Error('Short format chunk');
      format = { codec: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2), sampleRate: bytes.readUInt32LE(start + 4), byteRate: bytes.readUInt32LE(start + 8), blockAlign: bytes.readUInt16LE(start + 12), bitsPerSample: bytes.readUInt16LE(start + 14) };
    }
    if (id === 'data') dataBytes += size;
    offset = start + size + (size % 2);
  }
  return { bytes: bytes.length, sha256: sha256(bytes), declaredSize, trailingBytes: bytes.length - declaredSize, ...format, dataBytes, durationSeconds: format?.codec === 1 && format.byteRate ? dataBytes / format.byteRate : null, chunks };
}

function scratchPath(relative) {
  const root = resolve('.tools/research/sounds'), result = resolve(root, relative);
  if (!result.startsWith(root + sep)) throw new Error('Research outputs must stay inside ignored sound scratch directory');
  return result;
}

async function download(url, name) {
  const output = scratchPath(name);
  await mkdir(dirname(output), { recursive: true });
  const response = await fetch(url, { signal: AbortSignal.timeout(240000) });
  if (!response.ok) throw new Error(`Download HTTP ${response.status}: ${url}`);
  const hash = createHash('sha256'), hash512 = createHash('sha512');
  let size = 0;
  await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, encoding, callback) { size += chunk.length; if (size > 900_000_000) return callback(new Error('Download size bound exceeded')); hash.update(chunk); hash512.update(chunk); callback(null, chunk); } }), createWriteStream(output, { flags: 'wx' }));
  console.log(JSON.stringify({ sourceUrl: url, resolvedUrl: response.url, output, bytes: size, sha256: hash.digest('hex'), sha512: hash512.digest('hex') }, null, 2));
}

async function main([command, ...args]) {
  if (command === 'wav') {
    for (const file of args) console.log(JSON.stringify({ file, ...inspectWave(await readFile(file)) }, null, 2));
  } else if (command === 'download') {
    await download(args[0], args[1]);
  } else if (command === 'winworld') {
    const html = await (await fetch(args[0])).text();
    console.log([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(x => /download|mirror|library|.7z|.zip/.test(x)));
  } else if (command === 'ethscription') {
    const id = args[0];
    if (!/^0x[0-9a-f]{64}$/i.test(id)) throw new Error('Invalid Ethscription ID');
    const sourceUrl = `https://api.ethscriptions.com/v2/ethscriptions/${id}`;
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Indexer HTTP ${response.status}`);
    const json = await response.json(), record = json.result || json;
    if (record.transaction_hash?.toLowerCase() !== id.toLowerCase()) throw new Error('Indexer returned wrong ID');
    const uri = record.content_uri, comma = uri?.indexOf(',');
    if (comma < 0 || !uri.slice(0, comma).endsWith(';base64')) throw new Error('Expected base64 Data URI');
    const bytes = Buffer.from(uri.slice(comma + 1), 'base64');
    const metadata = { sourceUrl, checkedAt: new Date().toISOString(), id, number: record.ethscription_number, creator: record.creator, currentOwner: record.current_owner, createdAt: new Date(Number(record.block_timestamp) * 1000).toISOString(), prefix: uri.slice(0, comma + 1), protocolSha256: sha256(Buffer.from(uri)), ...inspectWave(bytes) };
    if (record.content_sha.toLowerCase().replace(/^0x/, '') !== metadata.protocolSha256) throw new Error('Protocol content hash mismatch');
    const destination = scratchPath(`founder/${id}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(`${destination}.wav`, bytes, { flag: 'wx' });
    await writeFile(`${destination}.json`, JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(metadata, null, 2));
  } else throw new Error('Use wav FILE..., download URL scratch-relative-path, winworld PAGE, or ethscription ID');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2)).catch(error => { console.error(error); process.exitCode = 1; });
