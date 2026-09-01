import { parseXpm } from './XpmPreview';

test('parses XPM source into an exact pixel map', () => {
  const parsed = parseXpm(`
    /* XPM */
    static char * test[] = {
      "2 1 2 1",
      ". c #ff0000",
      "  c None",
      ". "
    };
  `);

  expect(parsed.width).toBe(2);
  expect(parsed.height).toBe(1);
  expect(parsed.palette.get('.')).toEqual([255, 0, 0, 255]);
  expect(parsed.palette.get(' ')).toEqual([0, 0, 0, 0]);
  expect(parsed.rows).toEqual(['. ']);
});

test('rejects unsafe XPM preview dimensions', () => {
  expect(() => parseXpm('"999999 999999 1 1"')).toThrow(/safe preview limits/i);
});
