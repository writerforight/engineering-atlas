import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'QAM-OFDM: cos/sin taşıyıcılarla bilgi gönder, Φᵀ ile oku',
  summary:
    'K alt taşıyıcının cos ve sin bileşenlerine QAM seviyeleri ata, sinyali örnekle ve alıcıda Φᵀ ile katsayıları geri oku. Örnekleme matrisi, transpozu ve DFT/FFT ile aynı şey olduğu gözünün önünde.',
  tags: ['haberleşme', 'OFDM', 'QAM', 'örnekleme', 'DFT', 'FFT'],
  order: 30,
  de: {
    title: 'QAM-OFDM: Information mit cos/sin-Trägern senden, mit Φᵀ lesen',
    summary:
      'Den cos- und sin-Komponenten von K Unterträgern QAM-Stufen zuweisen, das Signal abtasten und im Empfänger die Koeffizienten mit Φᵀ zurückgewinnen. Abtastmatrix, ihre Transponierte und dass das dasselbe wie DFT/FFT ist, direkt vor Augen.',
    tags: ['Nachrichtentechnik', 'OFDM', 'QAM', 'Abtastung', 'DFT', 'FFT'],
  },
};
