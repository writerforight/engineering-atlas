import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Polinom interpolasyonu: eşit aralıklı ve Çebişev düğümleri, Lebesgue sabiti',
  summary:
    'n düğüm seç (eşit aralıklı ya da Çebişev), fonksiyonu barisentrik formülle interpole et, polinomu 100 noktalı test ızgarasında değerlendir. Tek grafikte f, iki polinom ve en büyük sapma; RMS, ortalama RMS, max|p−f| ve Λₙ tablosu; n = 2…40 için hata eğrisi e_interp(n). Typ‑K termokupl verisi: T_exakt ve 0,01 °C\'ye yuvarlı T_kalibrator ile veri hatası e_daten ≤ Λₙ·δ.',
  tags: ['interpolasyon', 'Çebişev', 'Runge', 'Lebesgue', 'veri hatası', 'termokupl', 'sayısal analiz'],
  order: 28,
};
