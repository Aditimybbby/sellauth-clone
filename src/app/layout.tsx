import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'SellAuth Clone - Digital Product Store',
  description: 'Sell digital products with crypto payments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${sora.variable} font-sans min-h-screen bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
