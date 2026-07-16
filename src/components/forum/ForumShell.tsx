'use client';

import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useAppStore } from '@/lib/store';
import Header from '@/components/forum/Header';
import AuthModal from '@/components/forum/AuthModal';
import ForumHome from '@/components/forum/ForumHome';
import SiteFooter from '@/components/forum/SiteFooter';
import BackToTopButton from '@/components/forum/BackToTopButton';
import CookieConsent from '@/components/forum/CookieConsent';
import Preloader from '@/components/forum/Preloader';
import type { AppView } from '@/lib/types';

/* ── Dynamic imports ────────────────────────────────────────────────
 * Admin views and secondary pages are lazy-loaded so Turbopack only
 * compiles them on demand.  This keeps the initial / compilation under
 * the sandbox memory ceiling and avoids the OOM crashes we were seeing
 * with 30+ eager imports.                                          */

const ThreadList = lazy(() => import('@/components/forum/ThreadList'));
const ThreadView = lazy(() => import('@/components/forum/ThreadView'));
const NewThread  = lazy(() => import('@/components/forum/NewThread'));
const SearchView = lazy(() => import('@/components/forum/SearchView'));
const MembersView = lazy(() => import('@/components/forum/MembersView'));
const BookmarksView = lazy(() => import('@/components/forum/BookmarksView'));
const NotificationsView = lazy(() => import('@/components/forum/NotificationsView'));
const ProfileView = lazy(() => import('@/components/forum/ProfileView'));
const TagsView   = lazy(() => import('@/components/forum/TagsView'));
const StaticPageView = lazy(() => import('@/components/forum/StaticPageView'));

// Admin
const AdminLayout = lazy(() => import('@/components/forum/AdminLayout'));
const AdminDashboard = lazy(() => import('@/components/forum/AdminDashboard'));
const AdminUsers = lazy(() => import('@/components/forum/AdminUsers'));
const AdminCategories = lazy(() => import('@/components/forum/AdminCategories'));
const AdminSecurity = lazy(() => import('@/components/forum/AdminSecurity'));
const AdminReports = lazy(() => import('@/components/forum/AdminReports'));
const AdminSettings = lazy(() => import('@/components/forum/admin/AdminBranding'));
const AdminTopics = lazy(() => import('@/components/forum/admin/AdminTopics'));
const AdminRanks = lazy(() => import('@/components/forum/admin/AdminRanks'));
const AdminTags = lazy(() => import('@/components/forum/admin/AdminTags'));
const AdminRules = lazy(() => import('@/components/forum/admin/AdminRules'));
const AdminPages = lazy(() => import('@/components/forum/admin/AdminPages'));
const AdminAuth = lazy(() => import('@/components/forum/admin/AdminAuth'));
const AdminEmail = lazy(() => import('@/components/forum/admin/AdminEmail'));
const AdminVerification = lazy(() => import('@/components/forum/admin/AdminVerification'));
const AdminUsernames = lazy(() => import('@/components/forum/admin/AdminUsernames'));
const AdminLogin = lazy(() => import('@/components/forum/admin/AdminLogin'));
const AdminSeo = lazy(() => import('@/components/forum/admin/AdminSeo'));
const AdminSitemap = lazy(() => import('@/components/forum/admin/AdminSitemap'));
const AdminPwa = lazy(() => import('@/components/forum/admin/AdminPwa'));
const AdminAnalytics = lazy(() => import('@/components/forum/admin/AdminAnalytics'));
const AdminSpam = lazy(() => import('@/components/forum/admin/AdminSpam'));
const AdminCookies = lazy(() => import('@/components/forum/admin/AdminCookies'));
const AdminGdpr = lazy(() => import('@/components/forum/admin/AdminGdpr'));
const AdminMonetization = lazy(() => import('@/components/forum/admin/AdminMonetization'));
const AdminBackup = lazy(() => import('@/components/forum/admin/AdminBackup'));

/** Lightweight inline spinner used as fallback while lazy chunks load. */
function ChunkLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/** Wrap a lazy component with Suspense. */
function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ChunkLoader />}>{children}</Suspense>;
}

/**
 * ForumShell — shared client-side shell used by every App Router page under
 * PiForum.  Parameterized by an `initialView` / `initialParams` pair so
 * that any direct URL (e.g. /admin, /forum/abc, /profile/xyz) can render
 * the correct view immediately after init while still allowing in-app
 * `navigateTo()` calls to switch views without a full page reload.
 */
