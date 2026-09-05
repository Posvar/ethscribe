const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEthscriptionMedia, parseDataUri, previewContentSecurityPolicy } = require('./ethscriptionMedia');

test('decodes base64 and percent-encoded Ethscription media', () => {
  const base64 = parseDataUri('data:image/png;base64,aGVsbG8=');
  assert.equal(base64.contentType, 'image/png');
  assert.equal(base64.body.toString('utf8'), 'hello');

  const text = parseDataUri('data:text/plain,hello%20world');
  assert.equal(text.contentType, 'text/plain');
  assert.equal(text.body.toString('utf8'), 'hello world');
});

test('loads only the requested official Ethscription record', async () => {
  const id = `0x${'a'.repeat(64)}`;
  const media = await loadEthscriptionMedia(id, async (url) => {
    assert.match(url, new RegExp(`${id}$`));
    return Response.json({ result: { transaction_hash: id, content_uri: 'data:audio/wav;base64,UklGRg==' } });
  });
  assert.equal(media.contentType, 'audio/wav');
  assert.equal(media.body.toString('utf8'), 'RIFF');
});

test('rejects an oversized upstream record before reading or parsing its body', async () => {
  const id = `0x${'a'.repeat(64)}`;
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  await assert.rejects(
    loadEthscriptionMedia(id, async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(body, { headers: { 'content-length': '8000001' } });
    }),
    /upstream_response_too_large/,
  );
  assert.equal(cancelled, true);
});

test('bounds decoded UTF-8 and percent-encoded media before allocating its output buffer', () => {
  assert.throws(() => parseDataUri(`data:text/plain,${'é'.repeat(1_000_001)}`), /unsupported_preview_size/);
  assert.throws(() => parseDataUri(`data:text/plain,${'%41'.repeat(2_000_001)}`), /unsupported_preview_size/);
  assert.throws(() => parseDataUri(`data:text/plain,${'a'.repeat(6_000_513)}`), /unsupported_preview_size/);
});

test('rejects malformed and oversized previews', () => {
  assert.throws(() => parseDataUri('data:image/png;base64,%%%'), /invalid_base64/);
  const oversized = Buffer.alloc(2_000_001).toString('base64');
  assert.throws(() => parseDataUri(`data:image/png;base64,${oversized}`), /unsupported_preview_size/);
});

test('allows static HTML presentation without allowing executable content', () => {
  const policy = previewContentSecurityPolicy('text/html');
  assert.match(policy, /style-src 'unsafe-inline'/);
  assert.match(policy, /sandbox/);
  assert.doesNotMatch(policy, /script-src/);
  assert.equal(previewContentSecurityPolicy('image/png'), "default-src 'none'; sandbox");
});
