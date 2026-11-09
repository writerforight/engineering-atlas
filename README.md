# Engineering Atlas

**Live:** https://writerforight.github.io/engineering-atlas/

Interactive visualisations of engineering and mathematics concepts. Static site
(Vite + React + TypeScript + KaTeX), deployed to GitHub Pages. The UI is in
Turkish; code, comments and commits are in English.

Every topic page follows the same order:

1. **Sezgi** — short intuition
2. **Etkileşimli görsel** — the interactive part
3. **Adım adım türetme** — derivation from first principles; every step says where its formula comes from
4. **Yorum ve genelleme** — interpretation and generalisations

> The repo name `engineering-atlas` is only a default. The build uses a relative
> base path and hash routing, so renaming the repo (or using a custom domain)
> needs no code change.

![M² = −I topic](docs/screenshot-complex-structure.png)
![Laplace topic](docs/screenshot-laplace.png)

## Topics

Click to jump straight in:

- **M² = −I and e^{tM}**: [2×2 family (incl. skew-symmetric ±J)](https://writerforight.github.io/engineering-atlas/#/topic/complex-structure?tab=structure&section=etkilesim) · [similarity and commutator \[M, A\]](https://writerforight.github.io/engineering-atlas/#/topic/complex-structure?tab=similarity&section=etkilesim) · [4×4 quaternions (skew-symmetric M)](https://writerforight.github.io/engineering-atlas/#/topic/complex-structure?tab=quaternion&section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/complex-structure?section=turetme)
- **Skew-symmetric matrix [ω]× and its powers**: [draw a vector ω, pick a power k, watch [ω]×ᵏ bend 3D space](https://writerforight.github.io/engineering-atlas/#/topic/skew-symmetric?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/skew-symmetric?section=turetme)
- **Rodrigues via Taylor terms**: [set v, build V = [v]×, add the terms of e^{Vωt} one by one and watch each partial sum bend space (ω, t adjustable)](https://writerforight.github.io/engineering-atlas/#/topic/rodrigues-taylor?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/rodrigues-taylor?section=turetme)
- **Spectrum of a derivative, F{f′} = iωF**: [interactive (derivative)](https://writerforight.github.io/engineering-atlas/#/topic/fourier-derivative?tab=derivative&section=etkilesim) · [integral F/(iω)](https://writerforight.github.io/engineering-atlas/#/topic/fourier-derivative?tab=integral&section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/fourier-derivative?section=turetme) · [results table](src/topics/fourier-derivative/README.md)
- **cos/sin matrix projection, f_ω = Δt·C·f_t**: [interactive: drag N samples, see C (rows = ω, columns = t), the coefficients, and the derivative / integral by central difference, backward difference or exact spectral (a′ = ω b)](https://writerforight.github.io/engineering-atlas/#/topic/cos-sin-projection?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/cos-sin-projection?section=turetme)
- **Convolution matrix diagonalised by the DFT, F·C·F⁻¹ = diag(F a)**: [circular (circulant, adjustable N, aliasing)](https://writerforight.github.io/engineering-atlas/#/topic/convolution-dft?tab=circular&section=etkilesim) · [linear (Toeplitz, vs zero-padded circulant)](https://writerforight.github.io/engineering-atlas/#/topic/convolution-dft?tab=linear&section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/convolution-dft?section=turetme)
- **Polynomial interpolation, equidistant vs Chebyshev nodes**: [interactive: n nodes, barycentric p on a 100-point test grid, RMS / max deviation / Λₙ, error curve n = 2…40](https://writerforight.github.io/engineering-atlas/#/topic/polynomial-interpolation?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/polynomial-interpolation?section=turetme)
- **QAM-OFDM with cos/sin subcarriers**: [interactive](https://writerforight.github.io/engineering-atlas/#/topic/qam-ofdm?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/qam-ofdm?section=turetme)
- **Your own coordinate system + a scalar field**: [interactive: pick 1, 2 or 3 dimensions, type x = f₁(a,b,…), then T; shaded 3D surface / point cloud / SVD projection](https://writerforight.github.io/engineering-atlas/#/topic/coordinate-field?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/coordinate-field?section=turetme)
- **Laplace of an integral, F(s)/s**: [interactive](https://writerforight.github.io/engineering-atlas/#/topic/laplace-integration?section=etkilesim) · [derivation](https://writerforight.github.io/engineering-atlas/#/topic/laplace-integration?section=turetme)

Standalone page (not part of the site build): [`convolution-story/`](convolution-story/README.md), the convolution story as a single offline `index.html` (double-click to open, no network, no storage).

Deep links: `#/topic/<slug>?tab=<tab>&section=<sezgi|etkilesim|turetme|yorum>`. The tab in the URL
updates as you switch tabs, so the address bar is always a shareable link to the current view.

| Slug | What it shows |
| --- | --- |
| `complex-structure` | Real 2×2 matrices with M² = −I, `e^{tM} = cos t I + sin t M`, elliptic orbits as `P e^{tJ} P⁻¹`, the similarity flow `e^{tM} A e^{−tM}` and `[M, A]`, and the 4×4 quaternion case (a whole S² of complex structures). |
| `skew-symmetric` | Type any ω ∈ R³: its cross-product matrix [ω]×, the powers [ω]×ᵏ (cycle via [ω]×³ = −\|ω\|²[ω]×), and a 3D lattice morphing from I to [ω]×ᵏ: ω is crushed, space flattens onto the plane ⊥ ω and turns 90° per power. Drag the tip of ω to draw it. |
| `rodrigues-taylor` | Set any v ∈ R³ (drag its tip), V = [v]×, scalars ω and t (playable). Pick the last term N: the lattice shows the partial sum S_N = Σ (ωt)ⁿVⁿ/n!, next to the exact Rodrigues rotation, the added term, the error and det S_N. |
| `fourier-derivative` | Spectral derivative `ifft(iω·fft(x))` vs backward difference vs analytic on two sines, a Gauss pulse and a noisy signal: \|F′\| = \|ω\|\|F\|, phase ±π/2, the difference gain (2/Ts)\|sin(ωTs/2)\|, the integral F/(iω), and the leakage / Gibbs / noise pitfalls. Done criteria (< 1e-10 magnitude, < 1e-8 phase) checked in tests. |
| `cos-sin-projection` | N samples of f(t) (presets or dragged by hand) multiplied by the K×N matrices C_kn = cos(ω_k t_n) and S_kn = sin(ω_k t_n) on the DFT grid, shown with numbers and a clickable heat map; coefficients as bars. Derivative or integral (F(0) adjustable) by circulant central difference D, backward difference or exact spectral ω factor, with the ideal a′ = ω b, b′ = −ω a (integral: −b/ω, a/ω) marked, the per-row gain sin(ωΔt)/Δt or (2/Δt)sin(ωΔt/2) vs ω, the D matrix, and the non-periodic integral when the mean ≠ 0. |
| `convolution-dft` | Two random integer sequences a(n), b(n) with independently adjustable lengths (1–16) and max element value (default 20, optional negatives; also editable by hand). Linear (Toeplitz T, y = T b) or circular (N×N circulant C, N adjustable, aliasing shown when N < La+Lb−1) convolution, with every matrix printed in full: the convolution matrix, the DFT matrix F (and F⁻¹), the product F·C (= ΛF, rows of F scaled by (F a)_k) and Λ = F·C·F⁻¹ = diag(F a), with an off-diagonal check. In linear mode the square matrix is the lower Toeplitz L (not diagonalised) or the zero-padded circulant (diagonalised, same y). Complex entries as a+bj, \|z\|∠θ or colour only (hue = phase). A table checks F y = (F a) ⊙ (F b). |
| `polynomial-interpolation` | Five functions (Runge 1/(1+25x²), eˣ, \|x\|, tanh 5x, sin 4x), n = 2…40 nodes, equidistant or Chebyshev (or both). The barycentric interpolant is evaluated on a 100-point test grid and drawn in one plot with f, the nodes and the largest deviation; a table gives RMS, max\|p−f\|, the Lebesgue constant Λₙ and the mean RMS over n = 2…40; a log plot shows e_interp(n) (max or RMS) and Λₙ for both node sets. |
| `qam-ofdm` | K subcarriers (cos/sin pairs), random M-QAM levels fill the coefficient matrix C; s(t) and its samples (legend toggles); sampling matrix Φ, receiver Φᵀ, recovered Ĉ with decisions, and the same Ĉ from a DFT. Shows N = 2K losing the last sine and aliasing below it. Gray-coded bits, AWGN slider, 2ⁿ levels per axis, and a live stream (adjustable symbol rate) with a scrolling scope, a TX/RX bit console and BER over time. Panels are collapsible. |
| `coordinate-field` | Choose the dimension (1–3), type each coordinate as a formula of the parameters (`x = a cos(b)`, …, safe parser with exp/ln/log/trig/hyperbolic, implicit multiplication, variable detection) and a scalar T in parameters and/or new coordinates (T = T∘F). 1D: T over x with the a-spacing marked; 2D: shaded surface z = T over the mapped grid (colour = T optional), coordinate curves on the floor; 3D: point cloud coloured by T, or projection onto the two largest singular vectors with T as height and the kept variance. |
| `laplace-integration` | `L{∫f} = F(s)/s`, the damped integrand `g(t)e^{−σt}`, the σ → 0 limit `1/(jω) + πF(0)δ(ω)`, ROC warnings, causal signal vs causal system. |

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # Vitest (core math + registry)
npm run build      # type-check (strict) + production build into dist/
npm run preview    # serve dist/
```

Node 22 is used in CI.

## Project layout

```
src/
  core/
    math/      pure TS, no UI: matrices, expm, complex numbers, quaternions,
               quadrature, causal test signals (+ *.test.ts)
    ui/        shared React pieces: Canvas, Slider, Tex (KaTeX), Tabs,
               Callout, Step/Steps, plot + draw helpers, theme
    topic.ts   TopicMeta / TheoryModule types
  app/         shell: hash router, home page, topic page, registry
  topics/
    _template/             copy this to start a new topic (ignored by the registry)
    complex-structure/     meta.ts · Viz.tsx · Theory.tsx
    laplace-integration/   meta.ts · Viz.tsx · Theory.tsx
```

## Adding a topic

1. Copy `src/topics/_template/` to `src/topics/<your-slug>/` (lowercase, dashes;
   folders starting with `_` are ignored).
2. Edit `meta.ts`: `title`, `summary`, `tags`, optional `order` (home-page sort key).
3. Write `Viz.tsx` with a default-exported component. Use `Canvas` with a `draw`
   callback (CSS-pixel coordinates, theme palette passed in), `Slider`, `Tex`.
4. Write `Theory.tsx` exporting `Intuition`, `Derivation` and `Notes`. Build the
   derivation from `<Steps>` / `<Step title why>`; `why` is required and must say
   where the step comes from.
5. Put any non-trivial math in `src/core/math/` and add a `*.test.ts` next to it.
6. `npm run dev`. The topic appears on the home page automatically
   (`import.meta.glob` in `src/app/registry.ts`). No other file needs editing.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci` → tests →
build → deploy `dist/` to GitHub Pages. One-time setup in the repo:
**Settings → Pages → Source: GitHub Actions**.

## Roadmap

- Kalman filter
- Park / Clarke transform
- Matrix exponential and state space
- NVH spectral analysis

## Assumptions

Choices made where the brief left room:

- **Routing:** hash routes (`#/topic/<slug>`) so deep links work on GitHub Pages without a 404 redirect hack; Vite `base: './'` so the site works under any repo name.
- **Theory format:** `Theory.tsx` (not MDX), so there is no MDX toolchain and formulas use the same `Tex` component as the visualisations. A theory module exports three components (`Intuition`, `Derivation`, `Notes`), so the page shell can enforce the section order.
- **`b → 0` in `complex-structure`:** b = 0 is impossible (it would need −a² = 1), so the slider value is clamped to |b| ≥ 0.05 and a warning is shown. The sign of b sets the rotation direction.
- **Conjugator:** `P = [e₁, M e₁] = [[1, a], [0, c]]` (any non-zero first column works; e₁ keeps the formula short).
- **"How much does A rotate":** A is split into `A_c = (A − MAM)/2` (commutes with M, fixed) and `A_a = (A + MAM)/2` (anticommutes, rotates as `e^{2tM} A_a`). The UI reports `‖A_a‖ / √(‖A_c‖² + ‖A_a‖²)` next to `‖[M, A]‖`.
- **Quaternion view:** basis order (1, i, j, k), M = left multiplication by the unit pure quaternion n. "2D slice" is shown two ways: projection onto a chosen coordinate plane (ellipse in general) and the invariant plane span{p₀, M p₀} (exact circle). The sphere picker drags on the front hemisphere; the θ slider reaches the back.
- **User-drawn signal:** piecewise linear on 0 ≤ t ≤ 8, zero afterwards (finite support → F is entire; its transform is computed numerically).
- **σ range:** −0.6 … 2, deliberately reaching below the ROC so the divergence warning can be seen.
- **Animation:** starts paused when the OS asks for reduced motion.
- **Theme:** follows the system by default; the header button cycles system → light → dark and the choice is stored in `localStorage`.
- **TypeScript:** pinned to 5.9 (`strict`, `noUncheckedIndexedAccess`); TS 7 was too new to rely on.

## Author

Built by [Eren Can Almaz](https://writerforight.github.io/), an Electrical Engineering (Elektrotechnik)
student at RWTH Aachen University who builds interactive tools that make engineering visible.

## License

MIT, see [LICENSE](LICENSE).
