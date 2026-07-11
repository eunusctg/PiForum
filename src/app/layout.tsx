import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import ThemeManager from "@/components/forum/ThemeManager";
import PwaRegistration from "@/components/forum/PwaRegistration";
import SiteHeadInjector from "@/components/forum/SiteHeadInjector";
import { getSettingsMap, settingStr, settingBool } from "@/lib/server-settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Dynamic metadata generated from DB settings so SEO changes in the admin
   panel take effect without a rebuild. Falls back to comprehensive
   tech-focused PiForum defaults. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettingsMap();
  const forumName = settingStr(s, "forum_name", "PiForum");
  const description = settingStr(
    s,
    "forum_description",
    "PiForum is a modern tech community forum for developers, engineers, and tech enthusiasts. Discuss programming, web development, AI, hardware, gaming, and more.",
  );
  const suffix = settingStr(s, "seo_title_suffix", `— ${forumName}`);
  const keywords = settingStr(
    s,
    "seo_keywords",
    "tech forum,developer community,programming forum,web development,AI discussion,coding help,tech community,PiForum,software engineering,open source,dev forum,hardware forum,gaming community",
  );
  const author = settingStr(s, "seo_author", "PiForum");
  const ogImage = settingStr(s, "seo_og_image", "/og-image.png");
  const twitter = settingStr(s, "seo_twitter_handle", "");
  const canonical = settingStr(s, "seo_canonical_url", "https://piforum.eu.org");
  const indexable = settingBool(s, "seo_indexable", true);
  const logoUrl = settingStr(s, "logo_url", "/logo.svg");
  const favicon = settingStr(s, "favicon_url", logoUrl || "/logo.svg");

  return {
    title: {
      default: `PiForum — Tech Community & Developer Forum`,
      template: `%s — PiForum`,
    },
    description,
    keywords: keywords
      ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    authors: [{ name: author }],
    creator: "PiForum",
    publisher: "PiForum",
    icons: { icon: favicon, apple: favicon },
    metadataBase: new URL(canonical),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: forumName,
      title: "PiForum — Tech Community & Developer Forum",
      description:
        "Join PiForum — the modern tech community for developers, engineers, and enthusiasts. Discuss programming, AI, hardware, gaming and more.",
      images: [
        {
          url: ogImage,
          width: 1344,
          height: 768,
          alt: "PiForum — Tech Community Forum",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "PiForum — Tech Community & Developer Forum",
      description:
        "Join PiForum — the modern tech community for developers and tech enthusiasts.",
      images: [ogImage],
      ...(twitter ? { creator: twitter, site: twitter } : {}),
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : { index: false, follow: false },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  // Provide theme-color for both light & dark color-scheme preferences so the
  // browser chrome (mobile address bar, PWA toolbar, iOS status bar) matches
  // the page before JS hydrates. ThemeManager syncs this live when the user
  // explicitly picks Day / Night / Golden.
  // Golden (#D4AF37) is used as the default light-scheme color because the
  // PiForum brand is gold-themed; the dark-scheme uses the dark bronze bg.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00897b" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data + analytics injected client-side from settings */}
        <SiteHeadInjector />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThemeManager />
          {children}
          <Toaster />
          <PwaRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
