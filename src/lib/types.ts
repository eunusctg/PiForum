export interface ForumUser {
  id: string;
  firebaseUid: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  signature: string | null;
  location: string | null;
  website: string | null;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  postCount: number;
  threadCount: number;
  reputation: number;
  lastSeenAt: string;
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
  color: string | null;
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
  featured: boolean;
  solved: boolean;
  createdAt: string;
  updatedAt: string;
  author?: ForumUser;
  posts?: Post[];
  postCount?: number;
  tags?: Tag[];
  poll?: Poll | null;
  bookmarked?: boolean;
}

export interface Post {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  editedAt: string | null;
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

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  usageCount: number;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  actor?: ForumUser | null;
}

export interface Bookmark {
  id: string;
  userId: string;
  threadId: string;
  createdAt: string;
  thread?: Thread;
}

export interface Subscription {
  id: string;
  userId: string;
  forumId: string | null;
  threadId: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reason: string;
  details: string | null;
  targetType: string;
  targetId: string;
  targetUserId: string | null;
  status: string;
  resolution: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  reporter?: ForumUser;
  targetUser?: ForumUser | null;
}

export interface Poll {
  id: string;
  threadId: string;
  question: string;
  allowMultiple: boolean;
  closesAt: string | null;
  createdAt: string;
  options: PollOption[];
  userVotedOptionIds?: string[];
}

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  voteCount?: number;
  createdAt: string;
}

export interface UserSetting {
  id: string;
  userId: string;
  key: string;
  value: string;
}

export type AppView =
  | "install"
  | "home"
  | "forum"
  | "thread"
  | "new-thread"
  | "search"
  | "members"
  | "bookmarks"
  | "notifications"
  | "profile"
  | "tags"
  | "activity"
  | "admin-dashboard"
  | "admin-users"
  | "admin-categories"
  | "admin-settings"
  | "admin-security"
  | "admin-reports"
  | "login"
  | "register";

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

/* Search results */
export interface SearchResult {
  threads: Thread[];
  posts: Post[];
  users: ForumUser[];
  tags: Tag[];
  total: number;
}
