import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PiForum - Modern Neumorphic Forum CMS",
  description: "A modern, production-ready forum CMS with Neumorphism design powered by Cloudflare D1, R2, and Firebase Auth.",
  keywords: ["PiForum", "Forum", "CMS", "Neumorphism", "Cloudflare", "Firebase", "Next.js"],
  authors: [{ name: "PiForum Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "PiForum",
    description: "Modern Neumorphic Forum CMS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
