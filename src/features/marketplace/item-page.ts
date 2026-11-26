export const marketplaceDetailPath =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(catalog|bundles|library)\/([1-9]\d*)(?:\/|$)/i;

export function marketplaceHeading(): HTMLElement | null {
  if (location.hostname === 'create.roblox.com') {
    const path = location.pathname.replace(/\/$/, '');
    const titleLink = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[href^="/store/asset/"]'),
    ].find(
      (link) =>
        new URL(link.href).pathname.replace(/\/$/, '') === path &&
        link.textContent?.trim() &&
        link.getClientRects().length &&
        !link.closest('nav, [hidden], [aria-hidden="true"]'),
    );
    if (titleLink) return titleLink;
  }
  const candidates = document.querySelectorAll<HTMLElement>(
    '#item-container h1, #item-container .item-name, .item-details-name-row h1, [data-testid="item-details"] h1, #item-name, main h1, [role="main"] h1, main [data-testid="item-name"]',
  );
  return (
    [...candidates].find((node) => {
      if (
        !node.textContent?.trim() ||
        node.closest(
          '[hidden], [aria-hidden="true"], nav, [role="dialog"], .item-list-carousel-title',
        )
      )
        return false;
      const style = getComputedStyle(node);
      return style.visibility !== 'hidden' && style.display !== 'none';
    }) ?? null
  );
}
