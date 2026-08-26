import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SellAuth Clone - Digital Product Store',
  description: 'Sell digital products with crypto payments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
