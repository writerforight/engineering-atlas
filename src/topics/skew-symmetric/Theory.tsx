import { Callout, Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        3B’de bir <Tex tex="\omega" /> vektörü verildiğinde “<Tex tex="\omega" /> ile çapraz çarp” işlemi
        doğrusaldır, yani bir matrisle yazılır: <Tex tex="[\omega]_\times x=\omega\times x" />. Bu matris{' '}
        <b>ters simetriktir</b>: <Tex tex="K^{\mathsf T}=-K" />. Her <Tex tex="x" /> noktasını kendisine dik bir
        yöne iter. Küre üzerindeki her noktaya teğet bir ok koyar, yani <Tex tex="\omega" /> ekseni etrafındaki
        bir dönmenin <b>hız alanıdır</b>.
      </p>
      <p>
        Ama <Tex tex="K" />’nın kendisi bir dönme değildir. <Tex tex="\omega" /> yönünü sıfıra götürür, küreyi{' '}
        <Tex tex="\omega" />’ya dik düzlemdeki <Tex tex="|\omega|" /> yarıçaplı diske ezer ve 90° çevirir.{' '}
        <Tex tex="K^2,\ K^3,\dots" /> aynı diske tekrar tekrar ezer; her adımda yarıçap{' '}
        <Tex tex="|\omega|" /> katına çıkar, açı 90° daha döner.
      </p>
      <p>
        <Tex tex="n" /> boyutta <Tex tex="K" />, birbirine dik düzlemlerde aynı anda yapılan bağımsız dönmelerin
        hızlarıdır (<Tex tex="\lambda_1\ge\lambda_2\ge\dots" />). <Tex tex="K^k" /> her düzlemi{' '}
        <Tex tex="\lambda_j^k" /> ile ölçekler. Bu yüzden en hızlı düzlem kazanır ve küre giderek o düzleme doğru
        basıklaşır. <Tex tex="e^{tK}" /> ise her düzlemi <Tex tex="\lambda_jt" /> kadar döndürür ve küreyi hiç
        bozmaz.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Vektörden matrise: çapraz çarpım matrisi"
        why="Çapraz çarpımın bileşen tanımı ω×x = (ω₂x₃ − ω₃x₂, ω₃x₁ − ω₁x₃, ω₁x₂ − ω₂x₁). Her satırda x₁, x₂, x₃’ün katsayılarını okuyunca matris çıkar."
      >
        <Tex
          block
          tex="\omega\times x=\begin{bmatrix}0&-\omega_3&\omega_2\\ \omega_3&0&-\omega_1\\ -\omega_2&\omega_1&0\end{bmatrix}\begin{bmatrix}x_1\\x_2\\x_3\end{bmatrix}=[\omega]_\times x"
        />
      </Step>
      <Step
        title="n boyutta: her koordinat düzlemine bir sayı"
        why="Kᵢᵢ = −Kᵢᵢ olduğundan köşegen sıfırdır; üst üçgen alt üçgeni belirler. Geriye i < j çiftleri kadar, yani n(n−1)/2 serbest sayı kalır. eⱼeᵢᵀ − eᵢeⱼᵀ, (eᵢ, eⱼ) düzleminde eᵢ’yi eⱼ’ye doğru döndüren üreteçtir."
      >
        <Tex block tex="K=\sum_{i<j}v_{ij}\,\bigl(e_je_i^{\mathsf T}-e_ie_j^{\mathsf T}\bigr),\qquad \#\{v_{ij}\}=\tfrac{n(n-1)}2" />
        <p>
          <Tex tex="\tfrac{n(n-1)}2=n" /> eşitliği yalnızca <Tex tex="n=3" /> için sağlanır. Bir vektörün bir
          ters simetrik matrisle bire bir eşlenmesi bu yüzden 3B’ye özgüdür. Diğer boyutlarda girilen “vektör”
          aslında düzlem başına bir sayıdır (bivektör).
        </p>
      </Step>
      <Step
        title="Kx her zaman x’e diktir"
        why="xᵀKx bir sayıdır, dolayısıyla kendi transpozuna eşittir: xᵀKx = (xᵀKx)ᵀ = xᵀKᵀx = −xᵀKx. Kendisinin eksisine eşit olan sayı sıfırdır."
      >
        <Tex block tex="x^{\mathsf T}Kx=0\quad\Longrightarrow\quad \dot x=Kx\ \text{ için }\ \tfrac{d}{dt}|x|^2=2x^{\mathsf T}\dot x=0" />
        <p>
          <Tex tex="\dot x=Kx" /> akışı uzunluğu korur. <Tex tex="e^{tK}" />’nın dönme olmasının sebebi budur
          (Adım 10).
        </p>
      </Step>
      <Step
        title="Özdeğerler saf sanaldır; n tekse det K = 0"
        why="Kz = μz (z karmaşık) ise zᴴKz = μ|z|². Sol tarafın eşleniği zᴴKᵀz = −zᴴKz (K reel), yani μ̄ = −μ. Determinant için det K = det Kᵀ = det(−K) = (−1)ⁿ det K."
      >
        <Tex block tex="\mu\in i\mathbb R,\qquad n\ \text{tek}\ \Rightarrow\ \det K=0\ \Rightarrow\ \ker K\neq\{0\}" />
      </Step>
      <Step
        title="Normal form: dik düzlemlerde λJ blokları"
        why="KᵀK = −K² simetrik ve pozitif yarı tanımlıdır (yᵀKᵀKy = |Ky|²), yani spektral teoremle dik özvektörleri vardır. λ² özdeğerli birim q için p = Kq/λ birimdir (|Kq|² = qᵀKᵀKq = λ²), Adım 3’ten q’ya diktir ve Kp = K²q/λ = −λq. Dik tümleyen de değişmezdir: y ⊥ q, p ise q·Ky = −Kq·y = −λ p·y = 0 ve p·Ky = −Kp·y = λ q·y = 0. Aynı işlem tümleyende tekrarlanır."
      >
        <Tex block tex="Kq=\lambda p,\quad Kp=-\lambda q\quad\Longrightarrow\quad K=Q\begin{bmatrix}\lambda_1J&&&\\&\ddots&&\\&&\lambda_mJ&\\&&&0\end{bmatrix}Q^{\mathsf T},\qquad J=\begin{bmatrix}0&-1\\1&0\end{bmatrix}" />
        <p>
          <Tex tex="Q" /> ortogonaldir: sütunları <Tex tex="q_1,p_1,\dots,q_m,p_m" /> ve çekirdek vektörleridir.
          Görseldeki “değişmez düzlemler” çerçevesi bu sütunlardır.
        </p>
      </Step>
      <Step
        title="Kuvvetler: ölçekle ve 90° döndür"
        why="Q ortogonal olduğundan çarpımda aradaki QᵀQ = I’lar sadeleşir: (QBQᵀ)ᵏ = QBᵏQᵀ. Blok köşegen matrisin kuvveti blokların kuvvetidir. J² = −I olduğundan Jᵏ, kπ/2 açılı dönmedir."
      >
        <Tex block tex="K^k=Q\,\operatorname{blockdiag}\bigl(\lambda_1^kJ^k,\ \dots,\ \lambda_m^kJ^k,\ 0\bigr)\,Q^{\mathsf T},\qquad J^k=\begin{bmatrix}\cos\frac{k\pi}2&-\sin\frac{k\pi}2\\ \sin\frac{k\pi}2&\cos\frac{k\pi}2\end{bmatrix}" />
      </Step>
      <Step
        title="Birim kürenin görüntüsü bir elipsoittir"
        why="Tekil değer ayrışımı A = UΣVᵀ. V ortogonal olduğundan Vᵀ küreyi kendisine götürür; Σ eksenleri σᵢ ile ölçekler; U yalnızca döndürür. Adım 6’da her blok λⱼᵏ × (dönme) olduğundan Kᵏ’nin tekil değerleri λⱼᵏ’dir (her biri iki kez) ve k ≥ 1 için çekirdekte 0."
      >
        <Tex block tex="A\,S^{n-1}=U\Sigma\,S^{n-1}=\Bigl\{\sum_i\sigma_iz_iu_i:\ |z|=1\Bigr\},\qquad \sigma(K^k)=\{\lambda_j^k,\lambda_j^k\}\cup\{0\}" />
        <p>
          Yarı eksenleri <Tex tex="\sigma_i" /> olan bir elipsoittir. <Tex tex="\sigma_i=0" /> olan yönler ezilir;
          o zaman görüntü, <Tex tex="A" />’nın görüntü uzayında <b>dolu</b> bir elipsoittir (3B’de{' '}
          <Tex tex="K" /> için dolu disk).
        </p>
        <Tex block tex="\frac{K^k}{\lambda_1^k}:\quad \text{yarı eksenler}\ \Bigl(\frac{\lambda_j}{\lambda_1}\Bigr)^k\xrightarrow[k\to\infty]{}0\quad(\lambda_j<\lambda_1)" />
        <p>
          Küre, en büyük <Tex tex="\lambda" />’lı düzleme doğru üstel hızla basıklaşır. Bu, kuvvet yönteminin
          (power iteration) baskın özuzaya yakınsamasıyla aynı mekanizmadır. Tüm <Tex tex="\lambda_j" /> eşitse
          (çift <Tex tex="n" />, “Eşit hızlar”), <Tex tex="K/\lambda" /> bir karmaşık yapıdır (
          <Tex tex="K^2=-\lambda^2I" />) ve küre yuvarlak kalır.
        </p>
      </Step>
      <Step
        title="Çift kuvvetler simetrik, tek kuvvetler ters simetrik"
        why="Transpoz çarpımın sırasını çevirir; aynı matrisin kuvvetinde sıra önemsizdir: (Kᵏ)ᵀ = (Kᵀ)ᵏ = (−K)ᵏ."
      >
        <Tex block tex="(K^k)^{\mathsf T}=(-1)^kK^k,\qquad K^2=-K^{\mathsf T}K\preceq 0" />
      </Step>
      <Step
        title="3B’de kapalı formlar: K² ve K³ = −|ω|²K"
        why="İlk eşitlik BAC−CAB kuralı: ω×(ω×x) = ω(ω·x) − |ω|²x. İkinciyi bulmak için soldan K ile çarp ve Kω = ω×ω = 0 kullan. Aynı şey Cayley–Hamilton’dan da çıkar: karakteristik polinom μ³ + |ω|²μ."
      >
        <Tex block tex="K^2=\omega\omega^{\mathsf T}-|\omega|^2I,\qquad K^3=-|\omega|^2K,\qquad K^{k+2}=-|\omega|^2K^k\ (k\ge1)" />
        <p>
          <Tex tex="K^2" />, <Tex tex="-|\omega|^2" /> çarpı “<Tex tex="\omega" />’ya dik düzleme izdüşüm”dür.
          Bütün kuvvetler aynı diske gider; yalnızca ölçek ve 90°’lik adımlar değişir.
        </p>
      </Step>
      <Step
        title="Üstel: her düzlemde bağımsız dönme"
        why="eᵗᴷ = Σ tᵏKᵏ/k!, kuvvetler Adım 6’dan. Her blokta Σ (λt)ᵏJᵏ/k! = cos(λt) I + sin(λt) J (J² = −I ile çift/tek terimler ayrılır). Çekirdekte yalnızca k = 0 terimi kalır: 1. Sonuç ortogonaldir ve determinantı 1’dir."
      >
        <Tex block tex="e^{tK}=Q\,\operatorname{blockdiag}\bigl(R(\lambda_1t),\dots,R(\lambda_mt),\ I\bigr)\,Q^{\mathsf T},\qquad R(\theta)=\begin{bmatrix}\cos\theta&-\sin\theta\\ \sin\theta&\cos\theta\end{bmatrix}" />
        <p>3B’de Adım 9’daki çevrim seriyi iki terime indirir (Rodrigues formülü):</p>
        <Tex block tex="e^{t[\omega]_\times}=I+\frac{\sin\theta}{|\omega|}[\omega]_\times+\frac{1-\cos\theta}{|\omega|^2}[\omega]_\times^2,\qquad \theta=|\omega|t" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <ul>
        <li>
          <b>so(n) ve dönme grubu.</b> Ters simetrik matrisler <Tex tex="SO(n)" />’nin Lie cebiri{' '}
          <Tex tex="\mathfrak{so}(n)" />’dir. Boyutu <Tex tex="n(n-1)/2" />, yani düzlem sayısıdır. Komütatör
          yine ters simetriktir. 3B’de <Tex tex="[\,[a]_\times,[b]_\times]=[a\times b]_\times" />: matris
          komütatörü vektörlerin çapraz çarpımıdır.
        </li>
        <li>
          <b>Açısal hız.</b> Dönen bir cismin yönelimi <Tex tex="\dot R=[\omega]_\times R" /> ile değişir. IMU
          entegrasyonunda her adımda <Tex tex="R\leftarrow R\,e^{[\omega]_\times\Delta t}" /> yapılır. Rodrigues
          formülü bunun kapalı hâlidir. Coriolis ivmesi <Tex tex="2\,\omega\times v" /> de aynı matrisle yazılır.
        </li>
        <li>
          <b>Jiroskopik terimler iş yapmaz.</b> <Tex tex="M\ddot q+(D+G)\dot q+Kq=0" /> denklemindeki{' '}
          <Tex tex="G^{\mathsf T}=-G" /> için Adım 3’ten <Tex tex="\dot q^{\mathsf T}G\dot q=0" /> çıkar. Bu terim
          enerjiyi değiştirmez, yalnızca modları birbirine bağlar (rotor dinamiğinde ileri/geri girdap).
        </li>
        <li>
          <b>Tek boyutta her zaman bir eksen vardır.</b> <Tex tex="n" /> tekse <Tex tex="\ker K\ne\{0\}" />. Bu
          yüzden 3B’de her dönmenin bir ekseni vardır, 4B’de ise genelde yoktur (iki düzlem birden döner).
        </li>
        <li>
          <b>Karmaşık yapı bağlantısı.</b> Bütün <Tex tex="\lambda_j" /> 1’e eşitse <Tex tex="K^2=-I" /> olur. Bu
          durum “M² = −I” konusundaki <Tex tex="J" /> ve kuaterniyon matrislerinin ta kendisidir; o sayfadaki{' '}
          <Tex tex="L_i, L_j, L_k" /> hepsi ters simetriktir.
        </li>
        <li>
          <b>Cayley dönüşümü.</b> <Tex tex="(I-K)^{-1}(I+K)" /> de ortogonaldir (<Tex tex="I-K" /> her zaman
          terslenebilir, çünkü özdeğerleri <Tex tex="1-i\lambda\ne0" />). Üstelden ucuzdur ve sayısal
          entegratörlerde dönmeyi korumak için kullanılır.
        </li>
      </ul>
      <Callout title="Sayısal not">
        Normal form (<Tex tex="Q" />, <Tex tex="\lambda_j" />) <Tex tex="K^{\mathsf T}K" />’nın Jacobi özdeğer
        ayrışımından kurulur. Görseldeki her matris kontrol edilir: <Tex tex="K^{\mathsf T}=-K" />, kuvvetlerin
        paritesi, 3B’de <Tex tex="K^3=-|\omega|^2K" />, ve <Tex tex="e^{tK}" /> için hem ortogonallik hem de
        bağımsız bir sayısal matris üsteliyle fark. Testler aynı özdeşlikleri 2’den 6 boyuta kadar doğrular.
      </Callout>
    </div>
  );
}
