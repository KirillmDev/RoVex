import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { mountSettings } from '../src/settings/mount';

describe('settings UI', () => {
  it('shows manifest version and team cards with only API-confirmed badges', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (request: unknown) => {
      const { kind, id } = request as { kind: string; id: string };
      return {
        ok: true,
        data:
          kind === 'headshots'
            ? {
                data: [
                  {
                    targetId: 10436912462,
                    state: 'Completed',
                    imageUrl: 'https://tr.rbxcdn.com/avatar.png',
                  },
                ],
              }
            : {
                id,
                name: id === '10436912462' ? 'VexorCreator' : undefined,
                hasVerifiedBadge: id === '10436912462',
              },
      };
    });
    let mounted!: ReturnType<typeof mountSettings>;
    await act(async () => {
      mounted = mountSettings(document.body);
    });
    const shadow = mounted.host.shadowRoot!;
    const about = [...shadow.querySelectorAll('button')].find(
      (button) => button.textContent === 'About RoVex',
    )!;
    await act(async () => about.click());
    expect(shadow.querySelector('.ct-about-version')?.textContent).toBe('Version 0.1.0');
    expect(shadow.querySelectorAll('.ct-team-row')).toHaveLength(3);
    expect(shadow.querySelectorAll('.ct-team-row [role="img"]')).toHaveLength(1);
    expect(shadow.querySelector('.ct-team-row img')?.getAttribute('src')).toBe(
      'https://tr.rbxcdn.com/avatar.png',
    );
    expect(shadow.textContent).not.toContain('Creator Hub support is deferred');
    await act(async () => mounted.unmount());
  });
  it('reversibly replaces account content, searches, and remains available when disabled', async () => {
    const target = document.createElement('main');
    const nativeContent = document.createElement('section');
    nativeContent.textContent = 'Roblox account settings';
    target.append(nativeContent);
    document.body.append(target);
    let unmount: () => void = () => undefined;
    await act(async () => {
      const mounted = mountSettings(target);
      unmount = mounted.unmount;
      await Promise.resolve();
    });
    const host = document.querySelector('creator-toolkit-settings-root')!;
    const shadow = host.shadowRoot!;
    expect(shadow.querySelector('.ct-shell')).toBeTruthy();
    expect(nativeContent.hidden).toBe(true);
    const search = shadow.querySelector<HTMLInputElement>('.ct-search')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        search,
        'bundle',
      );
      search.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    });
    expect(shadow.textContent).toContain('Copy Bundle ID');
    const master = shadow.querySelector<HTMLInputElement>('.ct-master input')!;
    await act(async () => master.click());
    expect(shadow.textContent).toContain('Settings remain available');
    unmount();
    expect(nativeContent.hidden).toBe(false);
  });
});
