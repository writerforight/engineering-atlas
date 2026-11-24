import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Kendi koordinat sistemin ve üstünde bir skaler alan',
  summary:
    'Boyut sayısını seç, her koordinatı parametrelerin fonksiyonu olarak yaz (x = f₁(a,b), …), sonra bir T fonksiyonu gir: 1B’de eğri, 2B’de gölgeli 3B yüzey, 3B’de nokta bulutu ya da SVD ile en büyük iki yöne izdüşüm.',
  tags: ['koordinat dönüşümü', 'skaler alan', '3B', 'SVD'],
  order: 35,
  de: {
    title: 'Dein eigenes Koordinatensystem und ein Skalarfeld darauf',
    summary:
      'Dimension wählen, jede Koordinate als Funktion der Parameter schreiben (x = f₁(a,b), …), dann eine Funktion T eingeben: in 1D eine Kurve, in 2D eine schattierte 3D-Fläche, in 3D eine Punktwolke oder die Projektion auf die zwei Hauptrichtungen per SVD.',
    tags: ['Koordinatentransformation', 'Skalarfeld', '3D', 'SVD'],
  },
};
