const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function pngDimensions(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${file} must be a PNG`);
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

test('REQ-PWA-001: manifest identifies Spesa and local any/maskable icons', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

  assert.equal(manifest.name, 'Spesa');
  assert.equal(manifest.short_name, 'Spesa');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');

  const expected = [
    ['./icons/spesa-192.png', '192x192', 'any'],
    ['./icons/spesa-512.png', '512x512', 'any'],
    ['./icons/spesa-maskable-192.png', '192x192', 'maskable'],
    ['./icons/spesa-maskable-512.png', '512x512', 'maskable']
  ];
  assert.deepEqual(
    manifest.icons.map(icon => [icon.src, icon.sizes, icon.purpose]),
    expected
  );

  for (const [src, sizes] of expected) {
    const size = Number(sizes.split('x')[0]);
    const file = path.join(root, src.replace(/^\.\//, ''));
    assert.deepEqual(pngDimensions(file), { width: size, height: size });
  }
});
