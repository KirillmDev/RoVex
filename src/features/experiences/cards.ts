export const experienceCardLinks =
  'a.game-card-link[href], a.sdui-game-tile-wrapper[href], a.sdui-game-tile-primary[href], [data-testid="wide-game-tile"] a[href*="/games/"]';
const tiles =
  '[data-testid="wide-game-tile"], .game-card-container, .game-card, .sdui-game-tile-wrapper, [data-testid^="sdui-carousel-item"]';

export function experienceCardWrapper(link: HTMLAnchorElement): Element | null {
  if (link.closest('[data-testid="event-experience-link"]')) return null;
  const tile = link.closest('.game-card-container') ?? link.closest(tiles);
  const container = tile?.closest('a')?.parentElement ?? tile;
  if (
    !container ||
    container.matches('a') ||
    container.querySelectorAll(experienceCardLinks).length > 2
  )
    return null;
  return container;
}
