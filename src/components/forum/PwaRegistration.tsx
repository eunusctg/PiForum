'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

/* Registers the service worker (only in production / https) and shows an
   install prompt when the browser fires beforeinstallprompt. */
export default function PwaRegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Only register on https or localhost (SW won't work otherwise)
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (window.location.protocol !== 'https:' && !isLocalhost) return;

    // One-time cache purge: clear ALL existing caches and unregister any old
    // service workers so stale Turbopack chunks (e.g. from a previous
    // cache-first SW version) are evicted immediately. We gate this with a
    // sessionStorage flag so it only runs once per tab/session, avoiding a
    // reload loop. After the purge we register the fresh SW.
    (async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // non-critical
      }

      // Unregister any existing service workers so the new network-first
      // SW takes over cleanly on this navigation.
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // non-critical
      }

      // Register the fresh service worker.
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failure is non-critical; the site still works online.
      });
    })();

    // When a new service worker takes control (skipWaiting + clients.claim),
    // reload the page once so the client picks up fresh chunks. Guard with
    // sessionStorage to prevent a reload loop.
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
      // A controller already exists; listen for a NEW one taking over.
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    // Note: when the app is already installed (standalone display mode),
    // browsers do NOT fire beforeinstallprompt, so showPrompt stays false
    // and nothing renders — no explicit standalone check needed.

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show the install prompt after a short delay so it doesn't interrupt
      // the initial load.
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

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

  if (installed) return null;

  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="neu-card p-4 flex items-center gap-3">
          <div className="neu-circle p-2 shrink-0">
            <Smartphone className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install PiForum</p>
            <p className="text-xs text-muted-foreground">Add to your home screen for a faster, app-like experience.</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={handleInstall} className="neu-btn px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1">
              <Download className="size-3" /> Install
            </button>
            <button onClick={() => setShowPrompt(false)} className="neu-btn px-3 py-1 text-xs flex items-center gap-1 justify-center">
              <X className="size-3" /> Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
