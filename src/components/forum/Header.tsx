"use client";

import { useState, useCallback, useSyncExternalStore, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
  Home,
  Palette,
  Check,
  Search,
  Bookmark,
  Bell,
  MessageSquare,
  FolderOpen,
  Mail,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ThemeMode as StoreThemeMode } from "@/lib/store";
import { ROLE_LABELS, UserRole } from "@/lib/types";
import type { AppView, ForumUser } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/**
 * Map a store view (+ optional params) to a real App-Router URL so that
 * clicking nav links updates the browser URL and the route is shareable /
 * bookmarkable. Returns `null` for views that have no dedicated URL
 * (login / register), in which case the caller falls back to the
 * in-store `navigateTo` SPA switch.
 */
function viewToUrl(
  view: AppView,
  params: Record<string, string> | undefined,
  currentUser: ForumUser | null
): string | null {
  switch (view) {
    case "home":
      return "/";
    case "forum":
      return params?.forumId
        ? `/forum/${encodeURIComponent(params.forumId)}`
        : "/";
    case "thread":
      return params?.threadId
        ? `/thread/${encodeURIComponent(params.threadId)}`
        : "/";
    case "new-thread":
      return params?.forumId
        ? `/new-thread?forumId=${encodeURIComponent(params.forumId)}`
        : "/new-thread";
    case "search":
      return params?.q ? `/search?q=${encodeURIComponent(params.q)}` : "/search";
    case "bookmarks":
      return "/bookmarks";
    case "notifications":
      return "/notifications";
    case "page":
      return params?.pageSlug ? `/page/${encodeURIComponent(params.pageSlug)}` : "/";
    case "profile": {
      const uid = params?.userId || currentUser?.id;
      return uid ? `/profile/${encodeURIComponent(uid)}` : "/";
    }
    case "admin-dashboard":
      return "/admin";
    case "admin-users":
      return "/admin/users";
    case "admin-topics":
      return "/admin/topics";
    case "admin-categories":
      return "/admin/categories";
    case "admin-ranks":
      return "/admin/ranks";
    case "admin-tags":
      return "/admin/tags";
    case "admin-rules":
      return "/admin/rules";
    case "admin-pages":
      return "/admin/pages";
    case "admin-branding":
    case "admin-settings":
      return "/admin/branding";
    case "admin-auth":
      return "/admin/auth";
    case "admin-email":
      return "/admin/email";
    case "admin-verification":
      return "/admin/verification";
    case "admin-usernames":
      return "/admin/usernames";
    case "admin-login":
      return "/admin/login";
    case "admin-seo":
      return "/admin/seo";
    case "admin-sitemap":
      return "/admin/sitemap";
    case "admin-pwa":
      return "/admin/pwa";
    case "admin-analytics":
      return "/admin/analytics";
    case "admin-spam":
      return "/admin/spam";
    case "admin-cookies":
      return "/admin/cookies";
    case "admin-gdpr":
      return "/admin/gdpr";
    case "admin-security":
      return "/admin/security";
    case "admin-reports":
      return "/admin/reports";
    case "admin-monetization":
      return "/admin/monetization";
    case "admin-backup":
      return "/admin/backup";
    default:
      return null;
  }
}

