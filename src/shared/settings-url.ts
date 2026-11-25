export const PRIMARY_SETTINGS_URL = 'https://www.roblox.com/my/account?creatorToolkit=settings';

export async function openSettingsTab(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://www.roblox.com/*' });
  const existing = tabs[0];
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true, url: PRIMARY_SETTINGS_URL });
    if (existing.windowId !== undefined)
      await chrome.windows.update(existing.windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({ url: PRIMARY_SETTINGS_URL });
}
