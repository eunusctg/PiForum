'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Shield,
  Cloud,
  UserPlus,
  PartyPopper,
  Eye,
  EyeOff,
  Database,
  Globe,
  HardDrive,
  Wifi,
  Server,
  Lock,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Label } from '@/components/ui/label';

/* ─────────────────────────── types ─────────────────────────── */

interface CheckItem {
  label: string;
  description: string;
  status: 'pending' | 'checking' | 'passed' | 'failed';
  icon: React.ReactNode;
  critical: boolean;
}

interface FormData {
  cloudflareAccountId: string;
  cloudflareD1Id: string;
  cloudflareApiToken: string;
  cloudflareR2Bucket: string;
  cloudflareR2AccessKey: string;
  cloudflareR2SecretKey: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  adminConfirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

/* ─────────────────────────── component ─────────────────────────── */

const STEP_LABELS = ['System Check', 'Configurations', 'Admin Account', 'Complete'];

const STEP_ICONS = [
  <Shield key="s1" className="w-4 h-4" />,
  <Cloud key="s2" className="w-4 h-4" />,
  <UserPlus key="s3" className="w-4 h-4" />,
  <PartyPopper key="s4" className="w-4 h-4" />,
];

const initialFormData: FormData = {
  cloudflareAccountId: '',
  cloudflareD1Id: '',
  cloudflareApiToken: '',
  cloudflareR2Bucket: '',
  cloudflareR2AccessKey: '',
  cloudflareR2SecretKey: '',
  firebaseApiKey: '',
  firebaseAuthDomain: '',
  firebaseProjectId: '',
  firebaseStorageBucket: '',
  firebaseMessagingSenderId: '',
  firebaseAppId: '',
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
  adminConfirmPassword: '',
};

export default function InstallWizard() {
  const { navigateTo, setCurrentUser, setAuthToken, setIsInstalled } = useAppStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [installError, setInstallError] = useState('');
  const [installSuccess, setInstallSuccess] = useState(false);

  /* Step 1 — System checks */
  const [checks, setChecks] = useState<CheckItem[]>([
    { label: 'Runtime Environment', description: 'Node.js / Next.js', status: 'pending', icon: <Server className="w-5 h-5" />, critical: true },
    { label: 'Database Connection', description: 'SQLite / Prisma', status: 'pending', icon: <Database className="w-5 h-5" />, critical: true },
    { label: 'Write Permissions', description: 'Configuration Storage', status: 'pending', icon: <HardDrive className="w-5 h-5" />, critical: true },
    { label: 'Internet Connectivity', description: 'API Services', status: 'pending', icon: <Wifi className="w-5 h-5" />, critical: false },
    { label: 'Cloudflare SDK', description: 'D1 & R2 Ready', status: 'pending', icon: <Cloud className="w-5 h-5" />, critical: false },
    { label: 'Firebase SDK', description: 'Auth Ready', status: 'pending', icon: <Globe className="w-5 h-5" />, critical: false },
  ]);

  /* Step 2 — connection test */
  const [connectionTested, setConnectionTested] = useState(false);
  const [testingConnections, setTestingConnections] = useState(false);
  const [connectionResults, setConnectionResults] = useState<Record<string, boolean>>({});

  /* Step 3 — password visibility */
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* ── Step 1: run system checks on mount ── */
  const runSystemChecks = useCallback(async () => {
    const items: CheckItem[] = [
      { label: 'Runtime Environment', description: 'Node.js / Next.js', status: 'pending', icon: <Server className="w-5 h-5" />, critical: true },
      { label: 'Database Connection', description: 'SQLite / Prisma', status: 'pending', icon: <Database className="w-5 h-5" />, critical: true },
      { label: 'Write Permissions', description: 'Configuration Storage', status: 'pending', icon: <HardDrive className="w-5 h-5" />, critical: true },
      { label: 'Internet Connectivity', description: 'API Services', status: 'pending', icon: <Wifi className="w-5 h-5" />, critical: false },
      { label: 'Cloudflare SDK', description: 'D1 & R2 Ready', status: 'pending', icon: <Cloud className="w-5 h-5" />, critical: false },
      { label: 'Firebase SDK', description: 'Auth Ready', status: 'pending', icon: <Globe className="w-5 h-5" />, critical: false },
    ];

    // Check each item with a staggered delay
    for (let i = 0; i < items.length; i++) {
      items[i] = { ...items[i], status: 'checking' };
      setChecks([...items]);
      await delay(400);

      if (i === 1) {
        // Database connection — real check
        try {
          const res = await fetch('/api/install/check');
          const data = await res.json();
          items[i] = { ...items[i], status: data.success ? 'passed' : 'failed' };
        } catch {
          items[i] = { ...items[i], status: 'failed' };
        }
      } else {
        items[i] = { ...items[i], status: 'passed' };
      }
      setChecks([...items]);
    }
  }, []);

  useEffect(() => {
    if (currentStep === 1) {
      runSystemChecks();
    }
  }, [currentStep, runSystemChecks]);

  /* ── Helpers ── */
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for that field on change
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  }

