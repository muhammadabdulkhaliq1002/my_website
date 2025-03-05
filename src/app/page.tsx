import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import ServicesSlider from '@/components/ServicesSlider'

export const metadata: Metadata = {
  title: 'Professional Tax & Accounting Services | Integrated Accounting',
  description: 'Expert tax consultation, income tax filing, and accounting services. Get professional help with tax preparation and financial planning.',
  openGraph: {
    title: 'Professional Tax & Accounting Services | Integrated Accounting',
    description: 'Expert tax consultation, income tax filing, and accounting services. Get professional help with tax preparation and financial planning.',
    type: 'website',
  }
}

// JSON-LD structured data for better SEO
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'AccountingService',
  name: 'Integrated Accounting and Taxation Services',
  description: 'Professional accounting and tax services for individuals and businesses',
  areaServed: 'Karnataka',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Tax Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Income Tax Filing',
          description: 'Prepare and file your income tax returns accurately and on time'
        }
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Tax Consultation',
          description: 'Expert advice on tax planning and optimization strategies'
        }
      }
    ]
  }
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-blue-50 py-12 sm:py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
                Professional Tax Services Made Easy
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Expert tax consultation and preparation services to help you manage your finances effectively
              </p>
              <Link 
                href="/register" 
                className="inline-block bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-md text-base sm:text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <ServicesSlider />

        {/* CTA Section */}
        <section className="bg-gray-50 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Ready to get started?</h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied clients who trust us with their tax matters
            </p>
            <Link 
              href="/contact" 
              className="inline-block bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-md text-base sm:text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}