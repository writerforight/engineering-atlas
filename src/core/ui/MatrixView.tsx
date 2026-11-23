import { useState, type ReactNode } from 'react';

export type CellRole = 'diag' | 'up' | 'low' | 'extra' | 'zero' | 'plain';

export interface MatrixCell {
  v: ReactNode;
  role?: CellRole;
}

interface Props {
  cells: MatrixCell[][];
  /** Columns from this index on are drawn as an extra (augmented) block. */
  extraFrom?: number;
  /** Fade the extra block out (it "vanishes"). */
  extraGone?: boolean;
  /** Text shown for the hovered row, e.g. the equation it stands for. */
  rowNote?: (row: number) => ReactNode;
  label?: ReactNode;
}

/**
 * Live matrix: bracketed grid whose cells are coloured by role and animate
 * when values change; hovering (or tapping) a row highlights it and shows
 * `rowNote(row)` underneath.
 */
export function MatrixView({ cells, extraFrom, extraGone, rowNote, label }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const cols = cells[0]?.length ?? 0;
  return (
    <div className="mv">
      {label && <div className="mv-label">{label}</div>}
      <div
        className="mv-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
        onMouseLeave={() => setHover(null)}
      >
        {cells.map((row, i) =>
          row.map((c, j) => {
            const extra = extraFrom !== undefined && j >= extraFrom;
            return (
              <span
                key={`${i}-${j}`}
                className="mv-cell"
                data-role={c.role ?? 'plain'}
                data-extra={extra || undefined}
                data-gone={(extra && extraGone) || undefined}
                data-hl={hover === i || undefined}
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(i)}
              >
                {c.v}
              </span>
            );
          }),
        )}
      </div>
      {rowNote && <div className="mv-note">{hover === null ? ' ' : rowNote(hover)}</div>}
    </div>
  );
}
