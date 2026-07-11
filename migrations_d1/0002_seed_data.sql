-- PiForum D1 data sync (no transaction wrapper — D1 JS API handles atomicity)
-- Delete order: children first. Insert order: parents first. FK-safe.

-- ============================================================
-- DELETE (children first)
-- ============================================================
DELETE FROM "UserSetting";
DELETE FROM "ThreadTag";
DELETE FROM "Tag";
DELETE FROM "Subscription";
DELETE FROM "Setting";
DELETE FROM "SecurityLog";
DELETE FROM "Rule";
DELETE FROM "Report";
DELETE FROM "PostVote";
DELETE FROM "PollVote";
DELETE FROM "PollOption";
DELETE FROM "Poll";
DELETE FROM "PageRevision";
DELETE FROM "Page";
DELETE FROM "OtpChallenge";
DELETE FROM "Notification";
DELETE FROM "InstallConfig";
DELETE FROM "EmailVerification";
DELETE FROM "Bookmark";
DELETE FROM "Attachment";
DELETE FROM "Post";
DELETE FROM "Thread";
DELETE FROM "Forum";
DELETE FROM "Category";
DELETE FROM "User";
DELETE FROM "Rank";

-- ============================================================
-- INSERT (parents first)
-- ============================================================
-- User: 15 rows
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqfhze880001q4xgdyhvct5f', 'ebfff3b4-35a4-4207-bbdb-373ebe2fb30f', 'admin', 'admin@piforum.com', 'admin', NULL, NULL, NULL, NULL, NULL, 3, 0, NULL, 3, 0, 0, 0, NULL, NULL, NULL, 1, '37Z2NQYEHHCSZS2HBFVIYFCSAWIAHX25', 1, '["17d52031b42f5bf09ae7ed313bde206cdcf3a4c5b99de2f89d8f36817c33d2c1","828cee53fbddfa76410fdb847cf33c0dd35511b2773eef841164c69a17e64244","5c7ebe508447bca4e74681e56ce216e8e71caa0f4af8901329bd1aae559a3a32","71b38f2b6c39f5d5c3f0713adbf439001b6a1f13fa449898f3256bbd7c42b1ce","8fdda3505799faa99a2e2e85c7f5a1ffa07d80cc980450297baaf18837601af7","f8035e718acbd2c96caccd5adbc7143444dcb2b34bdc3935bf56e5c56d8790b4","193e40963060af9f1f3c278eedccc3bdb0e02a7c25e3422e1a16cce9633876c6","f7449ad31465b7beb0b46c7757fc0605d3c6a2337632cb9b5764d2d8d4e408a5"]', '+1234567890', 1, NULL, '2026-06-18 05:51:58', 1781545148361, 1781783994032);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqfii6mf0006q4sfggzppjlx', 'c37096b6-644a-45f9-a43b-fd5f3d9313d5', 'testuser', 'test@example.com', 'testuser', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, '2026-06-18 05:51:58', 1781546024968, 1781546024968);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8i40000pypqdlv0us83', '870b0c5d-cb58-4763-82e6-2562febed8c9', 'alex_writer', 'alex@piforum.dev', 'Alex Writer', NULL, 'Novelist and tea enthusiast. Writing my way through life.', '— Alex | Pen is mightier than the pi', 'London, UK', 'https://alexwrites.example', 0, 0, NULL, 3, 2, 70, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781293546622, 1781764330829, 1781764331066);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8i80002pypqg5uv66dh', 'e82f00a0-932f-4d18-a329-3e3c40a069a5', 'maria_dev', 'maria@piforum.dev', 'Maria Dev', NULL, 'Full-stack engineer. TypeScript believer. Coffee-powered.', 'console.log("Hello, world!")', 'Lisbon, PT', 'https://maria.dev', 0, 0, NULL, 5, 1, 48, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781277288406, 1781764330833, 1781764331067);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8ib0004pypqa23k2orr', '295ac2f3-f2a2-4394-ae5f-39461c4768d7', 'kenji_artist', 'kenji@piforum.dev', 'Kenji Sato', NULL, 'Illustrator & character designer. Loves ink and pixels.', 'Art is never finished, only abandoned.', 'Osaka, JP', 'https://kenjiart.example', 0, 0, NULL, 4, 1, 169, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781725747919, 1781764330835, 1781764331068);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8id0006pypqrt8aozp1', '2896d153-430b-467c-b347-552223f66f7e', 'sara_mod', 'sara@piforum.dev', 'Sara (Mod)', NULL, 'Community moderator. Here to keep things tidy.', 'Be excellent to each other.', 'Berlin, DE', NULL, 1, 0, NULL, 4, 2, 195, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781753790792, 1781764330837, 1781764331069);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8if0008pypq8wegxk7n', 'adabdea8-07a2-491b-8d2f-13754015f156', 'lucas_gamer', 'lucas@piforum.dev', 'Lucas_Gamer', NULL, 'Speedrunner. Indie dev. Pixel art appreciator.', 'GG WP', 'São Paulo, BR', 'https://lucasplays.example', 0, 0, NULL, 5, 2, 34, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781513198240, 1781764330840, 1781764331070);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8ih000apypq40umb63v', 'd60c2296-11ba-44db-a74b-db08a8769ce1', 'priya_reader', 'priya@piforum.dev', 'Priya Rao', NULL, 'Bookworm. Philosophy student. Cat person.', '"We are what we repeatedly read."', 'Bengaluru, IN', NULL, 0, 0, NULL, 6, 2, 118, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781592787757, 1781764330842, 1781764331071);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8ij000cpypq3sy5aqfx', 'e19d23fb-de82-4718-9926-0691ea6ad00c', 'tom_tinker', 'tom@piforum.dev', 'Tom Tinker', NULL, 'Hardware hacker. Raspberry Pi aficionado. Robot builder.', 'If it ain''t broke, take it apart anyway.', 'Austin, TX', 'https://tinkertom.example', 0, 0, NULL, 8, 1, 78, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781177791704, 1781764330844, 1781764331072);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8il000epypqho2s1hob', '4573f0d6-2960-438c-a236-37fdee3b48e7', 'amelia_chef', 'amelia@piforum.dev', 'Amelia Cooks', NULL, 'Pastry chef. Recipe collector. Sourdough obsessed.', 'Butter makes everything better.', 'Paris, FR', 'https://amecooks.example', 0, 0, NULL, 6, 1, 101, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781501112536, 1781764330846, 1781764331073);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8iq000gpypqs0n0q15o', 'e6f81a98-b6ce-441b-ae5c-68e723a595e2', 'noah_music', 'noah@piforum.dev', 'Noah Beats', NULL, 'Producer. Synth nerd. Lo-fi addict.', 'Music is the space between the notes.', 'Toronto, CA', 'https://noahbeats.example', 0, 0, NULL, 4, 1, 80, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781545219760, 1781764330851, 1781764331074);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj4h8it000ipypqk0id25f4', 'bae33c2a-fc32-408f-8f93-037785a68e9e', 'yuki_travel', 'yuki@piforum.dev', 'Yuki Travels', NULL, 'Globetrotter. Photographer. Mountain lover.', 'Collect moments, not things.', 'Kyoto, JP', 'https://yukitravels.example', 0, 0, NULL, 3, 1, 21, 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781473921855, 1781764330853, 1781764331075);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqj5p37d008ipypqrx4askm5', '655872e9-d641-47c0-9b7e-b68e6474f308', 'testuser123', 'testuser123@example.com', 'testuser123', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, 1, 1781778838127, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781766376826, 1781766376826, 1781778838128);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqjb63l50006pypd96bz7om6', '55c891ea-4b70-4db5-b75d-297a8db5237b', 'verifytest', 'verifytest@test.com', 'verifytest', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, 1, 1781775568702, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, 1781775568554, 1781775568554, 1781775568706);
INSERT INTO "User" ("id", "firebaseUid", "username", "email", "displayName", "avatarUrl", "bio", "signature", "location", "website", "role", "banned", "banReason", "postCount", "threadCount", "reputation", "isVerified", "verifiedAt", "verifyToken", "verifyExpires", "twoFactorEnabled", "totpSecret", "totpEnabled", "totpBackupCodes", "phoneNumber", "phoneVerified", "rankId", "lastSeenAt", "createdAt", "updatedAt") VALUES ('cmqkar5fu00006jqjnnv5i04c', '5e7c9f11-89d7-4db6-9df6-20486d3f2b4e', 'testuser1', 'test1@example.com', 'testuser1', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, 0, NULL, '3ebaebfa8ed51e90a92bae3c7f4e90eba111ca054f34893b05ba6a96296a5c33', '2026-06-20T02:15:37.283+00:00', 0, NULL, 0, NULL, NULL, 0, NULL, '2026-06-19T02:15:37.290+00:00', '2026-06-19T02:15:37.290+00:00', '2026-06-19T02:15:37.290+00:00');

