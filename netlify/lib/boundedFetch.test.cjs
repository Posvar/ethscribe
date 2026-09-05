const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchBoundedJson, fetchBoundedText } = require('./boundedFetch');

test('parses a bounded JSON response without using the unbounded response.json method', async () => {
  const response = Response.json({ result: 'verified' });
  response.json = () => { throw new Error('unbounded_json_must_not_run'); };
  const result = await fetchBoundedJson('https://example.com/record', { maxBytes: 100 }, async () => response);
  assert.deepEqual(result, { result: 'verified' });
});

for (const declaredLength of [undefined, '1']) {
  test(`bounds bytes actually streamed even with Content-Length ${declaredLength}`, async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('abc'));
        controller.enqueue(new TextEncoder().encode('def'));
      },
      cancel() { cancelled = true; },
    });
    const headers = declaredLength ? { 'content-length': declaredLength } : {};
    await assert.rejects(
      fetchBoundedText('https://example.com/record', { maxBytes: 5 }, async () => new Response(stream, { headers })),
      /upstream_response_too_large/,
    );
    assert.equal(cancelled, true);
  });
}

test('enforces its deadline even when an upstream never returns response headers', async () => {
  let signal;
  await assert.rejects(
    fetchBoundedJson('https://example.com/record', { timeoutMs: 15 }, async (_url, options) => {
      signal = options.signal;
      return new Promise(() => {});
    }),
    /upstream_timeout/,
  );
  assert.equal(signal.aborted, true);
});

test('enforces the same deadline across the response body and cancels a stalled stream', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('{')); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(
    fetchBoundedJson('https://example.com/record', { timeoutMs: 15 }, async () => new Response(stream)),
    /upstream_timeout/,
  );
  assert.equal(cancelled, true);
});

test('preserves upstream HTTP status and reports malformed JSON', async () => {
  await assert.rejects(
    fetchBoundedJson('https://example.com/record', {}, async () => new Response('missing', { status: 404 })),
    (error) => error.message === 'upstream_http_error' && error.status === 404,
  );
  await assert.rejects(
    fetchBoundedJson('https://example.com/record', {}, async () => new Response('{')),
    /upstream_invalid_json/,
  );
});
