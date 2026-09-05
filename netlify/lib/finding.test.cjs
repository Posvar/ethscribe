const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Wallet } = require('ethers');
const { MARKET_ADDRESS } = require('./market');
const {
  FindingError,
  assignmentMessage,
  decodeVerifiedContentUri,
  fetchEthscription,
  listFindings,
  publicFinding,
  storeFinding,
  validateAssignment,
  verifyAndStoreFinding,
} = require('./finding');

function hash(value) {
  return `0x${createHash('sha256').update(value).digest('hex')}`;
}

const now = Date.parse('2026-08-31T18:00:00.000Z');
const wallet = new Wallet(`0x${'12'.repeat(32)}`);
const raw = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('lost pixels candidate'),
]);
const contentUri = `data:image/png;base64,${raw.toString('base64')}`;
const ethscriptionId = `0x${'ab'.repeat(32)}`;

function assignment(overrides = {}) {
  return {
    schemaVersion: 1,
    documentType: 'finding',
    expeditionId: 'lost-pixels-of-satoshi',
    targetId: 'lost-bc-png',
    ethscriptionId,
    rawSha256: hash(raw),
    protocolContentSha256: hash(Buffer.from(contentUri, 'utf8')),
    dataUriPrefix: 'data:image/png;base64,',
    byteLength: raw.length,
    filename: 'bitcoin20x20.png',
    authorAddress: wallet.address.toLowerCase(),
    custodyContract: MARKET_ADDRESS.toLowerCase(),
    claimSummary: 'Recovered from a reproducible primary-source archive.',
    sourceReferences: ['https://example.com/archive'],
    createdAt: new Date(now).toISOString(),
    ...overrides,
  };
}

test('verifies signature, exact indexed bytes, frozen wrapper, and reconciled custody before storage', async () => {
  const value = assignment();
  const message = assignmentMessage(value);
  const signature = await wallet.signMessage(message);
  let stored;
  const result = await verifyAndStoreFinding({ assignment: value, message, signature }, {
    now,
    fetchImpl: async () => Response.json({ result: {
        transaction_hash: ethscriptionId,
        content_sha: value.protocolContentSha256,
        content_uri: contentUri,
        current_owner: MARKET_ADDRESS,
        previous_owner: wallet.address,
        creator: `0x${'34'.repeat(20)}`,
        block_timestamp: 1687470000,
        ethscription_number: 174464,
    } }),
    getArtifactMarket: async (id) => ({
      ethscription: { transactionHash: id },
      seller: wallet.address.toLowerCase(),
      custody: { verified: true },
    }),
    storeFinding: async (path, record) => { stored = { path, record }; },
  });

  assert.match(result.findingId, /^lost-bc-png--/);
  assert.equal(stored.path, result.storagePath);
  assert.equal(stored.record.verification.marketCustody, 'verified');
  assert.equal(stored.record.verification.frozenTargetWrapper, 'data:image/png;base64,');
  assert.equal(result.targetId, 'lost-bc-png');
  assert.equal(result.ethscriptionId, ethscriptionId);
  assert.equal(result.contentUri, contentUri);
  assert.equal(result.ethscriptionCreator, `0x${'34'.repeat(20)}`);
  assert.notEqual(result.ethscriptionCreator, result.authorAddress);
  assert.equal(result.ethscriptionTimestamp, 1687470000);
  assert.equal(result.ethscriptionNumber, 174464);
});

test('rejects non-frozen wrappers and known-target hash mismatches', () => {
  assert.throws(
    () => validateAssignment(assignment({ dataUriPrefix: 'data:image/x-png;base64,' }), now),
    (error) => error instanceof FindingError && error.code === 'wrong_wrapper',
  );
  assert.throws(
    () => validateAssignment(assignment({
      targetId: 'november-single-xpm',
      dataUriPrefix: 'data:image/x-xpixmap;base64,',
    }), now, {
      EXPEDITION_001_TARGET_HASHES: JSON.stringify({ 'november-single-xpm': '11'.repeat(32) }),
    }),
    (error) => error instanceof FindingError && error.code === 'target_mismatch',
  );
});

test('rejects a valid signature from the wrong wallet', async () => {
  const value = assignment();
  const message = assignmentMessage(value);
  const impostor = Wallet.createRandom();
  const signature = await impostor.signMessage(message);
  await assert.rejects(
    verifyAndStoreFinding({ assignment: value, message, signature }, { now }),
    (error) => error instanceof FindingError && error.code === 'wrong_signer',
  );
});

