import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reviews from '@/components/Reviews';
import AuthProvider from '@/components/AuthProvider';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { inter, roboto } from '@/lib/fonts';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ReactNode } from 'react';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link
          rel="preload"
          href="/fonts/brand-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/brand-bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider session={session}>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow pt-16">{children}</main>
            <Footer />
          </div>
          <ServiceWorkerRegistration />
        </AuthProvider>
      </body>
    </html>
  );
}
