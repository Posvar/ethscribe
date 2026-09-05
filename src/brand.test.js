import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('the site mark contains the shaded shovel without a background disc or outline', () => {
  const svg = readFileSync(resolve(process.cwd(), 'public/newicon.svg'), 'utf8');
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(document.querySelector('parsererror')).toBeNull();
  expect(document.querySelector('circle, ellipse, rect')).toBeNull();
  const paths = [...document.querySelectorAll('path')];
  expect(paths).toHaveLength(6);
  paths.forEach((path) => {
    expect(path.getAttribute('fill')).toMatch(/^url\(#fill[0-5]\)$/);
    expect(path.hasAttribute('stroke')).toBe(false);
  });
});