-- Category: 8 rows
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqfhze8b000dq4xgak85ohsd', 'General', 'General discussion topics', '💬', 0, 0, 1781545148364, 1781545148364, NULL);
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqfhze8d000eq4xg5jlm6gzq', 'Technology', 'Tech news and discussions', '💻', 1, 0, 1781545148365, 1781545148365, NULL);
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqfhze8e000fq4xg81ahhm0c', 'Community', 'Community events and announcements', '🌟', 2, 0, 1781545148366, 1781545148366, NULL);
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqj4h8iv000kpypq06zk9bkm', 'General', 'General discussions, welcomes, and announcements', '💬', 0, 0, 1781764330855, 1781764330855, '#6366f1');
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqj4h8iw000lpypqmcj97cpx', 'Technology', 'Tech news, programming, hardware, and gadgets', '💻', 1, 0, 1781764330856, 1781764330856, '#10b981');
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqj4h8ix000mpypqkdv50b7g', 'Creative', 'Art, writing, music, design — share your craft', '🎨', 2, 0, 1781764330857, 1781764330857, '#ec4899');
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqj4h8iy000npypquk9aje64', 'Lifestyle', 'Travel, food, hobbies, and daily life', '🌍', 3, 0, 1781764330858, 1781764330858, '#f59e0b');
INSERT INTO "Category" ("id", "name", "description", "icon", "sortOrder", "accessLevel", "createdAt", "updatedAt", "color") VALUES ('cmqj4h8iz000opypqyekh51jh', 'Gaming', 'Video games, board games, tabletop — all things playable', '🎮', 4, 0, 1781764330859, 1781764330859, '#8b5cf6');

-- Forum: 22 rows
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8f000gq4xgw2z96ppw', 'cmqfhze8b000dq4xgak85ohsd', 'Welcome & Introductions', 'New here? Introduce yourself to the community!', '👋', 0, NULL, 0, 0, 1781545148367, 1781545148367);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8f000hq4xg3623utdn', 'cmqfhze8b000dq4xgak85ohsd', 'Off-Topic Discussion', 'Chat about anything not covered by other forums', '🎲', 1, NULL, 0, 0, 1781545148367, 1781545148367);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8f000iq4xg5fft6yn8', 'cmqfhze8d000eq4xg5jlm6gzq', 'Programming', 'Discuss programming languages, frameworks, and best practices', '⌨️', 0, 1781546024853, 2, 3, 1781545148368, 1781546024853);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8f000jq4xgulxbg230', 'cmqfhze8d000eq4xg5jlm6gzq', 'Hardware', 'Hardware reviews, recommendations, and troubleshooting', '🔧', 1, NULL, 0, 0, 1781545148368, 1781545148368);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8f000kq4xgp6byt351', 'cmqfhze8d000eq4xg5jlm6gzq', 'Software & Apps', 'Software recommendations and reviews', '📱', 2, NULL, 0, 0, 1781545148368, 1781545148368);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8g000lq4xgbzskhowx', 'cmqfhze8e000fq4xg81ahhm0c', 'Announcements', 'Official announcements and updates', '📢', 0, 1781769896125, 1, 1, 1781545148369, 1781769896126);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqfhze8g000mq4xg91j0ao63', 'cmqfhze8e000fq4xg81ahhm0c', 'Feedback & Suggestions', 'Share your ideas to improve the forum', '💡', 1, NULL, 0, 0, 1781545148369, 1781545148369);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j0000qpypq6vnmchsy', 'cmqj4h8iv000kpypq06zk9bkm', 'Announcements', 'Official news from the PiForum team', '📢', 0, 1781764330913, 2, 9, 1781764330860, 1781764330914);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j1000spypq0g3j5ykm', 'cmqj4h8iv000kpypq06zk9bkm', 'Introductions', 'New here? Say hello!', '👋', 1, 1781764330925, 1, 5, 1781764330861, 1781764330926);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j3000upypqyg2vu0ym', 'cmqj4h8iv000kpypq06zk9bkm', 'Feedback & Suggestions', 'Help us improve the forum', '💡', 2, NULL, 0, 0, 1781764330863, 1781764330863);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j5000wpypqw3bkzxu6', 'cmqj4h8iw000lpypqmcj97cpx', 'Programming', 'Code, languages, frameworks, and best practices', '⌨️', 3, 1781764330938, 1, 4, 1781764330865, 1781764330939);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j6000ypypqe9svrwki', 'cmqj4h8iw000lpypqmcj97cpx', 'Hardware', 'PCs, single-board computers, peripherals', '🔌', 4, 1781764330950, 1, 2, 1781764330866, 1781764330951);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j70010pypqiynnbdwb', 'cmqj4h8iw000lpypqmcj97cpx', 'Web Development', 'Frontend, backend, full-stack discussions', '🌐', 5, 1781764330960, 1, 2, 1781764330867, 1781764330960);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j80012pypqve9d2edr', 'cmqj4h8ix000mpypqkdv50b7g', 'Writing', 'Stories, poetry, novels, and prose', '✍️', 6, 1781764330972, 1, 2, 1781764330868, 1781764330973);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8j90014pypq0yh7c4ig', 'cmqj4h8ix000mpypqkdv50b7g', 'Visual Art', 'Drawing, painting, illustration, design', '🖼️', 7, 1781764330987, 1, 4, 1781764330869, 1781764330988);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8ja0016pypqzf9oif7n', 'cmqj4h8ix000mpypqkdv50b7g', 'Music Production', 'Compose, produce, mix, and master', '🎵', 8, 1781764331003, 1, 5, 1781764330870, 1781764331004);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8jb0018pypqjcn6olov', 'cmqj4h8iy000npypquk9aje64', 'Travel', 'Destinations, itineraries, and stories', '✈️', 9, 1781764331011, 1, 2, 1781764330871, 1781764331012);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8jc001apypqa36hvh6k', 'cmqj4h8iy000npypquk9aje64', 'Food & Cooking', 'Recipes, restaurants, kitchen tips', '🍳', 10, 1781764331022, 1, 2, 1781764330872, 1781764331023);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8jd001cpypqfz6loxbn', 'cmqj4h8iy000npypquk9aje64', 'Hobbies & Crafts', 'Knitting, woodworking, gardening, and more', '🧶', 11, NULL, 0, 0, 1781764330873, 1781764330873);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8jd001epypqx5mal6lh', 'cmqj4h8iz000opypqyekh51jh', 'PC Gaming', 'RPGs, FPS, indies, and AAA on PC', '🖥️', 12, 1781764331036, 1, 5, 1781764330874, 1781764331037);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8je001gpypq2y2s3zze', 'cmqj4h8iz000opypqyekh51jh', 'Consoles', 'PlayStation, Xbox, Nintendo, and beyond', '🎮', 13, 1781764331045, 1, 3, 1781764330875, 1781764331049);
INSERT INTO "Forum" ("id", "categoryId", "name", "description", "icon", "sortOrder", "lastPostAt", "threadCount", "postCount", "createdAt", "updatedAt") VALUES ('cmqj4h8jf001ipypqow8m6sjz', 'cmqj4h8iz000opypqyekh51jh', 'Tabletop & Board Games', 'D&D, board games, card games', '🎲', 14, 1781764331060, 1, 3, 1781764330875, 1781764331061);

