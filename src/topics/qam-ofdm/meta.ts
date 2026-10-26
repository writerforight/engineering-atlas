import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'QAM-OFDM: cos/sin taşıyıcılarla bilgi gönder, Φᵀ ile oku',
  summary:
    'K alt taşıyıcının cos ve sin bileşenlerine QAM seviyeleri ata, sinyali örnekle ve alıcıda Φᵀ ile katsayıları geri oku. Örnekleme matrisi, transpozu ve DFT/FFT ile aynı şey olduğu gözünün önünde.',
  tags: ['haberleşme', 'OFDM', 'QAM', 'örnekleme', 'DFT', 'FFT'],
  order: 30,
};
