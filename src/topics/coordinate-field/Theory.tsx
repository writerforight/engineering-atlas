import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Bir koordinat sistemi, parametrelerden (<Tex tex="a,b,\dots" />) uzaydaki noktalara giden bir eşlemedir:{' '}
        <Tex tex="F(a,b)=(x,y)" />. Kartezyen sistemde <Tex tex="x=a,\;y=b" />; kutupsal sistemde{' '}
        <Tex tex="x=a\cos b,\;y=a\sin b" />. Eşit aralıklı parametre ızgarası, F’den geçince eğri bir ağa dönüşür. Yeni
        koordinat sistemi bu ağın kendisidir.
      </p>
      <p>
        Bunun üstüne bir skaler fonksiyon <Tex tex="T" /> koyunca her noktaya bir sayı düşer: sıcaklık, potansiyel, yükseklik
        gibi. T’yi ister parametrelerle ister yeni koordinatlarla yaz; ikisi de aynı noktaya aynı değeri verir, çünkü{' '}
        <Tex tex="T(a,b)=T\big(F(a,b)\big)" />.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Koordinat sistemi bir eşlemedir"
        why="Tanım: her boyut için bir bileşen fonksiyonu yazılır. n parametre, n koordinat verir."
      >
        <Tex block tex="F:\mathbb{R}^n\to\mathbb{R}^n,\qquad (a,b,c)\;\mapsto\;\big(f_1(a,b,c),\,f_2(a,b,c),\,f_3(a,b,c)\big)=(x,y,z)" />
      </Step>
      <Step
        title="Skaler alan, bileşke olarak"
        why="T yeni koordinatlarda tanımlıysa, bir parametre noktasındaki değeri bulmak için önce F ile o noktanın koordinatlarını hesaplar, sonra T’ye verirsin. Bu fonksiyon bileşkesidir."
      >
        <Tex block tex="T(a,b)=(T\circ F)(a,b)=T\big(f_1(a,b),\,f_2(a,b)\big)" />
      </Step>
      <Step
        title="Izgara çizgileri: koordinat eğrileri"
        why="Bir parametreyi sabit tutup diğerini değiştirince F bir eğri çizer. 2B grafikteki zemin ağı tam olarak bu eğrilerden oluşur (mavi: a = sabit, mor: b = sabit)."
      >
        <Tex block tex="\gamma_{a_0}(b)=F(a_0,b),\qquad \gamma_{b_0}(a)=F(a,b_0)" />
      </Step>
      <Step
        title="2B: yüzey ve gölgelendirme"
        why="Yüzey noktaları P(a,b) = (x, y, T). Küçük bir ızgara hücresinin iki köşegeninin çapraz çarpımı, yüzeyin o hücredeki normalini verir. Işık yönü L ile normal arasındaki açının kosinüsü (Lambert yasası) parlaklığı belirler."
      >
        <Tex block tex="N\approx(P_{i+1,j+1}-P_{i,j})\times(P_{i,j+1}-P_{i+1,j}),\qquad \text{parlaklık}\propto\frac{|N\cdot L|}{|N|}" />
      </Step>
      <Step
        title="3B: dört sayı, üç eksen"
        why="3 parametreli bir koordinat sisteminde her noktanın (x, y, z) konumu ve bir T değeri vardır, yani 4 sayı. Ekranda 3 eksen olduğundan birinden vazgeçmek gerekir. Seçenek 1: konumu koru, T’yi renkle göster."
      >
        <Tex block tex="(x,y,z,T)\;\to\;\text{konum }(x,y,z),\;\text{renk }T" />
      </Step>
      <Step
        title="3B: SVD ile en büyük iki yön"
        why="Noktaların ortalamasını çıkarıp N×3 veri matrisi X’i kur. SVD, X = UΣVᵀ. V’nin ilk iki sütunu, izdüşüm sonrası yayılımı (kareler toplamını) en büyük tutan iki dik yöndür. Kalan yayılım σ₃², kaybolan bilgidir. Seçenek 2: noktaları bu düzleme izdüşür, T’yi yükseklik yap."
      >
        <Tex block tex="X=U\Sigma V^{\mathsf T},\qquad (p_1,p_2)=\big((x-\mu)\cdot v_1,\;(x-\mu)\cdot v_2\big),\qquad \text{korunan}=\frac{\sigma_1^2+\sigma_2^2}{\sigma_1^2+\sigma_2^2+\sigma_3^2}" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Formül yazımı.</b> <code>+ - * / ^</code>, parantez ve örtük çarpım (<code>2a</code>, <code>a cos(b)</code>,{' '}
        <code>2pi</code>). Fonksiyonlar: sin, cos, tan, cot, sec, csc, asin, acos, atan, atan2(y, x), sinh, cosh, tanh,
        asinh, acosh, atanh, exp, ln (doğal), log (10 tabanı), log2, sqrt, cbrt, abs, sign, floor, ceil, round, pow, mod,
        min, max, hypot. Sabitler: pi (π), e, tau. Bilinmeyen bir ad yazınca hangi değişkenlerin kullanılabileceği
        gösterilir.
      </p>
      <p>
        <b>Tekil noktalar.</b> F bazı yerlerde ızgarayı ezebilir. Örneğin kutupsal sistemde <Tex tex="a=0" /> çizgisinin
        tamamı tek bir noktaya gider. Orada Jacobian determinantı sıfırdır (<Tex tex="\det J=a" />) ve koordinatlar
        noktayı tek başına belirlemez.
      </p>
      <p>
        <b>SVD izdüşümü ne zaman işe yarar?</b> Nokta bulutu kalın bir hacmi dolduruyorsa (küre kabuğu gibi), üçüncü yönü
        atınca farklı noktalar üst üste düşer. Korunan yayılım %100’e yakınsa bulut neredeyse bir düzlemdedir ve izdüşüm
        sadık kalır.
      </p>
    </div>
  );
}
