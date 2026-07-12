// Client-side Firebase initialization (for FCM push notifications only)
// IMPORTANT: This is only imported on the client side

import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyAzGFPRx4lL9kQPIgwmwyKaEOCUvO-KZ4Y',
  authDomain: 'piforumeuorg.firebaseapp.com',
  projectId: 'piforumeuorg',
  storageBucket: 'piforumeuorg.firebasestorage.app',
  messagingSenderId: '120994957797',
  appId: '1:120994957797:web:ce26d58ad7e40802a6470c',
};

const app = initializeApp(firebaseConfig);

export const VAPID_PUBLIC_KEY =
  'BNDUVvk3Brgkvf8ZFT7EZGrdVTd040PNWwtIaVR9hmC4Vq4dEGyaxKCqerhignmIlhiWRc5lTICz1hLODShyLow';

// Lazy init messaging (only in browsers that support it)
let _messaging: ReturnType<typeof getMessaging> | null = null;

export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  if (!_messaging) {
    _messaging = getMessaging(app);
  }
  return _messaging;
}

export { app };
