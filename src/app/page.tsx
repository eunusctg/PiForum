'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import Header from '@/components/forum/Header';
import AuthModal from '@/components/forum/AuthModal';
import InstallWizard from '@/components/forum/InstallWizard';
import ForumHome from '@/components/forum/ForumHome';
import ThreadList from '@/components/forum/ThreadList';
import ThreadView from '@/components/forum/ThreadView';
import NewThread from '@/components/forum/NewThread';
import AdminDashboard from '@/components/forum/AdminDashboard';
import AdminUsers from '@/components/forum/AdminUsers';
import AdminCategories from '@/components/forum/AdminCategories';
import AdminSettings from '@/components/forum/AdminSettings';
import AdminSecurity from '@/components/forum/AdminSecurity';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const currentView = useAppStore((s) => s.currentView);
  const isInstalled = useAppStore((s) => s.isInstalled);
  const setIsInstalled = useAppStore((s) => s.setIsInstalled);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setAuthToken = useAppStore((s) => s.setAuthToken);
  const setSettings = useAppStore((s) => s.setSettings);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const viewParams = useAppStore((s) => s.viewParams);
  const [initializing, setInitializing] = useState(true);

  // Check installation status and restore auth on mount
  useEffect(() => {
    async function init() {
      try {
        // Check if installed
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

          navigateTo('home');
        } else {
          setIsInstalled(false);
          navigateTo('install');
        }
      } catch {
        setIsInstalled(false);
        navigateTo('install');
      } finally {
        setInitializing(false);
      }
    }

    init();
  }, [setIsInstalled, setCurrentUser, setAuthToken, setSettings, navigateTo]);

  // Show loading screen during initialization
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--neu-bg)' }}>
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--neu-bg)' }}>
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
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-users':
        return <AdminUsers />;
      case 'admin-categories':
        return <AdminCategories />;
      case 'admin-settings':
        return <AdminSettings />;
      case 'admin-security':
        return <AdminSecurity />;
      default:
        return <ForumHome />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--neu-bg)' }}>
      <Header />
      <AuthModal />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderView()}
      </main>
      <footer className="mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="neu-divider mb-4" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">π</span>
              <span>PiForum</span>
              <span>·</span>
              <span>Neumorphic Forum CMS</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by Cloudflare D1 & R2</span>
              <span>·</span>
              <span>Firebase Auth</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