-- Thread: 17 rows
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqficse90001q4xk1or0v6se', 'cmqfhze8f000iq4xg5fft6yn8', 'cmqfhze880001q4xgdyhvct5f', 'Hello World', 'My first post!', 0, 0, 0, 0, 0, 1781545773249, 1781545773249);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqfii6hc0001q4sfz6iv93nd', 'cmqfhze8f000iq4xg5fft6yn8', 'cmqfhze880001q4xgdyhvct5f', 'Test Thread via API', 'This is a test thread with **bold** and *italic* and `code`.', 1, 0, 0, 0, 0, 1781546024784, 1781546506324);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8j0000qpypq6vnmchsy', 'cmqj4h8i40000pypqdlv0us83', 'Welcome to PiForum — Read This First!', '# Welcome to PiForum! 👋

We are thrilled to have you here. PiForum is a community-driven space built with a passion for great design and great conversations.

## Getting Started

1. **Introduce yourself** in the Introductions forum
2. **Read the rules** in the Announcements
3. **Pick a topic** that interests you and join a discussion

## House Rules

- Be kind and respectful
- No spam or self-promotion in unrelated threads
- Use descriptive thread titles
- Tag your posts appropriately

Have fun, and welcome aboard! 🚀', 99, 1, 0, 1, 0, 1780633802627, 1781764330892);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8j0000qpypq6vnmchsy', 'cmqj4h8i80002pypqg5uv66dh', 'PiForum 2.0 is here — what''s new', 'We just shipped a major update!

## Highlights

- **3 themes**: Day, Night, and the new Golden neumorphism
- **Tags & bookmarks** for organising content
- **Notifications** so you never miss a reply
- **Search** across threads, posts, and members

Let us know what you think below 👇', 246, 1, 0, 1, 0, 1781277114823, '2026-06-19T05:22:03.507+00:00');
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8j1000spypq0g3j5ykm', 'cmqj4h8ib0004pypqa23k2orr', 'New here from Osaka — call me Kenji!', 'Hey everyone! I''m Kenji, an illustrator from Osaka. I stumbled on this forum last week and the design is *gorgeous* — that golden theme is a chef''s kiss. 🤌

I draw characters, mostly indie-game style. Looking forward to sharing WIPs and getting feedback!', 253, 0, 0, 0, 0, 1779444665041, 1781764330916);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8j5000wpypqw3bkzxu6', 'cmqj4h8id0006pypqrt8aozp1', 'Why I switched from VS Code to Zed (and back)', 'I tried Zed for two weeks. The speed is unreal — instant file opens, buttery scrolling. But the extension ecosystem just isn''t there yet for my workflow.

## TL;DR

- **Pros**: Speed, multi-buffer editing, collaboration built-in
- **Cons**: Fewer extensions, no proper remote dev yet

Anyone else made the jump?', 248, 0, 0, 0, 0, 1780160757861, 1781764330928);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8l9003lpypq6tdgreis', 'cmqj4h8j6000ypypqe9svrwki', 'cmqj4h8if0008pypq8wegxk7n', 'Best single-board computer for a home lab in 2025?', 'I want to set up a small home lab — Pi-hole, Jellyfin, maybe Home Assistant.

Options I''m considering:
- Raspberry Pi 5 (8GB)
- Orange Pi 5 Plus
- Intel N100 mini PC

Budget is around $150. What would you pick?', 26, 0, 0, 0, 0, 1780240602595, 1781764330942);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8ll003xpypq2qmfnjpv', 'cmqj4h8j70010pypqiynnbdwb', 'cmqj4h8ih000apypq40umb63v', 'Next.js 16 App Router — lessons learned after 6 months', 'I''ve been building a SaaS on Next.js 16 for half a year. Here are the lessons I wish I knew on day one.

## 1. Server Components by default
Most of your components should be server components. Only add `"use client"` when you actually need interactivity.

## 2. Route handlers > API routes
The new `route.ts` convention is cleaner. Use them.

## 3. Cache aggressively
`unstable_cache` and `revalidatePath` are your friends.

Full write-up in the comments.', 255, 0, 0, 0, 0, 1781067307052, 1781764330953);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8lu0049pypqtnxqzarv', 'cmqj4h8j80012pypqve9d2edr', 'cmqj4h8ij000cpypq3sy5aqfx', 'Chapter 1 of my novel — feedback welcome', 'Working on a sci-fi novel. Here''s chapter 1, about 2000 words. Looking for feedback on pacing and character voice.

> The morning the sky broke, Lina was already awake.
>
> She had been awake since 4 a.m., unable to shake the feeling that something was wrong...

(Full text in attached file — let me know if you can''t open it.)', 135, 0, 0, 0, 0, 1780603437919, 1781765348997);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8j90014pypq0yh7c4ig', 'cmqj4h8il000epypqho2s1hob', '30-day ink drawing challenge — Day 1', 'Starting a 30-day ink drawing challenge today. I''ll post one drawing every day.

Day 1: a koi fish. Used a brush pen on Bristol board. Took about 45 minutes.

Critique welcome — I want to get better at negative space.', 102, 0, 0, 0, 0, 1779949306594, 1781764330975);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8ja0016pypqzf9oif7n', 'cmqj4h8iq000gpypqs0n0q15o', 'My lo-fi hip-hop workflow in FL Studio', 'Sharing my workflow for making lo-fi beats. Hope it helps someone starting out.

