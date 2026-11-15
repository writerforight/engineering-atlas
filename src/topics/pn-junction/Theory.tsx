import { Callout, Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return (
    <div className="prose">
      <p>
        Temastan önce iki silisyum parçası ayrı ayrı nötrdür: n tarafında her sabit, pozitif donör iyonunun yanında bir
        serbest elektron, p tarafında her negatif akseptör iyonunun yanında bir delik vardır. Temas anında taşıyıcılar
        ısıl hareketle (difüzyon) az bulundukları tarafa yayılır ve orada karşıt taşıyıcılarla rekombine olur.
      </p>
      <p>
        Giden taşıyıcı iyonunu götüremez. Kavşağın iki yanında örtüsüz iyonlardan oluşan bir yük tabakası kalır:{' '}
        <b>tükenim (uzay yükü) bölgesi</b>. Bu yükler bir alan kurar; alan taşıyıcıları geri iter. Difüzyon ile bu geri
        itme (sürüklenme) eşitlenince bölge büyümeyi bırakır ve iki taraf arasında{' '}
        <Tex tex="V_{bi}=V_T\ln\frac{N_AN_D}{n_i^2}" /> kadar bir potansiyel farkı kalır.
      </p>
      <p>
        Aşağıdaki benzetimde bölge hiçbir yerde çizilmez. Parçacıklar sadece Coulomb kuvvetini, ısıl gürültüyü ve
        üretim–rekombinasyonu bilir; bölge, alan ve potansiyel bunlardan doğar ve formüllerle canlı karşılaştırılır.
      </p>
    </div>
  );
}

