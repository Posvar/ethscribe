// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

if (!global.TextEncoder) {
  const { TextDecoder, TextEncoder } = require('node:util');
  Object.defineProperty(global, 'TextEncoder', { value: TextEncoder });
  Object.defineProperty(global, 'TextDecoder', { value: TextDecoder });
}
