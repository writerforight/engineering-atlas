import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import raw from './code/pp3_aufgabe1.py?raw';

export const FILE_NAME = 'pp3_aufgabe1.py';

/**
 * The Python file marks each chapter's lines with `# >>> <id>` … `# <<< <id>`.
 * Marker lines are dropped from the displayed code; ranges are 1-based, inclusive.
 */
function parse(src: string) {
  const lines: string[] = [];
  const ranges: Record<string, [number, number]> = {};
  const open: Record<string, number> = {};
  for (const line of src.replace(/\s+$/, '').split('\n')) {
    const m = /^#\s*(>>>|<<<)\s*(\S+)\s*$/.exec(line.trim());
    if (!m) lines.push(line);
    else if (m[1] === '>>>') open[m[2]!] = lines.length + 1;
    else ranges[m[2]!] = [open[m[2]!] ?? 1, lines.length];
  }
  return { lines, ranges };
}

export const CODE = parse(raw);

/* ---------- minimal Python highlighting (per line, docstring state carried) ---------- */

const KW = new Set('def return for in if else elif import from as and or not None True False lambda while with class pass'.split(' '));
const BUILTIN = new Set('range sum abs enumerate zip print float int len dict list'.split(' '));
const TOKEN = /("""|''')|(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?(?:e[-+]?\d+)?\b)|([A-Za-z_]\w*)/g;

type Tok = { t: string; c?: string };

function highlightAll(lines: readonly string[]): Tok[][] {
  let inDoc = false;
  return lines.map((line) => {
    const out: Tok[] = [];
    let i = 0;
    if (inDoc) {
      const end = line.search(/"""|'''/);
      if (end < 0) return [{ t: line, c: 'str' }];
      out.push({ t: line.slice(0, end + 3), c: 'str' });
      i = end + 3;
      inDoc = false;
    }
    let prev = '';
    TOKEN.lastIndex = i;
    for (let m; (m = TOKEN.exec(line)); ) {
      if (m.index > i) out.push({ t: line.slice(i, m.index) });
      const [s, doc, com, str, num, word] = m;
      if (doc) {
        const close = line.indexOf(doc, m.index + 3);
        if (close < 0) {
          out.push({ t: line.slice(m.index), c: 'str' });
          inDoc = true;
          i = line.length;
          break;
        }
        out.push({ t: line.slice(m.index, close + 3), c: 'str' });
        i = TOKEN.lastIndex = close + 3;
        continue;
      }
      const c = com ? 'com' : str ? 'str' : num ? 'num' : word && KW.has(word) ? 'kw' : word && prev === 'def' ? 'fn' : word && BUILTIN.has(word) ? 'bi' : undefined;
      out.push({ t: s, c });
      if (word) prev = word;
      i = m.index + s.length;
    }
    if (i < line.length) out.push({ t: line.slice(i) });
    return out;
  });
}

const TOKENS = highlightAll(CODE.lines);

function Line({ n, active }: { n: number; active?: boolean }) {
  return (
    <div className="py-line" data-active={active || undefined} data-line={n}>
      <span className="py-ln">{n}</span>
      <span className="py-src">
        {TOKENS[n - 1]!.map((tok, k) => (tok.c ? <span key={k} className={`py-${tok.c}`}>{tok.t}</span> : tok.t))}
        {'\n'}
      </span>
    </div>
  );
}

/* ---------- shared state: drawer open + current chapter ---------- */

interface CodeState {
  open: boolean;
  setOpen: (v: boolean) => void;
  active: string;
  setActive: (id: string) => void;
}
export const CodeCtx = createContext<CodeState | null>(null);

function useCode(): CodeState {
  const c = useContext(CodeCtx);
  if (!c) throw new Error('CodeCtx missing');
  return c;
}

/** The lines of one chapter, shown under the chapter content. */
export function ChapterCode({ id, children }: { id: string; children: ReactNode }) {
  const { setActive, setOpen, open } = useCode();
  useEffect(() => setActive(id), [id, setActive]);
  const r = CODE.ranges[id];
  return (
    <>
      {children}
      {r && (
        <div className="py-snippet">
          <div className="py-head">
            <span>
              Python · <code>{FILE_NAME}</code> · Zeilen {r[0]}–{r[1]}
            </span>
            <button className="btn" aria-pressed={open} onClick={() => setOpen(!open)}>
              {open ? 'Code-Leiste schließen' : 'Ganzen Code daneben öffnen'}
            </button>
          </div>
          <pre className="py-code">
            {Array.from({ length: r[1] - r[0] + 1 }, (_, k) => (
              <Line key={k} n={r[0] + k} />
            ))}
          </pre>
        </div>
      )}
    </>
  );
}

/** Side panel with the whole file; the current chapter's lines are highlighted. */
export function CodeDrawer() {
  const { open, setOpen, active } = useCode();
  const bodyRef = useRef<HTMLPreElement>(null);
  const r = CODE.ranges[active];

  useEffect(() => {
    if (!open || !r) return;
    bodyRef.current?.querySelector(`[data-line="${r[0]}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [open, r]);

  // Wide screens: the page makes room for the drawer and re-centres in the space left of it (see CSS).
  useEffect(() => {
    document.documentElement.toggleAttribute('data-code-open', open);
    return () => document.documentElement.removeAttribute('data-code-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <>
      {!open && (
        <button className="py-tab" onClick={() => setOpen(true)} aria-label="Python-Code öffnen">
          {'</>'} Code
        </button>
      )}
      <aside className="py-drawer" data-open={open || undefined} aria-hidden={!open} lang="de">
        <div className="py-head">
          <span>
            <code>{FILE_NAME}</code>
            {r && <> · Kapitel-Zeilen {r[0]}–{r[1]}</>}
          </span>
          <button className="btn" onClick={() => setOpen(false)} aria-label="Code-Leiste schließen">
            ✕
          </button>
        </div>
        <pre className="py-code py-full" ref={bodyRef}>
          {CODE.lines.map((_, k) => (
            <Line key={k} n={k + 1} active={!!r && k + 1 >= r[0] && k + 1 <= r[1]} />
          ))}
        </pre>
      </aside>
    </>
  );
}