1. **Sample selection**: I dig through old jazz records on YouTube
2. **Chopping**: 4-bar loops, pitched down -3 semitones
3. **Drums**: Vinyl crackle layer + boom-bap pattern at 75 BPM
4. **Mix**: Sidechain everything to the kick

Project file linked below.', 278, 0, 0, 0, 0, 1781125084991, 1781764330991);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8n2005hpypq6w61x188', 'cmqj4h8jb0018pypqjcn6olov', 'cmqj4h8it000ipypqk0id25f4', 'Kyoto in autumn — a photo essay', 'Just got back from two weeks in Kyoto during peak momiji (red maple) season. Sharing my favourite shots and the spots where I took them.

## Top 3 temples for autumn colours

1. **Kiyomizu-dera** — go at sunrise to beat the crowds
2. **Eikan-do** — the tunnel of maples is unreal
3. **Tofuku-ji** — the view from Tsuten-kyo bridge

Photos in the thread.', 199, 0, 0, 0, 0, 1780497174323, 1781764331006);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8nc005rpypq5e86wmhw', 'cmqj4h8jc001apypqa36hvh6k', 'cmqj4h8i40000pypqdlv0us83', 'My foolproof sourdough recipe (after 50 failed loaves)', 'After 50 sad, flat loaves, I finally cracked it. Sharing the recipe that works for me every time.

## Ingredients
- 500g bread flour
- 350g water (70% hydration)
- 100g active starter
- 10g salt

## Method
1. Autolyse 1 hour
2. Mix starter + salt, 4 sets of stretch & folds 30 min apart
3. Bulk ferment 4-6 hours at 24°C
4. Shape, cold proof overnight
5. Bake 250°C covered 20 min, then 230°C uncovered 25 min

Tag me if you try it!', 62, 0, 0, 0, 0, 1781088227859, 1781764638305);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8jd001epypqx5mal6lh', 'cmqj4h8if0008pypq8wegxk7n', 'Hollow Knight Silksong — any news?', 'It''s been *years*. Has anyone heard anything credible about Silksong lately? I''m trying not to get my hopes up but here we are.

Drop any leaks, interviews, or speculation below.', 364, 0, 0, 0, 0, 1780673598369, 1781764331025);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8nz006hpypq5t6g44dp', 'cmqj4h8je001gpypq2y2s3zze', 'cmqj4h8id0006pypqrt8aozp1', 'PS5 Pro — worth it for 4K gaming?', 'Considering the PS5 Pro but the price is steep. Anyone here upgraded? Is the upscaling actually noticeable on a 4K TV?

Mainly playing RPGs and the occasional racing game.', 382, 0, 0, 0, 0, 1781355153171, 1781764331039);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8jf001ipypqow8m6sjz', 'cmqj4h8ih000apypq40umb63v', 'First time DM-ing D&D — send help', 'I''m DM-ing my first campaign next month (Curse of Strahd). I''ve read the module twice but I''m terrified of improvising when players go off-script.

Any tips from veteran DMs? Especially on:
- Voice acting (I''m bad at voices)
- Pacing
- Handling rules lawyers', 106, 0, 0, 0, 0, 1781248586755, 1781765375617);
INSERT INTO "Thread" ("id", "forumId", "authorId", "title", "content", "views", "pinned", "locked", "featured", "solved", "createdAt", "updatedAt") VALUES ('cmqj7sipm008lpypq9mlmyga4', 'cmqfhze8g000lq4xgbzskhowx', 'cmqfhze880001q4xgdyhvct5f', 'Test Thread from Admin', 'This is a test thread created to verify the post creation bug is fixed.', 3, 0, 0, 0, 0, 1781769896123, '2026-06-19T05:22:37.574+00:00');

