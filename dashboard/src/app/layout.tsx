import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ICO Scout — Job Applications',
  description: 'Job application tracker for Alexander Tobin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  )
}
