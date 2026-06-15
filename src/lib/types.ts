export interface ForumUser {
  id: string;
  firebaseUid: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  User = 0,
  Moderator = 1,
  Admin = 2,
  SuperAdmin = 3,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.User]: "User",
  [UserRole.Moderator]: "Moderator",
  [UserRole.Admin]: "Admin",
  [UserRole.SuperAdmin]: "Super Admin",
};

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  accessLevel: number;
  createdAt: string;
  updatedAt: string;
  forums: Forum[];
}

export interface Forum {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  lastPostAt: string | null;
  threadCount: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  id: string;
  forumId: string;
  authorId: string;
  title: string;
  content: string;
  views: number;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  author?: ForumUser;
  posts?: Post[];
  postCount?: number;
}

export interface Post {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: ForumUser;
  votes?: PostVote[];
  voteScore?: number;
  userVote?: number;
  attachments?: Attachment[];
}

export interface PostVote {
  id: string;
  postId: string;
  userId: string;
  voteType: number;
}

export interface Attachment {
  id: string;
  postId: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface SecurityLog {
  id: string;
  userId: string | null;
  eventType: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: ForumUser;
}

export interface ForumSetting {
  id: string;
  key: string;
  value: string;
}

export interface InstallConfig {
  id: string;
  installed: boolean;
  cloudflareAccountId: string | null;
  cloudflareD1Id: string | null;
  cloudflareApiToken: string | null;
  cloudflareR2Bucket: string | null;
  cloudflareR2AccessKey: string | null;
  cloudflareR2SecretKey: string | null;
  firebaseApiKey: string | null;
  firebaseAuthDomain: string | null;
  firebaseProjectId: string | null;
  firebaseStorageBucket: string | null;
  firebaseMessagingSenderId: string | null;
  firebaseAppId: string | null;
  adminFirebaseUid: string | null;
  forumName: string;
  forumDescription: string;
}

export interface ForumStats {
  totalUsers: number;
  totalThreads: number;
  totalPosts: number;
  totalCategories: number;
  totalForums: number;
  storageUsed: number;
  recentUsers: ForumUser[];
  recentThreads: Thread[];
}

export type AppView =
  | "install"
  | "home"
  | "forum"
  | "thread"
  | "new-thread"
  | "admin-dashboard"
  | "admin-users"
  | "admin-categories"
  | "admin-settings"
  | "admin-security"
  | "login"
  | "register"
  | "profile";

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}