-- Post: 52 rows
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqficsea0003q4xkn8lh20i9', 'cmqficse90001q4xk1or0v6se', 'cmqfhze880001q4xgdyhvct5f', 'My first post!', 1781545773250, 1781545773250, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqfii6hd0003q4sfiyxu1xcb', 'cmqfii6hc0001q4sfz6iv93nd', 'cmqfhze880001q4xgdyhvct5f', 'This is a test thread with **bold** and *italic* and `code`.', 1781546024786, 1781546024786, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqfii6j80005q4sfb8baldx8', 'cmqfii6hc0001q4sfz6iv93nd', 'cmqfhze880001q4xgdyhvct5f', 'This is a reply with a > quote block and a list.', 1781546024852, 1781546024852, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8k00025pypqejflxbyq', 'cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8i80002pypqg5uv66dh', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781417590594, 1781764330897, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8k10027pypq6sc3s03d', 'cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8ib0004pypqa23k2orr', 'I had a similar experience. The part about pacing really resonated with me.', 1781502106783, 1781764330898, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8k20029pypqpc3nrgw1', 'cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8id0006pypqrt8aozp1', 'Have you tried the alternative approach? Curious what you think.', 1781169688176, 1781764330899, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8k4002bpypqd9bjdymx', 'cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8if0008pypq8wegxk7n', 'Bookmarking this for later. Super helpful breakdown.', 1781198980679, 1781764330900, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kc002jpypqxyw8acjy', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8ib0004pypqa23k2orr', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781252707970, 1781764330909, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kd002lpypqcblz7saw', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8id0006pypqrt8aozp1', 'I had a similar experience. The part about pacing really resonated with me.', 1781173767557, 1781764330910, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8ke002npypq6ufgqdz5', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8if0008pypq8wegxk7n', 'Have you tried the alternative approach? Curious what you think.', 1781717916726, 1781764330911, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kf002ppypqtls8tldc', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8ih000apypq40umb63v', 'Bookmarking this for later. Super helpful breakdown.', 1781627158557, 1781764330912, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kg002rpypqndq80ka9', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8ij000cpypq3sy5aqfx', 'I disagree slightly — I think context matters here. But solid write-up overall.', 1781630752902, 1781764330913, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kn002xpypqrhj9brxg', 'cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8id0006pypqrt8aozp1', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781242632700, 1781764330919, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kp002zpypqz4bipznh', 'cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8if0008pypq8wegxk7n', 'I had a similar experience. The part about pacing really resonated with me.', 1781254193800, 1781764330921, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kq0031pypql2fnqxom', 'cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8ih000apypq40umb63v', 'Have you tried the alternative approach? Curious what you think.', 1781373291774, 1781764330923, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8kr0033pypqsqwwps6b', 'cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8ij000cpypq3sy5aqfx', 'Bookmarking this for later. Super helpful breakdown.', 1781300577414, 1781764330924, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8ks0035pypq0hqenhfe', 'cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8il000epypqho2s1hob', 'I disagree slightly — I think context matters here. But solid write-up overall.', 1781670698313, 1781764330925, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8l3003dpypql8db9k37', 'cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8if0008pypq8wegxk7n', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781750919290, 1781764330935, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8l4003fpypq1a9zjzv9', 'cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8ih000apypq40umb63v', 'I had a similar experience. The part about pacing really resonated with me.', 1781320248558, 1781764330936, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8l5003hpypqbans3fsl', 'cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8ij000cpypq3sy5aqfx', 'Have you tried the alternative approach? Curious what you think.', 1781729124532, 1781764330937, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8l6003jpypqqsvyva5c', 'cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8il000epypqho2s1hob', 'Bookmarking this for later. Super helpful breakdown.', 1781631519652, 1781764330938, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8lg003tpypqx2flv71p', 'cmqj4h8l9003lpypq6tdgreis', 'cmqj4h8ih000apypq40umb63v', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781609866523, 1781764330949, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8lh003vpypqoadupqnp', 'cmqj4h8l9003lpypq6tdgreis', 'cmqj4h8ij000cpypq3sy5aqfx', 'I had a similar experience. The part about pacing really resonated with me.', 1781491512369, 1781764330950, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8lq0045pypq24dlg107', 'cmqj4h8ll003xpypq2qmfnjpv', 'cmqj4h8ij000cpypq3sy5aqfx', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781513000337, 1781764330959, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8lr0047pypqjkit1iwm', 'cmqj4h8ll003xpypq2qmfnjpv', 'cmqj4h8il000epypqho2s1hob', 'I had a similar experience. The part about pacing really resonated with me.', 1781530490818, 1781764330960, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8m3004hpypqh34my3nn', 'cmqj4h8lu0049pypqtnxqzarv', 'cmqj4h8il000epypqho2s1hob', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781717932060, 1781764330971, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8m4004jpypqc92yi94y', 'cmqj4h8lu0049pypqtnxqzarv', 'cmqj4h8iq000gpypqs0n0q15o', 'I had a similar experience. The part about pacing really resonated with me.', 1781281902826, 1781764330972, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mg004tpypqz86uien3', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8iq000gpypqs0n0q15o', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781247263034, 1781764330984, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mh004vpypqlqxhvgy8', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8it000ipypqk0id25f4', 'I had a similar experience. The part about pacing really resonated with me.', 1781498093640, 1781764330985, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mi004xpypqntu5okg2', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8i40000pypqdlv0us83', 'Have you tried the alternative approach? Curious what you think.', 1781333968236, 1781764330986, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mj004zpypqvvbhf8sv', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8i80002pypqg5uv66dh', 'Bookmarking this for later. Super helpful breakdown.', 1781346100970, 1781764330987, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mu0057pypqkajysw72', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8it000ipypqk0id25f4', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781715102646, 1781764330999, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mv0059pypq047rrs3v', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8i40000pypqdlv0us83', 'I had a similar experience. The part about pacing really resonated with me.', 1781184640414, 1781764331000, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mw005bpypq62zcszpc', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8i80002pypqg5uv66dh', 'Have you tried the alternative approach? Curious what you think.', 1781275634892, 1781764331001, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8mx005dpypqpyl8xudj', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8ib0004pypqa23k2orr', 'Bookmarking this for later. Super helpful breakdown.', 1781683313910, 1781764331002, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8my005fpypq1eikj3a4', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8id0006pypqrt8aozp1', 'I disagree slightly — I think context matters here. But solid write-up overall.', 1781722393312, 1781764331003, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8n6005npypqezjtgf78', 'cmqj4h8n2005hpypq6w61x188', 'cmqj4h8i40000pypqdlv0us83', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781593264891, 1781764331010, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8n7005ppypqrdvso34x', 'cmqj4h8n2005hpypq6w61x188', 'cmqj4h8i80002pypqg5uv66dh', 'I had a similar experience. The part about pacing really resonated with me.', 1781236620209, 1781764331011, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8nh005xpypq87n046oo', 'cmqj4h8nc005rpypq5e86wmhw', 'cmqj4h8i80002pypqg5uv66dh', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781665113426, 1781764331022, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8ni005zpypqwi9gsa0c', 'cmqj4h8nc005rpypq5e86wmhw', 'cmqj4h8ib0004pypqa23k2orr', 'I had a similar experience. The part about pacing really resonated with me.', 1781639512809, 1781764331022, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8ns0067pypqgmghem86', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8ih000apypq40umb63v', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781326287496, 1781764331032, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8nt0069pypq9z7azhk1', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8ij000cpypq3sy5aqfx', 'I had a similar experience. The part about pacing really resonated with me.', 1781341367047, 1781764331033, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8nu006bpypqrtys59is', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8il000epypqho2s1hob', 'Have you tried the alternative approach? Curious what you think.', 1781247859189, 1781764331034, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8nv006dpypq9davrmfu', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8iq000gpypqs0n0q15o', 'Bookmarking this for later. Super helpful breakdown.', 1781607091608, 1781764331035, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8nw006fpypqe5xkv1pi', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8it000ipypqk0id25f4', 'I disagree slightly — I think context matters here. But solid write-up overall.', 1781422529813, 1781764331036, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8o3006npypqodai0cz2', 'cmqj4h8nz006hpypq5t6g44dp', 'cmqj4h8if0008pypq8wegxk7n', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781689707875, 1781764331043, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8o4006ppypq9w80wo16', 'cmqj4h8nz006hpypq5t6g44dp', 'cmqj4h8ih000apypq40umb63v', 'I had a similar experience. The part about pacing really resonated with me.', 1781506224525, 1781764331044, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8o5006rpypq155ofzgc', 'cmqj4h8nz006hpypq5t6g44dp', 'cmqj4h8ij000cpypq3sy5aqfx', 'Have you tried the alternative approach? Curious what you think.', 1781272667337, 1781764331045, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8oi0071pypq5y48lwdz', 'cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8ij000cpypq3sy5aqfx', 'Great post! Really enjoyed reading this. Thanks for sharing.', 1781508853222, 1781764331058, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8oj0073pypq0ai4udz8', 'cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8il000epypqho2s1hob', 'I had a similar experience. The part about pacing really resonated with me.', 1781335290978, 1781764331059, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj4h8ok0075pypqphgl4yqv', 'cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8iq000gpypqs0n0q15o', 'Have you tried the alternative approach? Curious what you think.', 1781667536552, 1781764331060, NULL);
INSERT INTO "Post" ("id", "threadId", "authorId", "content", "createdAt", "updatedAt", "editedAt") VALUES ('cmqj7sipo008npypqradimrnw', 'cmqj7sipm008lpypq9mlmyga4', 'cmqfhze880001q4xgdyhvct5f', 'This is a test thread created to verify the post creation bug is fixed.', 1781769896124, 1781769896124, NULL);

-- Bookmark: 1 rows
INSERT INTO "Bookmark" ("id", "userId", "threadId", "createdAt") VALUES ('cmqj4yx1r008hpypq8c995eno', 'cmqfhze880001q4xgdyhvct5f', 'cmqj4h8k8002dpypq7c2hfd0o', 1781765155791);

-- EmailVerification: 2 rows
INSERT INTO "EmailVerification" ("id", "userId", "token", "email", "expiresAt", "consumedAt", "createdAt") VALUES ('cmqjb63l80008pypdjgqha8ke', 'cmqjb63l50006pypd96bz7om6', '39b80081976256998b917a497dd97116385374377425b2960c3d92828b6969ca', 'verifytest@test.com', 1781861968553, 1781775568699, 1781775568557);
INSERT INTO "EmailVerification" ("id", "userId", "token", "email", "expiresAt", "consumedAt", "createdAt") VALUES ('cmqkar5g200026jqjuuzfp24v', 'cmqkar5fu00006jqjnnv5i04c', '3ebaebfa8ed51e90a92bae3c7f4e90eba111ca054f34893b05ba6a96296a5c33', 'test1@example.com', '2026-06-20T02:15:37.283+00:00', NULL, '2026-06-19T02:15:37.298+00:00');

