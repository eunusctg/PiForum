"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
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
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ROLE_LABELS, UserRole } from "@/lib/types";
import type { AppView } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const {
    currentUser,
    isAdmin,
    settings,
    getSetting,
    navigateTo,
    setCurrentUser,
    setAuthToken,
    setAuthModalOpen,
    setAuthModalTab,
  } = useAppStore();

  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hydration-safe mounted detection without calling setState in an effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const forumName = getSetting("forum_name", "PiForum");

  const handleNavigate = useCallback(
    (view: AppView) => {
      navigateTo(view);
      setMobileMenuOpen(false);
    },
    [navigateTo]
  );

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    navigateTo("home");
  }, [setCurrentUser, setAuthToken, navigateTo]);

  const handleOpenAuthModal = useCallback(
    (tab: "login" | "register") => {
      setAuthModalTab(tab);
      setAuthModalOpen(true);
      setMobileMenuOpen(false);
    },
    [setAuthModalTab, setAuthModalOpen]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const userIsAdmin = isAdmin();

  const navLinks = [
    { label: "Home", view: "home" as AppView, icon: Home, show: true },
    {
      label: "Admin Panel",
      view: "admin-dashboard" as AppView,
      icon: Shield,
      show: userIsAdmin,
    },
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

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(
              (link) =>
                link.show && (
                  <button
                    key={link.view}
                    onClick={() => handleNavigate(link.view)}
                    className="neu-btn px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all hover:text-primary"
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </button>
                )
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="neu-btn flex items-center justify-center w-9 h-9 p-0"
              aria-label={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mounted && theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-slate-600" />
              )}
            </button>

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
                      <span className="text-sm font-medium max-w-[120px] truncate">
                        {currentUser.displayName || currentUser.username}
                      </span>
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="neu-card w-56 p-2 border-0"
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
                      Profile
                    </DropdownMenuItem>
                    {userIsAdmin && (
                      <DropdownMenuItem
                        onClick={() => handleNavigate("admin-dashboard")}
                        className="neu-btn cursor-pointer rounded-lg my-0.5 px-2 py-2"
                      >
                        <Shield className="size-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
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
                  className="neu-btn px-4 py-2 text-sm font-medium transition-all hover:text-primary"
                >
                  Login
                </button>
                <button
                  onClick={() => handleOpenAuthModal("register")}
                  className="neu-btn px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-none hover:bg-primary/90"
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

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border/30">
            <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
              {navLinks.map(
                (link) =>
                  link.show && (
                    <button
                      key={link.view}
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
                    Profile
                  </button>

                  {userIsAdmin && (
                    <button
                      onClick={() => handleNavigate("admin-dashboard")}
                      className="neu-btn px-4 py-3 text-sm font-medium flex items-center gap-3 w-full text-left transition-all hover:text-primary"
                    >
                      <Shield className="size-4" />
                      Admin Panel
                    </button>
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
