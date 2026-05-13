import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/NavBar';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Teatro · Auditorio Tickets',
  description: 'Boletos premium para auditorios y experiencias en vivo',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0A0A12',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body className="grain min-h-screen bg-ink font-sans text-cream antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
