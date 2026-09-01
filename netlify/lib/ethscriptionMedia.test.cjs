const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEthscriptionMedia, parseDataUri } = require('./ethscriptionMedia');

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
    return {
      ok: true,
      json: async () => ({ result: { transaction_hash: id, content_uri: 'data:audio/wav;base64,UklGRg==' } }),
    };
  });
  assert.equal(media.contentType, 'audio/wav');
  assert.equal(media.body.toString('utf8'), 'RIFF');
});

test('rejects malformed and oversized previews', () => {
  assert.throws(() => parseDataUri('data:image/png;base64,%%%'), /invalid_base64/);
  const oversized = Buffer.alloc(2_000_001).toString('base64');
  assert.throws(() => parseDataUri(`data:image/png;base64,${oversized}`), /unsupported_preview_size/);
});
