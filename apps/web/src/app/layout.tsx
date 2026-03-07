import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Viaoda_Libre } from 'next/font/google'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider/next'

import './global.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

type RootLayoutProps = {
  children: ReactNode
}

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta'
})

const playfair = Viaoda_Libre({
  weight: ['400'],
  variable: '--font-playfair'
})

// Site metadata
export const metadata: Metadata = {
  title: {
    default: 'DBDesk - The cleanest database management tool',
    template: '%s | DBDesk'
  },
  description:
    'DBDesk is a modern, intuitive database management tool that provides a clean alternative to pgAdmin. Manage PostgreSQL databases with ease.',
  keywords: [
    'database',
    'pgadmin alternatives',
    'pgadmin',
    'postgres viewer',
    'postgres',
    'database management tool',
    'sql editor',
    'database gui',
    'postgresql client'
  ],
  authors: [{ name: 'DBDesk Team' }],
  creator: 'DBDesk',
  publisher: 'DBDesk',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'DBDesk - The cleanest database management tool',
    description:
      'DBDesk is a modern, intuitive database management tool that provides a clean alternative to pgAdmin. Manage PostgreSQL databases with ease.',
    siteName: 'DBDesk',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'DBDesk - Database Management Tool'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DBDesk - The cleanest database management tool',
    description:
      'DBDesk is a modern, intuitive database management tool that provides a clean alternative to pgAdmin.',
    images: ['/twitter-image.png'],
    creator: '@dbdesk' // Replace with your actual Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
}

export default function Layout({ children }: RootLayoutProps) {
  const baseUrl = APP_URL

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DBDesk',
    applicationCategory: 'DatabaseApplication',
    operatingSystem: ['Windows', 'macOS', 'Linux'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    description:
      'A modern, intuitive database management tool that provides a clean alternative to pgAdmin for managing PostgreSQL databases.',
    publisher: {
      '@type': 'Organization',
      name: 'DBDesk',
      url: baseUrl
    },
    downloadUrl: baseUrl,
    screenshot: `${baseUrl}/opengraph-image.png`,
    keywords: 'database management, PostgreSQL, pgAdmin alternative, SQL editor'
  }

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${playfair.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="f94ecf0a-dfaf-46ae-a004-a0f29dee626c"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`flex flex-col min-h-screen font-sans ${jakarta.className}`}>
        <RootProvider
          search={{
            enabled: false
          }}
          theme={{
            enabled: false
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
