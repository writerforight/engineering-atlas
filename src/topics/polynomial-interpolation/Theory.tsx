import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        <Tex tex="n" /> noktadan tam olarak bir tane <Tex tex="n-1" />. dereceden polinom geçer. Soru, bu polinomun düğümlerin
        <i> arasında</i> fonksiyona ne kadar yakın kaldığıdır. Bunu ölçmek için polinomu 100 noktalı bir test ızgarasında
        değerlendirip <Tex tex="f" /> ile karşılaştırırız: ortalama sapma (RMS) ve en kötü nokta (<Tex tex="\max|p-f|" />).
      </p>
      <p>
        Eşit aralıklı düğümlerde polinom kenarlara yakın şiddetle salınır (Runge olayı); <Tex tex="n" /> büyüdükçe hata
        azalmak yerine patlar. Çebişev düğümleri kenarlarda sıklaşır ve bu salınımı bastırır. Farkın sayısal ölçüsü Lebesgue
        sabitidir <Tex tex="\Lambda_n" />: sadece düğümlerin yerine bağlıdır, fonksiyona değil.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Düğümler" why="Eşit aralıklı düğümler uç noktaları da içerir. Çebişev düğümleri T_n polinomunun kökleridir: çember üzerinde eşit aralıklı noktaların x eksenine izdüşümü, bu yüzden uçlarda sıklaşırlar.">
        <Tex block tex="x_j^{\text{eş}}=-1+\frac{2j}{n-1},\qquad x_j^{\text{Ç}}=-\cos\frac{(2j+1)\pi}{2n},\qquad j=0,\dots,n-1" />
      </Step>
      <Step title="Lagrange tabanı ve barisentrik ağırlıklar" why="ℓ_j(x_k) = δ_jk. ℓ(x) = ∏(x − x_k) ortak çarpanı dışarı alınınca her ℓ_j sadece bir ağırlık ve 1/(x − x_j) olur.">
        <Tex block tex="\ell_j(x)=\ell(x)\,\frac{w_j}{x-x_j},\qquad w_j=\frac{1}{\prod_{k\ne j}(x_j-x_k)}" />
      </Step>
      <Step title="İkinci (gerçek) barisentrik formül" why="Sabit fonksiyon 1 tam interpole edilir: Σℓ_j(x) = 1. p’yi buna bölünce ℓ(x) sadeleşir; ağırlıklardaki ortak çarpan da sadeleştiği için kapalı formüller yeter.">
        <Tex block tex="p(x)=\frac{\sum_j \frac{w_j}{x-x_j}f_j}{\sum_j \frac{w_j}{x-x_j}},\qquad w_j^{\text{eş}}\propto(-1)^j\binom{n-1}{j},\quad w_j^{\text{Ç}}\propto(-1)^j\sin\frac{(2j+1)\pi}{2n}" />
      </Step>
      <Step title="Hata ölçüleri test ızgarasında" why="Polinom 100 noktada f ile karşılaştırılır. RMS ortalama davranışı, max en kötü noktayı gösterir; her zaman RMS ≤ max.">
        <Tex block tex="\text{RMS}=\sqrt{\tfrac1{100}\sum_{i=1}^{100}\big(p(t_i)-f(t_i)\big)^2},\qquad e_{\max}=\max_i|p(t_i)-f(t_i)|" />
      </Step>
      <Step title="Lebesgue sabiti" why="İnterpolasyon doğrusal bir operatördür, P f = Σ f_j ℓ_j. Sup-normdaki büyüklüğü Λ_n’dir. Veride δ kadar hata varsa (ölçüm, yuvarlama), polinomda en fazla Λ_n·δ kadar hata olur.">
        <Tex block tex="\Lambda_n=\max_{x\in[-1,1]}\sum_j|\ell_j(x)|,\qquad \|P f-P\tilde f\|_\infty\le\Lambda_n\,\|f-\tilde f\|_\infty" />
      </Step>
      <Step title="En büyük sapmayla ilişkisi" why="p* en iyi yaklaşan polinom olsun (aynı derece). P p* = p* olduğundan f − Pf = (f − p*) − P(f − p*). Bu sınır max sapma içindir; RMS için değil.">
        <Tex block tex="\|f-p\|_\infty\le(1+\Lambda_n)\,\min_{\deg q<n}\|f-q\|_\infty,\qquad \Lambda_n^{\text{Ç}}\approx\tfrac2\pi\ln n,\quad \Lambda_n^{\text{eş}}\sim\frac{2^{d+1}}{e\,d\ln d}\;(d=n-1)" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Neden barisentrik?</b> Değerlendirme <Tex tex="O(n)" /> işlem sürer ve sayısal olarak kararlıdır. Monom
        katsayılarına (Vandermonde sistemi) gitmek gerekmez; o sistemin kondisyon sayısı <Tex tex="n" /> ile hızla büyür.
      </p>
      <p>
        <b>Büyük n’de eşit aralıklı eğri.</b> Düzgün fonksiyonlarda bile (eˣ, sin 4x) hata bir süre azalır, sonra
        yeniden büyür: veri tam olsa da yuvarlama hatası (<Tex tex="\approx10^{-16}" />) <Tex tex="\Lambda_n" /> ile
        büyütülür. Çebişev düğümlerinde <Tex tex="\Lambda_n" /> küçük kaldığı için hata makine hassasiyetinde durur.
      </p>
      <p>
        <b>|x| ve tanh 5x.</b> Türevi süreksiz ya da dik fonksiyonlarda Çebişev hatası da yavaş azalır: hız, fonksiyonun
        düzgünlüğüne bağlıdır; düğüm seçimi sadece <Tex tex="(1+\Lambda_n)" /> çarpanını belirler.
      </p>
    </div>
  );
}
