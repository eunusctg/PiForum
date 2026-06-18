'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import Header from '@/components/forum/Header';
import AuthModal from '@/components/forum/AuthModal';
import InstallWizard from '@/components/forum/InstallWizard';
import ForumHome from '@/components/forum/ForumHome';
import ThreadList from '@/components/forum/ThreadList';
import ThreadView from '@/components/forum/ThreadView';
import NewThread from '@/components/forum/NewThread';
import SearchView from '@/components/forum/SearchView';
import MembersView from '@/components/forum/MembersView';
import BookmarksView from '@/components/forum/BookmarksView';
import NotificationsView from '@/components/forum/NotificationsView';
import ProfileView from '@/components/forum/ProfileView';
import TagsView from '@/components/forum/TagsView';
import SiteFooter from '@/components/forum/SiteFooter';
import AdminDashboard from '@/components/forum/AdminDashboard';
import AdminUsers from '@/components/forum/AdminUsers';
import AdminCategories from '@/components/forum/AdminCategories';
import AdminSecurity from '@/components/forum/AdminSecurity';
import AdminReports from '@/components/forum/AdminReports';
import AdminLayout from '@/components/forum/AdminLayout';
import AdminSettings from '@/components/forum/admin/AdminBranding';
import AdminTopics from '@/components/forum/admin/AdminTopics';
import AdminRanks from '@/components/forum/admin/AdminRanks';
import AdminTags from '@/components/forum/admin/AdminTags';
import AdminRules from '@/components/forum/admin/AdminRules';
import AdminPages from '@/components/forum/admin/AdminPages';
import AdminAuth from '@/components/forum/admin/AdminAuth';
import AdminEmail from '@/components/forum/admin/AdminEmail';
import AdminVerification from '@/components/forum/admin/AdminVerification';
import AdminUsernames from '@/components/forum/admin/AdminUsernames';
import AdminLogin from '@/components/forum/admin/AdminLogin';
import AdminSeo from '@/components/forum/admin/AdminSeo';
import AdminSitemap from '@/components/forum/admin/AdminSitemap';
import AdminPwa from '@/components/forum/admin/AdminPwa';
import AdminAnalytics from '@/components/forum/admin/AdminAnalytics';
import AdminSpam from '@/components/forum/admin/AdminSpam';
import AdminCookies from '@/components/forum/admin/AdminCookies';
import AdminGdpr from '@/components/forum/admin/AdminGdpr';
import AdminMonetization from '@/components/forum/admin/AdminMonetization';
import AdminBackup from '@/components/forum/admin/AdminBackup';
import StaticPageView from '@/components/forum/StaticPageView';
import { Loader2 } from 'lucide-react';
import type { AppView } from '@/lib/types';