interface ForumShellProps {
  initialView: AppView;
  initialParams?: Record<string, string>;
}

export default function ForumShell({
  initialView,
  initialParams = {},
}: ForumShellProps) {
  const currentView = useAppStore((s) => s.currentView);
  const viewParams = useAppStore((s) => s.viewParams);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setAuthToken = useAppStore((s) => s.setAuthToken);
  const setSettings = useAppStore((s) => s.setSettings);
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Skip the loading screen if another page already ran init.
  const [initializing, setInitializing] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !useAppStore.getState().settings || Object.keys(useAppStore.getState().settings).length === 0;
  });

  const initialViewRef = useRef(initialView);
  const initialParamsRef = useRef(initialParams);

  // Load settings and restore auth on mount.
  // A safety timeout ensures the preloader never gets stuck — if the API
  // is unreachable or a network error goes uncaught, we still dismiss the
  // loader after 10 s so the user can at least see the shell.
  useEffect(() => {
    let active = true;

    // Safety timeout — always dismiss the preloader after 10 s
    const safetyTimer = setTimeout(() => {
      if (active) {
        console.warn('[ForumShell] Safety timeout — dismissing preloader');
        setInitializing(false);
      }
    }, 10_000);

    async function init() {
      const state = useAppStore.getState();
      if (state.settings && Object.keys(state.settings).length > 0) {
        if (active) {
          clearTimeout(safetyTimer);
          navigateTo(initialViewRef.current, initialParamsRef.current);
          setInitializing(false);
        }
        return;
      }

      try {
        // Load settings (non-critical if it fails)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8_000);
          const settingsRes = await fetch('/api/settings', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData.success && settingsData.data) {
              setSettings(settingsData.data);
            }
          }
        } catch {
          // Settings load failure is non-critical
        }

        // Restore auth from localStorage
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('piforum_token') : null;
        if (savedToken) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5_000);
            const verifyRes = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: savedToken }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.success && verifyData.data.user) {
                setCurrentUser(verifyData.data.user);
                setAuthToken(savedToken);
              } else {
                localStorage.removeItem('piforum_token');
              }
            } else {
              localStorage.removeItem('piforum_token');
            }
          } catch {
            localStorage.removeItem('piforum_token');
          }
        }

        if (active) {
          clearTimeout(safetyTimer);
          navigateTo(initialViewRef.current, initialParamsRef.current);
        }
      } catch {
        if (active) {
          clearTimeout(safetyTimer);
          navigateTo(initialViewRef.current, initialParamsRef.current);
        }
      } finally {
        if (active) setInitializing(false);
      }
    }

    init();
    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Sync view when initialView/initialParams change after init completes.
  const paramsKey = JSON.stringify(initialParams);
  useEffect(() => {
    if (!initializing) {
      navigateTo(initialView, initialParams);
    }
  }, [initialView, paramsKey, initializing]);

  // Show loading screen during initialization
  if (initializing) {
    return <Preloader />;
  }

  // Render the current view (lazy components wrapped in Suspense)
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <ForumHome />;
      case 'forum':
        return <SuspenseWrap><ThreadList forumId={viewParams.forumId || ''} /></SuspenseWrap>;
      case 'thread':
        return <SuspenseWrap><ThreadView threadId={viewParams.threadId || ''} /></SuspenseWrap>;
      case 'new-thread':
        return <SuspenseWrap><NewThread forumId={viewParams.forumId} /></SuspenseWrap>;
      case 'search':
        return <SuspenseWrap><SearchView /></SuspenseWrap>;
      case 'members':
        return <SuspenseWrap><MembersView /></SuspenseWrap>;
      case 'bookmarks':
        return <SuspenseWrap><BookmarksView /></SuspenseWrap>;
      case 'notifications':
        return <SuspenseWrap><NotificationsView /></SuspenseWrap>;
      case 'profile':
        return <SuspenseWrap><ProfileView /></SuspenseWrap>;
      case 'tags':
        return <SuspenseWrap><TagsView /></SuspenseWrap>;
      case 'page':
        return <SuspenseWrap><StaticPageView slug={viewParams.pageSlug || ''} /></SuspenseWrap>;
      case 'admin-dashboard':
        return <SuspenseWrap><AdminLayout activeView="admin-dashboard"><AdminDashboard /></AdminLayout></SuspenseWrap>;
      case 'admin-users':
        return <SuspenseWrap><AdminLayout activeView="admin-users"><AdminUsers /></AdminLayout></SuspenseWrap>;
      case 'admin-topics':
        return <SuspenseWrap><AdminLayout activeView="admin-topics"><AdminTopics /></AdminLayout></SuspenseWrap>;
      case 'admin-categories':
        return <SuspenseWrap><AdminLayout activeView="admin-categories"><AdminCategories /></AdminLayout></SuspenseWrap>;
      case 'admin-ranks':
        return <SuspenseWrap><AdminLayout activeView="admin-ranks"><AdminRanks /></AdminLayout></SuspenseWrap>;
      case 'admin-tags':
        return <SuspenseWrap><AdminLayout activeView="admin-tags"><AdminTags /></AdminLayout></SuspenseWrap>;
      case 'admin-rules':
        return <SuspenseWrap><AdminLayout activeView="admin-rules"><AdminRules /></AdminLayout></SuspenseWrap>;
      case 'admin-pages':
        return <SuspenseWrap><AdminLayout activeView="admin-pages"><AdminPages /></AdminLayout></SuspenseWrap>;
      case 'admin-branding':
        return <SuspenseWrap><AdminLayout activeView="admin-branding"><AdminSettings /></AdminLayout></SuspenseWrap>;
      case 'admin-auth':
        return <SuspenseWrap><AdminLayout activeView="admin-auth"><AdminAuth /></AdminLayout></SuspenseWrap>;
      case 'admin-email':
        return <SuspenseWrap><AdminLayout activeView="admin-email"><AdminEmail /></AdminLayout></SuspenseWrap>;
      case 'admin-verification':
        return <SuspenseWrap><AdminLayout activeView="admin-verification"><AdminVerification /></AdminLayout></SuspenseWrap>;
      case 'admin-usernames':
        return <SuspenseWrap><AdminLayout activeView="admin-usernames"><AdminUsernames /></AdminLayout></SuspenseWrap>;
      case 'admin-login':
        return <SuspenseWrap><AdminLayout activeView="admin-login"><AdminLogin /></AdminLayout></SuspenseWrap>;
      case 'admin-seo':
        return <SuspenseWrap><AdminLayout activeView="admin-seo"><AdminSeo /></AdminLayout></SuspenseWrap>;
      case 'admin-sitemap':
        return <SuspenseWrap><AdminLayout activeView="admin-sitemap"><AdminSitemap /></AdminLayout></SuspenseWrap>;
      case 'admin-pwa':
        return <SuspenseWrap><AdminLayout activeView="admin-pwa"><AdminPwa /></AdminLayout></SuspenseWrap>;
      case 'admin-analytics':
        return <SuspenseWrap><AdminLayout activeView="admin-analytics"><AdminAnalytics /></AdminLayout></SuspenseWrap>;
      case 'admin-spam':
        return <SuspenseWrap><AdminLayout activeView="admin-spam"><AdminSpam /></AdminLayout></SuspenseWrap>;
      case 'admin-cookies':
        return <SuspenseWrap><AdminLayout activeView="admin-cookies"><AdminCookies /></AdminLayout></SuspenseWrap>;
      case 'admin-gdpr':
        return <SuspenseWrap><AdminLayout activeView="admin-gdpr"><AdminGdpr /></AdminLayout></SuspenseWrap>;
      case 'admin-security':
        return <SuspenseWrap><AdminLayout activeView="admin-security"><AdminSecurity /></AdminLayout></SuspenseWrap>;
      case 'admin-reports':
        return <SuspenseWrap><AdminLayout activeView="admin-reports"><AdminReports /></AdminLayout></SuspenseWrap>;
      case 'admin-monetization':
        return <SuspenseWrap><AdminLayout activeView="admin-monetization"><AdminMonetization /></AdminLayout></SuspenseWrap>;
      case 'admin-backup':
        return <SuspenseWrap><AdminLayout activeView="admin-backup"><AdminBackup /></AdminLayout></SuspenseWrap>;
      case 'admin-settings':
        return <SuspenseWrap><AdminLayout activeView="admin-branding"><AdminSettings /></AdminLayout></SuspenseWrap>;
      default:
        return <ForumHome />;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--neu-bg)' }}
    >
      <Header />
      <AuthModal />
      <main className="flex-1 w-full">
        <div key={currentView} className="animate-fade-in-up">
          {renderView()}
        </div>
      </main>
      <SiteFooter />
      <BackToTopButton />
      <CookieConsent />
    </div>
  );
}
