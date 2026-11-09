# sticker-maker — Çıkartma Atölyesi

**Canlı:** https://writerforight.github.io/engineering-atlas/sticker-maker/ (main dalına birleşip site yayınlanınca açılır)

Bir görseli 512×512 saydam çıkartmaya çeviren tek bir boru hattı ve ondan beslenen,
paralel çalışan dışa aktarıcılar. Aynı kod iki yerde çalışır:

- **Web sayfası** (GitHub Pages, kurulum yok): yükle → şekil → kenarlık / yazı → önizle → dışa aktar.
- **Komut satırı** (`cli/sticker.mjs`): aynı boru hattı + Telegram Bot API.

```
görsel(ler) ──► pipeline (core/pipeline.js) ──► 512×512 saydam tuval
                                                     │ (bir kez çizilir, bir kez kodlanır)
          ┌──────────────┬───────────────┬───────────┴───────┬──────────────────┐
     WhatsApp ZIP      PNG indir     GitHub'a kaydet     Telegram seti       (yeni eklenti)
   (web + CLI)       (web + CLI)     (web + CLI)    (CLI / sunucu fonksiyonu)
```

## Akış (web)

1. **Görsel**: dosya seç, sürükle-bırak ya da yapıştır (Ctrl+V). PNG, JPEG, WebP, GIF, BMP; ≤ 20 MB; kısa kenar ≥ 64 px; pakete 30 görsele kadar.
2. **Şekil**: kare (ortadan kırp), yuvarlatılmış (köşe yarıçapı ayarlı), kesip çıkar (kenarlara değen düz arka planı siler; saydam PNG'de mevcut alfa kullanılır).
3. **Kenarlık / yazı** (isteğe bağlı): şeklin çevresini izleyen kenarlık (tam Öklid uzaklık dönüşümü, kenar yumuşatmalı), konturlu yazı (sığmazsa küçülür, gerekirse iki satıra bölünür).
4. **Önizleme**: saydamlık ızgarası ya da açık / koyu sohbet zemininde gerçeğe yakın boyutta. Altında canlı kontroller: çıktı boyutu, WebP ağırlığı (≤ 100 KB), tepsi simgesi (≤ 50 KB), paket sayısı.
5. **Dışa aktar**: seçili eklentiler aynı anda çalışır; her biri kendi sonucunu ya da hatasını gösterir, biri bozulursa diğerleri etkilenmez.

## Dışa aktarıcılar

| Eklenti | Nerede | Çıktı ve kurallar |
| --- | --- | --- |
| `whatsapp` | web, CLI | ZIP: `contents.json` (resmî örnek uygulamanın biçimi), `title.txt`, `author.txt`, `tray.png` (96×96 PNG ≤ 50 KB), `01.webp…` (512×512 WebP ≤ 100 KB, 3–30 adet, çıkartma başına ≤ 3 emoji). WebP kalitesi sınıra sığana kadar düşürülür. 3'ten az görsel varsa varyantlarla (başka şekil, kenarlık) tamamlanır; kapatılabilir. Bitmiş ZIP, bir tüketicinin okuyacağı gibi yeniden okunup doğrulanır. |
| `png` | web, CLI | Her görsel için 512×512 saydam PNG. |
| `github` | web, CLI | PNG'leri seçilen deponun `stickers/` (değiştirilebilir) klasörüne **tek commit** ile yazar (Git Data API; boş depoda Contents API). |
| `telegram` | CLI, sunucu fonksiyonu | Bot API: `getMe` → `createNewStickerSet` (ilk 50) → `addStickerToSet`. Statik çıkartma: WEBP, 512×512, ≤ 512 KB (WhatsApp ile aynı WebP paylaşılır). Set adı `<kısa_ad>_by_<bot>`. |

Yeni bir eklenti `{ id, label, targets, run(ctx, settings) }` biçiminde bir nesnedir (`core/exporters.js`).
`ctx.stickers()`, `ctx.webp()`, `ctx.png()` önbellekli olduğu için eklentiler aynı işi tekrar yapmaz.

## Kontroller

Hepsi `core/validate.js` içinde ve hem girişte hem de **gönderilecek baytların üzerinde** çalışır
(kodlayıcıya ne söylendiğine değil, dosyanın başlığından okunan biçim ve boyuta bakılır):

- Giriş: biçim (bayttan tanınır), ağırlık, en kısa / en uzun kenar, çözülebilirlik.
- Çıktı: biçim (PNG / WebP), boyut (512×512, 96×96), ağırlık sınırları, hareketsizlik.
- Paket: 3–30 çıkartma, ad / yayıncı uzunluğu, kimlik karakterleri, emoji sayısı; Telegram için set adı kuralları.
- Hatalar Türkçe ve dosya adıyla gösterilir (web'de kırmızı kartlar, CLI'da `hata:` satırları ve çıkış kodu 1).

## Komut satırı

```sh
npm ci --prefix sticker-maker          # bir kez (@napi-rs/canvas, hazır derlenmiş)

# Bir görselden WhatsApp ZIP + PNG
node sticker-maker/cli/sticker.mjs make foto.jpg --shape cutout --outline 10 --text "Selam!" \
  --name "Paketim" --publisher "Ben" --emoji "😀🎉"

# Aynı anda Telegram seti (token yalnız ortam değişkeninden)
TELEGRAM_BOT_TOKEN=123:ABC node sticker-maker/cli/sticker.mjs make foto.jpg \
  --export whatsapp,telegram --tg-user 123456789 --tg-set paketim

# Telegram'a göndermeden kurallara uygunluğu dene
node sticker-maker/cli/sticker.mjs make foto.jpg --export telegram --tg-dry-run --tg-set paketim

# GitHub deposuna kaydet
GITHUB_TOKEN=github_pat_… node sticker-maker/cli/sticker.mjs make foto.jpg --export github --repo kullanici/depo

# Hazır bir dosyayı doğrula
node sticker-maker/cli/sticker.mjs check sticker-out/paketim.zip sticker-out/telegram/01.webp
```

Telegram için: [@BotFather](https://t.me/BotFather) ile bot oluştur, token'ı al; botuna bir kez `/start` yaz;
sayısal kullanıcı kimliğini öğren (ör. @userinfobot). Set oluşunca çıktı `https://t.me/addstickers/<ad>` bağlantısını verir.

## Telegram'ı web sayfasından kullanmak (isteğe bağlı)

`server/telegram-function.js` bir fetch işleyicisidir (Cloudflare Workers, Deno Deploy, Vercel Edge).
Token sunucuda ortam değişkeni olarak durur; sayfa yalnız hazır WebP'leri gönderir, fonksiyon onları yeniden doğrular.
Ayarlar: `TELEGRAM_BOT_TOKEN`, `ALLOWED_ORIGIN` (ör. `https://<kullanıcı>.github.io`), isteğe bağlı `SHARED_KEY`.
Fonksiyonun adresini sayfadaki "Sunucu fonksiyonu adresi" alanına ya da `?tg=` parametresine yaz.

## Başka depolarda kullanmak

- **Bağlantıyla:** `…/sticker-maker/?repo=kullanici/depo&branch=main&dir=assets/stickers` alanları doldurur ve "GitHub'a kaydet"i açar.
  Bu bağlantıyı herhangi bir deponun README'sine koyabilirsin; token her kullanıcının kendi tarayıcısında kalır.
- **Komut satırıyla:** `--repo kullanici/depo --dir stickers` ve `GITHUB_TOKEN`.
- **Kopyalayarak:** `sticker-maker/` klasörü kendi başına çalışır; `index.html`, `web/`, `core/` statik olarak herhangi bir yerde yayınlanabilir.

Token için ince ayarlı (fine-grained) bir token önerilir: yalnız hedef depo, **Contents: Read and write**.
Sayfa token'ı yalnız `api.github.com`'a gönderir; "hatırla" seçilirse yalnız o sekmenin `sessionStorage`'ında tutar.

## Güvenlik

- Görseller tarayıcıdan çıkmaz (GitHub'a kaydet ve Telegram fonksiyonu hariç, onlar da yalnız seçilirse).
- CSP: `script-src 'self' 'wasm-unsafe-eval'` (WASM yalnız WebP yedeği için); harici betik, yazı tipi, analitik yok. Kullanıcı metni yalnız `textContent` ile yazılır.
- Telegram bot token'ı hiçbir zaman genel sayfaya girmez: `server/` ve `cli/` klasörleri siteye kopyalanmaz
  (`scripts/copy-web.mjs` yalnız `index.html`, `web/`, `core/` kopyalar).

## Sınırlar

- **Safari ve iOS'taki bütün tarayıcılar** tuvalden WebP üretemiyor. Sayfa bunu algılayınca repoya gömülü libwebp WASM kodlayıcısına geçer (`web/vendor/webp/`, ~280 KB, yalnız gerektiğinde yüklenir). Önizlemedeki kontrol satırı hangi kodlayıcının kullanıldığını gösterir. Çok eski Safari (< 16) WASM'ı bu sayfanın güvenlik politikası altında çalıştıramaz.
- **Kesip çıkarma** yapay zekâ ile değil, renk benzerliğiyle çalışır: düz ya da sade arka planlarda iyi, kalabalık fotoğraflarda kusurlu olabilir. En iyi sonuç saydam PNG ile alınır.
- **WhatsApp ZIP'i doğrudan içe aktarmaz.** ZIP, `.wastickers` içe aktaran bir uygulamayla (dosya uzantısını `.wastickers` yapıp) ya da WhatsApp'ın resmî örnek uygulamasına (`contents.json` biçimi) koyularak kullanılır.
  Tek tek çıkartmalar WhatsApp Web / masaüstünde "Çıkartma oluştur" ile de yüklenebilir.
- HEIC (iPhone) desteklenmiyor; önce JPEG/PNG'ye çevir.

## Testler

```sh
npm test --prefix sticker-maker
```

Saf çekirdek (ZIP/CRC, başlık okuyucu, uzaklık dönüşümü, arka plan silme, doğrulayıcılar), tüm şekiller,
"bir görsel → geçerli WhatsApp ZIP + Telegram seti (sahte Bot API ile) paralel", GitHub tek commit (sahte API),
sunucu fonksiyonunun köken kontrolü ve CLI uçtan uca (`make` sonra `check`). CI her push'ta çalıştırır.

## Dosyalar

```
index.html, web/            web arayüzü (browser-env: HTMLCanvas; telegram-remote: sunucu fonksiyonuna gönderim)
core/                       ortak çekirdek: pipeline, mask, validate, image-info, zip, context, exporters, github, plugins/
cli/                        komut satırı (node-env: @napi-rs/canvas)
server/                     Telegram Bot API istemcisi + isteğe bağlı sunucu fonksiyonu
scripts/                    copy-web (site derlemesine kopyalar), build-artifact, serve (yerel test)
test/                       node:test
```