test('writes immutable Azure blobs without exposing credentials in the record', async () => {
  let request;
  await storeFinding('hunts/test/findings/id/finding.json', { safe: true }, async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201 };
  }, {
    AZURE_STORAGE_ACCOUNT_NAME: 'ethscribe',
    AZURE_STORAGE_CONTAINER: 'ethscribe-assets',
    AZURE_STORAGE_SAS_TOKEN: '?sv=secret',
  });
  assert.equal(request.options.headers['if-none-match'], '*');
  assert.equal(request.options.headers['x-ms-blob-type'], 'BlockBlob');
  assert.match(request.url, /^https:\/\/ethscribe\.blob\.core\.windows\.net\/ethscribe-assets\/hunts\/test/);
  assert.doesNotMatch(request.options.body, /secret/);
});

test('lists only safe verified Finding projections from immutable storage', async () => {
  const value = assignment({ targetId: 'lost-bc-png' });
  const record = {
    schemaVersion: 1,
    documentType: 'verified-finding',
    findingId: `lost-bc-png--${ethscriptionId.slice(2)}`,
    assignment: value,
    message: 'private signed message is not returned',
    signature: `0x${'44'.repeat(65)}`,
    verifiedAt: new Date(now).toISOString(),
    verification: { indexedContentUri: contentUri },
  };
  const blobName = `hunts/lost-pixels-of-satoshi/findings/${record.findingId}/finding.json`;
  const records = await listFindings(async (url) => {
    if (String(url).includes('comp=list')) {
      return new Response(`<EnumerationResults><Blobs><Blob><Name>${blobName}</Name></Blob></Blobs></EnumerationResults>`);
    }
    return Response.json(record);
  }, {
    AZURE_STORAGE_ACCOUNT_NAME: 'ethscribe',
    AZURE_STORAGE_CONTAINER: 'ethscribe-assets',
    AZURE_STORAGE_SAS_TOKEN: '?sv=secret',
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].targetId, 'lost-bc-png');
  assert.equal(records[0].contentUri, '');
  assert.equal(records[0].signature, undefined);
  assert.equal(records[0].message, undefined);
});

const listTestEnv = {
  AZURE_STORAGE_ACCOUNT_NAME: 'ethscribe',
  AZURE_STORAGE_CONTAINER: 'ethscribe-assets',
  AZURE_STORAGE_SAS_TOKEN: '?sv=test-only',
};

function storedFinding(targetId, number, submittedAt = now) {
  const id = `0x${number.toString(16).padStart(64, '0')}`;
  const findingId = `${targetId}--${id.slice(2)}`;
  return {
    name: `hunts/lost-pixels-of-satoshi/findings/${findingId}/finding.json`,
    modifiedAt: new Date(submittedAt).toUTCString(),
    record: {
      documentType: 'verified-finding',
      findingId,
      assignment: assignment({ targetId, ethscriptionId: id }),
      verifiedAt: new Date(submittedAt).toISOString(),
      verification: { indexedContentUri: contentUri },
    },
  };
}

