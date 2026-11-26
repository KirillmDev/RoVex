export function liveStatus(): HTMLParagraphElement {
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  return status;
}

export function verificationIcon(label: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns, 'svg');
  icon.setAttribute('viewBox', '0 0 20 20');
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', label);
  icon.setAttribute('focusable', 'false');
  icon.style.cssText =
    'display:inline-block;width:16px;height:16px;margin-inline-start:4px;vertical-align:middle;flex:none;';
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('x', '3');
  background.setAttribute('y', '3');
  background.setAttribute('width', '14');
  background.setAttribute('height', '14');
  background.setAttribute('rx', '2');
  background.setAttribute('transform', 'rotate(-15 10 10)');
  background.setAttribute('fill', '#335fff');
  const check = document.createElementNS(ns, 'path');
  check.setAttribute('d', 'm6.7 10 2.1 2.1 4.5-4.6');
  check.setAttribute('fill', 'none');
  check.setAttribute('stroke', 'white');
  check.setAttribute('stroke-width', '1.8');
  icon.append(background, check);
  return icon;
}