export default function Header() {
  const {
    currentUser,
    isAdmin,
    getSetting,
    navigateTo,
    setCurrentUser,
    setAuthToken,
    setAuthModalOpen,
    setAuthModalTab,
    themeMode,
    setThemeMode,
  } = useAppStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Hydration-safe mounted detection without calling setState in an effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const router = useRouter();
  const forumName = getSetting("forum_name", "PiForum");
  const logoUrl = getSetting("logo_url", "");
  const announcement = getSetting("header_announcement", "");

  // ---------- Fetch unread notification count ----------
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    let active = true;
    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications?count=true", {
          headers: { "x-user-id": currentUser!.id },
        });
        const data = await res.json();
        if (active && data.success) {
          setUnreadCount(data.data?.count ?? 0);
        }
      } catch {
        // Non-critical
      }
    }
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser]);

  // Reset unread count when user logs out
  const displayUnreadCount = currentUser ? unreadCount : 0;

  const handleNavigate = useCallback(
    (view: AppView, params?: Record<string, string>) => {
      const url = viewToUrl(view, params, currentUser);
      if (url !== null) {
        router.push(url);
      } else {
        navigateTo(view, params);
      }
      setMobileMenuOpen(false);
    },
    [router, navigateTo, currentUser]
  );

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    router.push("/");
  }, [router, setCurrentUser, setAuthToken]);

  const handleOpenAuthModal = useCallback(
    (tab: "login" | "register") => {
      setAuthModalTab(tab);
      setAuthModalOpen(true);
      setMobileMenuOpen(false);
    },
    [setAuthModalTab, setAuthModalOpen]
  );

  const handleSelectTheme = useCallback(
    (mode: StoreThemeMode) => {
      setThemeMode(mode);
    },
    [setThemeMode]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        handleNavigate("search", { q: searchQuery.trim() });
        setSearchQuery("");
      }
    },
    [searchQuery, handleNavigate]
  );

  const themeOptions: { mode: StoreThemeMode; label: string; icon: typeof Sun; swatch: string }[] = [
    { mode: "light", label: "Day", icon: Sun, swatch: "#e0e0e0" },
    { mode: "dark", label: "Night", icon: Moon, swatch: "#1e1e24" },
    { mode: "gold", label: "Golden", icon: Palette, swatch: "#D4AF37" },
  ];

  const userIsAdmin = isAdmin();

  // Desktop nav links — only Home, Forums, Categories (as page link)
  const desktopNavLinks: { label: string; view: AppView; icon: typeof Home }[] = [
    { label: "Home", view: "home", icon: Home },
    { label: "Forums", view: "home", icon: MessageSquare },
    { label: "Categories", view: "home", icon: FolderOpen },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full">
        {/* Verification Banner */}
        {currentUser && currentUser.verifyToken && getSetting("require_email_verification", "false") === "true" && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-2">
            <Mail className="size-3.5 shrink-0" />
            <span>Please verify your email address to unlock full access.</span>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
            >
              Verify now
            </button>
          </div>
        )}
        <div className="neu-card rounded-none px-4 py-3 sm:rounded-b-2xl sm:mx-2 sm:mt-2">
          <div className="flex items-center justify-between gap-4">
            {/* Logo / Brand */}
            <button
              onClick={() => handleNavigate("home")}
              className="flex items-center gap-2 group cursor-pointer shrink-0"
              aria-label="Go to home"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${forumName} logo`}
                  className="h-9 w-auto rounded-lg object-contain transition-all group-hover:opacity-80"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src !== window.location.origin + '/logo.svg') {
                      img.src = '/logo.svg';
                    } else {
                      img.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <img
                  src="/logo.svg"
                  alt={`${forumName} logo`}
                  className="h-9 w-auto rounded-lg object-contain transition-all group-hover:opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="text-lg font-bold tracking-tight hidden sm:inline">
                {forumName}
              </span>
            </button>

            {/* Desktop Search Bar (center) */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex items-center flex-1 max-w-md mx-4"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search threads, members, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neu-input w-full h-9 pl-9 pr-3 text-sm placeholder:text-muted-foreground"
                  aria-label="Search"
                />
              </div>
            </form>

            {/* Desktop Navigation Links — only Home, Forums, Categories */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {desktopNavLinks.map((link, idx) => (
                <button
                  key={`d-${link.view}-${idx}`}
                  onClick={() => {
                    if (link.view === "home" && link.label === "Categories") {
                      // Navigate to home with categories view
                      navigateTo("home", { showCategories: "true" });
                      router.push("/?categories=true");
                    } else {
                      handleNavigate(link.view);
                    }
                  }}
                  className="neu-btn px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-all hover:text-primary"
                >
                  <link.icon className="size-4" />
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Bookmarks (logged-in only, desktop only) */}
              {currentUser && (
                <button
                  onClick={() => handleNavigate("bookmarks")}
                  className="neu-btn hidden sm:flex items-center justify-center w-9 h-9 p-0"
                  aria-label="Bookmarks"
                  title="Bookmarks"
                >
                  <Bookmark className="size-4" />
                </button>
              )}



              {/* Notifications (logged-in only) */}
              {currentUser && (
                <button
                  onClick={() => handleNavigate("notifications")}
                  className="neu-btn relative flex items-center justify-center w-9 h-9 p-0"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="size-4" />
                  {displayUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {displayUnreadCount > 99 ? "99+" : displayUnreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Theme Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="neu-btn flex items-center justify-center w-9 h-9 p-0"
                    aria-label="Select theme"
                    title="Theme settings"
                  >
                    {mounted && themeMode === "dark" ? (
                      <Moon className="size-4 text-cyan-300" />
                    ) : themeMode === "gold" ? (
                      <Palette className="size-4 text-amber-700" />
                    ) : (
                      <Sun className="size-4 text-amber-500" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="neu-card-static w-48 p-2 border-0"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 flex items-center gap-2">
                    <Palette className="size-4" />
                    <span className="text-sm font-semibold">Theme</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = themeMode === opt.mode;
                    return (
                      <DropdownMenuItem
                        key={opt.mode}
                        onClick={() => handleSelectTheme(opt.mode)}
                        className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2 flex items-center gap-2"
                      >
                        <Icon className="size-4" />
                        <span className="text-sm flex-1">{opt.label}</span>
                        <span
                          className="size-3 rounded-full border border-border/40"
                          style={{ backgroundColor: opt.swatch }}
                          aria-hidden
                        />
                        {active && <Check className="size-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile: User avatar next to theme icon (logged in) OR login button */}
              {currentUser ? (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="neu-btn md:hidden flex items-center justify-center w-9 h-9 p-0"
                  aria-label="User menu"
                >
                  <Avatar className="size-7">
                    {currentUser.avatarUrl ? (
                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.username} />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">
                      {currentUser.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenAuthModal("login")}
                  className="neu-btn md:hidden flex items-center justify-center w-9 h-9 p-0"
                  aria-label="Login"
                >
                  <User className="size-4" />
                </button>
              )}

              {/* Desktop: User dropdown */}
              {currentUser ? (
                <div className="hidden md:flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="neu-btn flex items-center gap-2 px-3 py-2 cursor-pointer">
                        <Avatar className="size-7 neu-circle">
                          {currentUser.avatarUrl ? (
                            <AvatarImage
                              src={currentUser.avatarUrl}
                              alt={currentUser.username}
                            />
                          ) : null}
                          <AvatarFallback className="text-xs font-semibold">
                            {currentUser.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium max-w-[100px] truncate hidden lg:inline">
                          {currentUser.displayName || currentUser.username}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="neu-card-static w-56 p-2 border-0"
                    >
                      <DropdownMenuLabel className="px-2 py-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold">
                            {currentUser.displayName || currentUser.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {ROLE_LABELS[currentUser.role as UserRole] || "User"}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleNavigate("profile")}
                        className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2"
                      >
                        <User className="size-4 mr-2" />
                        My Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleNavigate("bookmarks")}
                        className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2"
                      >
                        <Bookmark className="size-4 mr-2" />
                        Bookmarks
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleNavigate("notifications")}
                        className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2"
                      >
                        <Bell className="size-4 mr-2" />
                        Notifications
                        {displayUnreadCount > 0 && (
                          <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-bold">
                            {displayUnreadCount}
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {userIsAdmin && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleNavigate("admin-dashboard")}
                            className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2"
                          >
                            <Home className="size-4 mr-2" />
                            Admin Panel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2 text-destructive focus:text-destructive"
                      >
                        <LogOut className="size-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAuthModal("login")}
                    className="neu-btn px-3 py-2 text-sm font-medium transition-all hover:text-primary"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleOpenAuthModal("register")}
                    className="neu-btn px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-none hover:bg-primary/90"
                  >
                    Register
                  </button>
                </div>
              )}

              {/* Desktop Hamburger (not needed — desktop nav is inline) */}
            </div>
          </div>



          {/* Mobile Menu Dropdown (user menu only — triggered by avatar) */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-border/30">
              {currentUser ? (
                <nav className="flex flex-col gap-2" aria-label="Mobile user menu">
                  {/* User Info */}
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="size-9 neu-circle">
                      {currentUser.avatarUrl ? (
                        <AvatarImage
                          src={currentUser.avatarUrl}
                          alt={currentUser.username}
                        />
                      ) : null}
                      <AvatarFallback className="text-sm font-semibold">
                        {currentUser.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {currentUser.displayName || currentUser.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABELS[currentUser.role as UserRole] || "User"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => { handleNavigate("profile"); setMobileMenuOpen(false); }}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                  >
                    <User className="size-4" />
                    My Profile
                  </button>

                  <button
                    onClick={() => { handleNavigate("bookmarks"); setMobileMenuOpen(false); }}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                  >
                    <Bookmark className="size-4" />
                    Bookmarks
                  </button>

                  <button
                    onClick={() => { handleNavigate("notifications"); setMobileMenuOpen(false); }}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                  >
                    <Bell className="size-4" />
                    Notifications
                    {displayUnreadCount > 0 && (
                      <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 font-bold">
                        {displayUnreadCount}
                      </span>
                    )}
                  </button>

                  {userIsAdmin && (
                    <button
                      onClick={() => { handleNavigate("admin-dashboard"); setMobileMenuOpen(false); }}
                      className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                    >
                      <Home className="size-4" />
                      Admin Panel
                    </button>
                  )}

                  <div className="neu-divider my-2" />

                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left text-destructive transition-all hover:text-destructive/80"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </nav>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenAuthModal("login")}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 w-full transition-all hover:text-primary"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleOpenAuthModal("register")}
                    className="neu-btn px-4 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-none hover:bg-primary/90 flex items-center justify-center gap-2"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin-configurable announcement banner */}
        {announcement && (
          <div className="px-4 sm:px-6">
            <div className="max-w-7xl mx-auto mt-2">
              <div className="neu-card-inset px-4 py-2 text-center text-xs sm:text-sm text-foreground/80 flex items-center justify-center gap-2">
                <Bell className="size-3.5 text-primary shrink-0" />
                <span className="truncate">{announcement}</span>
              </div>
            </div>
          </div>
        )}
      </header>


    </>
  );
}
