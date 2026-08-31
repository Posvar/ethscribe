import { useEffect, useRef, useState } from 'react';

function decodeCString(value) {
  return value
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

function parseColor(value) {
  if (!value || value.toLowerCase() === 'none') return [0, 0, 0, 0];

  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return [
      parseInt(value[1] + value[1], 16),
      parseInt(value[2] + value[2], 16),
      parseInt(value[3] + value[3], 16),
      255,
    ];
  }

  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return [
      parseInt(value.slice(1, 3), 16),
      parseInt(value.slice(3, 5), 16),
      parseInt(value.slice(5, 7), 16),
      255,
    ];
  }

  if (/^#[0-9a-f]{12}$/i.test(value)) {
    return [
      parseInt(value.slice(1, 3), 16),
      parseInt(value.slice(5, 7), 16),
      parseInt(value.slice(9, 11), 16),
      255,
    ];
  }

  return [0, 0, 0, 255];
}

export function parseXpm(source) {
  const strings = [...source.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) =>
    decodeCString(match[1]));
  const headerIndex = strings.findIndex((line) => /^\d+\s+\d+\s+\d+\s+\d+/.test(line));

  if (headerIndex < 0) throw new Error('XPM header not found');

  const [width, height, colorCount, charsPerPixel] = strings[headerIndex]
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map(Number);

  if (![width, height, colorCount, charsPerPixel].every(Number.isFinite)) {
    throw new Error('Invalid XPM header');
  }

  const palette = new Map();
  const colorLines = strings.slice(headerIndex + 1, headerIndex + 1 + colorCount);

  colorLines.forEach((line) => {
    const key = line.slice(0, charsPerPixel);
    const definition = line.slice(charsPerPixel);
    const match = definition.match(/(?:^|\s)c\s+(.+?)(?=\s+[mgsv]\s+|$)/i);
    palette.set(key, parseColor(match?.[1]?.trim()));
  });

  const rows = strings.slice(headerIndex + 1 + colorCount, headerIndex + 1 + colorCount + height);
  if (rows.length !== height) throw new Error('Incomplete XPM pixel data');

  return { width, height, charsPerPixel, palette, rows };
}

function paintXpm(canvas, parsed) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  canvas.width = parsed.width;
  canvas.height = parsed.height;
  const image = context.createImageData(parsed.width, parsed.height);

  parsed.rows.forEach((row, y) => {
    for (let x = 0; x < parsed.width; x += 1) {
      const key = row.slice(x * parsed.charsPerPixel, (x + 1) * parsed.charsPerPixel);
      const [red, green, blue, alpha] = parsed.palette.get(key) || [0, 0, 0, 0];
      const offset = (y * parsed.width + x) * 4;
      image.data[offset] = red;
      image.data[offset + 1] = green;
      image.data[offset + 2] = blue;
      image.data[offset + 3] = alpha;
    }
  });

  context.putImageData(image, 0, 0);
}

export default function XpmPreview({ source, label, className = '' }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();

    async function renderPreview() {
      try {
        setState('loading');
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) throw new Error(`XPM request failed: ${response.status}`);
        const parsed = parseXpm(await response.text());
        if (canvasRef.current) paintXpm(canvasRef.current, parsed);
        setState('ready');
      } catch (error) {
        if (error.name !== 'AbortError') setState('error');
      }
    }

    renderPreview();
    return () => controller.abort();
  }, [source]);

  return (
    <div className={`xpm-preview ${className}`} role="img" aria-label={label}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {state !== 'ready' && (
        <span>{state === 'error' ? 'SOURCE PREVIEW UNAVAILABLE' : 'DECODING XPM…'}</span>
      )}
    </div>
  );
}
