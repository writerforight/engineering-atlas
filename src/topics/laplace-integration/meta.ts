import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'İntegralin Laplace dönüşümü: F(s)/s',
  summary:
    'Bir sinyali integre etmek s-düzleminde 1/s ile çarpmaktır. σ → 0 limitinde bu 1/(jω) ve bir δ(ω) terimine dönüşür; nedenini sönümleme kaydıracıyla gör.',
  tags: ['sinyaller ve sistemler', 'Laplace', 'Fourier', 'ROC'],
  order: 20,
  de: {
    title: 'Laplace-Transformation des Integrals: F(s)/s',
    summary:
      'Ein Signal zu integrieren heißt, in der s-Ebene mit 1/s zu multiplizieren. Im Grenzfall σ → 0 wird daraus 1/(jω) plus ein δ(ω)-Term; den Grund zeigt der Dämpfungsregler.',
    tags: ['Signale und Systeme', 'Laplace', 'Fourier', 'Konvergenzbereich'],
  },
};
