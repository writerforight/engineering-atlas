import type { ReactNode } from 'react';

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: ReadonlyArray<{ id: T; label: ReactNode }>;
}

export function Tabs<T extends string>({ value, onChange, items }: Props<T>) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={it.id === value} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