-- InstallConfig: 1 rows
INSERT INTO "InstallConfig" ("id", "installed", "cloudflareAccountId", "cloudflareD1Id", "cloudflareApiToken", "cloudflareR2Bucket", "cloudflareR2AccessKey", "cloudflareR2SecretKey", "firebaseApiKey", "firebaseAuthDomain", "firebaseProjectId", "firebaseStorageBucket", "firebaseMessagingSenderId", "firebaseAppId", "adminFirebaseUid", "forumName", "forumDescription", "dbType", "mysqlHost", "mysqlPort", "mysqlDatabase", "mysqlUsername", "mysqlPassword", "logoUrl") VALUES ('cmqfhze870000q4xg0s6og74e', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ebfff3b4-35a4-4207-bbdb-373ebe2fb30f', 'PiForum', 'A modern neumorphic forum', 'sqlite', NULL, NULL, NULL, NULL, NULL, NULL);

-- Notification: 3 rows
INSERT INTO "Notification" ("id", "userId", "actorId", "type", "title", "body", "link", "read", "createdAt") VALUES ('cmqj4h8p00077pypqy1cn8q0b', 'cmqfhze880001q4xgdyhvct5f', NULL, 'system', 'Welcome to PiForum!', 'Your forum is ready. Check out the admin dashboard to configure settings.', '/?view=admin-dashboard', 0, 1781764331076);
INSERT INTO "Notification" ("id", "userId", "actorId", "type", "title", "body", "link", "read", "createdAt") VALUES ('cmqj4h8p10079pypqvhudv3r2', 'cmqfhze880001q4xgdyhvct5f', NULL, 'system', 'Dummy data seeded', 'We''ve added sample users, threads, and posts to get you started.', '/', 0, 1781764331077);
INSERT INTO "Notification" ("id", "userId", "actorId", "type", "title", "body", "link", "read", "createdAt") VALUES ('cmqj4h8p3007bpypqk8q3g3dx', 'cmqfhze880001q4xgdyhvct5f', NULL, 'mention', 'New member joined', 'Kenji Sato just introduced themselves in the Introductions forum.', '/?view=forum', 0, 1781764331080);

-- OtpChallenge: 2 rows
INSERT INTO "OtpChallenge" ("id", "userId", "channel", "target", "codeHash", "expiresAt", "consumedAt", "attempts", "createdAt") VALUES ('cmqjg64t0000epydusbv5kimo', 'cmqfhze880001q4xgdyhvct5f', 'email', 'admin@piforum.com', '4187a0b23cd03b86ab6c7b4469e7b36c0a31531236793695d12d70a19ade8868', 1781784568211, NULL, 0, 1781783968212);
INSERT INTO "OtpChallenge" ("id", "userId", "channel", "target", "codeHash", "expiresAt", "consumedAt", "attempts", "createdAt") VALUES ('cmqjg6jh3000npydu4ocxmq1h', 'cmqfhze880001q4xgdyhvct5f', 'whatsapp', '+1234567890', '5a454ce80d096221831bf1166e888438a3ee90e4cb00e1bf6cc816afcd7f2083', 1781784587222, 1781783994029, 0, 1781783987223);

-- Page: 1 rows
INSERT INTO "Page" ("id", "slug", "title", "content", "excerpt", "status", "showInFooter", "showInHeader", "sortOrder", "authorId", "publishedAt", "createdAt", "updatedAt") VALUES ('cmqjb4ij80000pypd40lec4c8', 'about', 'About Us', '# About
Welcome to PiForum.', NULL, 'published', 1, 0, 0, 'cmqfhze880001q4xgdyhvct5f', 1781775494606, 1781775494613, 1781775494613);

-- SecurityLog: 15 rows
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjb4ija0002pypdchyvc6nr', 'cmqfhze880001q4xgdyhvct5f', 'PAGE_CREATED', 'Created page "About Us" (about)', NULL, 1781775494615);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjb5ai30005pypddg63dtof', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: require_email_verification', NULL, 1781775530859);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjb63ph000apypd87bucm96', 'cmqjb63l50006pypd96bz7om6', 'EMAIL_VERIFIED', 'User verified their email address', NULL, 1781775568710);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjcn5ee000npyintkzg68kp', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: require_email_verification, verification_expiry_hours, verification_email_subject, verification_email_body, admin_auto_verify_staff, verification_resend_cooldown_minutes, verification_max_resends, enable_phone_verification, phone_otp_length, phone_otp_expiry_minutes, phone_otp_provider, enable_id_verification, id_allowed_types, id_review_mode, verified_badge_enabled, verified_badge_text, verified_badge_color, require_verified_to_post, require_verified_to_thread, require_verified_to_vote, require_verified_to_message, require_verified_to_link', NULL, 1781778043670);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjd0ik8001bpyinm3bia87q', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: require_email_verification, verification_expiry_hours, verification_email_subject, verification_email_body, admin_auto_verify_staff, verification_resend_cooldown_minutes, verification_max_resends, enable_phone_verification, phone_otp_length, phone_otp_expiry_minutes, phone_otp_provider, enable_id_verification, id_allowed_types, id_review_mode, verified_badge_enabled, verified_badge_text, verified_badge_color, require_verified_to_post, require_verified_to_thread, require_verified_to_vote, require_verified_to_message, require_verified_to_link', NULL, 1781778667257);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjd39hz001zpyinmfxdncoe', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: require_email_verification, verification_expiry_hours, verification_email_subject, verification_email_body, admin_auto_verify_staff, verification_resend_cooldown_minutes, verification_max_resends, enable_phone_verification, phone_otp_length, phone_otp_expiry_minutes, phone_otp_provider, enable_id_verification, id_allowed_types, id_review_mode, verified_badge_enabled, verified_badge_text, verified_badge_color, require_verified_to_post, require_verified_to_thread, require_verified_to_vote, require_verified_to_message, require_verified_to_link', NULL, 1781778795480);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjd46er0021pyinlfo63htz', 'cmqfhze880001q4xgdyhvct5f', 'VERIFICATION_GRANTED', 'Admin manually verified testuser123', NULL, 1781778838132);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjfq48u0027pyin85m422l4', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: enable_totp, totp_issuer, totp_period, totp_digits', NULL, 1781783220990);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg5rq20005pyduhfu1vqbt', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: enable_totp, totp_issuer, totp_period, totp_digits', NULL, 1781783951258);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg5yr80007pydu3sicguoj', 'cmqfhze880001q4xgdyhvct5f', 'TOTP_ENABLED', 'User enabled TOTP (authenticator app) verification', NULL, 1781783960372);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg64ox000cpyduubzbua34', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: enable_email_otp, email_otp_subject, email_from_address', NULL, 1781783968066);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg64t1000gpyduf8qfuu38', 'cmqfhze880001q4xgdyhvct5f', 'OTP_SENT', 'email OTP sent to admin@piforum.com (delivered=true)', NULL, 1781783968214);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg6jgh000lpydu56dncjun', 'cmqfhze880001q4xgdyhvct5f', 'SETTINGS_UPDATED', 'Updated settings: enable_whatsapp_otp, whatsapp_phone_number_id, whatsapp_access_token', NULL, 1781783987201);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg6jh4000ppydufaxiblan', 'cmqfhze880001q4xgdyhvct5f', 'OTP_SENT', 'whatsapp OTP sent to +1234567890 (delivered=false)', NULL, 1781783987224);
INSERT INTO "SecurityLog" ("id", "userId", "eventType", "details", "ipAddress", "createdAt") VALUES ('cmqjg6oq9000rpydujv8lc06w', 'cmqfhze880001q4xgdyhvct5f', 'OTP_VERIFIED', 'whatsapp OTP verified successfully', NULL, 1781783994033);

