import { useContext, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredLayer } from './anchored-layer';

import { OverlayRoot } from './overlay-root';

export function Popover({
  id,
  anchor,
  close,
  children,
}: {
  id: string;
  anchor: RefObject<HTMLButtonElement | null>;
  close: () => void;
  children: ReactNode;
}) {
  const root = useContext(OverlayRoot);
  const panel = useRef<HTMLDivElement>(null);
  const label = useId();
  useAnchoredLayer(anchor, panel, true, close);
  useLayoutEffect(() => {
    panel.current?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
  }, []);
  if (!root) return null;
  return createPortal(
    <div
      id={id}
      ref={panel}
      popover="auto"
      className="ct-anchored ct-filter-popover"
      role="dialog"
      aria-labelledby={label}
      onToggle={(event) => {
        if (!event.currentTarget.matches(':popover-open')) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        close();
        anchor.current?.focus({ preventScroll: true });
      }}
    >
      <h2 id={label}>Filter settings</h2>
      {children}
    </div>,
    root,
  );
}
