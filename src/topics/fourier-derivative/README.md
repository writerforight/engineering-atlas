# fourier-derivative

Visual test of **F{f′}(ω) = iω F(ω)**: the derivative multiplies the magnitude by |ω| and shifts the
phase by +π/2 (−π/2 for ω < 0). The integral tab shows the inverse, **F{∫f} = F/(iω)** (DC excluded).

Live: <https://writerforight.github.io/engineering-atlas/#/topic/fourier-derivative?section=etkilesim>

- Signals: two sines (whole periods in the window), a Gauss pulse, two sines + white noise.
- Methods compared: spectral derivative (`ifft(iω·fft(x))`, Nyquist bin zeroed), backward difference
  `(x[n]−x[n−1])/Ts`, analytic derivative.
- Plots: A time; B |F|, |F′|, |ω||F|; C |F′|/|F| against |ω|; D phase difference; E backward-difference gain
  (2/Ts)|sin(ωTs/2)| against |ω|; F integral tab (1/|ω|, −π/2).
- B–D can take F′ from the FFT of the sampled analytic f′ (independent test of the theorem, default), of
  the spectral derivative (equals iωX by construction, so only round-off), or of the backward difference.
- Pitfalls handled and marked in code (`src/core/math/spectral.ts`): phase only on bins with
  |F| > 10⁻⁶·max|F|; k > N/2 are negative frequencies; leakage toggle (fractional periods); Gibbs at the
  edges when the pulse does not decay; the derivative amplifies noise.

## Results (done criteria)

Criteria: relative magnitude error `max| |F′| − |ω||F| | / max |ω||F|` < 1e-10, phase error
`max |Δarg − sgn(ω)·π/2|` < 1e-8 (bins with |F| > 10⁻⁶·max|F|). Computed by `src/core/math/spectral.test.ts`,
which runs on every deploy. Two sines: 3 and min(17, N/4−1) periods, amplitudes 1 and 0.3. Gauss: σ = 0.05·T.

| Signal | N | Ts | F′ from | magnitude rel. error | phase error | time error vs analytic | backward difference, time error |
| --- | --- | --- | --- | --- | --- | --- | --- |
| two sines | 64 | 0.05 | analytic f′ | 2.9e-15 | 1.8e-15 | | |
| two sines | 64 | 0.05 | spectral | 1.9e-16 | 2.2e-16 | 1.2e-14 | 4.7e-1 |
| Gauss | 64 | 0.05 | analytic f′ | 2.1e-15 | 5.8e-12 | | |
| Gauss | 64 | 0.05 | spectral | 9.4e-16 | 2.6e-12 | 2.7e-15 | 2.5e-1 |
| two sines | 256 | 0.01 | analytic f′ | 6.5e-15 | 6.7e-16 | | |
| two sines | 256 | 0.01 | spectral | 1.2e-15 | 2.2e-16 | 4.9e-14 | 1.4e-1 |
| Gauss | 256 | 0.01 | analytic f′ | 7.0e-15 | 4.9e-12 | | |
| Gauss | 256 | 0.01 | spectral | 3.1e-15 | 6.2e-13 | 1.9e-14 | 6.4e-2 |
| two sines | 1024 | 0.002 | analytic f′ | 1.4e-14 | 1.6e-15 | | |
| two sines | 1024 | 0.002 | spectral | 8.4e-15 | 2.2e-16 | 1.5e-13 | 3.6e-2 |
| Gauss | 1024 | 0.002 | analytic f′ | 4.4e-14 | 5.0e-11 | | |
| Gauss | 1024 | 0.002 | spectral | 2.5e-14 | 6.6e-13 | 8.8e-14 | 1.6e-2 |
| two sines | 2048 | 0.001 | analytic f′ | 7.5e-14 | 4.4e-16 | | |
| two sines | 2048 | 0.001 | spectral | 1.4e-14 | 2.2e-16 | 4.2e-13 | 1.8e-2 |
| Gauss | 2048 | 0.001 | analytic f′ | 9.1e-14 | 4.1e-11 | | |
| Gauss | 2048 | 0.001 | spectral | 3.8e-14 | 6.8e-13 | 6.0e-13 | 8.1e-3 |

Integral (N = 512, Ts = 0.01): two sines (4 and 21 periods) magnitude 1.4e-16, phase 4.4e-16, and the result
matches the analytic −A cos(ωt)/ω to 1e-10; Gauss pulse (mean removed) magnitude 2.2e-16, phase 1.7e-11.

All criteria pass. With the leakage toggle on (3.4 and 17.4 periods) the analytic-f′ check fails as intended
(test: magnitude error > 1e-3, phase error > 0.1). The backward difference column is the O(Ts) error of a
first-order difference (it estimates f′ at t − Ts/2), not a failure of the method.