-- Setting: 88 rows
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8a0002q4xg9hb662et', 'password_cmqfhze880001q4xgdyhvct5f', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0003q4xgopdjg8dh', 'forum_name', 'PiForum');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0004q4xgs535ckr5', 'forum_description', 'A modern neumorphic forum');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0005q4xgkrpj7202', 'maintenance_mode', 'false');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0006q4xg5rd9aiej', 'open_registration', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0007q4xg5dcukdky', 'logo_url', '/logo.svg');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0008q4xgdbkzbz04', 'favicon_url', '/favicon.ico');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b0009q4xg9ba567fs', 'posts_per_page', '20');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b000aq4xg88hbqh7z', 'threads_per_page', '25');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b000bq4xgunfc3l76', 'max_upload_size', '5242880');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfhze8b000cq4xghmfpuc59', 'allowed_file_types', 'image/jpeg,image/png,image/gif,image/webp');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqfii6mh0007q4sfjsdf9qi5', 'password_cmqfii6mf0006q4sfggzppjlx', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8i70001pypqrgvwr3vw', 'password_cmqj4h8i40000pypqdlv0us83', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ia0003pypq51snz8gw', 'password_cmqj4h8i80002pypqg5uv66dh', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ic0005pypqih5ogprx', 'password_cmqj4h8ib0004pypqa23k2orr', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ie0007pypq8rr7raub', 'password_cmqj4h8id0006pypqrt8aozp1', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ig0009pypqnhswvn6m', 'password_cmqj4h8if0008pypq8wegxk7n', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ii000bpypq0c4shs9m', 'password_cmqj4h8ih000apypq40umb63v', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ik000dpypqfccev891', 'password_cmqj4h8ij000cpypq3sy5aqfx', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ip000fpypqekyllb7a', 'password_cmqj4h8il000epypqho2s1hob', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ir000hpypqh6s6hp0o', 'password_cmqj4h8iq000gpypqs0n0q15o', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8iu000jpypqbusd42g1', 'password_cmqj4h8it000ipypqk0id25f4', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8p8007epypq16e2liw7', 'forum_tagline', 'Where conversations find their form.');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pb007hpypqos3440wh', 'maintenance_message', 'We''ll be right back. PiForum is undergoing scheduled maintenance.');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pf007mpypqj8yj0wx4', 'min_username_length', '3');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pg007npypqcvblvj0u', 'max_username_length', '30');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8ph007opypqc0a76q6p', 'min_password_length', '6');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pi007ppypqpv3cqpeo', 'allow_guest_viewing', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pj007qpypqxkqdv5v3', 'allow_thread_voting', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pm007rpypql547pj76', 'allow_post_voting', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8pw007spypq1octcirp', 'allow_bookmarks', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8q4007tpypqbftbymld', 'allow_tags', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8q6007upypqooiny04k', 'allow_polls', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8q8007vpypqo3hz0ib4', 'allow_signatures', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8q9007wpypq1cc0bojs', 'allow_avatars', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qa007xpypqf9nhfpje', 'require_email_verification', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qc007ypypqir5h25rh', 'seo_keywords', 'forum, community, discussion, neumorphism, piforum');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qd007zpypq5lsy3rad', 'seo_meta_description', 'PiForum — a modern neumorphic forum CMS. Join the conversation today.');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qe0080pypqd8nd5zqb', 'analytics_enabled', 'false');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qf0081pypqtdeo2wsq', 'analytics_id', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qg0082pypqvtlq0x00', 'smtp_enabled', 'false');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qi0083pypq2x0xi4x1', 'smtp_host', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qq0084pypqenn21xdk', 'smtp_port', '587');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qs0085pypquyjim4b7', 'smtp_username', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qt0086pypqmxipb2kn', 'smtp_from_email', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qu0087pypq4tx6550c', 'smtp_from_name', 'PiForum');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qv0088pypqbg34cwb9', 'footer_text', 'Powered by PiForum');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qw0089pypqjk84kt2h', 'show_online_users', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qx008apypq9e9p6omg', 'show_statistics', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qy008bpypqpkbubvey', 'show_birthdays', 'false');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8qz008cpypqbe7hvcz2', 'rate_limit_posts', '30');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8r0008dpypq32vkzqt6', 'rate_limit_threads', '10');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8r2008epypq93yaqfkf', 'word_censorship', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj4h8r3008fpypqqhruu5d2', 'banned_words', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqj5p37f008jpypql9a3zovr', 'password_cmqj5p37d008ipypqrx4askm5', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjb63l70007pypdlobey5z4', 'password_cmqjb63l50006pypd96bz7om6', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5dz0001pyindt3xbr4f', 'verification_expiry_hours', '24');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5dz0002pyinj0issnq4', 'verification_email_subject', 'Verify your email');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5dz0003pyin4zthe18p', 'verification_resend_cooldown_minutes', '5');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e00005pyinchot3z66', 'verification_email_body', 'Click the link below to verify your email: {{verify_link}}');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e00007pyinzgojr4le', 'enable_id_verification', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e00008pyinrvjurok7', 'verified_badge_enabled', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e10009pyinspj67yns', 'verified_badge_text', 'Verified');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e00004pyina6ipuj5q', 'verification_max_resends', '5');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e3000cpyinh24qmk7i', 'verified_badge_color', 'primary');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e1000bpyinsq5n5v8d', 'id_allowed_types', 'passport,drivers_license,national_id');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e4000epyind2pwlpm4', 'require_verified_to_vote', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e5000fpyin90fgu2eq', 'id_review_mode', 'manual');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e6000gpyint9xkxndq', 'require_verified_to_message', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e6000hpyinkg2odf8v', 'require_verified_to_link', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e7000ipyin8of8v396', 'require_verified_to_post', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e7000jpyin3e3kjca4', 'phone_otp_length', '6');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e8000kpyini8wjsbly', 'phone_otp_expiry_minutes', '10');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e8000lpyinxshiaalr', 'phone_otp_provider', 'none');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e00006pyinzo6v6zuq', 'enable_phone_verification', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e1000apyincrzyxiko', 'admin_auto_verify_staff', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjcn5e4000dpyinhbgeh8yr', 'require_verified_to_thread', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjfq48j0022pyin8wnvlo8v', 'enable_totp', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjfq48k0025pyin6imvs72a', 'totp_digits', '6');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjfq48j0023pyinf9xc1ob6', 'totp_issuer', 'PiForum');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjfq48k0024pyinobkwrng1', 'totp_period', '30');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjg64ov0008pydul8qkx531', 'enable_email_otp', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjg64ov000apydugrdzs5b4', 'email_from_address', 'noreply@piforum.com');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjg64ov0009pydu4vua42gf', 'email_otp_subject', 'Your PiForum code');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjg6jge000hpydukump6l81', 'enable_whatsapp_otp', 'true');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjg6jgf000ipyduw2zhaqd1', 'whatsapp_phone_number_id', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqjg6jgf000jpyduxlbf7j4s', 'whatsapp_access_token', '');
INSERT INTO "Setting" ("id", "key", "value") VALUES ('cmqkar5fy00016jqj2enstj4r', 'password_cmqkar5fu00006jqjnnv5i04c', '7e6e0c3079a08c5cc6036789b57e951f65f82383913ba1a49ae992544f1b4b6e');

