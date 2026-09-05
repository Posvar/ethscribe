import {
  buildCreateEthscriptionTransaction,
  buildDataUri,
  buildFindingReceiptDataUri,
  buildFindingAssignment,
  buildWrapperChecks,
  CANONICAL_XPM_MEDIA_TYPE,
  CANONICAL_WAV_MEDIA_TYPE,
  checkExpeditionTarget,
  checkProtocolExistence,
  findingAssignmentMessage,
  inspectFile,
  matchesMediaSignature,
  mediaTypeForFile,
  publishFinding,
  waitForEthscriptionRecord,
  waitForVerifiedCustody,
  XPM_MEDIA_TYPE_CANDIDATES,
  WAV_MEDIA_TYPE_CANDIDATES,
} from './ethscriptionCreation';
import { MARKET_ADDRESS } from './marketConfig';

const account = '0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba';

beforeAll(() => {
  if (!global.TextEncoder) {
    const { TextEncoder, TextDecoder } = require('node:util');
    Object.defineProperty(global, 'TextEncoder', { value: TextEncoder });
    Object.defineProperty(global, 'TextDecoder', { value: TextDecoder });
  }
  if (!global.crypto?.subtle) {
    Object.defineProperty(global, 'crypto', { value: require('node:crypto').webcrypto });
  }
});

test('hashes exact bytes separately from the complete protocol Data URI', async () => {
  const bytes = Uint8Array.from([97, 98, 99]);
  const file = {
    name: 'artifact.xpm',
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer,
  };
  const inspected = await inspectFile(file, CANONICAL_XPM_MEDIA_TYPE);

  expect(inspected.rawSha256).toBe('0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(inspected.dataUri).toBe('data:image/x-xpixmap;base64,YWJj');
  expect(inspected.dataUriPrefix).toBe('data:image/x-xpixmap;base64,');
  expect(inspected.protocolContentSha256).not.toBe(inspected.rawSha256);
  expect(inspected.receiptDataUri).toBe(buildFindingReceiptDataUri(inspected.protocolContentSha256));
  expect(inspected.receiptContentSha256).toMatch(/^0x[a-f0-9]{64}$/);
});

test('checks common file signatures without treating a MIME label as proof', () => {
  expect(matchesMediaSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true);
  expect(matchesMediaSignature(Uint8Array.from([97, 98, 99]), 'image/png')).toBe(false);
  expect(matchesMediaSignature(new TextEncoder().encode('/* XPM */'), CANONICAL_XPM_MEDIA_TYPE)).toBe(true);
});

function wavFixture() {
  const bytes = new Uint8Array(48);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => bytes.set(new TextEncoder().encode(value), offset);
  text(0, 'RIFF');
  view.setUint32(4, 40, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, 4, true);
  bytes.set([0x80, 0x81, 0x7f, 0x80], 44);
  return bytes;
}

test('automatically fixes WAV media type and preserves the complete RIFF file byte for byte', async () => {
  const bytes = wavFixture();
  const file = { name: 'MESSAGE.WAV', type: 'audio/x-wav', size: bytes.length, arrayBuffer: async () => bytes.buffer };
  expect(mediaTypeForFile(file)).toBe(CANONICAL_WAV_MEDIA_TYPE);
  expect(mediaTypeForFile({ ...file, name: 'renamed.bin', type: 'text/plain' }, { format: 'WAV' })).toBe(CANONICAL_WAV_MEDIA_TYPE);
  const inspected = await inspectFile(file, mediaTypeForFile(file));
  expect(inspected.signatureMatchesMediaType).toBe(true);
  expect(inspected.dataUriPrefix).toBe('data:audio/wav;base64,');
  expect(Uint8Array.from(atob(inspected.base64), (character) => character.charCodeAt(0))).toEqual(bytes);
  expect(matchesMediaSignature(new TextEncoder().encode('RIFFnot a WAVE file'), 'audio/wav')).toBe(false);
  expect(matchesMediaSignature(new TextEncoder().encode('not a WAV'), 'audio/x-wav')).toBe(false);
  const checks = await buildWrapperChecks(inspected, WAV_MEDIA_TYPE_CANDIDATES);
  expect(checks.map(({ dataUriPrefix }) => dataUriPrefix)).toEqual([
    'data:audio/wav;base64,', 'data:audio/x-wav;base64,', 'data:audio/wave;base64,', 'data:audio/vnd.wave;base64,',
  ]);
  expect(checks.filter(({ canonical }) => canonical)).toHaveLength(1);
  expect(new Set(checks.map(({ protocolContentSha256 }) => protocolContentSha256)).size).toBe(4);
});

test('rejects a one-byte-altered sound locally and still requires server verification for an exact match', async () => {
  const bytes = wavFixture();
  const file = { name: 'message.wav', size: bytes.length, arrayBuffer: async () => bytes.buffer };
  const inspected = await inspectFile(file, CANONICAL_WAV_MEDIA_TYPE);
  const artifact = { id: 'icq-message', expeditionId: 'youve-got-history', format: 'WAV', sha256: inspected.rawSha256, bytes: bytes.length };
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ result: {
    expeditionId: artifact.expeditionId, targetId: artifact.id, eligible: true, validation: 'exact',
  } }) }));
  bytes[47] ^= 1;
  const altered = await inspectFile(file, CANONICAL_WAV_MEDIA_TYPE);
  expect(altered.signatureMatchesMediaType).toBe(true);
  await expect(checkExpeditionTarget(artifact, altered, fetchImpl)).resolves.toMatchObject({ eligible: false, validation: 'mismatch' });
  expect(fetchImpl).not.toHaveBeenCalled();
  await expect(checkExpeditionTarget(artifact, inspected, fetchImpl)).resolves.toMatchObject({ eligible: true });
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
    expeditionId: artifact.expeditionId, targetId: artifact.id, rawSha256: inspected.rawSha256,
    protocolContentSha256: inspected.protocolContentSha256, byteLength: 48, dataUriPrefix: 'data:audio/wav;base64,',
  });
  await expect(checkExpeditionTarget({ ...artifact, sha256: null }, inspected, fetchImpl)).rejects.toThrow(/no verified byte commitment/);
});

