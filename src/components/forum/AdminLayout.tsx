'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Flag,
  FolderTree,
  Award,
  Tag,
  ScrollText,
  FileText,
  Palette,
  KeyRound,
  Mail,
  BadgeCheck,
  AtSign,
  LogIn,
  Search,
  Map as MapIcon,
  Smartphone,
  BarChart3,
  ShieldAlert,
  Cookie,
  ShieldCheck,
  DollarSign,
  DatabaseBackup,
  Shield,
  Menu,
  X,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import type { AppView } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Admin section registry — single source of truth for the sidebar.  */
/*  Grouped exactly as the operator requested. No duplicate settings.  */
/* ------------------------------------------------------------------ */

export interface AdminSection {
  view: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

export interface AdminGroup {
  label: string;
  sections: AdminSection[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    label: 'Overview',
    sections: [
      { view: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Forum analytics & quick actions' },
      { view: 'admin-users', label: 'Users', icon: Users, desc: 'Manage members & roles' },
      { view: 'admin-topics', label: 'Topics', icon: MessageSquare, desc: 'Moderate threads & posts' },
      { view: 'admin-reports', label: 'Reports', icon: Flag, desc: 'Review flagged content' },
    ],
  },
  {
    label: 'Content',
    sections: [
      { view: 'admin-categories', label: 'Categories', icon: FolderTree, desc: 'Forums & categories' },
      { view: 'admin-ranks', label: 'Ranks', icon: Award, desc: 'User titles & badges' },
      { view: 'admin-tags', label: 'Tags', icon: Tag, desc: 'Tag taxonomy' },
      { view: 'admin-rules', label: 'Rules', icon: ScrollText, desc: 'Community rules' },
      { view: 'admin-pages', label: 'Pages', icon: FileText, desc: 'Static pages & header/footer' },
      { view: 'admin-branding', label: 'Branding', icon: Palette, desc: 'Site identity & appearance' },
    ],
  },
  {
    label: 'Auth & Communication',
    sections: [
      { view: 'admin-auth', label: 'Auth', icon: KeyRound, desc: 'Registration & password policy' },
      { view: 'admin-email', label: 'Email / SMTP', icon: Mail, desc: 'Outbound email server' },
    ],
  },
  {
    label: 'User Management',
    sections: [
      { view: 'admin-verification', label: 'Verification', icon: BadgeCheck, desc: 'Email verification system' },
      { view: 'admin-usernames', label: 'Usernames', icon: AtSign, desc: 'Reserved names & rules' },
      { view: 'admin-login', label: 'Login', icon: LogIn, desc: 'Sessions & 2FA' },
    ],
  },
  {
    label: 'SEO & PWA',
    sections: [
      { view: 'admin-seo', label: 'SEO', icon: Search, desc: 'Meta tags & structured data' },
      { view: 'admin-sitemap', label: 'Sitemap', icon: MapIcon, desc: 'XML sitemap generation' },
      { view: 'admin-pwa', label: 'PWA', icon: Smartphone, desc: 'Installable app config' },
      { view: 'admin-analytics', label: 'Analytics', icon: BarChart3, desc: 'Traffic tracking' },
    ],
  },
  {
    label: 'Security & Privacy',
    sections: [
      { view: 'admin-spam', label: 'Spam', icon: ShieldAlert, desc: 'Filters & rate limits' },
      { view: 'admin-cookies', label: 'Cookies', icon: Cookie, desc: 'Cookie consent banner' },
      { view: 'admin-gdpr', label: 'GDPR', icon: ShieldCheck, desc: 'Data privacy compliance' },
      { view: 'admin-security', label: 'Security Log', icon: Shield, desc: 'Audit log' },
    ],
  },
  {
    label: 'Revenue',
    sections: [
      { view: 'admin-monetization', label: 'Monetization', icon: DollarSign, desc: 'Ads & subscriptions' },
    ],
  },
  {
    label: 'System',
    sections: [
      { view: 'admin-backup', label: 'Backup', icon: DatabaseBackup, desc: 'Export & restore data' },
    ],
  },
];

/* Flatten for quick lookup */
export const ALL_ADMIN_SECTIONS: AdminSection[] = ADMIN_GROUPS.flatMap((g) => g.sections);

export function findAdminSection(view: AppView): AdminSection | undefined {
  return ALL_ADMIN_SECTIONS.find((s) => s.view === view);
}

/* ------------------------------------------------------------------ */
/*  AdminLayout — sidebar + content area shared by every admin page   */
/* ------------------------------------------------------------------ */

interface AdminLayoutProps {
  /** The active admin view, used to highlight the current nav item. */
  activeView: AppView;
  children: React.ReactNode;
}

export default function AdminLayout({ activeView, children }: AdminLayoutProps) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userIsAdmin = isAdmin();
  const current = findAdminSection(activeView);

  if (!userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Shield className="size-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm text-center">
          You need administrator privileges to access this page.
        </p>
        <button onClick={() => navigateTo('home')} className="neu-btn px-6 py-2 text-sm font-medium">
          <ArrowLeft className="size-4 mr-2 inline" />
          Back to Home
        </button>
      </div>
    );
  }

  const SidebarContent = (
    <nav className="flex flex-col gap-5" aria-label="Admin navigation">
      {ADMIN_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          {group.sections.map((section) => {
            const Icon = section.icon;
            const active = activeView === section.view;
            return (
              <button
                key={section.view}
                onClick={() => {
                  navigateTo(section.view);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
                  active
                    ? 'neu-card-inset text-primary'
                    : 'hover:text-primary text-foreground/80'
                }`}
                title={section.desc}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Slim top bar: mobile sidebar toggle + view-site link. Each admin
          panel renders its own title header, so we keep this minimal to
          avoid duplicate headings. */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="neu-btn lg:hidden flex items-center gap-2 px-3 py-2 text-xs font-medium"
          aria-label="Toggle admin menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          <span>{current?.label ?? 'Admin'}</span>
        </button>
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5 text-primary" />
          <span>Admin Panel</span>
          {current && (
            <>
              <span>·</span>
              <span className="font-medium text-foreground/70">{current.label}</span>
            </>
          )}
        </div>
        <button
          onClick={() => navigateTo('home')}
          className="neu-btn px-3 py-2 text-xs font-medium flex items-center gap-1.5"
          title="View site"
        >
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">View Site</span>
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="neu-card p-3 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scroll">
            {SidebarContent}
          </div>
        </aside>

        {/* Mobile sidebar (collapsible) */}
        {mobileOpen && (
          <aside className="lg:hidden w-full shrink-0 mb-2">
            <div className="neu-card p-3 max-h-[60vh] overflow-y-auto custom-scroll">
              {SidebarContent}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
