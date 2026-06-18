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
  Shield,
  Home,
  ChevronDown,
  Palette,
  Check,
  Search,
  Users,
  Tag,
  Bookmark,
  Bell,
  MessageSquare,
  Flag,
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
 * (install / login / register), in which case the caller falls back to the
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
    case "members":
      return "/members";
    case "bookmarks":
      return "/bookmarks";
    case "notifications":
      return "/notifications";
    case "tags":
      return "/tags";
    case "profile": {
      const uid = params?.userId || currentUser?.id;
      return uid ? `/profile/${encodeURIComponent(uid)}` : "/";
    }
    case "admin-dashboard":
      return "/admin";
    case "admin-users":
      return "/admin/users";
    case "admin-categories":
      return "/admin/categories";
    case "admin-settings":
      return "/admin/settings";
    case "admin-security":
      return "/admin/security";
    case "admin-reports":
      return "/admin/reports";
    default:
      // install / login / register / activity — no dedicated URL
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
  const [searchOpen, setSearchOpen] = useState(false);

  // Hydration-safe mounted detection without calling setState in an effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const router = useRouter();
  const forumName = getSetting("forum_name", "PiForum");

  // ---------- Fetch unread notification count ----------
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    let active = true;
    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true", {
          headers: { "x-user-id": currentUser!.id },
        });
        const data = await res.json();
        if (active && data.success) {
          setUnreadCount(data.data?.length ?? 0);
        }
      } catch {
        // Non-critical
      }
    }
    loadUnread();
    const interval = setInterval(loadUnread, 30000); // refresh every 30s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser]);

  // Reset unread count when user logs out (derived state, no extra render needed)
  const displayUnreadCount = currentUser ? unreadCount : 0;

  const handleNavigate = useCallback(
    (view: AppView, params?: Record<string, string>) => {
      const url = viewToUrl(view, params, currentUser);
      if (url !== null) {
        // Real route exists — push it so the URL updates and the page is
        // shareable / bookmarkable. ForumShell on the destination page will
        // sync the store's currentView on mount.
        router.push(url);
      } else {
        // No dedicated URL (install / login / register) — fall back to the
        // in-store SPA switch.
        navigateTo(view, params);
      }
      setMobileMenuOpen(false);
      setSearchOpen(false);
    },
    [router, navigateTo, currentUser]
  );

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    // After clearing auth, send the user back to the home route.
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

  const navLinks: { label: string; view: AppView; icon: typeof Home; show: boolean }[] = [
    { label: "Home", view: "home", icon: Home, show: true },
    { label: "Forums", view: "home", icon: MessageSquare, show: true },
    { label: "Members", view: "members", icon: Users, show: true },
    { label: "Tags", view: "tags", icon: Tag, show: true },
    { label: "Admin", view: "admin-dashboard", icon: Shield, show: userIsAdmin },
  ];

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="neu-card rounded-none px-4 py-3 sm:rounded-b-2xl sm:mx-2 sm:mt-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <button
            onClick={() => handleNavigate("home")}
            className="flex items-center gap-2 group cursor-pointer shrink-0"
            aria-label="Go to home"
          >
            <span className="neu-circle flex items-center justify-center w-9 h-9 text-lg font-bold text-primary transition-all group-hover:text-primary/80">
              π
            </span>
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
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                className="neu-input w-full h-9 pl-9 pr-3 text-sm placeholder:text-muted-foreground"
                aria-label="Search"
              />
            </div>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(
              (link, idx) =>
                link.show && (
                  <button
                    key={`${link.view}-${idx}`}
                    onClick={() => handleNavigate(link.view)}
                    className="neu-btn px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-all hover:text-primary"
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </button>
                )
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="neu-btn md:hidden flex items-center justify-center w-9 h-9 p-0"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>

            {/* Bookmarks (logged-in only) */}
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

            {/* Theme Selector — Day / Night / Golden */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="neu-btn flex items-center justify-center w-9 h-9 p-0"
                  aria-label="Select theme"
                  title="Theme settings"
                >
                  {mounted && themeMode === "dark" ? (
                    <Moon className="size-4 text-indigo-300" />
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

            {/* User Section - Desktop */}
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
                      <ChevronDown className="size-3.5 text-muted-foreground" />
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
                          <Shield className="size-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleNavigate("admin-reports")}
                          className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2"
                        >
                          <Flag className="size-4 mr-2" />
                          Reports
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

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="neu-btn md:hidden flex items-center justify-center w-9 h-9 p-0"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (collapsible) */}
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="md:hidden mt-3 pt-3 border-t border-border/30"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search threads, members, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neu-input w-full h-11 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                aria-label="Search"
              />
            </div>
          </form>
        )}

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border/30">
            <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
              {navLinks.map(
                (link, idx) =>
                  link.show && (
                    <button
                      key={`m-${link.view}-${idx}`}
                      onClick={() => handleNavigate(link.view)}
                      className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                    >
                      <link.icon className="size-4" />
                      {link.label}
                    </button>
                  )
              )}

              <div className="neu-divider my-2" />

              {currentUser ? (
                <>
                  {/* Mobile User Info */}
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
                    onClick={() => handleNavigate("profile")}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                  >
                    <User className="size-4" />
                    My Profile
                  </button>

                  <button
                    onClick={() => handleNavigate("bookmarks")}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                  >
                    <Bookmark className="size-4" />
                    Bookmarks
                  </button>

                  <button
                    onClick={() => handleNavigate("notifications")}
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
                    <>
                      <button
                        onClick={() => handleNavigate("admin-dashboard")}
                        className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                      >
                        <Shield className="size-4" />
                        Admin Panel
                      </button>
                      <button
                        onClick={() => handleNavigate("admin-reports")}
                        className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                      >
                        <Flag className="size-4" />
                        Reports
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleLogout}
                    className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left text-destructive transition-all hover:text-destructive/80"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </>
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
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
