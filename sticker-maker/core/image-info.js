// Read format and dimensions straight from file bytes (PNG, WebP, JPEG, GIF,
// BMP). Validation runs on the bytes we are about to ship, not on what the
// encoder was asked to produce.

const ascii = (b, start, len) => String.fromCharCode(...b.subarray(start, start + len));
const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32be = (b, o) => ((b[o] << 24) >>> 0) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + ((b[o + 3] << 24) >>> 0);

/**
 * @param {Uint8Array} bytes
 * @returns {{ type: string, width: number, height: number, animated?: boolean, alpha?: boolean } | null}
 */
export function imageInfo(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 16) return null;

  // PNG: signature + IHDR chunk.
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && ascii(b, 12, 4) === 'IHDR') {
    const colorType = b[25];
    return {
      type: 'image/png',
      width: u32be(b, 16),
      height: u32be(b, 20),
      alpha: colorType === 4 || colorType === 6 || hasPngChunk(b, 'tRNS'),
      animated: hasPngChunk(b, 'acTL'),
    };
  }

  // WebP: RIFF....WEBP then VP8 / VP8L / VP8X.
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP' && b.length >= 30) {
    const chunk = ascii(b, 12, 4);
    if (chunk === 'VP8 ') {
      // Frame tag (3) + start code 9d 01 2a + 14-bit width / height.
      if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      return { type: 'image/webp', width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff, alpha: false, animated: false };
    }
    if (chunk === 'VP8L') {
      if (b[20] !== 0x2f) return null;
      const bits = u32le(b, 21);
      return {
        type: 'image/webp',
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
        alpha: ((bits >>> 28) & 1) === 1,
        animated: false,
      };
    }
    if (chunk === 'VP8X') {
      const flags = b[20];
      return {
        type: 'image/webp',
        width: u24le(b, 24) + 1,
        height: u24le(b, 27) + 1,
        alpha: (flags & 0x10) !== 0,
        animated: (flags & 0x02) !== 0,
      };
    }
    return null;
  }

  // JPEG: walk segments to the first SOFn marker.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const marker = b[o + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { o += 2; continue; }
      const len = u16be(b, o + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { type: 'image/jpeg', height: u16be(b, o + 5), width: u16be(b, o + 7), alpha: false, animated: false };
      o += 2 + len;
    }
    return null;
  }

  if (ascii(b, 0, 4) === 'GIF8') {
    return { type: 'image/gif', width: u16le(b, 6), height: u16le(b, 8), alpha: false };
  }

  if (b[0] === 0x42 && b[1] === 0x4d && b.length >= 26) {
    return { type: 'image/bmp', width: u32le(b, 18), height: Math.abs(u32le(b, 22) | 0) };
  }

  return null;
}

function hasPngChunk(b, name) {
  let o = 8;
  while (o + 8 <= b.length) {
    const len = u32be(b, o);
    const type = ascii(b, o + 4, 4);
    if (type === name) return true;
    if (type === 'IDAT' || type === 'IEND') return false;
    o += 12 + len;
  }
  return false;
}
