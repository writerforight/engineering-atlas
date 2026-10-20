import { Callout, Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        <Tex tex="g(t)=\int_0^t f(\tau)\,d\tau" /> sinyali <Tex tex="f" />’nin altında biriken alandır. Laplace
        dönüşümü <Tex tex="g" />’yi <Tex tex="e^{-st}" /> ile tartıp toplar. Biriken alan, kendisini üreten
        sinyalden bir “adım” daha yavaş değişir: hızlı salınımlar birbirini götürür, yavaş kısım birikir. Bu
        yüzden dönüşümde her frekans <Tex tex="1/s" /> ile ölçeklenir:
      </p>
      <Tex block tex="\mathcal L\Big\{\int_0^t f(\tau)\,d\tau\Big\}=\frac{F(s)}{s}" />
      <p>
        <Tex tex="s=\sigma+j\omega" /> alıp sönümlemeyi (<Tex tex="\sigma" />) azalttıkça Fourier eksenine
        yaklaşırız. Orada <Tex tex="1/s" /> iki parçaya ayrılır: <Tex tex="1/(j\omega)" /> ve{' '}
        <Tex tex="\omega=0" />’da giderek daralan bir tepe. O tepe, <Tex tex="g" />’nin sonunda yerleştiği
        sabit seviyenin (DC) izidir ve limitte <Tex tex="\pi F(0)\,\delta(\omega)" /> olur.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Tek taraflı Laplace dönüşümü ve yakınsama bölgesi"
        why="Tanım. f nedensel olduğundan (t < 0 için 0) integral 0’dan başlar. |f(t)| ≤ Kexp(σ_f·t) ise Re s > σ_f için integrand üstel olarak söner ve integral mutlak yakınsar; bu yarı-düzlem ROC’tur."
      >
        <Tex block tex="F(s)=\int_0^\infty f(t)\,e^{-st}\,dt,\qquad \operatorname{Re}s>\sigma_f" />
      </Step>
      <Step
        title="Çalışılacak sinyal: birikimli integral"
        why="Analizin temel teoremi: g, f’nin belirli integrali olduğundan türevi f’dir ve sıfır uzunluklu aralıkta integral sıfırdır."
      >
        <Tex block tex="g(t)=\int_0^t f(\tau)\,d\tau,\qquad g'(t)=f(t),\qquad g(0)=0" />
      </Step>
      <Step
        title="G(s)’ye kısmi integrasyon uygula"
        why="∫u dv = uv − ∫v du, u = g ve dv = e⁻ˢᵗdt seçildi; böylece v = −e⁻ˢᵗ/s ve du = g′dt = f dt (Adım 2)."
      >
        <Tex
          block
          tex="G(s)=\int_0^\infty g(t)e^{-st}dt=\Big[-\frac{g(t)e^{-st}}{s}\Big]_0^\infty+\frac1s\int_0^\infty f(t)e^{-st}dt"
        />
      </Step>
      <Step
        title="Sınır terimleri sıfırdır, ama sadece ROC içinde"
        why="Alt sınırda g(0) = 0 (Adım 2). Üst sınırda |g(t)| ≤ ∫|f| ≤ K'(1 + exp(σ_f·t)) olduğundan Re s > max(σ_f, 0) için g(t)e⁻ˢᵗ → 0. Sıfırın eklenmesinin sebebi: f söndüğünde bile g sabit bir değere yerleşir (σ_f < 0 olsa bile g büyümeyebilir ama sönmez de)."
      >
        <Tex block tex="\lim_{t\to\infty}g(t)e^{-st}=0\quad\text{için}\quad \operatorname{Re}s>\max(\sigma_f,0)" />
      </Step>
      <Step title="Sonuç" why="Adım 3’te sınır terimi sıfıra eşitlendi, kalan integral tanım gereği F(s) (Adım 1).">
        <Tex block tex="\boxed{G(s)=\frac{F(s)}{s}},\qquad \operatorname{ROC}_G\supseteq\{\operatorname{Re}s>\max(\sigma_f,0)\}" />
      </Step>
      <Step
        title="Aynı sonuç evrişimle"
        why="g = f * u, çünkü (f*u)(t) = ∫f(τ)u(t−τ)dτ = ∫₀ᵗ f(τ)dτ. Birim basamağın dönüşümü ∫₀^∞ e⁻ˢᵗdt = 1/s (Re s > 0). Evrişim teoremi çarpıma çevirir."
      >
        <Tex block tex="g=f*u\;\Longrightarrow\;G(s)=F(s)\,U(s)=F(s)\cdot\frac1s" />
        <p>
          Yani integratör, dürtü yanıtı <Tex tex="h(t)=u(t)" /> olan bir LTI sistemdir ve transfer fonksiyonu{' '}
          <Tex tex="1/s" />’dir.
        </p>
      </Step>
      <Step
        title="Fourier eksenine yaklaş: 1/s’yi ayır"
        why="s = σ + jω yaz ve paydanın eşleniğiyle çarp: 1/(σ+jω) = (σ − jω)/(σ² + ω²)."
      >
        <Tex block tex="\frac{1}{\sigma+j\omega}=\underbrace{\frac{\sigma}{\sigma^2+\omega^2}}_{\text{Lorentz tepesi}}-j\,\underbrace{\frac{\omega}{\sigma^2+\omega^2}}_{\to\,1/\omega}" />
      </Step>
      <Step
        title="Gerçel kısım δ’ya, sanal kısım 1/ω’ya gider"
        why="Lorentz tepesinin alanı her σ için ∫σ/(σ²+ω²)dω = [arctan(ω/σ)] = π. Genişliği σ ile küçülür, yüksekliği 1/σ ile büyür; alanı sabit kalan ve daralan bir tepe δ’ya yakınsar. ω ≠ 0 için ω/(σ²+ω²) → 1/ω (Sokhotski–Plemelj formülü)."
      >
        <Tex block tex="\int_{-\infty}^{\infty}\frac{\sigma}{\sigma^2+\omega^2}\,d\omega=\pi\quad\Longrightarrow\quad \lim_{\sigma\to0^+}\frac{1}{\sigma+j\omega}=\pi\,\delta(\omega)+\mathrm{p.v.}\frac{1}{j\omega}" />
      </Step>
      <Step
        title="F ile çarp: Fourier eksenindeki form"
        why="Adım 8’deki limit F(σ+jω) ile çarpılır. f mutlak integrallenebilirse F, jω ekseninde sürekli olur ve F(ω)δ(ω) = F(0)δ(ω) eşitliği kullanılabilir. F(0) = ∫₀^∞ f dt = g(∞): Adım 1’de s = 0 konmuş hâli."
      >
        <Tex block tex="G(j\omega)=\frac{F(j\omega)}{j\omega}+\pi F(0)\,\delta(\omega),\qquad F(0)=\int_0^\infty f\,dt=g(\infty)" />
        <p>
          Örnek: <Tex tex="f=\delta" /> için <Tex tex="g=u" /> ve <Tex tex="F\equiv1" />. Sonuç bilinen{' '}
          <Tex tex="\mathcal F\{u\}=\frac{1}{j\omega}+\pi\delta(\omega)" /> formülüdür.
        </p>
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <ul>
        <li>
          <b>ROC neden önemli?</b> <Tex tex="F(s)/s" /> bir cebirsel ifade olarak her yerde yazılabilir, ama
          integralin <Tex tex="G(s)" />’ye eşit olması sadece ROC’ta geçerlidir. ROC dışında{' '}
          <Tex tex="g(t)e^{-\sigma t}" /> sönmez, integral ıraksar. Görseldeki <Tex tex="\sigma" />{' '}
          kaydıracını ROC sınırının altına çekince bu açıkça görülür.
        </li>
        <li>
          <b>Laplace ≠ “σ = 0’da Fourier”.</b> <Tex tex="\sigma=0" /> ROC’un içinde değil de sınırındaysa (burada
          integratör kutbu <Tex tex="s=0" /> yüzünden öyle), Fourier dönüşümü <Tex tex="G(j\omega)" /> yerine
          koyarak bulunmaz. Limit alınmalıdır ve limit dağılım (δ) içerebilir.
        </li>
        <li>
          <b>Son değer teoremi ile bağ.</b> <Tex tex="\lim_{t\to\infty}g(t)=\lim_{s\to0}sG(s)=F(0)" />. δ
          teriminin ağırlığı <Tex tex="\pi F(0)" /> tam olarak bu son değerden gelir. Son değer 0 ise δ terimi
          de yoktur.
        </li>
        <li>
          <b>Basamak ve rampa.</b> Bu sinyallerin <Tex tex="F" />’si de <Tex tex="s=0" />’da kutba sahiptir (
          <Tex tex="1/s" />, <Tex tex="1/s^2" />). <Tex tex="g" /> sınırsız büyür, <Tex tex="F(0)" />{' '}
          tanımsızdır. <Tex tex="\sigma\to0" /> limiti δ’nın türevleri gibi daha tekil dağılımlar verir.
        </li>
        <li>
          <b>Bode diyagramında integratör.</b> <Tex tex="|1/(j\omega)|" /> genliği dekad başına −20 dB eğimle
          düşer ve faz sabit −90°’dir. Kontrolde PI denetleyicinin “I” kısmı budur. Sıfırdaki kutup sistemi
          marjinal kararlı yapar: basamak girişe rampa çıkışla cevap verir.
        </li>
        <li>
          <b>Genelleme.</b> <Tex tex="n" /> katlı integral <Tex tex="F(s)/s^n" />, türev ise{' '}
          <Tex tex="sF(s)-f(0^-)" /> verir. Türevde başlangıç koşulu görünür, integralde görünmez çünkü{' '}
          <Tex tex="g(0)=0" />.
        </li>
      </ul>
      <Callout title="Sayısal doğrulama">
        Testler, her örnek sinyal için <Tex tex="\int_0^T g(t)e^{-st}dt" /> integralini Simpson kuralıyla
        karmaşık <Tex tex="s" /> noktalarında hesaplar ve <Tex tex="F(s)/s" /> ile <Tex tex="10^{-6}" />{' '}
        bağıl toleransla karşılaştırır. Kullanıcı çizimi gibi sonlu destekli sinyaller de buna dahildir.
      </Callout>
    </div>
  );
}
