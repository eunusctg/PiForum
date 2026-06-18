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
   panel take effect without a rebuild. Falls back to sensible defaults. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettingsMap();
  const forumName = settingStr(s, "forum_name", "PiForum");
  const description = settingStr(s, "forum_description", "A modern, neumorphic forum CMS.");
  const suffix = settingStr(s, "seo_title_suffix", `— ${forumName}`);
  const keywords = settingStr(s, "seo_keywords", "forum, community, discussion");
  const author = settingStr(s, "seo_author", "PiForum");
  const ogImage = settingStr(s, "seo_og_image", "");
  const twitter = settingStr(s, "seo_twitter_handle", "");
  const canonical = settingStr(s, "seo_canonical_url", "");
  const indexable = settingBool(s, "seo_indexable", true);
  const logoUrl = settingStr(s, "logo_url", "/logo.svg");
  const favicon = settingStr(s, "favicon_url", logoUrl || "/logo.svg");

  return {
    title: { default: `${forumName} ${suffix}`.trim(), template: `%s ${suffix}`.trim() },
    description: description,
    keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    authors: [{ name: author }],
    icons: { icon: favicon, apple: favicon },
    metadataBase: canonical ? new URL(canonical) : undefined,
    alternates: { canonical: canonical || undefined },
    openGraph: {
      title: forumName,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(twitter ? { creator: twitter, site: twitter } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: "#D4AF37",
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
