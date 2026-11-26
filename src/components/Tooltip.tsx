import { useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { OverlayRoot } from './overlay-root';
import { useAnchoredLayer } from './anchored-layer';

export function Tooltip({
  text,
  children,
  onClick,
  className,
}: {
  text: string;
  children: ReactNode;
  onClick: () => void;
  className: string;
}) {
  const root = useContext(OverlayRoot);
  const anchor = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const id = useId();
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);
  useAnchoredLayer(anchor, layer, open, dismiss, true);
  useEffect(() => () => clearTimeout(timer.current), []);
  const reveal = (delay: number) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  return (
    <>
      <button
        className={className}
        type="button"
        ref={anchor}
        aria-describedby={id}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') reveal(350);
        }}
        onPointerLeave={dismiss}
        onFocus={() => reveal(0)}
        onBlur={dismiss}
        onKeyDown={(event) => {
          if (event.key === 'Escape') dismiss();
        }}
        onClick={() => {
          dismiss();
          onClick();
        }}
      >
        {children}
      </button>
      {root &&
        createPortal(
          <span
            id={id}
            className="ct-anchored ct-tooltip"
            role="tooltip"
            ref={layer}
            popover="manual"
          >
            {text}
          </span>,
          root,
        )}
    </>
  );
}