-- Tag: 15 rows
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jg001jpypqb5rcmsat', 'welcome', 'welcome', '#06b6d4', 2, 1781764330877);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jh001kpypqkjdtvh2y', 'discussion', 'discussion', '#8b5cf6', 3, 1781764330877);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8ji001lpypqpg5xlvtg', 'question', 'question', '#06b6d4', 3, 1781764330878);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jj001mpypq0re33zf7', 'tutorial', 'tutorial', '#ec4899', 3, 1781764330880);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jk001npypqz5cdhjz2', 'showcase', 'showcase', '#f59e0b', 3, 1781764330881);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jl001opypq61fq1z9t', 'help', 'help', '#8b5cf6', 2, 1781764330881);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jm001ppypqc1pz8s6g', 'beginner', 'beginner', '#8b5cf6', 2, 1781764330883);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jo001qpypq32k5y4x0', 'advanced', 'advanced', '#06b6d4', 1, 1781764330884);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jp001rpypqvka7x70l', 'guide', 'guide', '#f59e0b', 4, 1781764330886);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jq001spypqzngfplkb', 'news', 'news', '#10b981', 2, 1781764330887);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jr001tpypqwshiz0el', 'review', 'review', '#6366f1', 2, 1781764330887);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8js001upypqgsfbsyyx', 'opinion', 'opinion', '#10b981', 1, 1781764330888);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jt001vpypqjbvzz540', 'feedback', 'feedback', '#f59e0b', 1, 1781764330889);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8jt001wpypqu3orj4q3', 'wip', 'wip', '#8b5cf6', 2, 1781764330890);
INSERT INTO "Tag" ("id", "name", "slug", "color", "usageCount", "createdAt") VALUES ('cmqj4h8ju001xpypq8ygx07n6', 'challenge', 'challenge', '#6366f1', 1, 1781764330891);

-- ThreadTag: 32 rows
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8jw0021pypq6uzrlkl8', 'cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8jg001jpypqb5rcmsat');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8jy0023pypqfnek4zze', 'cmqj4h8jv001zpypqsl4742ol', 'cmqj4h8jp001rpypqvka7x70l');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8k9002fpypq4u2wjs7x', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8jq001spypqzngfplkb');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8kb002hpypqca00f8y8', 'cmqj4h8k8002dpypq7c2hfd0o', 'cmqj4h8jh001kpypqkjdtvh2y');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8kl002vpypqw9rdk6pe', 'cmqj4h8kk002tpypq64y4kk6r', 'cmqj4h8jg001jpypqb5rcmsat');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8kx0039pypq9y1lwudu', 'cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8jh001kpypqkjdtvh2y');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8l1003bpypq1v5qqxyt', 'cmqj4h8kw0037pypqqpmh484x', 'cmqj4h8js001upypqgsfbsyyx');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8la003npypqlxjj34rn', 'cmqj4h8l9003lpypq6tdgreis', 'cmqj4h8ji001lpypqpg5xlvtg');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8lc003ppypqgjs8i337', 'cmqj4h8l9003lpypq6tdgreis', 'cmqj4h8jl001opypq61fq1z9t');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8le003rpypqybmx1z5j', 'cmqj4h8l9003lpypq6tdgreis', 'cmqj4h8jm001ppypqc1pz8s6g');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8ll003zpypqfv58ehw1', 'cmqj4h8ll003xpypq2qmfnjpv', 'cmqj4h8jj001mpypq0re33zf7');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8ln0041pypqgl2i2xb3', 'cmqj4h8ll003xpypq2qmfnjpv', 'cmqj4h8jo001qpypq32k5y4x0');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8lp0043pypqz61j4rjb', 'cmqj4h8ll003xpypq2qmfnjpv', 'cmqj4h8jp001rpypqvka7x70l');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8ly004bpypqnro57a2u', 'cmqj4h8lu0049pypqtnxqzarv', 'cmqj4h8jk001npypqz5cdhjz2');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8lz004dpypqqbathf9v', 'cmqj4h8lu0049pypqtnxqzarv', 'cmqj4h8jt001vpypqjbvzz540');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8m1004fpypq45v5lua6', 'cmqj4h8lu0049pypqtnxqzarv', 'cmqj4h8jt001wpypqu3orj4q3');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8m8004npypqgz001ioa', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8ju001xpypq8ygx07n6');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8ma004ppypq122w86lk', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8jk001npypqz5cdhjz2');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8mc004rpypqzt1tkhba', 'cmqj4h8m7004lpypq6mosw9r5', 'cmqj4h8jt001wpypqu3orj4q3');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8mn0053pypqidoxiwzl', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8jj001mpypq0re33zf7');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8mr0055pypqc1nd6pvd', 'cmqj4h8mm0051pypqwg7xvmb9', 'cmqj4h8jp001rpypqvka7x70l');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8n3005jpypqla4ch0kg', 'cmqj4h8n2005hpypq6w61x188', 'cmqj4h8jk001npypqz5cdhjz2');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8n4005lpypqalv2119z', 'cmqj4h8n2005hpypq6w61x188', 'cmqj4h8jr001tpypqwshiz0el');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8nd005tpypq120uo2n7', 'cmqj4h8nc005rpypq5e86wmhw', 'cmqj4h8jj001mpypq0re33zf7');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8nf005vpypq2k6gh3g7', 'cmqj4h8nc005rpypq5e86wmhw', 'cmqj4h8jp001rpypqvka7x70l');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8nm0063pypqjkwuyq1l', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8jh001kpypqkjdtvh2y');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8no0065pypqfsbnmr6z', 'cmqj4h8nl0061pypqu05gr5v6', 'cmqj4h8jq001spypqzngfplkb');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8o0006jpypqpb7be7ed', 'cmqj4h8nz006hpypq5t6g44dp', 'cmqj4h8ji001lpypqpg5xlvtg');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8o1006lpypq6ohs2a7a', 'cmqj4h8nz006hpypq5t6g44dp', 'cmqj4h8jr001tpypqwshiz0el');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8od006vpypqudnv225w', 'cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8ji001lpypqpg5xlvtg');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8oe006xpypqbm9mteme', 'cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8jl001opypq61fq1z9t');
INSERT INTO "ThreadTag" ("id", "threadId", "tagId") VALUES ('cmqj4h8og006zpypq71b9o0fn', 'cmqj4h8ob006tpypqp61yen5b', 'cmqj4h8jm001ppypqc1pz8s6g');
