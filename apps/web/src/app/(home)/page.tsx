import type { Metadata } from 'next'

import Features from './components/features'
import Hero from './components/hero'
import HeroImage from './components/hero-image'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export const metadata: Metadata = {
  title: 'DBDesk - The cleanest database management tool',
  description:
    'Experience the future of database management with DBDesk. A modern, intuitive alternative to pgAdmin for PostgreSQL databases. Clean interface, powerful features.',
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    title: 'DBDesk - The cleanest database management tool',
    description:
      'Experience the future of database management with DBDesk. A modern, intuitive alternative to pgAdmin for PostgreSQL databases.',
    url: APP_URL,
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'DBDesk Database Management Tool',
      },
    ],
  },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <HeroImage />
      <Features />
      {/* <Waitlist /> */}
    </>
  )
}
