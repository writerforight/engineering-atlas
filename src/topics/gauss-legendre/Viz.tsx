import { Chapters, type Chapter } from '../../core/ui';
import { Ch1Orthogonal } from './Ch1Orthogonal';
import { Ch2GramSchmidt } from './Ch2GramSchmidt';
import { Ch3Recurrence } from './Ch3Recurrence';
import { Ch4Matrix } from './Ch4Matrix';
import { Ch5Symmetric } from './Ch5Symmetric';
import { Ch6Nodes } from './Ch6Nodes';
import { Ch7Quadrature } from './Ch7Quadrature';
import { Ch8Exactness } from './Ch8Exactness';

const CHAPTERS: Chapter[] = [
  { id: 'dik-aile', title: 'Dik bir aile', lead: 'Vektörlerde izdüşüm, fonksiyonlarda integral: Legendre polinomları Fourier fonksiyonları gibi dik bir ailedir.', render: () => <Ch1Orthogonal /> },
  { id: 'gram-schmidt', title: 'Gram-Schmidt', lead: '1, x, x², … sırayla alınıp öncekilere dik hale getirilir; her adımda yeni bir Legendre polinomu çıkar.', render: () => <Ch2GramSchmidt /> },
  { id: 'rekursiyon', title: 'Üç terimli rekürsiyon', lead: 'Her seferinde bütün öncekileri çıkarmaya gerek yok: iki önceki polinom yeter.', render: () => <Ch3Recurrence /> },
  { id: 'matris', title: 'Matris biçimi', lead: 'Rekürsiyon alt alta yazılınca bir sütun fazla bir sistem olur; bir köke gidince fazla sütun kaybolur.', render: () => <Ch4Matrix /> },
  { id: 'simetrik', title: 'Simetrik J', lead: 'D·T·D⁻¹ = J: özdeğerler aynı kalır, matris simetrik olur ve eigh ile kararlı çözülür.', render: () => <Ch5Symmetric /> },
  { id: 'dugumler', title: 'Kökler = düğümler', lead: 'J’nin özdeğerleri artık Stützstellen. Önce interpolasyonda eşit aralıklı ve Tschebyscheff ile karşılaştırma.', render: () => <Ch6Nodes /> },
  { id: 'kuadratur', title: 'Kuadratür', lead: '∫f dx ≈ Σ wᵢ f(xᵢ): düğümler hazır, ağırlıkları nasıl seçelim?', render: () => <Ch7Quadrature /> },
  { id: 'exaktheitsgrad', title: 'Exaktheitsgrad deneyi', lead: '40 formül, monomlarla test, tol ve Konditionszahl: ölçülen derece teoriyle uyuşuyor mu?', render: () => <Ch8Exactness /> },
];

export default function Viz() {
  return <Chapters items={CHAPTERS} />;
}
