import katex from 'katex';
import { memo } from 'react';

interface Props {
  tex: string;
  /** Render as a centered display block instead of inline. */
  block?: boolean;
}

/** KaTeX formula. Errors render in red instead of throwing. */
export const Tex = memo(function Tex({ tex, block = false }: Props) {
  const html = katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: false });
  return block ? (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
});

