import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Un date ? | Invitation privée',
  description: 'Une invitation pensée rien que pour toi.',
  openGraph: {
    title: 'Un date ?',
    description: 'Une invitation privée',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Un date ? Invitation privée' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Un date ?',
    description: 'Une invitation privée',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
