import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Polinom interpolasyonu: eşit aralıklı ve Çebişev düğümleri, Lebesgue sabiti',
  summary:
    'n düğüm seç (eşit aralıklı ya da Çebişev), fonksiyonu barisentrik formülle interpole et, polinomu 100 noktalı test ızgarasında değerlendir. Tek grafikte f, iki polinom ve en büyük sapma; RMS, ortalama RMS, max|p−f| ve Λₙ tablosu; n = 2…40 için hata eğrisi e_interp(n). Typ‑K termokupl verisi: T_exakt ve 0,01 °C\'ye yuvarlı T_kalibrator ile veri hatası e_daten ≤ Λₙ·δ.',
  tags: ['interpolasyon', 'Çebişev', 'Runge', 'Lebesgue', 'veri hatası', 'termokupl', 'sayısal analiz'],
  order: 28,
  de: {
    title: 'Polynominterpolation: äquidistante und Tschebyscheff-Knoten, Lebesgue-Konstante',
    summary:
      'n Knoten wählen (äquidistant oder Tschebyscheff), die Funktion mit der baryzentrischen Formel interpolieren und das Polynom auf einem Testgitter mit 100 Punkten auswerten. In einem Diagramm f, beide Polynome und die größte Abweichung; Tabelle mit RMS, mittlerem RMS, max|p−f| und Λₙ; Fehlerkurve e_interp(n) für n = 2…40. Thermoelement-Daten Typ K: T_exakt und auf 0,01 °C gerundetes T_kalibrator mit Datenfehler e_daten ≤ Λₙ·δ.',
    tags: ['Interpolation', 'Tschebyscheff', 'Runge', 'Lebesgue', 'Datenfehler', 'Thermoelement', 'Numerik'],
  },
};
