import { Callout, Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <p className="prose">
      Bir vektör alanı her noktaya bir ok koyar. Bu oku hangi birim vektörlerle yazdığın koordinat sistemine bağlıdır:
      kutupsalda <Tex tex="\mathbf e_r" /> ve <Tex tex="\mathbf e_\varphi" /> noktadan noktaya döner, ama ok aynı oktur. Bir P
      noktasının çevresine R yarıçaplı küçük bir çember (3B’de küre) çiz. Alanın çemberden <b>dışarı taşan</b> kısmını
      toplarsan akıyı, çember <b>boyunca</b> ilerleyen kısmını toplarsan sirkülasyonu bulursun. Bu iki sayıyı çemberin
      kapladığı alana bölüp R’yi küçültünce geriye yalnız P’ye ait iki sayı kalır: diverjans (nokta ne kadar kaynak)
      ve rotasyon (nokta çevresinde ne kadar dönme var).
    </p>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Alanı yerel birim vektörlerle yaz" why="Bileşenler koordinatların fonksiyonu; birim vektörler de (Kartezyen dışında) konuma bağlı.">
        <Tex block tex="\mathbf F=F_1(q_1,q_2,q_3)\,\mathbf e_1+F_2(q_1,q_2,q_3)\,\mathbf e_2+F_3(q_1,q_2,q_3)\,\mathbf e_3" />
        <Tex block tex="\text{kutupsal: }\mathbf e_r=(\cos\varphi,\sin\varphi),\quad\mathbf e_\varphi=(-\sin\varphi,\cos\varphi)" />
        <Tex block tex="\text{küresel: }\mathbf e_r=(\sin\vartheta\cos\varphi,\sin\vartheta\sin\varphi,\cos\vartheta)" />
        <Tex block tex="\mathbf e_\vartheta=(\cos\vartheta\cos\varphi,\cos\vartheta\sin\varphi,-\sin\vartheta),\quad\mathbf e_\varphi=(-\sin\varphi,\cos\varphi,0)" />
      </Step>
      <Step title="Akı ve sirkülasyon" why="Sınırda alanı iki parçaya ayır: dış normal n boyunca olan ve teğet t boyunca olan.">
        <Tex block tex="\Phi_R=\oint\mathbf F\cdot\mathbf n\,ds\;\;(\text{3B: }\oiint\mathbf F\cdot\mathbf n\,dA),\qquad\Gamma_R=\oint\mathbf F\cdot d\mathbf l=\oint\mathbf F\cdot\mathbf t\,ds" />
      </Step>
      <Step title="Diverjans ve rotasyon: birim hacim / alan başına limit" why="Tanım koordinat sisteminden bağımsız; sayfadaki oranlar tam olarak bunlar.">
        <Tex block tex="\nabla\cdot\mathbf F\,(P)=\lim_{R\to0}\frac{\Phi_R}{V_R},\qquad(\nabla\times\mathbf F)\cdot\mathbf n\,(P)=\lim_{R\to0}\frac{\Gamma_R}{\pi R^2}" />
        <p className="prose">
          2B’de <Tex tex="V_R=\pi R^2" />, 3B’de <Tex tex="V_R=\tfrac43\pi R^3" />. Sirkülasyon çemberi n’ye göre sağ el yönünde dolaşılır.
        </p>
      </Step>
      <Step title="Gauss ve Stokes" why="Limit almadan, sonlu R için de akı ve sirkülasyon içerideki diverjans ve rotasyonun toplamıdır.">
        <Tex block tex="\Phi_R=\int_{V_R}\nabla\cdot\mathbf F\,dV,\qquad\Gamma_R=\int_{A_R}(\nabla\times\mathbf F)\cdot\mathbf n\,dA" />
      </Step>
      <Step title="Eğrisel koordinatlarda formüller" why="Birim vektörler de türev aldığından Kartezyen formül bileşenlere doğrudan uygulanamaz.">
        <Tex block tex="\text{silindirik: }\nabla\cdot\mathbf F=\frac1r\frac{\partial(rF_r)}{\partial r}+\frac1r\frac{\partial F_\varphi}{\partial\varphi}+\frac{\partial F_z}{\partial z}" />
        <Tex block tex="(\nabla\times\mathbf F)_z=\frac1r\Big(\frac{\partial(rF_\varphi)}{\partial r}-\frac{\partial F_r}{\partial\varphi}\Big)" />
        <Tex block tex="\text{küresel: }\nabla\cdot\mathbf F=\frac1{r^2}\frac{\partial(r^2F_r)}{\partial r}+\frac1{r\sin\vartheta}\frac{\partial(\sin\vartheta\,F_\vartheta)}{\partial\vartheta}+\frac1{r\sin\vartheta}\frac{\partial F_\varphi}{\partial\varphi}" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <>
      <p className="prose">
        Sayfa diverjans ve rotasyonu, alanı Kartezyen bileşenlere çevirip merkezi farkla hesaplar; akı ve sirkülasyon
        çember/küre üzerinde sayısal integraldir. Bu yüzden hangi koordinat sistemini seçersen seç aynı alan aynı sonucu verir.
      </p>
      <Callout kind="info" title="Denenecek üç şey">
        Kutupsal <Tex tex="\mathbf F=\mathbf e_r/r" />: orijin dışında diverjans 0, ama çember orijini içine alınca akı hep{' '}
        <Tex tex="2\pi" />. Silindirik <Tex tex="\mathbf F=\mathbf e_\varphi/r" /> (akım taşıyan tel): rotasyon 0, eksen çemberin
        içindeyse sirkülasyon <Tex tex="2\pi" />. Küresel <Tex tex="\mathbf F=\mathbf e_r/r^2" /> (nokta yük): küre yükü içeriyorsa
        akı <Tex tex="4\pi" />, içermiyorsa 0.
      </Callout>
    </>
  );
}
