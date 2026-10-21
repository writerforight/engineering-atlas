import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <p className="prose">
      Bir sinüsün türevi yine aynı frekansta bir sinüstür: <Tex tex="\frac{d}{dt}\sin\omega t=\omega\cos\omega t" />. Genlik{' '}
      <Tex tex="\omega" /> kat büyür, dalga çeyrek periyot (90°) öne kayar. Her sinyal sinüslerin toplamı olduğuna göre türev
      spektrumda her bileşeni ayrı ayrı <Tex tex="i\omega" /> ile çarpmaktan ibarettir: <Tex tex="|\omega|" /> genliği, <Tex tex="i" />{' '}
      fazı taşır. Yüksek frekanslar en çok büyür; gürültünün türevde patlamasının nedeni budur. İntegral her bileşeni{' '}
      <Tex tex="i\omega" />’ya böler: yüksek frekansları bastırır, fazı 90° geri alır.
    </p>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Ters dönüşümden başla" why="Fourier ters dönüşümünün tanımı: f, e^{iωt} bileşenlerinin ağırlıklı toplamıdır.">
        <Tex block tex="f(t)=\frac{1}{2\pi}\int_{-\infty}^{\infty}F(\omega)\,e^{i\omega t}\,d\omega" />
      </Step>
      <Step title="Türevi integralin içine al" why="t’ye göre türev ω’ya göre integralle yer değiştirir (F yeterince hızlı sönüyorsa); yalnız üstel terim t’ye bağlı.">
        <Tex block tex="f'(t)=\frac{1}{2\pi}\int F(\omega)\,\frac{\partial}{\partial t}e^{i\omega t}\,d\omega=\frac{1}{2\pi}\int \big(i\omega F(\omega)\big)e^{i\omega t}\,d\omega" />
      </Step>
      <Step title="Katsayıyı oku" why="Son ifade yine bir ters dönüşüm; içindeki fonksiyon f′’nün spektrumu olmak zorunda (dönüşüm birebir).">
        <Tex block tex="\mathcal F\{f'\}(\omega)=i\omega\,F(\omega)" />
      </Step>
      <Step title="Genlik ve faz" why="i = e^{iπ/2}; sgn(ω)·|ω| = ω olduğundan çarpanın modülü |ω|, argümanı sgn(ω)·π/2.">
        <Tex block tex="|\mathcal F\{f'\}|=|\omega|\,|F|,\qquad \arg\mathcal F\{f'\}-\arg F=\operatorname{sgn}(\omega)\,\frac{\pi}{2}" />
      </Step>
      <Step title="İntegral: tersini al" why="g = ∫f ise g′ = f, yani iωG = F. ω = 0’da bölünemez: DC bileşeni (ortalama) ayrıca ele alınmalı.">
        <Tex block tex="\mathcal F\Big\{\int f\Big\}(\omega)=\frac{F(\omega)}{i\omega},\quad \omega\neq0\qquad\Rightarrow\qquad |G|=\frac{|F|}{|\omega|},\ \ \Delta\arg=-\operatorname{sgn}(\omega)\frac{\pi}{2}" />
      </Step>
      <Step title="Örneklenmiş sinyalde: DFT ve ω ızgarası" why="N örnek, aralık Tₛ: DFT f’nin T = NTₛ periyodik uzatmasını görür ve k. bin ω_k frekansındadır; k > N/2 negatif frekanslardır.">
        <Tex block tex="X_k=\sum_{n=0}^{N-1}x_n e^{-2\pi i kn/N},\qquad \omega_k=\frac{2\pi}{NT_s}\begin{cases}k,&k<N/2\\k-N,&k\ge N/2\end{cases}" />
      </Step>
      <Step title="Spektral türev" why="Bant sınırlı periyodik f için aynı türetme DFT toplamında da geçerli. Nyquist bini ±ω_N’nin ortak kopyasıdır; iω orada tek değer alamaz, sıfırlanır.">
        <Tex block tex="x'_n=\mathrm{IDFT}\{i\omega_k X_k\},\qquad X_{N/2}:=0" />
      </Step>
      <Step title="Sonlu fark neden eksik türevler" why="Geri fark bir gecikme farkıdır: x[n−1]’in DFT’si e^{−iωTₛ}X. Çarpanı iω ile kıyasla.">
        <Tex block tex="\frac{x_n-x_{n-1}}{T_s}\ \longleftrightarrow\ \frac{1-e^{-i\omega T_s}}{T_s}X=\frac{2}{T_s}\sin\!\Big(\frac{\omega T_s}{2}\Big)e^{\,i(\pi/2-\omega T_s/2)}X" />
        <p className="prose">
          Küçük <Tex tex="\omega T_s" /> için <Tex tex="\tfrac{2}{T_s}\sin(\omega T_s/2)\approx\omega" />. Nyquist’e doğru
          sinüs düzleşir: yüksek frekansta kazanç <Tex tex="|\omega|" />’nın altında kalır, faz da <Tex tex="\pi/2" />’den{' '}
          <Tex tex="\omega T_s/2" /> kadar sapar (yarım örnek gecikme).
        </p>
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Sızıntı.</b> DFT sinyali pencere uzunluğunda periyodik sayar. Pencerede tam sayıda periyot yoksa periyodik uzatma
        kenarda sıçrar; bu sıçramanın spektrumu <Tex tex="1/\omega" /> ile sönen, bütün binlere yayılan bir kuyruktur. Türev onu{' '}
        <Tex tex="\omega" /> ile çarpar ve kenarda bir darbeye (Gibbs salınımına) dönüşür. Çare: tam periyot, uçlarda sönen sinyal
        ya da pencereleme.
      </p>
      <p>
        <b>Faz yalnız enerjisi olan binlerde anlamlıdır.</b> Bir binde sadece yuvarlama hatası (<Tex tex="\sim10^{-16}\max|F|" />)
        varsa onun açısı rastgeledir. Bu yüzden C ve D grafikleri <Tex tex="|F|>10^{-6}\max|F|" /> binlerini çizer.
      </p>
      <p>
        <b>Gürültü.</b> Türev yüksek frekans yükselticisidir. Ölçülmüş bir sinyalin türevini almadan önce süzgeç (alçak geçiren) ya
        da düzgünleştirici bir türev (ör. Savitzky–Golay) kullanmak bu yüzden standarttır. İntegral ise alçak geçiren bir süzgeçtir.
      </p>
      <p>
        <b>Genelleme.</b> Laplace tarafında aynı kural <Tex tex="\mathcal L\{f'\}=sF(s)-f(0^-)" /> olur; Fourier’de başlangıç terimi
        yoktur, çünkü sinyal iki yönlü ve sönümlüdür. Bir türev operatörü, frekans tanım kümesinde <Tex tex="i\omega" /> ile çarpan bir
        çarpma operatörüdür: diferansiyel denklemler bu yüzden spektrumda cebirsel denklemlere dönüşür.
      </p>
    </div>
  );
}
