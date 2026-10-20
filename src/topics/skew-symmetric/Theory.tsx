import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Bir <Tex tex="\omega" /> vektörüyle çapraz çarpım doğrusal bir işlemdir. O yüzden bir matrisle yazılabilir:{' '}
        <Tex tex="[\omega]_\times v=\omega\times v" />. Bu matris <b>ters simetriktir</b>:{' '}
        <Tex tex="[\omega]_\times^{\mathsf T}=-[\omega]_\times" />.
      </p>
      <p>
        Uzaya uygulandığında üç şey yapar. <Tex tex="\omega" /> doğrultusunu sıfıra ezer (
        <Tex tex="\omega\times\omega=0" />). Geri kalan her şeyi <Tex tex="\omega" />’ya dik düzleme yassıltır. O
        düzlemde 90° döndürüp <Tex tex="|\omega|" /> ile ölçekler. Kuvvet almak bu işlemi tekrarlamaktır: her{' '}
        <Tex tex="k" /> bir 90° daha çevirir, 4 adımda düzlemde başa dönülür.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Çapraz çarpımı matris olarak yaz"
        why="Çapraz çarpımın bileşen tanımı: ω × v = (ω_y v_z − ω_z v_y, ω_z v_x − ω_x v_z, ω_x v_y − ω_y v_x). Her satır v’nin bileşenlerinin doğrusal birleşimidir; katsayıları satır satır okumak matrisi verir."
      >
        <Tex block tex="[\omega]_\times=\begin{bmatrix}0&-\omega_z&\omega_y\\ \omega_z&0&-\omega_x\\ -\omega_y&\omega_x&0\end{bmatrix},\qquad [\omega]_\times v=\omega\times v" />
      </Step>
      <Step
        title="Ters simetri"
        why="Matristeki (i,j) ve (j,i) elemanları zıt işaretli, köşegen sıfır. Eşdeğer olarak u·(ω×v) = −v·(ω×u): karışık çarpımda iki vektör yer değiştirince işaret değişir."
      >
        <Tex block tex="[\omega]_\times^{\mathsf T}=-[\omega]_\times" />
      </Step>
      <Step
        title="ω doğrultusu ezilir: uzay bir düzleme çöker"
        why="Bir vektörün kendisiyle çapraz çarpımı sıfırdır. Sıfır olmayan bir vektörü sıfıra götüren matrisin determinantı 0’dır. Ayrıca ω×v her zaman ω’ya diktir, yani görüntü ω’ya dik düzlemin içindedir."
      >
        <Tex block tex="[\omega]_\times\,\omega=0,\qquad \det[\omega]_\times=0,\qquad \omega\cdot([\omega]_\times v)=0" />
      </Step>
      <Step
        title="Dik düzlemde: 90° dönme ve |ω| ile ölçek"
        why="v’yi ω’ya paralel ve dik parçalara ayır: v = v∥ + v⊥. Adım 3’e göre paralel kısım gider. v⊥ ⟂ ω olduğundan |ω × v⊥| = |ω||v⊥| (sin 90° = 1). ω × v⊥ hem ω’ya hem v⊥’ye diktir, yani düzlem içinde v⊥’den 90° dönmüştür."
      >
        <Tex block tex="[\omega]_\times v=\omega\times v_\perp,\qquad |\omega\times v_\perp|=|\omega|\,|v_\perp|,\qquad (\omega\times v_\perp)\perp v_\perp" />
      </Step>
      <Step
        title="İkinci kuvvet: düzleme izdüşüm, 180°"
        why="Üçlü çapraz çarpım özdeşliği a×(b×c) = b(a·c) − c(a·b), a = b = ω ve c = v ile. ωωᵀ/|ω|² ω yönüne izdüşümdür; I’dan çıkarınca dik düzleme izdüşüm (P⊥) kalır."
      >
        <Tex block tex="[\omega]_\times^2=\omega\omega^{\mathsf T}-|\omega|^2I=-|\omega|^2P_\perp,\qquad P_\perp=I-\frac{\omega\omega^{\mathsf T}}{|\omega|^2}" />
        <p>
          Yani <Tex tex="k=2" />: düzleme yassılt, <Tex tex="-1" /> ile çarp (düzlemde 180°), <Tex tex="|\omega|^2" />{' '}
          ile ölçekle.
        </p>
      </Step>
      <Step
        title="Kuvvetler döngüye girer"
        why="Adım 5’i [ω]× ile çarp: [ω]×ωωᵀ = (ω×ω)ωᵀ = 0, geriye −|ω|²[ω]× kalır. Bunu tekrar tekrar uygulamak genel formülü verir."
      >
        <Tex block tex="[\omega]_\times^3=-|\omega|^2[\omega]_\times" />
        <Tex block tex="[\omega]_\times^{2m+1}=(-|\omega|^2)^m[\omega]_\times,\qquad [\omega]_\times^{2m+2}=(-|\omega|^2)^m[\omega]_\times^2" />
      </Step>
      <Step
        title="k’ıncı kuvvetin geometrisi"
        why="Adım 4: her çarpım düzlemde 90° döndürür ve |ω| ile ölçekler; paralel kısım ilk adımda zaten gitmiştir. k adım bunu k kez yapar."
      >
        <Tex block tex="[\omega]_\times^k\,v=|\omega|^k\,\mathrm{Rot}_{\hat\omega}(90^\circ\!\cdot k)\,v_\perp\qquad(k\ge1)" />
        <p>
          <Tex tex="k=1,2,3,4" /> sırasıyla 90°, 180°, 270°, 360° demektir. <Tex tex="k=4" />’te düzlem kendi üstüne
          gelir: <Tex tex="[\omega]_\times^4=|\omega|^4P_\perp" />.
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
          <b>Görselde ne izliyorsun?</b> Soluk ızgara orijinal uzay, renkli ızgara{' '}
          <Tex tex="[\omega]_\times^k" /> uygulanmış hâli. <Tex tex="k\ge1" /> için bütün ızgara gri diske, yani <Tex tex="\omega" />’ya dik düzleme
          yapışır. <Tex tex="\omega" /> boyunca uzanan çizgiler tek bir noktaya çöker.
        </li>
        <li>
          <b>Normalize etmek.</b> <Tex tex="|\omega|^k" /> hızlı büyür ya da küçülür. Kutucuk işaretliyken ölçek
          bölünür; geriye sadece yassılma ve dönme kalır.
        </li>
        <li>
          <b>Komütatör = çapraz çarpım.</b> <Tex tex="\big[[a]_\times,[b]_\times\big]=[a\times b]_\times" />. 3×3
          ters simetrik matrisler, çapraz çarpımla birlikte <Tex tex="\mathbb R^3" />’ün aynısıdır (Lie cebiri
          so(3)).
        </li>
        <li>
          <b>2B ile bağı.</b> Düzlemde <Tex tex="[\omega]_\times/|\omega|" />, “M² = −I” konusundaki{' '}
          <Tex tex="J" /> gibi davranır: karesi o düzlemde <Tex tex="-I" />’dır.
        </li>
      </ul>
    </div>
  );
}
