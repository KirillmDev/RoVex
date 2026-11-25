import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { mountSettings } from '../src/settings/mount';

describe('settings UI', () => {
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
