# convolution-story

Konvolüsyonu bir hikâye olarak anlatan tek dosyalık sayfa: `index.html`'e çift tıkla (file://), başka hiçbir şey gerekmez.
Giriş x[n], ölçeklenmiş ve kaydırılmış impulsların toplamı olarak ayrıştırılır: x[n] = Σ x[m]·δ[n−m].
Sistem δ[n]'ye h[n] ile yanıt verir. Zamanla değişmezlik ve homojenlikten x[m]·δ[n−m] → x[m]·h[n−m] çıkar.
Toplamsallık bu parçaları toplar: y[n] = Σ x[m]·h[n−m]. Biriken toplam, doğrudan konvolüsyonla (np.convolve eşdeğeri) karşılaştırılır.
Aynı sonuç "çevir-kaydır" görünümünde de gösterilir, sürekli halde ise genişliği Δ olan darbelerin toplamı Δ → 0'da integrale gider.

## Hangi adım hangi özelliğe karşılık gelir

| Adım | Ekranda | Kullanılan özellik |
| --- | --- | --- |
| 1. Giriş | x[n] çubukları, altında her x[m] ayrı renkli bir impuls | Sinyal gösterimi (eleme özelliği): x[n] = Σ x[m]·δ[n−m]. Henüz sistem özelliği yok. |
| 2. Sistem | δ[n] → h[n] | Tanım: h[n], LTI sistemi tümüyle belirleyen impuls yanıtı |
| 3. Bir parça | δ[n−m] → h[n−m], sonra × x[m] (m slider'ı) | **Zaman değişmezliği** (kayma) ve **homojenlik** (ölçekleme, doğrusallığın yarısı) |
| 4. Biriktirme | Parçalar m = 0'dan itibaren kendi renginde üst üste yığılır, kısmi toplam çizgisi | **Toplamsallık** (doğrusallığın diğer yarısı): y[n] = Σ x[m]·h[n−m] |
| 5. Bitiş | Biriken toplam ile doğrudan konvolüsyon, fark grafiği ve en büyük hata | Sonuç: y = x ∗ h (tanımla birebir aynı) |
| 6. Çevir-kaydır (sekme) | h[n−k] ters çevrilip kaydırılır, örtüşme çarpımı toplanır | Aynı çift toplam, farklı sırayla toplanmış: önce n sabit, sonra k |
| 7. Sürekli hal (sekme) | Δ genişliğinde darbeler, tek darbe yanıtları, toplam ve tam integral | Riemann toplamı → integral: y(t) = ∫ x(τ)·h(t−τ) dτ (hata ∝ Δ) |

## Kontroller (ekranda yeşil / kırmızı)

Σy = Σh·Σx · çıkış uzunluğu = len(h) + len(x) − 1 · h nedensel olduğu için y[n] = 0, n < 0 ·
adım 4 toplamı = doğrudan konvolüsyon (hata < 1e-12). Varsayılan veride dördü de yeşil (doğrudan karşılaştırmada hata 0).

## Güvenlik ve kaynak kullanımı

- Tek dosya, sunucu / npm / build yok. Harici kaynak yok (CDN, font, analytics, ağ isteği).
  CSP: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:`.
- `eval`, `new Function`, `innerHTML` yok; kullanıcı metni yalnız `textContent` ile yazılır, girdi sayıya
  parse edilir (boş, sayı olmayan, 64'ten uzun ya da |değer| > 1e6 olan girdi reddedilir, uygulama çökmez).
- Depolama yok (localStorage, IndexedDB, cookie, indirme). Worker yok, `setInterval` yok.
- Animasyon yalnız `requestAnimationFrame` ile çalışır, sekme gizlenince durur, Oynat bitince döngü tamamen kesilir.
  Değişiklik olmadıkça çizim yapılmaz (dirty flag).
- Diziler en fazla 64 eleman (buffer'lar bir kez ayrılır ve yeniden kullanılır), canvas en fazla 1200×800 piksel.

Doğrulama (headless Firefox, file://): ağ kaynağı sayısı 0, localStorage 0, cookie boş; dört gösterge yeşil;
hatalı girdiler (harf, boş, 65 eleman, `<img …>`) reddedildi ve DOM'a eleman eklenmedi; 64 + 64 elemanda çıkış uzunluğu 127;
Oynat 5. adımda kendiliğinden durdu.
