'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Smartphone, WifiOff, Share, Plus, Bell, BellOff, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

/* Enhanced PWA registration with:
   - Offline/online detection UI (toast notifications)
   - Smart cache purging (only old versions, not all caches)
   - Improved install prompt with custom UI
   - iOS "Add to Home Screen" guidance
   - SW registered with updateViaCache: 'none' for immediate updates
   - FCM push notification integration */

const CURRENT_CACHE_PREFIX = 'piforum-v4';

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
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'default'>('default');
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAppStore();

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

        // Aggressive cache warming: pre-fetch key pages after SW activates
        if (registration.active) {
          registration.active.postMessage({
            type: 'WARM_CACHE',
            urls: ['/', '/api/settings', '/api/categories', '/api/threads?limit=25'],
          });
        }
        registration.addEventListener('activate', () => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'WARM_CACHE',
              urls: ['/', '/api/settings', '/api/categories', '/api/threads?limit=25'],
            });
          }
        });
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

  // ---------- Check push notification permission state ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    setPushPermission(Notification.permission);
  }, []);

  // ---------- Show push permission prompt after login ----------
  useEffect(() => {
    if (!currentUser) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    // Check if user already responded to the prompt before
    const dismissed = localStorage.getItem('piforum_push_dismissed');
    if (dismissed) return;

    // Check current permission
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

    // Show the push prompt after a short delay
    const timer = setTimeout(() => setShowPushPrompt(true), 5000);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // ---------- Handle FCM token registration ----------
  const registerFCMToken = useCallback(async () => {
    if (!currentUser) return;
    try {
      setPushLoading(true);

      // Request notification permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        toast({
          title: 'Notifications Disabled',
          description: 'You can enable push notifications later in your browser settings.',
          duration: 4000,
        });
        return;
      }

      // Ensure the FCM service worker is registered FIRST
      // Firebase requires the messaging SW to be active before getToken()
      let swRegistration: ServiceWorkerRegistration | null = null;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
          // Wait for the SW to be active
          if (swRegistration.installing) {
            await new Promise<void>((resolve) => {
              swRegistration!.installing!.addEventListener('statechange', () => {
                if (swRegistration!.active) resolve();
              });
            });
          }
        } catch (swErr) {
          console.warn('FCM SW registration failed, trying existing:', swErr);
          // Fall back to any existing registration
          swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
            || await navigator.serviceWorker.ready;
        }
      }

      // Get FCM token using Firebase Messaging
      const { getFirebaseMessaging, VAPID_PUBLIC_KEY } = await import('@/lib/firebase-client');
      const messaging = await getFirebaseMessaging();

      if (!messaging) {
        toast({
          title: 'Push Not Supported',
          description: 'Your browser does not support push notifications.',
          variant: 'destructive',
          duration: 4000,
        });
        return;
      }

      // Dynamically import getToken
      const { getToken } = await import('firebase/messaging');

      // Pass the service worker registration to getToken — this is critical!
      const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: swRegistration || undefined,
      });

      if (token) {
        // Send token to server
        const res = await fetch('/api/push/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (data.success) {
          toast({
            title: 'Push Enabled!',
            description: 'You will receive push notifications for new activity.',
            duration: 3000,
          });
        }
      } else {
        toast({
          title: 'Push Token Unavailable',
          description: 'Could not obtain a push token. Please try again.',
          variant: 'destructive',
          duration: 4000,
        });
      }

      // Set up foreground message handler
      const { onMessage } = await import('firebase/messaging');
      onMessage(messaging, (payload) => {
        // Show in-app notification toast when message is received in foreground
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';

        toast({
          title,
          description: body,
          duration: 6000,
        });

        // Also play a notification sound
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {
          // Audio not supported or blocked
        }
      });
    } catch (err) {
      console.error('FCM registration failed:', err);
      toast({
        title: 'Push Setup Failed',
        description: 'Could not set up push notifications. Please try again later.',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setPushLoading(false);
      setShowPushPrompt(false);
    }
  }, [currentUser, toast]);

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

  if (installed && isOnline && !showPushPrompt) return null;

  return (
    <>
      {!isOnline && <OfflineBanner />}

      {/* Push Notification Permission Prompt */}
      {showPushPrompt && currentUser && pushPermission === 'default' && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-bounce-up">
          <div className="neu-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="neu-circle p-2.5 shrink-0">
                <Bell className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Stay Updated</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable push notifications to get instant alerts for replies, mentions, and other activity.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPushPrompt(false);
                  localStorage.setItem('piforum_push_dismissed', '1');
                }}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex gap-2 pl-11">
              <button
                onClick={registerFCMToken}
                disabled={pushLoading}
                className="neu-btn-3d neu-btn px-4 py-2 text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1.5 disabled:opacity-50"
              >
                {pushLoading ? (
                  <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Enable Push
              </button>
              <button
                onClick={() => {
                  setShowPushPrompt(false);
                  localStorage.setItem('piforum_push_dismissed', '1');
                }}
                className="neu-btn px-3 py-2 text-xs flex items-center gap-1"
              >
                <BellOff className="size-3" />
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

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
