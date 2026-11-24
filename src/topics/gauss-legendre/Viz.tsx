import { useMemo, useState } from 'react';
import { CHAPTER_LABELS_DE, Chapters, type Chapter } from '../../core/ui';
import { ChapterCode, CodeCtx, CodeDrawer } from './PyCode';
import { Ch1Orthogonal } from './Ch1Orthogonal';
import { Ch2GramSchmidt } from './Ch2GramSchmidt';
import { Ch3Recurrence } from './Ch3Recurrence';
import { Ch4Matrix } from './Ch4Matrix';
import { Ch5Symmetric } from './Ch5Symmetric';
import { Ch6Nodes } from './Ch6Nodes';
import { Ch7Quadrature } from './Ch7Quadrature';
import { Ch8Exactness } from './Ch8Exactness';

const CHAPTERS: Chapter[] = [
  { id: 'orthogonal', title: 'Orthogonale Familie', lead: 'Projektion bei Vektoren, Integral bei Funktionen.', render: () => <Ch1Orthogonal /> },
  { id: 'gram-schmidt', title: 'Gram-Schmidt', lead: '1, x, x², … nacheinander orthogonalisieren.', render: () => <Ch2GramSchmidt /> },
  { id: 'rekursion', title: 'Drei-Term-Rekursion', lead: 'Statt aller Vorgänger genügen zwei.', render: () => <Ch3Recurrence /> },
  { id: 'matrix', title: 'Matrixform', lead: 'Eine Spalte zu viel — bis x eine Nullstelle ist.', render: () => <Ch4Matrix /> },
  { id: 'symmetrisch', title: 'Symmetrisches J', lead: 'Gleiche Eigenwerte, symmetrische Matrix.', render: () => <Ch5Symmetric /> },
  { id: 'stuetzstellen', title: 'Nullstellen = Stützstellen', lead: 'Vergleich mit äquidistanten und Tschebyscheff-Knoten.', render: () => <Ch6Nodes /> },
  { id: 'quadratur', title: 'Quadratur', lead: 'Womit gewichten wir die f(xᵢ)?', render: () => <Ch7Quadrature /> },
  { id: 'exaktheitsgrad', title: 'Exaktheitsgrad', lead: 'Messung gegen Theorie, tol und Konditionszahl.', render: () => <Ch8Exactness /> },
];

// Every chapter shows its lines of the Python solution below the content.
const WITH_CODE: Chapter[] = CHAPTERS.map((c) => ({ ...c, render: () => <ChapterCode id={c.id}>{c.render()}</ChapterCode> }));

export default function Viz() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(CHAPTERS[0]!.id);
  const ctx = useMemo(() => ({ open, setOpen, active, setActive }), [open, active]);
  return (
    <CodeCtx.Provider value={ctx}>
      <Chapters items={WITH_CODE} labels={CHAPTER_LABELS_DE} />
      <CodeDrawer />
    </CodeCtx.Provider>
  );
}
