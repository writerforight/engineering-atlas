import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Konvolüsyon doğrusal bir işlemdir, öyleyse bir matristir: <Tex tex="\mathbf y=C_a\,\mathbf b" />. Bu matrisin her
        sütunu <Tex tex="\mathbf a" />’nın bir adım kaydırılmış kopyasıdır. Kaydırma dairesel yapılırsa (alttan taşan üste
        dönerse) matris <i>circulant</i> olur ve bütün circulant matrislerin özvektörleri aynıdır: Fourier vektörleri.
      </p>
      <p>
        Özvektörlerden oluşan tabana geçmek matrisi köşegenleştirir. O taban DFT matrisi <Tex tex="F" />’dir; köşegene
        düşen özdeğerler de tam olarak <Tex tex="F\mathbf a" />’dır. Köşegen matrisle çarpmak eleman eleman çarpmak
        olduğundan, zamandaki konvolüsyon frekansta Hadamard çarpımına dönüşür:{' '}
        <Tex tex="F(\mathbf a\circledast\mathbf b)=(F\mathbf a)\odot(F\mathbf b)" />.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Doğrusal konvolüsyon" why="Tanım: a’nın her örneği b’nin kaydırılmış bir kopyasını ağırlıklandırır. Uzunluklar La ve Lb ise en son indis (La−1)+(Lb−1), yani sonuç La+Lb−1 uzunluğunda.">
        <Tex block tex="y[n]=\sum_{k}a[k]\,b[n-k],\qquad n=0,\dots,L_a+L_b-2" />
      </Step>
      <Step title="Matris biçimi: Toeplitz" why="y[n] ifadesi b’nin elemanlarında doğrusal; b[k]’nin katsayısı a[n−k]. Bu katsayılar yalnızca n−k farkına bağlı, yani her köşegen boyunca sabit: Toeplitz matris. Boyut (La+Lb−1)×Lb.">
        <Tex block tex="\mathbf y=T_a\,\mathbf b,\qquad (T_a)_{nk}=a[n-k]\;\;(\text{aralık dışında }0)" />
      </Step>
      <Step title="Dairesel konvolüsyon: circulant" why="İndisler mod N alınınca kaydırma dairesel olur: alttan taşan eleman üste döner. Her sütun bir öncekinin dairesel kaydırılmışıdır, matris N×N ve circulant.">
        <Tex block tex="y_N[n]=\sum_{k=0}^{N-1}a[k]\,b[(n-k)\bmod N],\qquad (C_a)_{nk}=a[(n-k)\bmod N]" />
      </Step>
      <Step title="Circulant = kaydırma matrisinin polinomu" why="P bir adım dairesel kaydırma (P_{nk} = 1, n ≡ k+1). Pᵐ m adım kaydırır; C_a’nın m’inci köşegeni a[m] olduğundan C_a, a[m] ağırlıklı Pᵐ’lerin toplamıdır.">
        <Tex block tex="C_a=\sum_{m=0}^{N-1}a[m]\,P^{m},\qquad (P\mathbf x)[n]=x[n-1]" />
      </Step>
      <Step title="P’nin özvektörleri Fourier vektörleri" why="v_k[n] = e^{2πikn/N} alınırsa v_k[n−1] = e^{−2πik/N} v_k[n]. Yani kaydırmak sadece sabit bir fazla çarpmak; W = e^{−2πi/N} ile özdeğer Wᵏ. Bu vektörler N·F⁻¹’in sütunlarıdır.">
        <Tex block tex="P\,\mathbf v_k=W^{k}\,\mathbf v_k,\qquad \mathbf v_k=\big(W^{-kn}\big)_{n},\qquad W=e^{-2\pi i/N}" />
      </Step>
      <Step title="C_a’nın özdeğerleri F a" why="Bir önceki adımı Pᵐ’ye uygula (özdeğer W^{km}) ve 4. adımdaki toplamı al. Çıkan toplam tam DFT tanımı: (F a)_k = Σ a[m] W^{km}.">
        <Tex block tex="C_a\mathbf v_k=\sum_m a[m]W^{km}\,\mathbf v_k=(F\mathbf a)_k\,\mathbf v_k" />
      </Step>
      <Step title="Köşegenleştirme" why="Özvektörleri sütun olarak yan yana koymak F⁻¹ verir; C_a F⁻¹ = F⁻¹ Λ. Soldan F ile çarp. Aynı eşitliğin F C_a = Λ F biçimi: F·C’nin k’inci satırı F’nin k’inci satırının (F a)_k katıdır (görseldeki 3. adım).">
        <Tex block tex="F\,C_a\,F^{-1}=\Lambda=\operatorname{diag}(F\mathbf a),\qquad F_{kn}=W^{kn},\quad F^{-1}=\tfrac1N\overline F" />
      </Step>
      <Step title="Konvolüsyon teoremi: Hadamard çarpımı" why="y = C_a b’ye F uygula ve F⁻¹F = I ekle: F y = (F C_a F⁻¹)(F b) = Λ F b. Köşegen matrisle vektör çarpımı, köşegenle vektörün eleman eleman çarpımıdır.">
        <Tex block tex="F\mathbf y=\Lambda\,F\mathbf b=(F\mathbf a)\odot(F\mathbf b)\quad\Longrightarrow\quad \mathbf y=F^{-1}\big[(F\mathbf a)\odot(F\mathbf b)\big]" />
      </Step>
      <Step title="Doğrusalı daireselle hesaplamak" why="N ≥ La+Lb−1 seçip a ve b’yi sıfırla doldurunca, dairesel toplamda sarılan terimler hep b’nin dolgu sıfırlarına denk gelir. Toeplitz L ile circulant C sadece sağ üst üçgende farklıdır ve o sütunlar sıfırla çarpılır.">
        <Tex block tex="N\ge L_a+L_b-1:\quad C_a\,\mathbf b_{\text{dolgulu}}=L_a\,\mathbf b_{\text{dolgulu}}=\mathbf a*\mathbf b" />
      </Step>
      <Step title="Daha kısa N: örtüşme" why="Dairesel toplam indisleri mod N katlar. Doğrusal sonucun N’den taşan kısmı başa eklenir (zaman örtüşmesi); frekans tarafında bu, DTFT’yi yalnızca N noktada örneklemenin bedelidir.">
        <Tex block tex="y_N[n]=\sum_{m}y[n+mN],\qquad n=0,\dots,N-1" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Toeplitz neden köşegenleşmez?</b> Alt üçgen Toeplitz <Tex tex="L" />’de kaydırma sarılmaz; Fourier vektörü
        kaydırılınca sonu kaybolur, başına sıfır gelir, yani <Tex tex="L\mathbf v_k" /> artık <Tex tex="\mathbf v_k" />’nın
        katı değildir. <Tex tex="F L F^{-1}" />’de köşegen dışına yayılan değerler tam bu eksik köşeden gelir. Sıfır
        dolgu, sonucu değiştirmeden eksik köşeyi ekleme hilesidir.
      </p>
      <p>
        <b>Normalizasyon.</b> Burada <Tex tex="F_{kn}=W^{kn}" /> (ölçeksiz) ve <Tex tex="F^{-1}=\overline F/N" />.
        Üniter seçim <Tex tex="U=F/\sqrt N" /> ile <Tex tex="C=U^{*}\Lambda U" /> olur; özdeğerler aynı kalır.
      </p>
      <p>
        <b>Gerçel diziler.</b> <Tex tex="\mathbf a" /> gerçelse <Tex tex="(F\mathbf a)_{N-k}=\overline{(F\mathbf a)_k}" />:
        köşegenin ikinci yarısı ilk yarısının eşleniğidir; <Tex tex="k=0" /> elemanı dizinin toplamıdır.
      </p>
      <p>
        <b>Hız.</b> Matris–vektör çarpımı <Tex tex="N^2" /> işlem ister. FFT ile <Tex tex="F\mathbf a" />,{' '}
        <Tex tex="F\mathbf b" /> ve ters dönüşüm <Tex tex="O(N\log N)" />’dir; uzun filtrelerde hızlı konvolüsyon budur.
      </p>
      <p>
        <b>Hangi dizinin matrisi?</b> Konvolüsyon değişmeli (<Tex tex="\mathbf a*\mathbf b=\mathbf b*\mathbf a" />), bu
        yüzden matris <Tex tex="\mathbf a" />’dan ya da <Tex tex="\mathbf b" />’den kurulabilir; köşegen ona göre{' '}
        <Tex tex="F\mathbf a" /> ya da <Tex tex="F\mathbf b" /> olur, Hadamard çarpımı aynıdır.
      </p>
    </div>
  );
}
