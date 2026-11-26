import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getGlobal, setGlobal } from '../storage/chrome-storage';
import './popup.css';

export function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    void getGlobal().then(({ enabled }) => setEnabled(enabled));
  }, []);

  return (
    <main>
      <header>
        <div className="mark" aria-hidden="true">
          RV
        </div>
        <div>
          <h1>RoVex</h1>
          <div className="version">Roblox website enhancements</div>
        </div>
      </header>
      <div className="row">
        <label htmlFor="master-enabled">Enable RoVex</label>
        <input
          id="master-enabled"
          className="switch"
          type="checkbox"
          checked={enabled}
          onChange={async (event) => {
            const value = event.target.checked;
            setEnabled(value);
            await setGlobal({ enabled: value });
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          setStatus('Opening settings…');
          chrome.runtime.sendMessage({ type: 'creatorToolkit.openSettings' }, (result) => {
            if (chrome.runtime.lastError || !result?.ok) setStatus('Could not open settings.');
            else window.close();
          });
        }}
      >
        Open RoVex settings
      </button>
      <p className="status" role="status">
        {status}
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);
