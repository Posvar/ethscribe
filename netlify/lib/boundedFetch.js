// Bound the upstream body before text/JSON decoding. Native fetch's json() and
// text() buffer the complete body, so a Content-Length check alone is not enough.
async function fetchBoundedText(url, options = {}, fetchImpl = fetch) {
  const { maxBytes = 1_000_000, timeoutMs = 8_000, headers = {} } = options;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('invalid_upstream_limits');
  }

  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('upstream_timeout');
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  const read = async () => {
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    controller.signal.throwIfAborted();
    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      const error = new Error('upstream_http_error');
      error.status = response.status;
      throw error;
    }

    const declaredLength = Number(response.headers?.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      response.body?.cancel().catch(() => {});
      throw new Error('upstream_response_too_large');
    }
    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new Error('upstream_body_unavailable');
    }

    const reader = response.body.getReader();
    const cancel = () => { reader.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        controller.signal.throwIfAborted();
        const { value, done } = await reader.read();
        controller.signal.throwIfAborted();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          cancel();
          throw new Error('upstream_response_too_large');
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks, total).toString('utf8');
    } finally {
      controller.signal.removeEventListener('abort', cancel);
      reader.releaseLock();
    }
  };

  try {
    return await Promise.race([read(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBoundedJson(url, options = {}, fetchImpl = fetch) {
  const text = await fetchBoundedText(url, options, fetchImpl);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('upstream_invalid_json');
  }
}

module.exports = { fetchBoundedJson, fetchBoundedText };
