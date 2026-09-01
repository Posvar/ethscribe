import {
  buildCreateEthscriptionTransaction,
  buildDataUri,
  buildFindingReceiptDataUri,
  buildFindingAssignment,
  buildWrapperChecks,
  CANONICAL_XPM_MEDIA_TYPE,
  checkExpeditionTarget,
  checkProtocolExistence,
  findingAssignmentMessage,
  inspectFile,
  matchesMediaSignature,
  publishFinding,
  waitForEthscriptionRecord,
  XPM_MEDIA_TYPE_CANDIDATES,
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
    json: async () => ({ result: { exists: url.includes(checks[1].protocolContentSha256), ethscription: null } }),
  }));
  const results = await checkProtocolExistence(checks, fetchImpl);
  expect(results[1].exists).toBe(true);
  expect(fetchImpl).toHaveBeenCalledWith(expect.stringMatching('/api/ethscriptions/exists/0x'), expect.any(Object));
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
