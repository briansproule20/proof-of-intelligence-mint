import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Proof of Intelligence Mint',
  description: 'Answer AI-powered trivia questions on Base. Pay 1 USDC per question via x402, mint 5000 POIC tokens for correct answers.',
  icons: {
    icon: '/poic-favicon.png',
    apple: '/poic-favicon.png',
  },
  openGraph: {
    title: 'Proof of Intelligence Mint',
    description: 'Prove Your Intelligence, Mint Rewards. Answer AI-powered trivia questions and earn POIC tokens on Base.',
    images: ['/poic-favicon.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proof of Intelligence Mint',
    description: 'Prove Your Intelligence, Mint Rewards. Answer AI-powered trivia questions and earn POIC tokens on Base.',
    images: ['/poic-favicon.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
