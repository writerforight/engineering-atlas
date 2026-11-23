import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Bir integrali birkaç fonksiyon değerinin ağırlıklı toplamıyla hesaplamak istiyoruz:{' '}
        <Tex tex="\int_{-1}^1 f\,dx\approx\sum_i w_i f(x_i)" />. Noktaları eşit aralıklı alırsak <Tex tex="N" /> noktayla en fazla{' '}
        <Tex tex="N-1" />. dereceye kadar tam sonuç alırız. Noktaları da akıllıca seçersek, yani Legendre polinomu <Tex tex="p_N" />’in
        köklerine koyarsak, bu <Tex tex="2N-1" />’e çıkar.
      </p>
      <p>
        Yol şöyle: Gram-Schmidt Legendre polinomlarını verir, diklik bir üç terimli rekürsiyon doğurur, rekürsiyon bir üç köşegenli
        matristir ve <Tex tex="p_N" />’in kökleri bu matrisin özdeğerleridir. Simetrik hali <Tex tex="J" /> hem düğümleri (özdeğerler)
        hem ağırlıkları (özvektörlerin ilk bileşeni) tek seferde verir: Golub-Welsch.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Gram-Schmidt" why="Önceki p_k’lar birbirine dik olduğundan her bileşen ayrı hesaplanıp çıkarılabilir. Payda ⟨p_k,p_k⟩ = ∫p_k² > 0, hiçbir zaman sıfır değil.">
        <Tex block tex="p_0=1,\qquad p_n=x^n-\sum_{k<n}\frac{\langle x^n,p_k\rangle}{\langle p_k,p_k\rangle}\,p_k" />
      </Step>
      <Step title="Diklik, derecesi küçük her polinoma" why="p_0,…,p_{n−1} derecesi n’den küçük bütün polinomları kurar. Her baz elemanına dik olan, her doğrusal kombinasyona diktir (geçişlilik değil, doğrusallık).">
        <Tex block tex="\langle p_n,q\rangle=0\quad\text{her }q,\ \deg q<n" />
      </Step>
      <Step title="Üç terimli rekürsiyon" why="⟨x p_n, p_k⟩ = ⟨p_n, x p_k⟩. k ≤ n−2 ise deg(x p_k) < n, bir önceki adım gereği sıfır. Katsayılar, iki tarafı p_n ve p_{n−1} ile iç çarpınca çıkar.">
        <Tex block tex="x\,p_n=p_{n+1}+a_n p_n+b_n p_{n-1},\quad a_n=\frac{\langle xp_n,p_n\rangle}{\langle p_n,p_n\rangle}=0,\quad b_n=\frac{\langle p_n,p_n\rangle}{\langle p_{n-1},p_{n-1}\rangle}=\frac{n^2}{4n^2-1}" />
      </Step>
      <Step title="Matris biçimi ve özdeğer" why="p_N(x_i) = 0 olan bir noktada son terim kaybolur; T·v = λ·v özdeğer denklemi kalır.">
        <Tex block tex="x\,\mathbf p(x)=T\,\mathbf p(x)+p_N(x)\,e_N\quad\Rightarrow\quad T\,\mathbf p(x_i)=x_i\,\mathbf p(x_i)" />
      </Step>
      <Step title="Simetrikleştirme" why="Benzer matrislerin karakteristik polinomu aynıdır: det(DTD⁻¹ − λI) = det(T − λI). d_k = 1/‖p_k‖ seçimi iki yan köşegeni eşitler.">
        <Tex block tex="J=DTD^{-1},\qquad J_{k,k+1}=J_{k+1,k}=\beta_k=\sqrt{b_k}=(4-k^{-2})^{-1/2}" />
      </Step>
      <Step title="Ağırlıklar özvektörlerden" why="Christoffel formülü w_i = 1/Σ_k q̃_k(x_i)² (q̃ normlu polinomlar). J’nin normlu özvektörü v_i = q̃(x_i)/‖q̃(x_i)‖, ilk bileşeni q̃_0 = 1/√2 sabit.">
        <Tex block tex="(v_i)_1^2=\frac{1/2}{\sum_k\tilde q_k(x_i)^2}=\frac{w_i}{2}\quad\Rightarrow\quad w_i=2\,(v_i)_1^2" />
      </Step>
      <Step title="Neden 2N − 1" why="f’yi p_N’e böl. q·p_N’nin integrali diklikten, toplamı da p_N(x_i) = 0’dan sıfır; r ise derecesi ≤ N−1 olduğu için tam integre edilir.">
        <Tex block tex="f=q\,p_N+r,\ \deg q,\deg r\le N-1:\quad \int f=\int r=\sum_i w_i r(x_i)=\sum_i w_i f(x_i)" />
      </Step>
      <Step title="Neden 2N değil" why="p_N² her yerde ≥ 0 ve integrali pozitif, ama bütün düğümlerde sıfır. Aradaki fark tam olarak x^{2N}’deki hata.">
        <Tex block tex="\int p_N^2=\|p_N\|^2>0,\qquad \sum_i w_i\,p_N(x_i)^2=0" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Başka aileler.</b> İç çarpımın ağırlığı ve aralığı değişince aynı formüllerle başka <Tex tex="a_n,b_n" /> çıkar ve Golub-Welsch
        aynen çalışır (formüldeki 2 yerine <Tex tex="\mu_0=\int\omega" />):
      </p>
      <div className="scroll-x">
        <table className="num-table">
          <thead>
            <tr><th style={{ textAlign: 'left' }}>Aile</th><th>aralık</th><th>ω(x)</th><th>aₙ</th><th>bₙ</th></tr>
          </thead>
          <tbody>
            <tr><td style={{ textAlign: 'left' }}>Legendre</td><td>[−1, 1]</td><td>1</td><td>0</td><td>n²/(4n²−1)</td></tr>
            <tr><td style={{ textAlign: 'left' }}>Tschebyscheff</td><td>[−1, 1]</td><td>1/√(1−x²)</td><td>0</td><td>1/2, sonra 1/4</td></tr>
            <tr><td style={{ textAlign: 'left' }}>Hermite</td><td>ℝ</td><td>e^(−x²)</td><td>0</td><td>n/2</td></tr>
            <tr><td style={{ textAlign: 'left' }}>Laguerre</td><td>[0, ∞)</td><td>e^(−x)</td><td>2n+1</td><td>n²</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <b>Aynı kalıp lineer cebirde.</b> “Dereceyi en fazla 1 artıran ve simetrik bir işlem dik tabanda üç köşegenli matris verir”:
        simetrik bir matrisin Krylov uzayında Lanczos yöntemi tam olarak budur. Simetri yoksa matris Hessenberg kalır (Arnoldi).
      </p>
      <p>
        <b>Notasyon.</b> Bu sayfada <Tex tex="N" /> düğüm sayısıdır. Polinom derecesiyle sayan kaynaklarda <Tex tex="n=N-1" />:
        exaktlık derecesi <Tex tex="2n+1=2N-1" />, düğümler <Tex tex="P_{n+1}" />’in kökleri.
      </p>
    </div>
  );
}
