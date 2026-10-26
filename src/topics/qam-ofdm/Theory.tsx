import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <p className="prose">
      Her alt taşıyıcı iki bağımsız “kanal” verir: <Tex tex="\cos k\omega_0 t" /> ve <Tex tex="\sin k\omega_0 t" />. Verici bunların
      her birine bir QAM seviyesi yazar (C matrisi) ve hepsini toplayıp tek bir fonksiyon gönderir. Bu fonksiyonlar bir sembol
      süresi boyunca birbirine dik olduğu için alıcı, sinyali her taşıyıcıyla çarpıp toplayarak (korelasyon) yalnız o taşıyıcının
      katsayısını geri alır; diğerleri sıfıra gider. Örneklenmiş halde bu korelasyon <Tex tex="\Phi^\top" /> ile çarpmaktır ve
      tam olarak bir DFT’dir: OFDM’de vericinin IFFT, alıcının FFT kullanmasının nedeni budur.
    </p>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Sinyal" why="Bir sembol süresi T, ω₀ = 2π/T. C’nin k. satırı [aₖ, bₖ], her biri bir QAM seviyesi.">
        <Tex block tex="s(t)=\sum_{k=1}^{K} a_k\cos k\omega_0 t+b_k\sin k\omega_0 t" />
      </Step>
      <Step title="Örnekleme = matris çarpımı" why="tₙ = nT/N anlarında her taşıyıcı bir sütun verir; N×2K matris Φ.">
        <Tex block tex="s[n]=\sum_j \Phi_{nj}\,c_j,\qquad s=\Phi c,\quad c=(a_1,b_1,\dots,a_K,b_K)^\top" />
      </Step>
      <Step title="Diklik" why="Ayrık toplamda da geçerli, yeter ki her k < N/2 olsun (N ≥ 2K+1).">
        <Tex block tex="\sum_{n=0}^{N-1}\cos\tfrac{2\pi kn}{N}\cos\tfrac{2\pi ln}{N}=\tfrac N2\delta_{kl},\quad \sum\sin\sin=\tfrac N2\delta_{kl},\quad\sum\cos\sin=0" />
      </Step>
      <Step title="Alıcı: transpoz yeter" why="ΦᵀΦ köşegen olduğu için ters matris transpozun ölçeklenmiş halidir; denklem çözmeye gerek yok.">
        <Tex block tex="\Phi^\top\Phi=\tfrac N2 I\ \Rightarrow\ \hat c=\tfrac 2N\,\Phi^\top s=c" />
      </Step>
      <Step title="Bu bir DFT" why="Euler: e^{−iθ} = cos θ − i sin θ. Φᵀ’nin cos ve sin satır çifti DFT’nin gerçel ve sanal kısmıdır.">
        <Tex block tex="X_k=\sum_n s[n]e^{-2\pi ikn/N}=\tfrac N2\,(a_k-i\,b_k)" />
        <p className="prose">
          Yani alıcıdaki <Tex tex="\Phi^\top s" /> çarpımı (<Tex tex="O(N^2)" />) FFT ile <Tex tex="O(N\log N)" />’de yapılır; verici
          tarafındaki <Tex tex="\Phi c" /> de bir ters DFT’dir (IFFT).
        </p>
      </Step>
      <Step title="Gürültü katsayıya nasıl geçer" why="Alıcı lineer: r = s + w ise ĉ = c + (2/N)Φᵀw. Her örnekte bağımsız, varyansı σ² olan w için varyans (2/N)²·‖φ_j‖²·σ².">
        <Tex block tex="\operatorname{Var}(\hat c_j-c_j)=\Big(\tfrac 2N\Big)^2\tfrac N2\,\sigma^2=\tfrac{2\sigma^2}{N}" />
        <p className="prose">
          Seviyeler 2 aralıklı, karar sınırı 1 uzakta. Katsayı başına sapma <Tex tex="\sigma\sqrt{2/N}" /> bu 1’e yaklaştıkça
          hatalar başlar. Daha çok örnek (büyük N) aynı σ’yı daha iyi ortalar. Burada aralık hep 2: 64-QAM aynı σ’da
          biraz daha çok hata yapar (iki komşulu iç seviyeler çoğalır), asıl bedel ise sinyal gücüdür; aynı SNR’de 64-QAM’in
          seviyeleri birbirine çok daha yakın düşer.
        </p>
      </Step>
      <Step title="Nyquist neden kesin eşitsizlik" why="N = 2K’da son sinüs her örnekte sıfır: o sütun sıfır vektörü, bilgi taşımaz.">
        <Tex block tex="\sin\!\big(K\omega_0\tfrac{nT}{2K}\big)=\sin(\pi n)=0\quad\Rightarrow\quad f_s>2f_{\max}" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Gerçek sistemlerde.</b> Burada her şey gerçel. Pratikte OFDM karmaşık taban bantta çalışır: k. taşıyıcıya karmaşık sembol{' '}
        <Tex tex="X_k=a_k-i\,b_k" /> yazılır, verici N noktalı IFFT alır, I ve Q kolları <Tex tex="\cos\omega_c t" /> ve{' '}
        <Tex tex="\sin\omega_c t" /> ile taşıyıcıya bindirilir. Burada gördüğün cos/sin çifti tam olarak o I/Q ayrımıdır.
      </p>
      <p>
        <b>Döngüsel önek.</b> Kanal sembolleri birbirine bulaştırır (çok yollu yayılım). Her sembolün sonu başına kopyalanırsa kanal
        DFT gözünde çarpma olur ve her taşıyıcı tek bir karmaşık kazançla düzeltilir.
      </p>
      <p>
        <b>Karar.</b> Gürültü yokken <Tex tex="\hat c" /> tam seviyelere düşer; gürültüde en yakın seviye seçilir. Seviyeler
        sıklaştıkça (64-QAM) aynı gürültü daha çok hata yapar: hız ile dayanıklılık arasındaki takas.
      </p>
    </div>
  );
}
