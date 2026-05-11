import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Memento',
  description: 'Persistent memory system for AI coding agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