export function Derivation() {
  return (
    <Steps>
      <Step
        title="Boyutsuz birimler (silisyum, 300 K)"
        why="Poisson denklemi ε φ'' = −ρ. Potansiyeli V_T’ye, yoğunluğu N₀’a, uzunluğu L₀’a bölünce bütün sabitler 1 olur. L₀, N₀ yoğunluğundaki Debye uzunluğudur."
      >
        <Tex
          block
          tex="V_T=\tfrac{k_BT}{q}=25{,}85\,\text{mV},\quad N_0=n_i=10^{10}\,\text{cm}^{-3},\quad L_0=\sqrt{\tfrac{\varepsilon_r\varepsilon_0V_T}{qN_0}}=40{,}9\,\mu\text{m}\;\Rightarrow\;\varphi''=-\rho,\;\;\rho=p-n+N_D^+-N_A^-"
        />
      </Step>
      <Step
        title="Langevin hareketi ve Einstein bağıntısı"
        why="Sürtünme γv ve beyaz gürültü √(2γk_BT)ξ birlikte, her potansiyel enerji U için durağan dağılımı Boltzmann yapar (dalgalanma–yitim teoremi). Yalnız sürüklenme ve gürültü kalan aşırı sönümlü sınırda D = k_BT/γ."
      >
        <Tex block tex="m\dot v=F-\gamma v+\sqrt{2\gamma k_BT}\,\xi(t),\qquad D=\frac{k_BT}{\gamma},\qquad P(\mathbf r)\propto e^{-U(\mathbf r)/k_BT}" />
      </Step>
      <Step
        title="Dengede sürüklenme = difüzyon"
        why="Bir önceki adımın Boltzmann dağılımı, elektron (U = −qφ) ve delik (U = +qφ) için. Akım J = qμnE + qDn' sıfır: aynı sonuç."
      >
        <Tex block tex="n(x)=n_{n0}\,e^{(\varphi(x)-\varphi_n)/V_T},\qquad p(x)=p_{p0}\,e^{-(\varphi(x)-\varphi_p)/V_T}" />
      </Step>
      <Step
        title="Üretim–rekombinasyon: n·p = nᵢ²"
        why="e + h ⇌ 0 tepkimesi için ayrıntılı denge. Benzetimde bir çift, aralarındaki uzaklık r_rec’ten küçükse adım başına p_rec olasılıkla yok olur. Üretim hızı G = p_rec·nᵢ²·Z seçilir; Z, r_rec içinde Boltzmann ağırlıklı çift sayısıdır. Böylece durağan durumda her yerde np = nᵢ² olur. nᵢ modelde yalnız burada geçer."
      >
        <Tex block tex="R=p_{rec}\,n\,p\,Z=G=p_{rec}\,n_i^2\,Z\;\Rightarrow\;np=n_i^2,\qquad Z=\int_0^{r_{rec}}2\pi r\,e^{-U_{eh}(r)/k_BT}\,dr" />
      </Step>
      <Step
        title="Yerleşik gerilim"
        why="3. adımdaki elektron oranını iki gövdede yaz: n tarafında n = N_D, p tarafında 4. adımdan n = nᵢ²/N_A."
      >
        <Tex block tex="\frac{N_D}{n_i^2/N_A}=e^{(\varphi_n-\varphi_p)/V_T}\;\Rightarrow\;V_{bi}=V_T\ln\frac{N_AN_D}{n_i^2}" />
      </Step>
      <Step
        title="Tükenim yaklaşımı ve yük dengesi"
        why="Bölge içinde taşıyıcı yok, dışı tamamen nötr kabul edilir: ρ = +qN_D (0 < x < x_n), −qN_A (−x_p < x < 0). Toplam yük sıfır olmalı, yoksa dışarıda alan kalırdı."
      >
        <Tex block tex="N_D\,x_n=N_A\,x_p\;\Rightarrow\;x_n=W\frac{N_A}{N_A+N_D},\quad x_p=W\frac{N_D}{N_A+N_D}" />
      </Step>
      <Step
        title="Alan: Gauss yasası"
        why="E' = ρ/ε’yi bölge kenarından (E = 0) kavşağa kadar integralle. En büyük alan x = 0’da ve kavşağın bir tarafındaki yükün tamamına eşit."
      >
        <Tex block tex="E(x)=-\frac{qN_D}{\varepsilon}(x_n-x)\;(0<x<x_n),\qquad E_{\max}=\frac{qN_Dx_n}{\varepsilon}=\frac{qN_Ax_p}{\varepsilon}" />
      </Step>
      <Step
        title="Genişlik W"
        why="Potansiyel farkı, üçgen biçimli alanın altındaki alan: V_bi − V = ½ E_max W. Önceki iki adımı yerine koyup W’yi çöz. Dış gerilim V (ileri > 0) bölgedeki farkı V_bi − V yapar."
      >
        <Tex block tex="W=\sqrt{\frac{2\varepsilon}{q}\left(\frac1{N_A}+\frac1{N_D}\right)(V_{bi}-V)}" />
      </Step>
      <Step
        title="Kuyruk düzeltmesi (formülün ötesi)"
        why="Çoğunluk taşıyıcıları bölgeye 3. adımdaki gibi üstel sızar. Bir tarafta Poisson–Boltzmann’ın ilk integrali alınır (u: gövdeden ölçülen potansiyel düşmesi, V_T biriminde). Tükenim yaklaşımı u − 1 + e⁻ᵘ yerine u kullanır; iki taraf için bu, V_bi − V’den yaklaşık 2V_T eksik yük demektir."
      >
        <Tex block tex="\tfrac{\varepsilon}{2}E^2=qN\,V_T\left(u-1+e^{-u}\right)\;\Rightarrow\;W_{\text{yük}}\approx\sqrt{\frac{2\varepsilon}{q}\left(\frac1{N_A}+\frac1{N_D}\right)(V_{bi}-V-2V_T)}" />
      </Step>
      <Step
        title="Coulomb kuvvetinin hesaplanması"
        why="Bütün yüklerin kuvveti iki parçaya ayrılır. Uzak kısım: yükler x ızgarasına (bulut-hücre) dağıtılır ve 1B Poisson çözülür; düzlemsel simetride bu Coulomb alanının tam ortalamasıdır. Yakın kısım: r < r_c çiftler hücre listesiyle doğrudan, yumuşatılmış ve r_c’de sıfıra kaydırılmış."
      >
        <Tex block tex="F_{ij}=k\,q_iq_j\left(\frac1{r^2+\epsilon^2}-\frac1{r_c^2+\epsilon^2}\right)\quad(r<r_c),\qquad \mathbf F_i^{\text{uzak}}=q_i\,E_{\text{ızgara}}(x_i)" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return (
    <div className="prose">
      <p>
        <b>Neden bu kadar düşük katkı?</b> Tipik diyotlarda <Tex tex="N\approx10^{16}\,\text{cm}^{-3}" />; o zaman
        azınlık yoğunluğu <Tex tex="n_i^2/N" /> çoğunluğun <Tex tex="10^{-12}" />’si olur ve 2000 parçacıkta sıfır
        parçacık kalır. <Tex tex="np=n_i^2" /> ve <Tex tex="V_{bi}" /> ölçülebilsin diye{' '}
        <Tex tex="N=10\dots60\,n_i" /> (<Tex tex="10^{11}\dots6\cdot10^{11}\,\text{cm}^{-3}" />) kullanılır. Bu, gerçek
        silisyumda 300 K’de hafif katkılı bir eklemdir; ölçek de aynı oranda büyür (L₀ = 40,9 µm).
      </p>
      <p>
        <b>W neden formülden yaklaşık %20 küçük?</b> Ana sebep fizik: <Tex tex="V_{bi}/V_T\approx7" /> küçük olduğundan
        çoğunluk taşıyıcılarının Debye kuyrukları önemlidir. Aynı istatistiğin parçacıksız tam çözümü (Poisson–Boltzmann)
        de formülden yaklaşık %16 küçük çıkar; benzetim ondan yalnız birkaç yüzde sapar. Kalan küçük fark sonlu parçacık
        sayısından ve süper parçacıkların abartılmış yakın korelasyonundan gelir. Ters kutuplamada üretim akımının
        taşıyıcıları da uzay yükünü biraz azaltır. <Tex tex="V_{bi}" /> ise birkaç yüzde içinde tutar.
      </p>
      <Callout kind="info" title="Model neyi göstermez">
        <ul>
          <li>Gerçek 3B: konumlar 2B, uzak alan düzlemsel (y–z) ortalama; yakın Coulomb düzlem içinde.</li>
          <li>
            Kuantum mekaniği, bant yapısı, etkin kütle, Fermi–Dirac istatistiği: taşıyıcılar klasik Boltzmann
            parçacıkları; donör/akseptörler hep iyonize.
          </li>
          <li>
            Süper parçacıklar: her parçacık birçok gerçek taşıyıcıyı temsil eder (N_D = N_A = 30 iken ~185 elektron);
            ortalama alan doğru, kısa menzilli korelasyonlar abartılı.
          </li>
          <li>
            Rekombinasyon basit bir yakalama yarıçapıyla; gerçek SRH tuzakları, yüzey rekombinasyonu, hız doygunluğu,
            sıcaklıkla değişen hareketlilik yok. Ömür, hızlı denge için gerçekten çok kısa.
          </li>
          <li>
            Kontaklar ideal: V = 0’da açık devre (kapalı sistem, V_bi kendiliğinden); V ≠ 0’da kontak potansiyelleri
            V_bi − V farkıyla sabit ve kontak bölgeleri tam nötr tutulur. Bu, kutuplamada V_bi’nin formül değerini
            kontakların kullandığı anlamına gelir.
          </li>
        </ul>
      </Callout>
    </div>
  );
}
