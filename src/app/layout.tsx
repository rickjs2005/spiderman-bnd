import type { Metadata } from "next";
import { Anton, Bangers, Inter } from "next/font/google";
import { SITE } from "@/lib/content";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const bangers = Bangers({
  variable: "--font-bangers",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spider-Man: Brand New Day — Fan Concept",
  description: SITE.metaDescription,
  openGraph: {
    title: "Spider-Man: Brand New Day — Fan Concept",
    description: SITE.metaDescription,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${bangers.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--ink)] text-[var(--paper)]">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
