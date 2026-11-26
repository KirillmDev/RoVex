import { ownedElement } from '../../core/live-dom';

export function openLaunchDialog(
  place: string,
  title: string,
  thumbnail: string | undefined,
  signal: AbortSignal,
) {
  document.querySelector<HTMLDialogElement>('[data-rovex-launch]')?.close();
  const dialog = ownedElement('dialog', 'quick-play', signal);
  dialog.dataset.rovexLaunch = '';
  dialog.setAttribute('aria-label', `Play ${title} with RoVex`);
  const heading = document.createElement('h2');
  heading.textContent = title;
  const badge = document.createElement('p');
  badge.textContent = 'RoVex Quick Play';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Continue to Roblox to launch this experience.';
  if (thumbnail && /^https:\/\/[\w-]+\.rbxcdn\.com\//i.test(thumbnail)) {
    const image = document.createElement('img');
    image.src = thumbnail;
    image.alt = '';
    image.width = image.height = 64;
    image.referrerPolicy = 'no-referrer';
    dialog.append(image);
  }
  const launch = document.createElement('a');
  launch.className = 'rovex-quick-launch';
  launch.href = `roblox://experiences/start?placeId=${place}`;
  launch.textContent = 'Open Roblox';
  launch.addEventListener('click', () => {
    status.textContent =
      'Launch requested. Follow any prompt from your browser or operating system.';
    launch.textContent = 'Retry launch';
  });
  const fallback = document.createElement('a');
  fallback.href = `/games/${place}`;
  fallback.textContent = 'Open experience page';
  const download = document.createElement('a');
  download.href = 'https://www.roblox.com/download';
  download.textContent = 'Download Roblox';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.append(badge, heading, status, launch, fallback, download, close);
  document.body.append(dialog);
  dialog.showModal();
}
