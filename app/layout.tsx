import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.callcatchai.online'),
  title: 'CallCatch — Your phone answers itself',
  description:
    'AI receptionist for home & outdoor service businesses. Answers every call in under a second, qualifies the lead, and books the job — 24/7, never voicemail.',
  openGraph: {
    title: 'CallCatch — Your phone answers itself',
    description:
      'AI receptionist for HVAC, plumbing, electrical, roofing, landscaping, lawn care & tree service. Every call answered, every job booked.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body className="font-inter bg-midnight text-ink-1 antialiased">{children}</body>
    </html>
  );
}
