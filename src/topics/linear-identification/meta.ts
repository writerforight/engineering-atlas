import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Deneylerden lineer dönüşümü bulmak ve tersine çevirmek: Â = Y X⁺, x̂ = Â⁺ y',
  summary:
    'Girdi boyu n ve çıktı boyu m seçilir, gizli bir m×n matris A vektörleri dönüştürür. K deney yap, SVD ile Â = Y X⁺ tahminini kur, sonra Â’nın sözde tersiyle çıktıdan girdiyi tahmin et; m < n ya da K < n olunca neyin kaybolduğunu gör.',
  tags: ['lineer cebir', 'SVD', 'sistem tanıma', 'sözde ters'],
  order: 29,
};
