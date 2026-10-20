import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        <Tex tex="V=[v]_\times" /> ters simetrik matrisinin üsteli <Tex tex="e^{V\omega t}" /> bir dönmedir: eksen{' '}
        <Tex tex="v" />, açı <Tex tex="\theta=|v|\,\omega t" />. Ama bu sonuç tek hamlede gelmez. Taylor açılımı terimleri
        tek tek ekler: <Tex tex="I" />, sonra <Tex tex="\omega t\,V" />, sonra <Tex tex="\tfrac{(\omega t)^2}{2}V^2" />…
      </p>
      <p>
        Her kısmi toplam <Tex tex="S_N" /> ayrı bir doğrusal dönüşümdür ve uzayı kendince büker. İlk birkaç terimde ızgara
        esner, şişer ya da büzülür (<Tex tex="\det S_N\ne1" />). Terim ekledikçe bükülme düzelir ve uzay katı bir dönmeye
        oturur. <Tex tex="\omega t" /> büyüdükçe bunun için daha çok terim gerekir.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Üstel fonksiyonun Taylor açılımı"
        why="e^x = Σ xⁿ/n! açılımı kare matrisler için de aynen tanımlıdır ve her matris için yakınsar. x yerine Vωt koyuyoruz."
      >
        <Tex block tex="e^{V\omega t}=\sum_{n=0}^{\infty}\frac{(\omega t)^n}{n!}V^n,\qquad S_N=\sum_{n=0}^{N}\frac{(\omega t)^n}{n!}V^n" />
      </Step>
      <Step
        title="Eksen ve açıyı ayır"
        why="v = |v| v̂ yaz. Ters simetrik matris doğrusal olduğundan V = |v| K, K = [v̂]×. Böylece Vωt = θK, θ = |v|ωt."
      >
        <Tex block tex="V\omega t=\theta K,\qquad K=[\hat v]_\times,\qquad \theta=|v|\,\omega t" />
      </Step>
      <Step
        title="K’nın kuvvetleri döngüye girer"
        why="Birim vektör için K³ = −K (çünkü [ω]×³ = −|ω|²[ω]× ve |v̂| = 1). Bu yüzden tek kuvvetler ±K’ya, çift kuvvetler ±K²’ye indirgenir."
      >
        <Tex block tex="K^{2m+1}=(-1)^mK,\qquad K^{2m+2}=(-1)^mK^2\quad(m\ge0)" />
      </Step>
      <Step
        title="Terimleri K ve K² etrafında topla"
        why="Açılımdaki her terimi 3. adımla yeniden yaz. K’nın katsayıları sin θ’nın serisini, K²’nin katsayıları 1 − cos θ’nın serisini oluşturur."
      >
        <Tex block tex="e^{\theta K}=I+\Big(\theta-\frac{\theta^3}{3!}+\frac{\theta^5}{5!}-\dots\Big)K+\Big(\frac{\theta^2}{2!}-\frac{\theta^4}{4!}+\dots\Big)K^2" />
      </Step>
      <Step
        title="Rodrigues formülü"
        why="Parantezler tam olarak sin θ ve 1 − cos θ’nın Taylor serileridir."
      >
        <Tex block tex="e^{V\omega t}=I+\sin\theta\,K+(1-\cos\theta)\,K^2" />
        <p>
          <Tex tex="S_N" /> bu iki serinin ilk terimlerini kesmektir. Fark, <Tex tex="\theta^{N+1}/(N+1)!" /> mertebesindedir;
          yani hata <Tex tex="N" /> büyüdükçe faktöriyel hızla söner.
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
          <b>Görselde ne izliyorsun?</b> Soluk ızgara orijinal uzay. Renkli ızgara, <Tex tex="N" /> düğmesiyle seçtiğin
          kısmi toplam <Tex tex="S_N" /> uygulanmış hâli. Düğmelere sırayla tıklamak terimleri üst üste bindirmektir.
        </li>
        <li>
          <b>N = 1:</b> <Tex tex="I+\omega t\,V" /> küçük açı yaklaşımıdır. Her nokta dairenin teğeti boyunca kayar, bu
          yüzden uzay biraz şişer: <Tex tex="\det(I+\theta K)=1+\theta^2" />.
        </li>
        <li>
          <b>Eksen hep sabit.</b> <Tex tex="Vv=0" /> olduğundan her kısmi toplam <Tex tex="v" /> doğrultusunu yerinde
          bırakır; bükülme yalnızca <Tex tex="v" />’ye dik düzlemde olur.
        </li>
        <li>
          <b>ω ve t ayrı ayrı değil, çarpım olarak girer.</b> Görüntü yalnızca <Tex tex="\theta=|v|\,\omega t" />’ye
          bağlıdır. <Tex tex="\omega" /> işaret değiştirince dönme yönü tersine döner.
        </li>
      </ul>
    </div>
  );
}
