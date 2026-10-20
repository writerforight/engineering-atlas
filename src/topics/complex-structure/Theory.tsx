import { Callout, Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Karmaşık sayılarda <Tex tex="i" /> ile çarpmak düzlemi 90° döndürür ve iki kez yapınca{' '}
        <Tex tex="-1" /> elde edilir. Aynı rolü bir reel matris de oynayabilir:{' '}
        <Tex tex="J=\begin{bmatrix}0&-1\\1&0\end{bmatrix}" /> için <Tex tex="J^2=-I" />.
      </p>
      <p>
        Peki <Tex tex="M^2=-I" /> sağlayan başka matrisler var mı? Var, hem de iki parametrelik bir aile. Hepsi
        aslında <Tex tex="J" />’dir, yalnızca başka bir koordinat sisteminden bakılmıştır:{' '}
        <Tex tex="M=PJP^{-1}" />. Bu yüzden <Tex tex="e^{tM}" /> bir birim vektörü çember yerine{' '}
        <b>elips</b> üzerinde gezdirir. O elips, <Tex tex="P" /> ile çarpılmış çemberdir.
      </p>
      <p>
        Formül de karmaşık sayılardaki Euler formülünün aynısıdır:{' '}
        <Tex tex="e^{tM}=\cos t\,I+\sin t\,M" />, tıpkı <Tex tex="e^{it}=\cos t+i\sin t" /> gibi.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Her 2×2 matris kendi karakteristik denklemini sağlar"
        why="Cayley–Hamilton teoremi. 2×2 için doğrudan çarparak da doğrulanır: M=[[p,q],[r,s]] için M² = [[p²+qr, q(p+s)],[r(p+s), s²+qr]] ve (p+s)M − (ps−qr)I ile karşılaştır."
      >
        <Tex block tex="M^2-(\operatorname{tr}M)\,M+(\det M)\,I=0" />
      </Step>
      <Step
        title="M² = −I koşulu iz ve determinantı belirler"
        why="Adım 1’de M² yerine −I yazıldı. M = λI olsaydı λ² = −1 olurdu, reel λ için imkânsız; dolayısıyla M ile I doğrusal bağımsızdır ve iki katsayı ayrı ayrı sıfır olmalıdır."
      >
        <Tex block tex="-I-(\operatorname{tr}M)\,M+(\det M)\,I=0 \;\Longrightarrow\; (\operatorname{tr}M)\,M=(\det M-1)\,I" />
        <Tex block tex="\Longrightarrow\quad \operatorname{tr}M=0,\qquad \det M=1" />
      </Step>
      <Step
        title="Aileyi parametrele"
        why="İz sıfır olduğundan köşegen (a, −a) biçimindedir. det = −a² − bc = 1 denkleminden c çekilir. b = 0 olsaydı −a² = 1 olurdu; yani b = 0 yalnızca ‘dışlanmış’ değil, imkânsızdır."
      >
        <Tex block tex="M=\begin{bmatrix}a&b\\c&-a\end{bmatrix},\qquad -a^2-bc=1\;\Longrightarrow\; c=-\frac{1+a^2}{b}" />
      </Step>
      <Step title="Doğrudan doğrulama" why="Matris çarpımı; köşegen dışı terimler a·b + b·(−a) = 0 ile sadeleşir. Son eşitlik Adım 3’teki c’nin yerine konmasıdır.">
        <Tex
          block
          tex="M^2=\begin{bmatrix}a^2+bc & ab-ab\\ ca-ac & bc+a^2\end{bmatrix}=(a^2+bc)\,I=-I"
        />
      </Step>
      <Step title="Kuvvetler iki değer arasında döner" why="M² = −I’yi tekrar tekrar uygula: M^{2k} = (M²)^k = (−I)^k ve M^{2k+1} = M^{2k}·M.">
        <Tex block tex="M^{2k}=(-1)^k I,\qquad M^{2k+1}=(-1)^k M" />
      </Step>
      <Step
        title="Üstel seriyi çift ve tek terimlere ayır"
        why="Tanım e^{X} = Σ X^n/n!. Kuvvetler Adım 5’ten geliyor. Kalan iki toplam tam olarak cos t ve sin t’nin Taylor serileri. Seri her matris için mutlak yakınsadığından terimleri yeniden gruplamak serbest."
      >
        <Tex
          block
          tex="e^{tM}=\sum_{k\ge0}\frac{(-1)^k t^{2k}}{(2k)!}\,I+\sum_{k\ge0}\frac{(-1)^k t^{2k+1}}{(2k+1)!}\,M=\cos t\,I+\sin t\,M"
        />
      </Step>
      <Step
        title="M, J’nin koordinat değiştirilmiş hâlidir"
        why="P’nin sütunlarını v = e₁ ve Mv seç. Mv = P e₂ = P J e₁ ve M(Mv) = M²v = −v = P(−e₁) = P J e₂; yani iki sütunda da MP = PJ. det P = c ≠ 0 olduğu için P terslenebilir."
      >
        <Tex block tex="P=\begin{bmatrix}1&a\\0&c\end{bmatrix},\qquad MP=PJ\;\Longrightarrow\;M=PJP^{-1}" />
      </Step>
      <Step
        title="Üstel de aynı şekilde taşınır, yörünge bir elipstir"
        why="(PJP⁻¹)ⁿ = P Jⁿ P⁻¹ (aradaki P⁻¹P’ler sadeleşir); bunu seriye uygula. e^{tJ} çemberde döndürür; P doğrusal bir dönüşüm olduğundan çemberi elipse götürür."
      >
        <Tex block tex="e^{tM}=P\,e^{tJ}P^{-1},\qquad e^{tM}x_0=P\begin{bmatrix}\cos t&-\sin t\\ \sin t&\cos t\end{bmatrix}P^{-1}x_0" />
        <Tex block tex="e^{tM}e_1=\cos t\,e_1+\sin t\,Me_1=\cos t\begin{bmatrix}1\\0\end{bmatrix}+\sin t\begin{bmatrix}a\\c\end{bmatrix}" />
      </Step>
      <Step
        title="Benzerlik akışı ve komütatör"
        why="A(t) = e^{tM} A e^{−tM} çarpım kuralıyla türetilir; (e^{tM})' = M e^{tM} = e^{tM} M ve (e^{−tM})' = −e^{−tM} M."
      >
        <Tex block tex="\dot A(t)=M\,A(t)-A(t)\,M=[M,A(t)],\qquad \dot A(0)=[M,A]" />
      </Step>
      <Step
        title="A’yı dönmeyen ve dönen parçalara ayır"
        why="A_c = (A − MAM)/2 için M·A_c = (MA + AM)/2 = A_c·M (M² = −I kullanıldı). A_a = (A + MAM)/2 için aynı hesap M·A_a = −A_a·M verir. Ters değişmeli parçada M^k A_a = A_a(−M)^k olduğundan e^{tM}A_a = A_a e^{−tM}."
      >
        <Tex block tex="A=A_c+A_a,\qquad A_c=\tfrac12(A-MAM),\quad A_a=\tfrac12(A+MAM)" />
        <Tex block tex="A(t)=A_c+e^{tM}A_a e^{-tM}=A_c+e^{2tM}A_a,\qquad [M,A]=2MA_a" />
        <p>
          Yani <Tex tex="A" />’nın <Tex tex="M" /> ile değişen kısmı hiç kıpırdamaz. Kalan kısım{' '}
          <b>iki kat hızla</b> döner ve <Tex tex="\pi" /> periyotla geri gelir. Komütatör dönen kısmı ölçer:{' '}
          <Tex tex="[M,A]=0\iff A_a=0" />, ve <Tex tex="M" /> ortogonal olduğunda (örneğin <Tex tex="J" />){' '}
          <Tex tex="\|[M,A]\|_F=2\|A_a\|_F" />.
        </p>
      </Step>
      <Step
        title="4×4: kuaterniyonla soldan çarpma"
        why="Kuaterniyon çarpımı birleşmeli olduğundan L_{pq} = L_p L_q. Saf bir n = n₁i + n₂j + n₃k için nn = −(n·n) + n×n = −|n|². Birim n alınca n² = −1 bulunur."
      >
        <Tex block tex="M_n=n_1L_i+n_2L_j+n_3L_k=L_n,\qquad M_n^2=L_{n^2}=L_{-1}=-I_4" />
        <Tex block tex="e^{tM_n}=\cos t\,I_4+\sin t\,M_n=L_{\cos t+n\sin t}" />
        <p>
          <Tex tex="|n|=1" /> küresindeki (<Tex tex="S^2" />) her nokta ayrı bir “i” verir. Her{' '}
          <Tex tex="M_n" /> ortogonal ve ters simetrik olduğundan <Tex tex="p_0" /> ve <Tex tex="M_np_0" /> dik
          ve eşit uzunluktadır. Yörünge bu iki vektörün gerdiği düzlemde gerçek bir çemberdir; koordinat
          düzlemlerine izdüşümü ise elips olarak görünür.
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
          <b>Karmaşık yapı.</b> <Tex tex="M^2=-I" /> olan bir <Tex tex="M" />, <Tex tex="\mathbb R^2" />’ye{' '}
          <Tex tex="(x+iy)\,v=xv+yMv" /> çarpımıyla bir <Tex tex="\mathbb C" />-vektör uzayı yapısı verir.
          Hangi yönün “i” sayılacağı seçime bağlıdır; bu sayfadaki her <Tex tex="(a,b)" /> ayrı bir seçimdir.
        </li>
        <li>
          <b>Ailenin geometrisi.</b> <Tex tex="a^2+bc=-1" />, değişkenler{' '}
          <Tex tex="u=(b+c)/2,\ w=(b-c)/2" /> alınınca <Tex tex="a^2+u^2-w^2=-1" /> olur. Bu iki yapraklı bir
          hiperboloittir. Yapraklar <Tex tex="b" />’nin işaretine karşılık gelir: <Tex tex="b<0" /> saat
          yönünün tersine (J gibi), <Tex tex="b>0" /> saat yönünde döner. <Tex tex="b=0" /> imkânsız olduğundan
          biri diğerine sürekli olarak dönüşemez; yön (oryantasyon) bir topolojik değişmezdir.
        </li>
        <li>
          <b>Boyut çift olmalı.</b> <Tex tex="M^2=-I_n" /> ise <Tex tex="(\det M)^2=(-1)^n" />, yani{' '}
          <Tex tex="n" /> çift olmak zorundadır. 3×3’te böyle bir reel matris yoktur.
        </li>
        <li>
          <b>Mühendislikte.</b> <Tex tex="\ddot x=-\omega^2x" /> osilatörünün durum matrisi, ölçek
          değiştirilince tam olarak bir karmaşık yapıdır. Elips yörüngesi faz düzlemindeki enerji elipsidir.
          Clarke/Park dönüşümündeki <Tex tex="\alpha\beta" /> düzleminde dönen fazör de{' '}
          <Tex tex="e^{\omega tJ}" /> ile döner.
        </li>
        <li>
          <b>Kuaterniyonlar ve 3B dönme.</b> <Tex tex="q=\cos t+n\sin t" /> birim kuaterniyonu,{' '}
          <Tex tex="v\mapsto qvq^{-1}" /> ile 3B vektörleri <Tex tex="n" /> ekseni etrafında <Tex tex="2t" />{' '}
          kadar döndürür. Bu da benzerlik akışındaki “iki kat hız”ın 4B karşılığıdır.
        </li>
      </ul>
      <Callout title="Sayısal not">
        Bu sayfadaki her matris, hem kapalı formülle (cos t I + sin t M) hem de bağımsız bir sayısal matris
        üsteli ile (ölçekle ve karele + Taylor) hesaplanıp karşılaştırılır. Aradaki fark görselde canlı olarak
        gösterilir, testlerde de 1e-10 toleransla doğrulanır.
      </Callout>
    </div>
  );
}
