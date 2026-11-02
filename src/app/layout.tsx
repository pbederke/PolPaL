import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Root layout — wraps every page in the application.
 *
 * Responsibilities:
 * 1. Global metadata defaults (metadataBase, title template, OG/Twitter tags).
 *    Child pages override individual fields; the template produces "PolPaL | Page Title".
 *    metadataBase resolves relative OG image URLs — must match the production origin.
 *
 * 2. WebSite JSON-LD structured data injected into <head>.
 *    Tells search engines the site name and canonical URL.
 *    No nonce needed: <script type="application/ld+json"> is a data block,
 *    not executable JS, so CSP's script-src nonce requirement does not apply.
 *
 * 3. Reading headers() opts this layout into dynamic rendering.
 *    This is required so Next.js can apply the proxy-supplied CSP nonce
 *    (x-nonce header, set by src/proxy.ts) to its own injected <script> tags.
 *    Even though we don't use `nonce` directly in our JSX, calling headers()
 *    here is what triggers dynamic rendering for the entire layout tree.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  title: {
    default: "PolPaL",
    template: "PolPaL | %s",
  },
  description: "PolPaL (Political Party Links) is a linkage key database for political entities in the social sciences, built on the core party list of Party Facts.",
  openGraph: {
    type: 'website',
    siteName: 'PolPaL',
    title: 'PolPaL',
    description: 'PolPaL (Political Party Links) is a linkage key database for political entities in the social sciences, built on the core party list of Party Facts.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers opts the layout into dynamic rendering so the proxy's
  // CSP nonce is available at render time and Next.js can apply it to its
  // own <script> tags.
  await headers(); // opt into dynamic rendering so Next.js can apply CSP nonces
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PolPaL',
    url: baseUrl,
    description: 'PolPaL (Political Party Links) is a linkage key database for political entities in the social sciences, built on the core party list of Party Facts.',
    isRelatedTo: 'https://partyfacts.herokuapp.com/',
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1 p-4 grid-bg pt-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