test.each([undefined, 'lost-pixels-of-satoshi'])('rejects a sound target response scoped to the wrong expedition (%s)', async (expeditionId) => {
  const inspection = { rawSha256: `0x${'11'.repeat(32)}`, byteLength: 48, dataUriPrefix: 'data:audio/wav;base64,' };
  const artifact = { id: 'message', expeditionId: 'youve-got-history', format: 'WAV', sha256: inspection.rawSha256, bytes: 48 };
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ result: { expeditionId, targetId: 'message', eligible: true } }) }));
  await expect(checkExpeditionTarget(artifact, inspection, fetchImpl)).rejects.toThrow(/invalid response/);
});

test('signs a sound Finding against Expedition 002, never the default Satoshi expedition', () => {
  const assignment = buildFindingAssignment({
    artifact: { id: 'icq-message', expeditionId: 'youve-got-history' },
    inspection: { rawSha256: `0x${'11'.repeat(32)}`, protocolContentSha256: `0x${'22'.repeat(32)}`, dataUriPrefix: 'data:audio/wav;base64,', byteLength: 48, filename: 'message.wav' },
    ethscriptionId: `0x${'33'.repeat(32)}`, account, claimSummary: 'Original shipping sound', sourceUrl: 'https://example.com/installer',
  });
  expect(assignment.expeditionId).toBe('youve-got-history');
  expect(findingAssignmentMessage(assignment)).toContain('Expedition: youve-got-history');
  expect(findingAssignmentMessage(assignment)).not.toContain('lost-pixels-of-satoshi');
});

test('checks the canonical XPM wrapper and explicit known alternates', async () => {
  const checks = await buildWrapperChecks({ mediaType: CANONICAL_XPM_MEDIA_TYPE, base64: 'YWJj' }, XPM_MEDIA_TYPE_CANDIDATES);
  expect(checks.map(({ dataUriPrefix }) => dataUriPrefix)).toEqual([
    'data:image/x-xpixmap;base64,',
    'data:image/x-xpm;base64,',
    'data:image/xpm;base64,',
    'data:text/x-xpm;base64,',
  ]);

  const fetchImpl = jest.fn(async (url) => ({
    ok: true,
    json: async () => ({ result: {
      exists: url.includes(checks[1].protocolContentSha256),
      ethscription: url.includes(checks[1].protocolContentSha256)
        ? { transaction_hash: `0x${'aa'.repeat(32)}`, content_sha: checks[1].protocolContentSha256 }
        : null,
    } }),
  }));
  const results = await checkProtocolExistence(checks, fetchImpl);
  expect(results[1].exists).toBe(true);
  expect(fetchImpl).toHaveBeenCalledWith(expect.stringMatching('/api/ethscriptions/exists/0x'), expect.any(Object));
});

test.each([
  {},
  { result: {} },
  { result: { exists: 'false' } },
  { result: { exists: true, ethscription: null } },
  { result: { exists: true, ethscription: { transaction_hash: `0x${'aa'.repeat(32)}`, content_sha: `0x${'bb'.repeat(32)}` } } },
])('does not report malformed duplicate responses as safe to create: %j', async (payload) => {
  const checks = [{ protocolContentSha256: `0x${'cc'.repeat(32)}` }];
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => payload }));
  await expect(checkProtocolExistence(checks, fetchImpl)).rejects.toThrow(/incomplete or inconsistent/);
});

