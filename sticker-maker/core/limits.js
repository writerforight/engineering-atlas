// Platform limits in one place. Every exporter and validator reads from here,
// so a rule change is a one-line edit.

export const STICKER_SIZE = 512;

export const INPUT = {
  // MIME types the pipeline accepts (browser File.type / CLI sniffed type).
  types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'],
  maxBytes: 20 * 1024 * 1024,
  minSide: 64,
  maxSide: 8000,
};

export const WHATSAPP = {
  stickerSide: 512,
  stickerMaxBytes: 100 * 1024,
  traySide: 96,
  trayMaxBytes: 50 * 1024,
  minStickers: 3,
  maxStickers: 30,
  maxEmojisPerSticker: 3,
  maxNameLength: 128,
  maxPublisherLength: 128,
  identifierPattern: /^[a-zA-Z0-9_.-]{1,128}$/,
};

export const TELEGRAM = {
  // Static sticker: PNG or WEBP, one side exactly 512, the other <= 512.
  stickerSide: 512,
  stickerMaxBytes: 512 * 1024,
  maxStickers: 120,
  maxInitialStickers: 50,
  maxEmojisPerSticker: 20,
  maxTitleLength: 64,
  maxNameLength: 64,
};

export const PNG_EXPORT = {
  side: 512,
};
