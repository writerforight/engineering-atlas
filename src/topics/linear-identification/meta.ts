import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Deneylerden lineer dönüşümü bulmak ve tersine çevirmek: Â = Y X⁺, x̂ = Â⁺ y',
  summary:
    'Girdi boyu n ve çıktı boyu m seçilir, gizli bir m×n matris A vektörleri dönüştürür. K deney yap, SVD ile Â = Y X⁺ tahminini kur, sonra Â’nın sözde tersiyle çıktıdan girdiyi tahmin et; m < n ya da K < n olunca neyin kaybolduğunu gör.',
  tags: ['lineer cebir', 'SVD', 'sistem tanıma', 'sözde ters'],
  order: 29,
  de: {
    title: 'Eine lineare Abbildung aus Experimenten bestimmen und umkehren: Â = Y X⁺, x̂ = Â⁺ y',
    summary:
      'Eingangsdimension n und Ausgangsdimension m wählen; eine verborgene m×n-Matrix A bildet Vektoren ab. K Experimente durchführen, mit der SVD die Schätzung Â = Y X⁺ bilden und dann mit der Pseudoinversen von Â den Eingang aus dem Ausgang schätzen; sehen, was bei m < n oder K < n verloren geht.',
    tags: ['lineare Algebra', 'SVD', 'Systemidentifikation', 'Pseudoinverse'],
  },
};
