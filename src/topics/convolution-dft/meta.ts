import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Konvolüsyon matrisi ve DFT ile köşegenleştirme: F·C·F⁻¹ = diag(F a)',
  summary:
    'Boyutları ayrı ayrı ayarlanan rastgele a(n), b(n) dizileri (en büyük değer seçilebilir) için doğrusal ya da dairesel konvolüsyonu, Toeplitz / dairesel (circulant) matrisini, DFT matrisini, F·C ve F·C·F⁻¹ çarpımlarını eksiksiz gör: köşegende F a çıkar, konvolüsyon Hadamard çarpımına dönüşür.',
  tags: ['konvolüsyon', 'DFT', 'matris', 'köşegenleştirme', 'Hadamard'],
  order: 27,
  de: {
    title: 'Faltungsmatrix und Diagonalisierung mit der DFT: F·C·F⁻¹ = diag(F a)',
    summary:
      'Für zufällige Folgen a(n), b(n) mit getrennt einstellbarer Länge (größter Wert wählbar): lineare oder zyklische Faltung, Toeplitz- bzw. zirkulante Matrix, DFT-Matrix sowie die Produkte F·C und F·C·F⁻¹ vollständig sehen. Auf der Diagonalen steht F a, die Faltung wird zum Hadamard-Produkt.',
    tags: ['Faltung', 'DFT', 'Matrix', 'Diagonalisierung', 'Hadamard'],
  },
};