function listingXml(entries, nextMarker = '') {
  const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<EnumerationResults><Blobs>${entries.map((entry) => `<Blob><Name>${entry.name}</Name><Properties><Last-Modified>${entry.modifiedAt}</Last-Modified></Properties></Blob>`).join('')}</Blobs><NextMarker>${escapeXml(nextMarker)}</NextMarker></EnumerationResults>`;
}

test('recovery candidate volume cannot evict exact targets, including targets on later Azure pages', async () => {
  const firstExact = storedFinding('const-16-xpm', 1, now - 100_000);
  const laterExact = storedFinding('november-20-xpm', 2, now - 90_000);
  const candidates = Array.from({ length: 51 }, (_, index) => storedFinding('lost-bc-png', index + 10, now + index * 1_000));
  const entries = new Map([firstExact, laterExact, ...candidates].map((entry) => [entry.name, entry]));
  const requestedMarkers = [];
  const bodyRequests = [];
  let activeReads = 0;
  let peakReads = 0;
  const marker = 'opaque+marker/&lt;';

  const result = await listFindings(async (url) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get('comp') === 'list') {
      requestedMarkers.push(parsed.searchParams.get('marker'));
      return new Response(requestedMarkers.length === 1
        ? listingXml([firstExact, ...candidates], marker)
        : listingXml([laterExact]));
    }
    const name = decodeURIComponent(parsed.pathname.slice('/ethscribe-assets/'.length));
    bodyRequests.push(name);
    activeReads += 1;
    peakReads = Math.max(peakReads, activeReads);
    await new Promise((resolve) => setImmediate(resolve));
    activeReads -= 1;
    return Response.json(entries.get(name).record);
  }, listTestEnv);

  assert.deepEqual(requestedMarkers, [null, marker]);
  assert.equal(result.length, 52);
  assert.deepEqual(result.filter((record) => record.validationMode === 'exact').map((record) => record.targetId).sort(), ['const-16-xpm', 'november-20-xpm']);
  assert.equal(result.filter((record) => record.validationMode === 'provenance').length, 50);
  assert.ok(result.filter((record) => record.validationMode === 'provenance').every((record) => record.contentUri === ''));
  assert.ok(result.filter((record) => record.validationMode === 'exact').every((record) => record.contentUri === contentUri));
  assert.equal(result.some((record) => record.ethscriptionId === candidates[0].record.assignment.ethscriptionId), false);
  assert.equal(bodyRequests.includes(candidates[0].name), false);
  assert.equal(bodyRequests.length, 52);
  assert.ok(peakReads <= 6, `Expected at most 6 concurrent body reads, received ${peakReads}`);
});

test('the candidate limit is separate from permanent targets and continuation can follow an empty Azure page', async () => {
  const exact = storedFinding('november-single-xpm', 1);
  const candidates = [storedFinding('lost-bc-png', 2), storedFinding('lost-bc-png', 3, now + 1_000)];
  const records = new Map([exact, ...candidates].map((entry) => [entry.name, entry.record]));
  let pages = 0;
  const result = await listFindings(async (url) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get('comp') === 'list') {
      pages += 1;
      return new Response(pages === 1 ? listingXml([], 'next') : listingXml([exact, ...candidates]));
    }
    return Response.json(records.get(parsed.pathname.slice('/ethscribe-assets/'.length)));
  }, listTestEnv, 1);

  assert.equal(pages, 2);
  assert.equal(result.length, 2);
  assert.equal(result[0].ethscriptionId, candidates[1].record.assignment.ethscriptionId);
  assert.equal(result[1].targetId, 'november-single-xpm');
});

test('a failed exact record read returns an error instead of a misleading partial accession index', async () => {
  const exact = storedFinding('november-20-xpm', 1);
  await assert.rejects(listFindings(async (url) => String(url).includes('comp=list')
    ? new Response(listingXml([exact]))
    : new Response('unavailable', { status: 503 }), listTestEnv),
  (error) => error instanceof FindingError && error.code === 'storage_unavailable');
});

test('repeated Azure continuation markers fail instead of looping forever', async () => {
  let pages = 0;
  await assert.rejects(listFindings(async () => {
    pages += 1;
    return new Response(listingXml([], 'repeated'));
  }, listTestEnv), (error) => error instanceof FindingError && /repeated continuation marker/.test(error.message));
  assert.equal(pages, 2);
});

test('unsigned upload filenames cannot impersonate a different public target filename', () => {
  const fixture = storedFinding('november-20-xpm', 1);
  fixture.record.assignment.filename = 'Satoshi-original-secret-masterpiece.png';
  assert.equal(publicFinding(fixture.record).filename, 'bitcoin20.xpm');
  fixture.record.assignment.filename = 'another-local-name.xpm';
  assert.equal(publicFinding(fixture.record).filename, 'bitcoin20.xpm');
});

test('oversized Finding content is rejected before allocating its decoded payload', () => {
  assert.throws(() => decodeVerifiedContentUri(`data:image/png;base64,${'A'.repeat(666_672)}`, 'data:image/png;base64,'),
    (error) => error instanceof FindingError && error.code === 'invalid_size');
});

test('an oversized official record is rejected at the response boundary', async () => {
  await assert.rejects(fetchEthscription(ethscriptionId, async () => new Response('{}', {
    headers: { 'content-length': '1000001' },
  })), (error) => error instanceof FindingError && error.code === 'indexer_unavailable');
});
