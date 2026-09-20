import { useEffect, useState } from 'react';

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Renders nothing once the app is already installed. Otherwise shows a
// button that either triggers Android/Chrome's native install prompt, or
// (on iOS, where no such API exists) opens instructions for the manual
// Share -> Add to Home Screen steps.
export default function AddToHomeScreen({ as: Tag = 'button', className, children }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [standalone, setStandalone] = useState(isStandalone());
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = isIos();

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    function onInstalled() {
      setInstallPrompt(null);
      setStandalone(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone) return null;
  if (!ios && !installPrompt) return null; // Android/desktop before Chrome fires the event, or unsupported browser

  async function handleClick() {
    if (ios) {
      setShowIosHelp(true);
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <>
      <Tag className={className} onClick={handleClick}>
        {children || 'Add to Home Screen'}
      </Tag>

      {showIosHelp && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowIosHelp(false)} />
          <div className="ios-help-card">
            <div className="eyebrow">Add to Home Screen</div>
            <h2 className="headline" style={{ fontSize: 22, marginBottom: 16 }}>
              Three taps on your iPhone
            </h2>
            <ol className="ios-help-steps">
              <li>
                <span className="ios-help-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Tap the <strong>Share</strong> button in Safari's toolbar
              </li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> in the top right</li>
            </ol>
            <button className="btn" onClick={() => setShowIosHelp(false)}>
              Got it
            </button>
          </div>
        </>
      )}
    </>
  );
}
