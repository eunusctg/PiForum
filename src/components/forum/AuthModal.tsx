"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { ForumUser } from "@/lib/types";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    setCurrentUser,
    setAuthToken,
  } = useAppStore();

  // authModalTab from the store is the single source of truth for which tab is shown.
  // This guarantees that clicking "Login" or "Register" in the header always shows
  // the correct form, even across open/close cycles.
  const activeTab = authModalTab;

  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset forms, errors, and password visibility whenever the modal closes.
  // Using an effect on authModalOpen (instead of onOpenChange) ensures the reset
  // happens reliably even when the modal is closed programmatically.
  useEffect(() => {
    if (!authModalOpen) {
      setLoginForm({ email: "", password: "" });
      setRegisterForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setLoginError("");
      setRegisterError("");
      setShowLoginPassword(false);
      setShowRegisterPassword(false);
      setShowConfirmPassword(false);
      setLoginLoading(false);
      setRegisterLoading(false);
    }
  }, [authModalOpen]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setAuthModalOpen(open);
    },
    [setAuthModalOpen]
  );

  const handleTabChange = useCallback(
    (tab: "login" | "register") => {
      setAuthModalTab(tab);
      setLoginError("");
      setRegisterError("");
    },
    [setAuthModalTab]
  );

  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError("");

      if (!loginForm.email.trim() || !loginForm.password.trim()) {
        setLoginError("Email and password are required.");
        return;
      }

      setLoginLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: loginForm.email.trim(),
            password: loginForm.password,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setLoginError(data.error || "Login failed. Please try again.");
          return;
        }

        setCurrentUser(data.data.user as ForumUser);
        setAuthToken(data.data.token as string);
        setAuthModalOpen(false);
      } catch {
        setLoginError("Network error. Please check your connection and try again.");
      } finally {
        setLoginLoading(false);
      }
    },
    [loginForm, setCurrentUser, setAuthToken, setAuthModalOpen]
  );

  const handleRegisterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setRegisterError("");

      if (
        !registerForm.username.trim() ||
        !registerForm.email.trim() ||
        !registerForm.password.trim()
      ) {
        setRegisterError("All fields are required.");
        return;
      }

      if (registerForm.password.length < 6) {
        setRegisterError("Password must be at least 6 characters.");
        return;
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        setRegisterError("Passwords do not match.");
        return;
      }

      setRegisterLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: registerForm.username.trim(),
            email: registerForm.email.trim(),
            password: registerForm.password,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setRegisterError(data.error || "Registration failed. Please try again.");
          return;
        }

        setCurrentUser(data.data.user as ForumUser);
        setAuthToken(data.data.token as string);
        setAuthModalOpen(false);
      } catch {
        setRegisterError("Network error. Please check your connection and try again.");
      } finally {
        setRegisterLoading(false);
      }
    },
    [registerForm, setCurrentUser, setAuthToken, setAuthModalOpen]
  );

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="neu-card-static border-0 sm:max-w-md p-0 overflow-hidden"
        showCloseButton
      >
        {/* Tab Headers — Neumorphism-styled custom tabs */}
        <div className="neu-well rounded-none p-1.5 flex gap-1.5 m-4 mb-0">
          <button
            onClick={() => handleTabChange("login")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl text-center transition-all ${
              activeTab === "login"
                ? "neu-card shadow-sm text-primary"
                : "neu-flat hover:text-foreground text-muted-foreground"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => handleTabChange("register")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl text-center transition-all ${
              activeTab === "register"
                ? "neu-card shadow-sm text-primary"
                : "neu-flat hover:text-foreground text-muted-foreground"
            }`}
          >
            Register
          </button>
        </div>

        <DialogHeader className="px-6 pt-4 pb-0 sr-only">
          <DialogTitle>
            {activeTab === "login" ? "Login to your account" : "Create a new account"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4">
          {/* Login Form */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-email"
                  className="text-sm font-medium text-foreground px-1"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="neu-input w-full h-11 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                    autoComplete="email"
                    disabled={loginLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-foreground px-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="neu-input w-full h-11 pl-10 pr-10 text-sm placeholder:text-muted-foreground"
                    autoComplete="current-password"
                    disabled={loginLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="neu-card-inset p-3 rounded-xl text-sm text-destructive font-medium">
                  {loginError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginLoading}
                className={`neu-btn w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  loginLoading
                    ? "neu-btn-inset opacity-70 cursor-wait"
                    : "hover:text-primary"
                }`}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Switch to Register */}
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleTabChange("register")}
                  className="text-primary font-medium hover:underline"
                >
                  Register
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-username"
                  className="text-sm font-medium text-foreground px-1"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="register-username"
                    type="text"
                    placeholder="Choose a username"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="neu-input w-full h-11 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                    autoComplete="username"
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-email"
                  className="text-sm font-medium text-foreground px-1"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="neu-input w-full h-11 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                    autoComplete="email"
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-password"
                  className="text-sm font-medium text-foreground px-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="neu-input w-full h-11 pl-10 pr-10 text-sm placeholder:text-muted-foreground"
                    autoComplete="new-password"
                    disabled={registerLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={
                      showRegisterPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className="text-sm font-medium text-foreground px-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={registerForm.confirmPassword}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="neu-input w-full h-11 pl-10 pr-10 text-sm placeholder:text-muted-foreground"
                    autoComplete="new-password"
                    disabled={registerLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {registerError && (
                <div className="neu-card-inset p-3 rounded-xl text-sm text-destructive font-medium">
                  {registerError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={registerLoading}
                className={`neu-btn w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  registerLoading
                    ? "neu-btn-inset opacity-70 cursor-wait"
                    : "hover:text-primary"
                }`}
              >
                {registerLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Switch to Login */}
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleTabChange("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
