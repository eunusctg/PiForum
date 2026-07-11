'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Smartphone, WifiOff, Share, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* Enhanced PWA registration with:
   - Offline/online detection UI (toast notifications)
   - Smart cache purging (only old versions, not all caches)
   - Improved install prompt with custom UI
   - iOS "Add to Home Screen" guidance
   - SW registered with updateViaCache: 'none' for immediate updates */

const CURRENT_CACHE_PREFIX = 'piforum-v3';

/* ---------- Offline indicator banner — declared outside render ---------- */
function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground text-center py-1.5 text-xs font-medium animate-bounce-up">
      <span className="flex items-center justify-center gap-1.5">
        <WifiOff className="size-3" />
        You&apos;re offline — some features may be limited
      </span>
    </div>
  );
}

/* ---------- Detect iOS (non-hook) ---------- */
function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (navigator as any).standalone === true;
}

export default function PwaRegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { toast } = useToast();

  // ---------- Online/Offline detection with toast ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial sync from browser API
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're Offline",
        description: "Some features may be limited. Cached content is still available.",
        duration: 5000,
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // ---------- Register Service Worker ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (window.location.protocol !== 'https:' && !isLocalhost) return;

    (async () => {
      // Smart cache purge: only delete OLD cache versions (not current v3)
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          const oldKeys = keys.filter((k) => !k.startsWith(CURRENT_CACHE_PREFIX));
          if (oldKeys.length > 0) {
            await Promise.all(oldKeys.map((k) => caches.delete(k)));
          }
        }
      } catch {
        // non-critical
      }

      // Register the service worker with updateViaCache: 'none'
      // so the SW script is always fetched from network (immediate updates)
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        // Check for updates periodically (every 30 minutes)
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);
      } catch {
        // Registration failure is non-critical; the site still works online.
      }
    })();

    // When a new service worker takes control, reload once (guarded against loops)
    const onControllerChange = () => {
      try {
        if (!sessionStorage.getItem('piforum_sw_reloaded')) {
          sessionStorage.setItem('piforum_sw_reloaded', '1');
          window.location.reload();
        }
      } catch {
        // sessionStorage might be unavailable; skip the reload
      }
    };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    // ---------- Install prompt detection ----------
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show the install prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "PiForum has been added to your home screen.",
        duration: 4000,
      });
    };
    window.addEventListener('appinstalled', installedHandler);

    // ---------- iOS "Add to Home Screen" guidance ----------
    // On iOS, beforeinstallprompt never fires, so we show manual guidance
    const isIOSDevice = detectIOS();
    const isStandaloneMode = detectStandalone();
    if (isIOSDevice && !isStandaloneMode && !installed) {
      // Show iOS guide after a longer delay to not interrupt initial load
      const iosTimer = setTimeout(() => setShowIOSGuide(true), 6000);
      return () => {
        clearTimeout(iosTimer);
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [installed, toast]);

  // ---------- Install handler ----------
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const isIOSDevice = detectIOS();
  const isStandaloneMode = detectStandalone();

  if (installed && isOnline) return null;

  return (
    <>
      {!isOnline && <OfflineBanner />}

      {/* Standard install prompt (Chrome, Edge, etc.) */}
      {showPrompt && deferredPrompt && !installed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-bounce-up">
          <div className="neu-card p-4 flex items-center gap-3">
            <div className="neu-circle p-2 shrink-0 animate-pulse-glow">
              <Smartphone className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Install PiForum</p>
              <p className="text-xs text-muted-foreground">Add to your home screen for a faster, app-like experience with offline support.</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={handleInstall} className="neu-btn-3d neu-btn px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1">
                <Download className="size-3" /> Install
              </button>
              <button onClick={() => setShowPrompt(false)} className="neu-btn px-3 py-1 text-xs flex items-center gap-1 justify-center">
                <X className="size-3" /> Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS "Add to Home Screen" guide */}
      {showIOSGuide && isIOSDevice && !isStandaloneMode && !installed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-bounce-up">
          <div className="neu-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="neu-circle p-2 shrink-0">
                <Smartphone className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Add to Home Screen</p>
                <p className="text-xs text-muted-foreground">For the best experience on iOS, add PiForum to your home screen:</p>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground pl-11">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[0.6rem] font-bold shrink-0">1</span>
                <span>Tap the <Share className="size-3 inline mx-0.5" /> <strong className="text-foreground">Share</strong> button in Safari&apos;s bottom bar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[0.6rem] font-bold shrink-0">2</span>
                <span>Scroll down and tap <Plus className="size-3 inline mx-0.5" /> <strong className="text-foreground">Add to Home Screen</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[0.6rem] font-bold shrink-0">3</span>
                <span>Tap <strong className="text-foreground">Add</strong> in the top right corner</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
