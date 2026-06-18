import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MLM Admin Dashboard',
  description: 'Multi-Level Marketing Administration System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}