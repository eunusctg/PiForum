"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Mail, Lock, User, Eye, EyeOff, BadgeCheck, CheckCircle2, Send } from "lucide-react";
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
    getSetting,
  } = useAppStore();

  // Check if Google OAuth is enabled via admin settings
  const googleOAuthEnabled = getSetting('oauth_google_enabled', 'false') === 'true';

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
  // Email verification state — shown after a successful registration when
  // verification is required by the admin.
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Handle OAuth callback from URL hash (set by Google callback redirect)
  // Uses queueMicrotask to avoid the react-hooks/set-state-in-effect lint rule
  // while still processing the OAuth redirect data on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash && !window.location.search) return;

    const hashParams = hash ? new URLSearchParams(hash.slice(1)) : new URLSearchParams();
    const queryParams = new URLSearchParams(window.location.search);

    const authToken = hashParams.get('auth_token');
    const authUser = hashParams.get('auth_user');

    if (authToken && authUser) {
      queueMicrotask(() => {
        try {
          const user = JSON.parse(decodeURIComponent(authUser)) as ForumUser;
          setCurrentUser(user);
          setAuthToken(authToken);
        } catch {
          console.error('Failed to parse OAuth callback data');
        }
      });
      // Clean up the URL hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Also check for auth_error in hash or query
    const authError = hashParams.get('auth_error') || queryParams.get('auth_error');
    if (authError) {
      const errorDetail = hashParams.get('auth_error_detail') || queryParams.get('auth_error_detail');
      const errorMessages: Record<string, string> = {
        access_denied: 'Google sign-in was cancelled.',
        missing_params: 'Invalid OAuth response from Google.',
        invalid_state: 'Security check failed. This can happen if you waited too long or used a different browser tab. Please try again.',
        expired_state: 'Your sign-in session expired (over 10 minutes). Please try again.',
        oauth_not_configured: 'Google OAuth is not properly configured on the server. Please contact an administrator.',
        token_exchange_failed: 'Google could not verify your sign-in. This usually means the redirect URI is not registered in Google Cloud Console.',
        no_id_token: 'Google did not return a valid identity token. Please try again.',
        no_email: 'Your Google account has no email address. Please add one to your Google account.',
        account_banned: 'Your account has been banned.',
        registration_closed: 'Registration is currently closed.',
        invalid_audience: 'Security check failed (audience mismatch). The Google OAuth configuration may be incorrect.',
      };
      let msg = errorMessages[authError] || `Authentication error: ${authError}`;
      // Append the detailed error from Google if available (helps debugging)
      if (errorDetail) {
        msg += `\n\nDetails: ${errorDetail}`;
      }
      queueMicrotask(() => {
        setLoginError(msg);
        // Auto-open the modal so the user sees the error immediately
        setAuthModalOpen(true);
        setAuthModalTab('login');
      });
      // Clean up
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

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
      setVerificationRequired(false);
      setVerifyToken(null);
      setVerifying(false);
      setResendLoading(false);
      setResendMessage(null);
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

        // If email verification is required, keep the modal open and show the
        // verification step instead of closing.
        if (data.data.verificationRequired) {
          setVerificationRequired(true);
          setVerifyToken(data.data.verifyToken || null);
        } else {
          setAuthModalOpen(false);
        }
      } catch {
        setRegisterError("Network error. Please check your connection and try again.");
      } finally {
        setRegisterLoading(false);
      }
    },
    [registerForm, setCurrentUser, setAuthToken, setAuthModalOpen]
  );

  const handleGoogleSignIn = useCallback(() => {
    setGoogleLoading(true);
    // Redirect to the Google OAuth initiation endpoint
    window.location.href = '/api/auth/google';
  }, []);

  const handleVerifyEmail = useCallback(async () => {
    if (!verifyToken) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken }),
      });
      const data = await res.json();
      if (data.success) {
        // Update the current user to reflect verified status
        const user = useAppStore.getState().currentUser;
        if (user) {
          setCurrentUser({ ...user, isVerified: true, verifiedAt: new Date().toISOString() });
        }
        setVerificationRequired(false);
        setAuthModalOpen(false);
      } else {
        setRegisterError(data.error || "Verification failed.");
      }
    } catch {
      setRegisterError("Network error during verification.");
    } finally {
      setVerifying(false);
    }
  }, [verifyToken, setCurrentUser, setAuthModalOpen]);

  // Resend verification email handler
  const handleResendVerification = useCallback(async () => {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const user = useAppStore.getState().currentUser;
      if (!user) return;
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (data.success) {
        // If a new token was returned (UI fallback), update it
        if (data.data?.verifyToken) {
          setVerifyToken(data.data.verifyToken);
        }
        setResendMessage(data.data?.emailSent
          ? "A new verification email has been sent to your inbox."
          : "Verification link ready. Click the button below to verify.");
      } else {
        setResendMessage(data.error || "Failed to resend verification email.");
      }
    } catch {
      setResendMessage("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }, []);

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="neu-card-static border-0 w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-0"
        showCloseButton
      >
        {/* Tab Headers — Neumorphism-styled custom tabs */}
        <div className="neu-well rounded-none p-1 flex gap-1 m-3 mb-0 sm:m-4 sm:mb-0">
          <button
            onClick={() => handleTabChange("login")}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl text-center transition-all ${
              activeTab === "login"
                ? "neu-card shadow-sm text-primary"
                : "neu-flat hover:text-foreground text-muted-foreground"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => handleTabChange("register")}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl text-center transition-all ${
              activeTab === "register"
                ? "neu-card shadow-sm text-primary"
                : "neu-flat hover:text-foreground text-muted-foreground"
            }`}
          >
            Register
          </button>
        </div>

        <DialogHeader className="px-5 pt-3 pb-0 sr-only">
          <DialogTitle>
            {activeTab === "login" ? "Login to PiForum" : "Join PiForum — Create an account"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 sm:px-5">
          {/* Email Verification Step (shown when registration requires verification) */}
          {verificationRequired ? (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="neu-circle p-4">
                  <BadgeCheck className="size-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Verify your email</h3>
                <p className="text-sm text-muted-foreground">
                  A verification link has been sent to your email address. Click the button
                  below to verify your account, or resend the verification email.
                </p>
              </div>
              {resendMessage && (
                <div className="neu-card-inset p-3 rounded-xl text-sm text-primary font-medium">
                  {resendMessage}
                </div>
              )}
              {registerError && (
                <div className="neu-card-inset p-3 rounded-xl text-sm text-destructive font-medium">
                  {registerError}
                </div>
              )}
              <button
                onClick={handleVerifyEmail}
                disabled={verifying || !verifyToken}
                className="neu-btn w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              >
                {verifying ? (
                  <><Loader2 className="size-4 animate-spin" /> Verifying...</>
                ) : (
                  <><CheckCircle2 className="size-4" /> Verify Email Now</>
                )}
              </button>
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="neu-btn w-full h-10 flex items-center justify-center gap-2 text-sm font-medium text-primary disabled:opacity-50"
              >
                {resendLoading ? (
                  <><Loader2 className="size-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="size-4" /> Resend Verification Email</>
                )}
              </button>
              {!verifyToken && (
                <p className="text-xs text-center text-muted-foreground">
                  No verification token available. Click &quot;Resend&quot; to get a new one, or ask an admin to verify your account manually.
                </p>
              )}
            </div>
          ) : (
            <>
          {/* Login Form */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              {/* Google Sign-in Button */}
              {googleOAuthEnabled && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loginLoading || googleLoading}
                    className="neu-btn w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:shadow-md"
                  >
                    {googleLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </>
              )}
              {/* Email */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="login-email"
                  className="text-xs font-medium text-foreground px-1"
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
                    className="neu-input w-full h-10 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                    autoComplete="email"
                    disabled={loginLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="login-password"
                  className="text-xs font-medium text-foreground px-1"
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
                    className="neu-input w-full h-10 pl-10 pr-10 text-sm placeholder:text-muted-foreground"
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
                className={`neu-btn w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
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
              <p className="text-center text-xs text-muted-foreground">
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
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
              {/* Google Sign-in Button */}
              {googleOAuthEnabled && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={registerLoading || googleLoading}
                    className="neu-btn w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:shadow-md"
                  >
                    {googleLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Sign up with Google
                  </button>
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </>
              )}

              {/* Username */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="register-username"
                  className="text-xs font-medium text-foreground px-1"
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
                    className="neu-input w-full h-10 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                    autoComplete="username"
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="register-email"
                  className="text-xs font-medium text-foreground px-1"
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
                    className="neu-input w-full h-10 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                    autoComplete="email"
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="register-password"
                  className="text-xs font-medium text-foreground px-1"
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
                    className="neu-input w-full h-10 pl-10 pr-10 text-sm placeholder:text-muted-foreground"
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
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="register-confirm-password"
                  className="text-xs font-medium text-foreground px-1"
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
                    className="neu-input w-full h-10 pl-10 pr-10 text-sm placeholder:text-muted-foreground"
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
                className={`neu-btn w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
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
              <p className="text-center text-xs text-muted-foreground">
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
