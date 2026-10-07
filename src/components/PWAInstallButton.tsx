import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, WifiOff } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Hide when already running as an installed standalone phone app
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
        title="Download Iron100 to your phone home screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Download Iron100 to Your Phone
                  </h3>
                  <p className="text-xs text-slate-400">
                    Full-screen home screen app with offline workout access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <p className="font-semibold text-white">
                  Install on iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    Open this app URL directly in <strong>Safari</strong> on your iPhone.
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>2. Tap the</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-medium">
                      <Share className="w-3.5 h-3.5" /> Share
                    </span>
                    <span>button at the bottom of Safari.</span>
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>3. Scroll down and tap</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-medium">
                      <PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <p className="font-semibold text-white">
                  Install on Android (Chrome) or iPhone (Safari):
                </p>
                <div className="space-y-2">
                  <p>
                    <strong className="text-emerald-400">On Android (Chrome):</strong> Open the direct app URL in Chrome, tap the <strong>⋮ menu</strong> in the top-right corner, and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                  <p>
                    <strong className="text-emerald-400">On iPhone (Safari):</strong> Open the direct app URL in Safari, tap the <strong>Share</strong> icon at the bottom, and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-lg">
      <WifiOff className="w-4 h-4" />
      <span>Offline Gym Mode — Changes will sync when back online.</span>
    </div>
  );
};
