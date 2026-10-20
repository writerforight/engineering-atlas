import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Bir <Tex tex="\omega" /> vektörü ile çapraz çarpım doğrusal bir işlemdir. O hâlde bir matrisi olmalı:{' '}
        <Tex tex="[\omega]_\times v=\omega\times v" />. Bu matris <b>ters simetriktir</b> (
        <Tex tex="K^{\mathsf T}=-K" />). Tersi de doğrudur: her 3×3 ters simetrik matris tam olarak bir vektörün
        çapraz çarpım matrisidir.
      </p>
      <p>
        <Tex tex="\dot v=\omega\times v" /> denklemi, <Tex tex="\omega" /> açısal hızıyla dönen bir cismin
        noktalarının hızıdır. Çözümü <Tex tex="v(t)=e^{t[\omega]_\times}v_0" />: vektör, <Tex tex="\omega" />{' '}
        ekseni etrafında <Tex tex="|\omega|" /> hızıyla döner. Üstel seri kapalı forma iner, çünkü{' '}
        <Tex tex="[\omega]_\times" />’in kuvvetleri iki matris arasında gidip gelir (Rodrigues formülü).
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Çapraz çarpımı matris olarak yaz"
        why="Çapraz çarpımın bileşen tanımı: ω × v = (ω_y v_z − ω_z v_y, ω_z v_x − ω_x v_z, ω_x v_y − ω_y v_x). Her satır v’nin bileşenlerinin doğrusal birleşimi; katsayıları satır satır okumak matrisi verir."
      >
        <Tex block tex="[\omega]_\times=\begin{bmatrix}0&-\omega_z&\omega_y\\ \omega_z&0&-\omega_x\\ -\omega_y&\omega_x&0\end{bmatrix},\qquad [\omega]_\times v=\omega\times v" />
      </Step>
      <Step
        title="Ters simetri"
        why="Matrise bakınca (i,j) ve (j,i) elemanlarının zıt işaretli, köşegenin sıfır olduğu görülür. Eşdeğer olarak: u·(ω×v) = −v·(ω×u) (karışık çarpımın bir çift vektörü yer değiştirince işaret değiştirmesi)."
      >
        <Tex block tex="[\omega]_\times^{\mathsf T}=-[\omega]_\times" />
      </Step>
      <Step
        title="Kare: eksene izdüşüm eksi birim"
        why="Üçlü çapraz çarpım (BAC−CAB) özdeşliği: a×(b×c) = b(a·c) − c(a·b). a = b = ω, c = v alınır."
      >
        <Tex block tex="[\omega]_\times^2 v=\omega\times(\omega\times v)=\omega(\omega\cdot v)-|\omega|^2v\;\Longrightarrow\;[\omega]_\times^2=\omega\omega^{\mathsf T}-|\omega|^2I" />
      </Step>
      <Step
        title="Küp: kuvvetler kapanır"
        why="Adım 3’teki ifadeyi K ile çarp. K ω = ω × ω = 0 olduğundan ωωᵀ terimi düşer."
      >
        <Tex block tex="[\omega]_\times^3=[\omega]_\times(\omega\omega^{\mathsf T}-|\omega|^2I)=-|\omega|^2[\omega]_\times" />
        <Tex block tex="[\omega]_\times^{2k+1}=(-|\omega|^2)^k[\omega]_\times,\qquad [\omega]_\times^{2k+2}=(-|\omega|^2)^k[\omega]_\times^2" />
      </Step>
      <Step
        title="Üstel seriyi topla: Rodrigues formülü"
        why="e^{X} = Σ Xⁿ/n! tanımı, Adım 4’teki kuvvetlerle birlikte. K̂ = [ω/|ω|]× ve θ = t|ω| alınınca tek kuvvetlerin katsayıları sin θ serisini, çift kuvvetlerinkiler 1 − cos θ serisini verir."
      >
        <Tex block tex="e^{t[\omega]_\times}=I+\Big(\theta-\frac{\theta^3}{3!}+\dots\Big)\hat K+\Big(\frac{\theta^2}{2!}-\frac{\theta^4}{4!}+\dots\Big)\hat K^2=I+\sin\theta\,\hat K+(1-\cos\theta)\,\hat K^2" />
      </Step>
      <Step
        title="Bu bir dönmedir"
        why="(e^{tK})ᵀ = e^{tKᵀ} = e^{−tK}, yani RᵀR = e^{−tK}e^{tK} = I (K kendisiyle değişir). det e^{tK} = e^{t·tr K} = e⁰ = 1. Eksen sabit kalır, çünkü Kω = 0 ⇒ e^{tK}ω = ω."
      >
        <Tex block tex="R(t)^{\mathsf T}R(t)=I,\qquad \det R(t)=1,\qquad R(t)\,\omega=\omega" />
      </Step>
      <Step
        title="Geometrik okuma"
        why="v’yi eksene paralel v∥ = ω̂(ω̂·v) ve dik v⊥ = v − v∥ parçalarına ayır. Adım 3’e göre K̂²v = −v⊥ ve K̂v = ω̂ × v⊥. Bunları Rodrigues’e koy."
      >
        <Tex block tex="R\,v=v_\parallel+\cos\theta\,v_\perp+\sin\theta\,(\hat\omega\times v_\perp)" />
        <p>
          Paralel kısım yerinde kalır. Dik kısım, <Tex tex="v_\perp" /> ve <Tex tex="\hat\omega\times v_\perp" />{' '}
          ile gerilen düzlemde <Tex tex="\theta" /> kadar döner. Görseldeki yeşil ok (
          <Tex tex="\omega\times v" />) çembere teğettir, mor ok (<Tex tex="\omega\times(\omega\times v)" />) ise
          çemberin merkezine, yani eksene doğrudur.
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
          <b>so(3) ve SO(3).</b> 3×3 ters simetrik matrisler, dönme grubu SO(3)’ün Lie cebiri so(3)’tür. Üstel
          fonksiyon cebirden gruba gider: her dönme bir <Tex tex="e^{[\omega]_\times}" />’dir (eksen–açı
          gösterimi).
        </li>
        <li>
          <b>Komütatör = çapraz çarpım.</b>{' '}
          <Tex tex="\big[[a]_\times,[b]_\times\big]=[a\times b]_\times" />. İki küçük dönmeyi farklı sırada yapmanın
          farkı, eksenlerinin çapraz çarpımı etrafında küçük bir dönmedir.
        </li>
        <li>
          <b>Rijit cisim kinematiği.</b> <Tex tex="\dot R=[\omega]_\times R" />. Robotik, dron tutum kontrolü ve
          IMU entegrasyonunda dönme matrisi tam olarak bu Rodrigues adımıyla ilerletilir.
        </li>
        <li>
          <b>2B ile bağı.</b> 2B’de tek bir ters simetrik yön vardır: <Tex tex="\omega J" />, burada{' '}
          <Tex tex="J=\begin{bmatrix}0&-1\\1&0\end{bmatrix}" />. Bu, “M² = −I” konusundaki <Tex tex="J" />’dir.{' '}
          <Tex tex="|\omega|=1" /> için 3B’de de <Tex tex="\hat K^2" /> eksene dik düzlemde <Tex tex="-I" />{' '}
          gibi davranır.
        </li>
      </ul>
    </div>
  );
}