test('checks custody by exact asset instead of the first wallet inventory page', async () => {
  const id = `0x${'dd'.repeat(32)}`;
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ result: {
    seller: account.toLowerCase(),
    ethscription: { transactionHash: id },
    custody: { verified: true, custodyKind: 'registered_deposit' },
    listing: { active: false },
  } }) }));
  await expect(waitForVerifiedCustody(account, id, { fetchImpl })).resolves.toMatchObject({ transactionHash: id, custody: { verified: true } });
  expect(fetchImpl).toHaveBeenCalledWith(`/api/market/artifact?id=${id}`, expect.any(Object));
});

test('checks a candidate against a sealed expedition target without requesting its expected hash', async () => {
  const fetchImpl = jest.fn(async (_url, options) => ({
    ok: true,
    json: async () => ({ result: { targetId: 'november-20-xpm', eligible: true, validation: 'exact' } }),
  }));
  const result = await checkExpeditionTarget({ id: 'november-20-xpm' }, {
    rawSha256: `0x${'11'.repeat(32)}`,
    byteLength: 4193,
    dataUriPrefix: 'data:image/x-xpixmap;base64,',
  }, fetchImpl);

  expect(result.validation).toBe('exact');
  const [url, request] = fetchImpl.mock.calls[0];
  expect(url).toBe('/api/targets/check');
  expect(request.method).toBe('POST');
  expect(request.body).not.toContain('expected');
});

test('creates directly to the market and signs a deterministic assignment message', () => {
  const dataUri = buildDataUri('image/png', 'YWJj');
  expect(buildCreateEthscriptionTransaction(account, dataUri)).toMatchObject({
    from: account,
    to: MARKET_ADDRESS,
    value: '0x0',
  });

  const assignment = buildFindingAssignment({
    artifact: { id: 'lost-bc-png' },
    inspection: {
      rawSha256: `0x${'11'.repeat(32)}`,
      protocolContentSha256: `0x${'22'.repeat(32)}`,
      dataUriPrefix: 'data:image/png;base64,',
      byteLength: 3,
      filename: 'candidate.png',
    },
    ethscriptionId: `0x${'33'.repeat(32)}`,
    account,
    claimSummary: ' Primary-source candidate ',
    sourceUrl: 'https://example.com/source ',
  });
  expect(assignment.custodyContract).toBe(MARKET_ADDRESS.toLowerCase());
  expect(findingAssignmentMessage(assignment)).toContain('Target: lost-bc-png');
  expect(findingAssignmentMessage(assignment)).toContain('Data URI prefix: data:image/png;base64,');
});

test('retries a signed Finding while direct-vault custody replicas reconcile', async () => {
  const published = { findingId: 'november-20-xpm--verified' };
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'custody_unverified', message: 'Custody is still reconciling.' }),
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'custody_unverified', message: 'Custody is still reconciling.' }),
    })
    .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ result: published }) });

  await expect(publishFinding({}, 'message', 'signature', fetchImpl, { retryDelays: [0, 0] })).resolves.toEqual(published);
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(fetchImpl.mock.calls[0][1].body).toBe(fetchImpl.mock.calls[2][1].body);
});

test('does not retry a rejected Finding whose failure is not transient custody lag', async () => {
  const fetchImpl = jest.fn(async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: 'target_mismatch', message: 'The bytes do not match.' }),
  }));

  await expect(publishFinding({}, 'message', 'signature', fetchImpl, { retryDelays: [0, 0] })).rejects.toThrow('The bytes do not match.');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('recognizes the guaranteed Finding Receipt when canonical creation loses a race', async () => {
  const attemptedId = `0x${'55'.repeat(32)}`;
  const canonicalSha = `0x${'66'.repeat(32)}`;
  const receiptUri = buildFindingReceiptDataUri(canonicalSha);
  const receiptSha = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(receiptUri));
  const receiptContentSha256 = `0x${Array.from(new Uint8Array(receiptSha), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  const fetchImpl = jest.fn(async (url) => {
    if (url.includes(attemptedId)) return {
      ok: true,
      json: async () => ({ result: {
        transaction_hash: attemptedId,
        content_sha: receiptContentSha256,
        creator: MARKET_ADDRESS,
        initial_owner: account,
        current_owner: account,
      } }),
    };
    return { ok: false, status: 404 };
  });

  await expect(waitForEthscriptionRecord(attemptedId, {
    owner: account,
    protocolContentSha256: canonicalSha,
    receiptContentSha256,
  }, { fetchImpl, pollMs: 0, timeoutMs: 20 })).resolves.toMatchObject({ creationOutcome: 'receipt' });
});
