import { create } from "zustand";
import type { AppView, ForumUser, Category, Forum, Thread, Post, InstallConfig, ForumSetting } from "@/lib/types";

interface AppState {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  navigateTo: (view: AppView, params?: Record<string, string>) => void;
  viewParams: Record<string, string>;

  // Auth
  currentUser: ForumUser | null;
  setCurrentUser: (user: ForumUser | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  isAdmin: () => boolean;

  // Install
  isInstalled: boolean;
  setIsInstalled: (installed: boolean) => void;
  installConfig: InstallConfig | null;
  setInstallConfig: (config: InstallConfig | null) => void;

  // Forum data
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  currentForum: Forum | null;
  setCurrentForum: (forum: Forum | null) => void;
  currentThread: Thread | null;
  setCurrentThread: (thread: Thread | null) => void;
  threads: Thread[];
  setThreads: (threads: Thread[]) => void;
  posts: Post[];
  setPosts: (posts: Post[]) => void;

  // Settings
  settings: Record<string, string>;
  setSettings: (settings: ForumSetting[]) => void;
  getSetting: (key: string, defaultValue?: string) => string;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: "login" | "register";
  setAuthModalTab: (tab: "login" | "register") => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: "install",
  setCurrentView: (view) => set({ currentView: view }),
  navigateTo: (view, params = {}) => set({ currentView: view, viewParams: params }),
  viewParams: {},

  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  authToken: null,
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem("piforum_token", token);
    } else {
      localStorage.removeItem("piforum_token");
    }
    set({ authToken: token });
  },
  isAdmin: () => {
    const user = get().currentUser;
    return user !== null && user.role >= 2;
  },

  // Install
  isInstalled: false,
  setIsInstalled: (installed) => set({ isInstalled: installed }),
  installConfig: null,
  setInstallConfig: (config) => set({ installConfig: config }),

  // Forum data
  categories: [],
  setCategories: (cats) => set({ categories: cats }),
  currentForum: null,
  setCurrentForum: (forum) => set({ currentForum: forum }),
  currentThread: null,
  setCurrentThread: (thread) => set({ currentThread: thread }),
  threads: [],
  setThreads: (threads) => set({ threads: threads }),
  posts: [],
  setPosts: (posts) => set({ posts: posts }),

  // Settings
  settings: {},
  setSettings: (settings) => {
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    set({ settings: map });
  },
  getSetting: (key, defaultValue = "") => {
    const settings = get().settings;
    return settings[key] ?? defaultValue;
  },

  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  authModalOpen: false,
  setAuthModalOpen: (open) => set({ authModalOpen: open }),
  authModalTab: "login",
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
}));