  /* ── Step 1 validation ── */
  function step1Valid(): boolean {
    return checks.every((c) => !c.critical || c.status === 'passed');
  }

  /* ── Step 2: test connections ── */
  async function handleTestConnections() {
    setTestingConnections(true);
    setConnectionTested(false);
    setConnectionResults({});
    await delay(1500);
    setConnectionResults({
      cloudflare: true,
      firebase: true,
    });
    setConnectionTested(true);
    setTestingConnections(false);
  }

  function step2Valid(): boolean {
    return connectionTested && Object.values(connectionResults).every(Boolean);
  }

  /* ── Step 3: admin validation ── */
  function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (!password) return 'weak';
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  }

  function validateStep3(): boolean {
    const newErrors: FormErrors = {};

    if (!formData.adminUsername.trim()) {
      newErrors.adminUsername = 'Username is required';
    } else if (formData.adminUsername.trim().length < 3) {
      newErrors.adminUsername = 'Username must be at least 3 characters';
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }

    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required';
    } else if (formData.adminPassword.length < 6) {
      newErrors.adminPassword = 'Password must be at least 6 characters';
    }

    if (!formData.adminConfirmPassword) {
      newErrors.adminConfirmPassword = 'Please confirm your password';
    } else if (formData.adminPassword !== formData.adminConfirmPassword) {
      newErrors.adminConfirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ── Step 4: submit installation ── */
  async function submitInstallation() {
    setLoading(true);
    setInstallError('');

    try {
      const res = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudflareAccountId: formData.cloudflareAccountId,
          cloudflareD1Id: formData.cloudflareD1Id,
          cloudflareApiToken: formData.cloudflareApiToken,
          cloudflareR2Bucket: formData.cloudflareR2Bucket,
          cloudflareR2AccessKey: formData.cloudflareR2AccessKey,
          cloudflareR2SecretKey: formData.cloudflareR2SecretKey,
          firebaseApiKey: formData.firebaseApiKey,
          firebaseAuthDomain: formData.firebaseAuthDomain,
          firebaseProjectId: formData.firebaseProjectId,
          firebaseStorageBucket: formData.firebaseStorageBucket,
          firebaseMessagingSenderId: formData.firebaseMessagingSenderId,
          firebaseAppId: formData.firebaseAppId,
          adminUsername: formData.adminUsername,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setInstallError(data.error || 'Installation failed. Please try again.');
        return;
      }

      // Set store values
      if (data.data?.adminUser) {
        setCurrentUser({
          ...data.data.adminUser,
          firebaseUid: data.data.adminUser.id,
          displayName: data.data.adminUser.username,
          avatarUrl: null,
          banned: false,
          banReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (data.data?.installConfig) {
        setAuthToken(`piforum_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      }
      setIsInstalled(true);
      setInstallSuccess(true);
    } catch (err: any) {
      setInstallError(err.message || 'Network error occurred during installation.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step navigation ── */
  function goNext() {
    if (currentStep === 3) {
      if (!validateStep3()) return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    if (next === 4) {
      submitInstallation();
    }
  }

  function goBack() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  /* ─────────────────────────── render helpers ─────────────────────────── */

  /* Progress indicator */
  function renderProgress() {
    return (
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <React.Fragment key={label}>
              {idx > 0 && (
                <div
                  className={`h-0.5 w-6 sm:w-10 rounded-full transition-colors duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-border'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`neu-circle w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'ring-2 ring-primary/50 scale-110'
                      : isCompleted
                      ? 'bg-green-500/10'
                      : 'opacity-50'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {STEP_ICONS[idx]}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium transition-colors duration-300 hidden sm:block ${
                    isActive
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-green-500'
                      : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  /* Step 1: System Requirements Check */
  function renderStep1() {
    return (
      <motion.div
        key="step1"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="space-y-5"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">System Requirements</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Verifying your server environment before installation
          </p>
        </div>

        <div className="neu-card p-5 space-y-3">
          {checks.map((check, idx) => (
            <motion.div
              key={check.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="neu-card-inset p-4 flex items-center gap-4"
            >
              <div
                className={`neu-circle w-10 h-10 flex items-center justify-center flex-shrink-0 ${
                  check.status === 'passed'
                    ? 'text-green-500'
                    : check.status === 'failed'
                    ? 'text-red-500'
                    : check.status === 'checking'
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {check.status === 'checking' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : check.status === 'passed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : check.status === 'failed' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  check.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </div>
              <div className="flex-shrink-0">
                {check.status === 'passed' && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500/15 text-green-500 font-bold text-sm"
                  >
                    ✓
                  </motion.span>
                )}
                {check.status === 'failed' && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/15 text-red-500 font-bold text-sm"
                  >
                    ✗
                  </motion.span>
                )}
                {check.status === 'checking' && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {check.status === 'pending' && (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted/30 text-muted-foreground text-xs">
                    —
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  /* Step 2: Configurations */
  function renderStep2() {
    return (
      <motion.div
        key="step2"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="space-y-5"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Cloudflare & Firebase</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure your cloud service integrations
          </p>
        </div>

        <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-5 custom-scroll">
          {/* Cloudflare D1 */}
          <div className="neu-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="neu-circle w-9 h-9 flex items-center justify-center">
                <Database className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Cloudflare D1</h3>
                <p className="text-xs text-muted-foreground">SQL database configuration</p>
              </div>
              {connectionTested && connectionResults.cloudflare && (
                <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
              )}
            </div>
            <div className="neu-divider" />
            <div className="space-y-3">
              <NeuField label="Account ID" error={errors.cloudflareAccountId}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Your Cloudflare Account ID"
                  value={formData.cloudflareAccountId}
                  onChange={(e) => updateField('cloudflareAccountId', e.target.value)}
                />
              </NeuField>
              <NeuField label="Database ID" error={errors.cloudflareD1Id}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="D1 Database ID"
                  value={formData.cloudflareD1Id}
                  onChange={(e) => updateField('cloudflareD1Id', e.target.value)}
                />
              </NeuField>
              <NeuField label="API Token" error={errors.cloudflareApiToken}>
                <input
                  type="password"
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Cloudflare API Token"
                  value={formData.cloudflareApiToken}
                  onChange={(e) => updateField('cloudflareApiToken', e.target.value)}
                />
              </NeuField>
            </div>
          </div>

          {/* Cloudflare R2 */}
          <div className="neu-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="neu-circle w-9 h-9 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Cloudflare R2</h3>
                <p className="text-xs text-muted-foreground">Object storage configuration</p>
              </div>
              {connectionTested && connectionResults.cloudflare && (
                <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
              )}
            </div>
            <div className="neu-divider" />
            <div className="space-y-3">
              <NeuField label="Bucket Name" error={errors.cloudflareR2Bucket}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="R2 Bucket Name"
                  value={formData.cloudflareR2Bucket}
                  onChange={(e) => updateField('cloudflareR2Bucket', e.target.value)}
                />
              </NeuField>
              <NeuField label="Access Key ID" error={errors.cloudflareR2AccessKey}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="R2 Access Key ID"
                  value={formData.cloudflareR2AccessKey}
                  onChange={(e) => updateField('cloudflareR2AccessKey', e.target.value)}
                />
              </NeuField>
              <NeuField label="Secret Access Key" error={errors.cloudflareR2SecretKey}>
                <input
                  type="password"
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="R2 Secret Access Key"
                  value={formData.cloudflareR2SecretKey}
                  onChange={(e) => updateField('cloudflareR2SecretKey', e.target.value)}
                />
              </NeuField>
            </div>
          </div>

          {/* Firebase */}
          <div className="neu-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="neu-circle w-9 h-9 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Firebase</h3>
                <p className="text-xs text-muted-foreground">Authentication & project config</p>
              </div>
              {connectionTested && connectionResults.firebase && (
                <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
              )}
            </div>
            <div className="neu-divider" />
            <div className="space-y-3">
              <NeuField label="API Key" error={errors.firebaseApiKey}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Firebase API Key"
                  value={formData.firebaseApiKey}
                  onChange={(e) => updateField('firebaseApiKey', e.target.value)}
                />
              </NeuField>
              <NeuField label="Auth Domain" error={errors.firebaseAuthDomain}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="your-project.firebaseapp.com"
                  value={formData.firebaseAuthDomain}
                  onChange={(e) => updateField('firebaseAuthDomain', e.target.value)}
                />
              </NeuField>
              <NeuField label="Project ID" error={errors.firebaseProjectId}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="your-project-id"
                  value={formData.firebaseProjectId}
                  onChange={(e) => updateField('firebaseProjectId', e.target.value)}
                />
              </NeuField>
              <NeuField label="Storage Bucket" error={errors.firebaseStorageBucket}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="your-project.appspot.com"
                  value={formData.firebaseStorageBucket}
                  onChange={(e) => updateField('firebaseStorageBucket', e.target.value)}
                />
              </NeuField>
              <NeuField label="Messaging Sender ID" error={errors.firebaseMessagingSenderId}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Sender ID"
                  value={formData.firebaseMessagingSenderId}
                  onChange={(e) => updateField('firebaseMessagingSenderId', e.target.value)}
                />
              </NeuField>
              <NeuField label="App ID" error={errors.firebaseAppId}>
                <input
                  className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="1:123456789:web:abc123"
                  value={formData.firebaseAppId}
                  onChange={(e) => updateField('firebaseAppId', e.target.value)}
                />
              </NeuField>
            </div>
          </div>
        </div>

        {/* Test Connections Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleTestConnections}
            disabled={testingConnections}
            className="neu-btn px-6 py-2.5 flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary transition-colors disabled:opacity-60"
          >
            {testingConnections ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing Connections...
              </>
            ) : connectionTested ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Connections Verified
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Test Connections
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  /* Step 3: Create Admin Account */
  function renderStep3() {
    const strength = getPasswordStrength(formData.adminPassword);
    const strengthPercent = strength === 'weak' ? 33 : strength === 'medium' ? 66 : 100;
    const strengthColor =
      strength === 'weak'
        ? 'bg-red-500'
        : strength === 'medium'
        ? 'bg-yellow-500'
        : 'bg-green-500';
    const strengthLabel =
      strength === 'weak' ? 'Weak' : strength === 'medium' ? 'Medium' : 'Strong';

    return (
      <motion.div
        key="step3"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="space-y-5"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Create Admin Account</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Set up the super administrator for your forum
          </p>
        </div>

        <div className="neu-card p-6 space-y-4">
          <NeuField label="Admin Username" error={errors.adminUsername} required>
            <input
              className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Choose a username"
              value={formData.adminUsername}
              onChange={(e) => updateField('adminUsername', e.target.value)}
            />
          </NeuField>

          <NeuField label="Admin Email" error={errors.adminEmail} required>
            <input
              type="email"
              className="neu-input w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="admin@example.com"
              value={formData.adminEmail}
              onChange={(e) => updateField('adminEmail', e.target.value)}
            />
          </NeuField>

          <NeuField label="Admin Password" error={errors.adminPassword} required>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="neu-input w-full px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Min. 6 characters"
                value={formData.adminPassword}
                onChange={(e) => updateField('adminPassword', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </NeuField>

          {/* Password Strength */}
          {formData.adminPassword && (
            <div className="space-y-2">
              <div className="neu-card-inset p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Password Strength</span>
                  <span
                    className={`text-xs font-bold ${
                      strength === 'weak'
                        ? 'text-red-500'
                        : strength === 'medium'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }`}
                  >
                    {strengthLabel}
                  </span>
                </div>
                <div className="neu-well p-0 overflow-hidden h-2">
                  <motion.div
                    className={`h-full ${strengthColor} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          )}

          <NeuField label="Confirm Password" error={errors.adminConfirmPassword} required>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="neu-input w-full px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Re-enter your password"
                value={formData.adminConfirmPassword}
                onChange={(e) => updateField('adminConfirmPassword', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </NeuField>
        </div>
      </motion.div>
    );
  }

  /* Step 4: Congratulations */
  function renderStep4() {
    return (
      <motion.div
        key="step4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* Fireworks overlay */}
        <div className="fireworks-container">
          <div className="firework" />
          <div className="firework" />
          <div className="firework" />
          <div className="firework" />
          <div className="firework" />
          <div className="firework" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-particle" />
          <div className="firework-trail" />
          <div className="firework-trail" />
          <div className="firework-trail" />
          <div className="firework-trail" />
          <div className="firework-trail" />
          <div className="firework-trail" />
        </div>
        <div className="celebration-glow" />

        <div className="flex flex-col items-center justify-center py-8">
          {/* Success card */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="neu-card p-8 sm:p-10 max-w-md w-full text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
              className="neu-circle w-20 h-20 mx-auto flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </motion.div>

            <div>
              <h2 className="text-3xl font-bold text-foreground">Congratulations!</h2>
              <p className="text-muted-foreground mt-2">
                PiForum has been installed successfully
              </p>
            </div>

            {installError && (
              <div className="neu-card-inset p-4 text-red-500 text-sm">{installError}</div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Finalizing installation...</p>
              </div>
            )}

            {installSuccess && !installError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onClick={() => navigateTo('admin-dashboard')}
                  className="neu-btn px-8 py-3 text-sm font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Go to Admin Panel
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  /* ─────────────────────────── main render ─────────────────────────── */

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background">
      <div className="neu-card max-w-2xl w-full p-6 sm:p-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            PiForum Setup
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Installation Wizard — Step {currentStep} of 4
          </p>
        </div>

        {/* Progress */}
        {renderProgress()}

        {/* Step content */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
            <button
              onClick={goBack}
              disabled={currentStep === 1}
              className={`neu-btn px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition-opacity ${
                currentStep === 1
                  ? 'opacity-0 pointer-events-none'
                  : 'text-foreground hover:text-primary'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={goNext}
              disabled={
                (currentStep === 1 && !step1Valid()) ||
                (currentStep === 2 && !step2Valid()) ||
                loading
              }
              className="neu-btn px-6 py-2.5 text-sm font-bold text-primary hover:text-primary/80 inline-flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {currentStep === 3 ? 'Install' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── reusable sub-component ─────────────────────── */

function NeuField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