/**
 * ForumShell — shared client-side shell used by every App Router page under
 * PiForum. It is essentially the same SPA that lives at `/` (src/app/page.tsx)
 * but parameterized by an `initialView` / `initialParams` pair so that any
 * direct URL (e.g. /admin, /forum/abc, /profile/xyz) can render the correct
 * view immediately after init while still allowing in-app `navigateTo()`
 * calls to switch views without a full page reload.
 *
 * Behaviour:
 * 1. On mount, run the install-check + settings load + auth restore flow.
 *    If the app is not installed yet, render <InstallWizard /> full-screen.
 *    If still initializing, render a loading screen.
 * 2. Once initialized, set the store's currentView/viewParams to
 *    `initialView` / `initialParams`. This ensures deep components that read
 *    from `viewParams` (e.g. SearchView, ProfileView) see the right values
 *    even when the user lands directly on a route.
 * 3. Render <Header />, <AuthModal />, the view matching `currentView`, and
 *    the footer. Because we render based on `currentView` from the store,
 *    in-app `navigateTo()` calls continue to work (URL won't change, but
 *    the view switches instantly — the standard SPA trade-off).
 *
 * If the store is already initialized (because the user navigated here from
 * another page that already ran init), we skip the loading screen and just
 * sync the view, avoiding a flash of the loader on every internal nav.
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
  const isInstalled = useAppStore((s) => s.isInstalled);
  const setIsInstalled = useAppStore((s) => s.setIsInstalled);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setAuthToken = useAppStore((s) => s.setAuthToken);
  const setSettings = useAppStore((s) => s.setSettings);
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Skip the loading screen if another page already ran init (e.g. user
  // navigated here from `/` via client-side routing).
  const [initializing, setInitializing] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !useAppStore.getState().isInstalled;
  });

  // Capture the initial view/params at mount so the init effect can use them
  // without re-running on every render.
  const initialViewRef = useRef(initialView);
  const initialParamsRef = useRef(initialParams);

  // Check installation status and restore auth on mount.
  useEffect(() => {
    let active = true;

    async function init() {
      // If already initialized (user navigated from another page), just sync
      // the view and bail out — no need to re-fetch install/settings/auth.
      const state = useAppStore.getState();
      if (state.isInstalled) {
        if (active) {
          navigateTo(initialViewRef.current, initialParamsRef.current);
          setInitializing(false);
        }
        return;
      }

      try {
        const installRes = await fetch('/api/install/check');
        const installData = await installRes.json();

        if (installData.success && installData.data.installed) {
          setIsInstalled(true);

          // Load settings
          try {
            const settingsRes = await fetch('/api/settings');
            const settingsData = await settingsRes.json();
            if (settingsData.success && settingsData.data) {
              setSettings(settingsData.data);
            }
          } catch {
            // Settings load failure is non-critical
          }

          // Restore auth from localStorage
          const savedToken = localStorage.getItem('piforum_token');
          if (savedToken) {
            try {
              const verifyRes = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: savedToken }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success && verifyData.data.user) {
                setCurrentUser(verifyData.data.user);
                setAuthToken(savedToken);
              } else {
                localStorage.removeItem('piforum_token');
              }
            } catch {
              localStorage.removeItem('piforum_token');
            }
          }

          if (active) navigateTo(initialViewRef.current, initialParamsRef.current);
        } else {
          if (active) {
            setIsInstalled(false);
            navigateTo('install');
          }
        }
      } catch {
        if (active) {
          setIsInstalled(false);
          navigateTo('install');
        }
      } finally {
        if (active) setInitializing(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  // When the page's initialView / initialParams change (e.g. navigating from
  // /forum/abc to /forum/xyz without a full remount, or arriving after init
  // completed), sync the store so the right view renders.
  const paramsKey = JSON.stringify(initialParams);
  useEffect(() => {
    if (!initializing && isInstalled) {
      navigateTo(initialView, initialParams);
    }
  }, [initialView, paramsKey, initializing, isInstalled]);

  // Show loading screen during initialization
  if (initializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--neu-bg)' }}
      >
        <div className="neu-card p-8 flex flex-col items-center gap-4">
          <div className="neu-circle w-16 h-16 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">π</span>
          </div>
          <h2 className="text-xl font-semibold">PiForum</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Installation wizard - no header/footer
  if (!isInstalled || currentView === 'install') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--neu-bg)' }}
      >
        <InstallWizard />
      </div>
    );
  }

  // Render the current view
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <ForumHome />;
      case 'forum':
        return <ThreadList forumId={viewParams.forumId || ''} />;
      case 'thread':
        return <ThreadView threadId={viewParams.threadId || ''} />;
      case 'new-thread':
        return <NewThread forumId={viewParams.forumId || ''} />;
      case 'search':
        return <SearchView />;
      case 'members':
        return <MembersView />;
      case 'bookmarks':
        return <BookmarksView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileView />;
      case 'tags':
        return <TagsView />;
      case 'page':
        return <StaticPageView slug={viewParams.pageSlug || ''} />;
      case 'admin-dashboard':
        return <AdminLayout activeView="admin-dashboard"><AdminDashboard /></AdminLayout>;
      case 'admin-users':
        return <AdminLayout activeView="admin-users"><AdminUsers /></AdminLayout>;
      case 'admin-topics':
        return <AdminLayout activeView="admin-topics"><AdminTopics /></AdminLayout>;
      case 'admin-categories':
        return <AdminLayout activeView="admin-categories"><AdminCategories /></AdminLayout>;
      case 'admin-ranks':
        return <AdminLayout activeView="admin-ranks"><AdminRanks /></AdminLayout>;
      case 'admin-tags':
        return <AdminLayout activeView="admin-tags"><AdminTags /></AdminLayout>;
      case 'admin-rules':
        return <AdminLayout activeView="admin-rules"><AdminRules /></AdminLayout>;
      case 'admin-pages':
        return <AdminLayout activeView="admin-pages"><AdminPages /></AdminLayout>;
      case 'admin-branding':
        return <AdminLayout activeView="admin-branding"><AdminSettings /></AdminLayout>;
      case 'admin-auth':
        return <AdminLayout activeView="admin-auth"><AdminAuth /></AdminLayout>;
      case 'admin-email':
        return <AdminLayout activeView="admin-email"><AdminEmail /></AdminLayout>;
      case 'admin-verification':
        return <AdminLayout activeView="admin-verification"><AdminVerification /></AdminLayout>;
      case 'admin-usernames':
        return <AdminLayout activeView="admin-usernames"><AdminUsernames /></AdminLayout>;
      case 'admin-login':
        return <AdminLayout activeView="admin-login"><AdminLogin /></AdminLayout>;
      case 'admin-seo':
        return <AdminLayout activeView="admin-seo"><AdminSeo /></AdminLayout>;
      case 'admin-sitemap':
        return <AdminLayout activeView="admin-sitemap"><AdminSitemap /></AdminLayout>;
      case 'admin-pwa':
        return <AdminLayout activeView="admin-pwa"><AdminPwa /></AdminLayout>;
      case 'admin-analytics':
        return <AdminLayout activeView="admin-analytics"><AdminAnalytics /></AdminLayout>;
      case 'admin-spam':
        return <AdminLayout activeView="admin-spam"><AdminSpam /></AdminLayout>;
      case 'admin-cookies':
        return <AdminLayout activeView="admin-cookies"><AdminCookies /></AdminLayout>;
      case 'admin-gdpr':
        return <AdminLayout activeView="admin-gdpr"><AdminGdpr /></AdminLayout>;
      case 'admin-security':
        return <AdminLayout activeView="admin-security"><AdminSecurity /></AdminLayout>;
      case 'admin-reports':
        return <AdminLayout activeView="admin-reports"><AdminReports /></AdminLayout>;
      case 'admin-monetization':
        return <AdminLayout activeView="admin-monetization"><AdminMonetization /></AdminLayout>;
      case 'admin-backup':
        return <AdminLayout activeView="admin-backup"><AdminBackup /></AdminLayout>;
      case 'admin-settings':
        // Legacy alias → branding
        return <AdminLayout activeView="admin-branding"><AdminSettings /></AdminLayout>;
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
        {/* Keyed wrapper so each view swap triggers a subtle fade-in-up
            entrance animation (defined in globals.css). */}
        <div key={currentView} className="animate-fade-in-up">
          {renderView()}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
