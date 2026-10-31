import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        <Tex tex="N" /> örnekli bir sinyal bir vektördür: <Tex tex="\mathbf f_t=(f(t_0),\dots,f(t_{N-1}))" />. Bir frekansta
        ne kadar “cos” olduğunu bulmak, bu vektörü <Tex tex="\cos(\omega t_n)" /> vektörüyle nokta çarpmaktır. Bütün
        frekansların cos vektörlerini satır satır üst üste koyunca bir matris çıkar, <Tex tex="C" />; tek bir matris
        çarpımı bütün katsayıları birden verir.
      </p>
      <p>
        Türev, katsayılar dünyasında basit bir işlemdir: cos ile sin yer değiştirir ve <Tex tex="\omega" /> ile
        ölçeklenir. Örneklerden fark alınca bu ölçek tam <Tex tex="\omega" /> değil, yönteme göre biraz farklı bir çarpan
        olur; yüksek frekanslarda fark büyür.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Izgara" why="T uzunluğunda N eşit aralıklı örnek. DFT ızgarasındaki frekanslar, T içinde tam sayı kadar periyodu olanlardır; T = 2π seçince ω_k = k olur.">
        <Tex block tex="t_n=n\,\Delta t,\quad \Delta t=\frac{T}{N},\qquad \omega_k=\frac{2\pi k}{T},\quad k=0,\dots,\lfloor N/2\rfloor" />
      </Step>
      <Step title="Matrisin yönü: satır frekans, sütun zaman" why="Bir ω için katsayı, cos(ω t_n) vektörüyle f vektörünün nokta çarpımıdır (∫ f cos ωt dt’nin dikdörtgen kuralı). Her ω bir satır olunca K×N matris N×1 vektörü K×1 vektöre götürür.">
        <Tex block tex="\mathbf f_\omega=\Delta t\,C\,\mathbf f_t,\qquad C_{kn}=\cos(\omega_k t_n),\quad S_{kn}=\sin(\omega_k t_n)" />
      </Step>
      <Step title="Diklik ve genlik" why="DFT ızgarasında farklı satırlar diktir (geometrik serinin toplamı sıfır). Aynı satırın kendisiyle çarpımı N/2, ω = 0 ve Nyquist satırında N’dir; bu yüzden genliğe geçerken 2/T (ya da 1/T) ile çarpılır.">
        <Tex block tex="C\,S^{\mathsf T}=0,\qquad (C C^{\mathsf T})_{kk}=\tfrac N2,\qquad a_k=\tfrac{2}{T}\,(\Delta t\,C\,\mathbf f_t)_k" />
      </Step>
      <Step title="Türevin katsayıları" why="f = a cos ωt + b sin ωt’nin türevi −aω sin ωt + bω cos ωt. Yani yeni cos katsayısı eski sin katsayısının ω katı; sadece ω ile ölçeklemek yetmez, cos ile sin yer değiştirir.">
        <Tex block tex="a'_\omega=\omega\,b_\omega,\qquad b'_\omega=-\omega\,a_\omega" />
      </Step>
      <Step title="Matris dilinde: türev taban vektörüne geçer" why="f′ ≈ D f ise cᵀ(D f) = (Dᵀ c)ᵀ f. Türev operatörü, transpozu ile cos taban vektörüne uygulanmış olur.">
        <Tex block tex="a'_\omega=\Delta t\,\mathbf c_\omega^{\mathsf T}D\,\mathbf f=\Delta t\,(D^{\mathsf T}\mathbf c_\omega)^{\mathsf T}\mathbf f" />
      </Step>
      <Step title="Merkezi fark: çarpan sin(ωΔt)/Δt" why="Dairesel merkezi farkta D ters simetrik (Dᵀ = −D). cos(ω(t+Δt)) − cos(ω(t−Δt)) = −2 sin ωΔt · sin ωt toplam formülünden gelir. ωΔt küçükken sin x ≈ x, çarpan ω’ya gider; hata x²/6 kadar.">
        <Tex block tex="D^{\mathsf T}\mathbf c_\omega=\frac{\sin\omega\Delta t}{\Delta t}\,\mathbf s_\omega\approx\omega\,\mathbf s_\omega" />
      </Step>
      <Step title="Geri fark: genlik ve faz" why="(f_n − f_{n−1})/Δt’nin e^{iωt} üzerindeki etkisi (1 − e^{−iωΔt})/Δt. Bunun mutlak değeri 2 sin(ωΔt/2)/Δt, açısı (π − ωΔt)/2: 90° yerine biraz daha az döndürür, bu yüzden cos katsayısı a’ya da bağlı olur.">
        <Tex block tex="\frac{1-e^{-i\omega\Delta t}}{\Delta t}=\frac{2}{\Delta t}\sin\frac{\omega\Delta t}{2}\;e^{\,i(\pi-\omega\Delta t)/2}" />
      </Step>
      <Step title="İntegral: ω’ya bölme ve başlangıç değeri" why="Türevin tersi: a cos ωt’nin integrali (a/ω) sin ωt, b sin ωt’ninki −(b/ω) cos ωt. ω = 0 satırına bölünemez: ortalama a₀ integralde a₀·t doğrusu olur. Sabit, F(0) koşulundan seçilir.">
        <Tex block tex="A_\omega=-\frac{b_\omega}{\omega},\quad B_\omega=\frac{a_\omega}{\omega},\qquad F(t)=a_0\,t+\sum_k\big(A_k\cos\omega_k t+B_k\sin\omega_k t\big)+c,\quad F(0)=F_0" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Spektral türev neden “tam”?</b> Örneklerden kurulan trigonometrik eğri (zaman grafiğindeki ince çizgi) tam olarak
        türevlenir. Sinyal bu ızgaradaki frekanslardan oluşuyorsa sonuç tam doğrudur; kare dalga gibi süreksiz sinyallerde
        eğri örnekler arasında salınır (Gibbs) ve türevi de salınır.
      </p>
      <p>
        <b>Yamuk ve dikdörtgen kuralı.</b> Örneklerden integralde geri farkın tersi dikdörtgen kuralı (birinci mertebe),
        merkezi farkın karşılığı yamuk kuralıdır (ikinci mertebe). N’yi artırınca yamuğun hatası dört kat, dikdörtgeninki
        iki kat azalır.
      </p>
      <p>
        <b>Nyquist satırı.</b> N çiftken son satır <Tex tex="\cos(\pi n)=(-1)^n" />; onun sin eşi örneklerde sıfırdır.
        Bu satırın türevi örneklerde görünmez, bu yüzden spektral yöntem onu atar.
      </p>
    </div>
  );
}
