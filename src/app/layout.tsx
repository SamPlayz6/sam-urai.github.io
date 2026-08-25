import type { Metadata } from 'next'
import './globals.css'

const siteTitle = 'Sam Dunning - AI & Full-Stack Developer'
const siteDescription =
  'AI and full-stack developer, and First Class Data Science graduate, building AI products end to end.'

export const metadata: Metadata = {
  metadataBase: new URL('https://sdd.ie'),
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: '/images/x-icon.png',
    shortcut: '/images/x-icon.png',
    apple: '/images/x-icon.png',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: 'https://sdd.ie',
    siteName: 'Sam Dunning',
    type: 'website',
    images: [
      {
        url: '/images/profile-pic.jpg',
        width: 337,
        height: 421,
        alt: 'Sam Dunning',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/images/profile-pic.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Handlee&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-kalam">{children}</body>
    </html>
  )
}
