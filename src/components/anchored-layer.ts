import { useLayoutEffect, type RefObject } from 'react';

export function useAnchoredLayer(
  anchor: RefObject<HTMLElement | null>,
  layer: RefObject<HTMLElement | null>,
  open: boolean,
  dismiss: () => void,
  preferAbove = false,
) {
  useLayoutEffect(() => {
    const trigger = anchor.current;
    const panel = layer.current;
    if (!open || !trigger || !panel) return;
    const viewport = window.visualViewport;
    const gap = 6;
    const margin = 8;
    let frame = 0;
    let previous = '';
    panel.showPopover();
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) dismiss();
    });
    visibility.observe(trigger);
    const position = () => {
      const bounds = trigger.getBoundingClientRect();
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? document.documentElement.clientWidth);
      const bottom = top + (viewport?.height ?? document.documentElement.clientHeight);
      if (
        !trigger.isConnected ||
        !bounds.width ||
        !bounds.height ||
        bounds.bottom <= top ||
        bounds.top >= bottom ||
        bounds.right <= left ||
        bounds.left >= right
      ) {
        dismiss();
        return;
      }
      const widthLimit = Math.max(0, right - left - margin * 2);
      const maxWidth = `${widthLimit}px`;
      if (panel.style.getPropertyValue('--ct-layer-viewport-width') !== maxWidth)
        panel.style.setProperty('--ct-layer-viewport-width', maxWidth);
      const above = Math.max(0, bounds.top - top - gap - margin);
      const below = Math.max(0, bottom - bounds.bottom - gap - margin);
      const style = getComputedStyle(panel);
      const desired = panel.scrollHeight + (panel.offsetHeight - panel.clientHeight);
      const up = preferAbove ? desired <= above || above > below : desired > below && above > below;
      const available = up ? above : below;
      const width = panel.offsetWidth;
      const start = style.direction === 'rtl' ? bounds.left : bounds.right - width;
      const x = Math.max(left + margin, Math.min(start, right - margin - width));
      const y = up ? bounds.top - gap - Math.min(desired, available) : bounds.bottom + gap;
      const next = `${x}:${y}:${available}`;
      if (previous !== next) {
        previous = next;
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.maxHeight = `${available}px`;
      }
      frame = requestAnimationFrame(position);
    };
    position();
    return () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      if (panel.matches(':popover-open')) panel.hidePopover();
    };
  }, [anchor, layer, open, dismiss, preferAbove]);
}
