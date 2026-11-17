import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        İçini görmediğimiz bir kutu, <Tex tex="n" /> boyutlu bir girdi vektörünü <Tex tex="m" /> boyutlu bir çıktıya
        lineer olarak çeviriyor: <Tex tex="\mathbf y = A\mathbf x" />. Kutuya bilinen girdiler verip çıktıları ölçersek
        (deneyler), bu çiftlerden <Tex tex="A" />’yı taklit eden bir <Tex tex="\hat A" /> kurabiliriz. Sonra
        <Tex tex="\hat A" />’yı SVD ile ters çevirip bir çıktıdan girdiyi tahmin ederiz.
      </p>
      <p>
        İki koşul her şeyi belirler: deneyler girdi uzayının bütün yönlerini denemiş olmalı (<Tex tex="K \ge n" />,
        bağımsız deneyler), ve kutu bilgi silmemeli (<Tex tex="m \ge n" />, rank <Tex tex="A = n" />). İlki
        sağlanmazsa <Tex tex="\hat A" /> eksik olur; ikincisi sağlanmazsa en iyi <Tex tex="\hat A" /> bile girdiyi geri veremez.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Deneyleri matrise diz" why="Her deney bir sütun. K deneyin hepsi tek bir matris denklemi olur; bilinmeyen sadece A.">
        <Tex block tex="X=[\mathbf x_1\ \cdots\ \mathbf x_K]\in\mathbb R^{n\times K},\quad Y=[\mathbf y_1\ \cdots\ \mathbf y_K]\in\mathbb R^{m\times K},\qquad Y = A X\,(+E)" />
      </Step>
      <Step title="En küçük kareler" why="Gürültü varsa Y = AX tam sağlanmaz; hatanın karelerinin toplamını en küçük yapan A aranır. Türevi sıfıra eşitlemek normal denklemleri verir.">
        <Tex block tex="\hat A=\arg\min_A\|AX-Y\|_F^2\;\Rightarrow\;\hat A\,XX^{\mathsf T}=YX^{\mathsf T}" />
      </Step>
      <Step title="Özdeğer mi, SVD mi?" why="XXᵀ (n×n) simetriktir; özdeğerleri X’in tekil değerlerinin karesidir. Özdeğer analizi sadece kare matrislere uyar; X ve A genelde kare değil, bu yüzden aynı fikrin genel hali SVD kullanılır.">
        <Tex block tex="X=U\Sigma V^{\mathsf T},\qquad XX^{\mathsf T}=U\Sigma^2U^{\mathsf T},\qquad \lambda_i(XX^{\mathsf T})=\sigma_i^2" />
      </Step>
      <Step title="Sözde ters ile çözüm" why="Sıfır olmayan σ’lar ters çevrilir, sıfır olanlar sıfır bırakılır. rank X = n ise X⁺ = Xᵀ(XXᵀ)⁻¹ ve normal denklemlerin tek çözümü budur.">
        <Tex block tex="X^{+}=V\,\Sigma^{+}U^{\mathsf T},\qquad \hat A = Y X^{+}" />
      </Step>
      <Step title="Deney az ise" why="rank X < n ise Xᵀ’nin çekirdeğinde (hiç denenmemiş yönler) Â sıfırdır. Â, A’yı sadece deneylerin gerdiği alt uzayda taklit eder.">
        <Tex block tex="\hat A = A\,P_{\mathrm{span}(X)}\quad(E=0)" />
      </Step>
      <Step title="Ters çevirme: çıktıdan girdiye" why="Â de genelde kare değil. Aynı SVD tarifiyle Â⁺ (n×m) kurulur; y’yi açıklayan en kısa x’i verir.">
        <Tex block tex="\hat A=U_A\Sigma_AV_A^{\mathsf T},\qquad \hat{\mathbf x}=\hat A^{+}\mathbf y=V_A\Sigma_A^{+}U_A^{\mathsf T}\mathbf y" />
      </Step>
      <Step title="Ne zaman tam geri gelir?" why="Â⁺Â = I_n ancak rank Â = n iken olur; bunun için m ≥ n gerekir. m < n ise Â⁺Â, satır uzayına izdüşümdür ve çekirdekteki bileşen kaybolur.">
        <Tex block tex="\hat A^{+}\hat A=\begin{cases}I_n & \operatorname{rank}\hat A=n\\ P_{\mathrm{row}(\hat A)} & \text{aksi halde}\end{cases}" />
      </Step>
      <Step title="Gürültünün büyümesi" why="y’deki bir hata Σ⁺ ile çarpılır: küçük tekil değerli yönlerde 1/σ kadar büyür. Kötü koşullu A’da girdi tahmini gürültüye çok duyarlıdır.">
        <Tex block tex="\delta\hat{\mathbf x}=\hat A^{+}\boldsymbol\varepsilon,\qquad \|\delta\hat{\mathbf x}\|\le\frac{\|\boldsymbol\varepsilon\|}{\sigma_{\min}(\hat A)}" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Senin sorduğun yol doğru mu?</b> Evet, şu düzeltmeyle: SVD’si alınan önce deney matrisi <Tex tex="X" />’tir
        (<Tex tex="\hat A = YX^{+}" />), sonra ters çevirmek için <Tex tex="\hat A" />’nın SVD’si alınır. İkisi de “SVD’nin
        tersi”, yani sözde ters. Kare ve tam ranklı durumda bu sıradan tersle aynıdır.
      </p>
      <p>
        <b>Doğrudan ters harita (adım 4).</b> Y’nin SVD’sini alıp tersi doğrudan da öğrenebiliriz: <Tex tex="\hat B = X Y^{+}" />.
        Gürültüsüz ve <Tex tex="m \ge n" /> iken <Tex tex="\hat B=\hat A^{+}" /> olur; gürültüde ikisi farklı hatayı
        küçültür.
      </p>
      <p>
        <b>Deneyleri iyi seçmek.</b> X’in tekil değerleri birbirine yakınsa (girdiler bütün yönleri eşit dener) tahmin
        gürültüye en az duyarlıdır; birbirine çok benzeyen deneyler küçük bir σ ve büyük hata verir.
      </p>
    </div>
  );
}
