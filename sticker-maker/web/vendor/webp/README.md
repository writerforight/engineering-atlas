# Vendored WebP encoder

`webp_enc.js` + `webp_enc.wasm`: libwebp compiled to WebAssembly by the Squoosh
project, as repackaged in [`@jsquash/webp`](https://github.com/jamsinclair/jSquash) 1.4.0
(`codec/enc/`, non-SIMD build), copied unchanged.

Used only when the browser cannot encode WebP from a canvas (Safari, and every
browser on iOS). Loaded lazily from `web/webp-wasm.js`.

Licences: `LICENSE-jsquash` (Apache-2.0), `LICENSE-libwebp.md` (BSD-3-Clause, libwebp).
