import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { TextDecoder, TextEncoder } from 'node:util';
import { vi } from 'vitest';

// Keep the existing test files readable while the application moves from
// CRA/Jest to Vite/Vitest. Their mock APIs are intentionally compatible.
globalThis.jest = vi;
configure({ asyncUtilTimeout: 10000 });

if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder });
  Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder });
}
