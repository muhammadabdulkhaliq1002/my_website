import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tax & Accounting Services | Professional Tax Services',
  description: 'Comprehensive tax services including income tax filing, business tax preparation, tax consultation, and online self-service portal. Expert tax planning and strategy.',
  openGraph: {
    title: 'Professional Tax & Accounting Services',
    description: 'Expert tax services including income tax filing, consultation, and online portal access. Get professional help with tax preparation and planning.',
  }
}

const servicesSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  provider: {
    '@type': 'AccountingService',
    name: 'Integrated Accounting and Taxation Services',
    areaServed: 'Karnataka'
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Tax Services Catalog',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Income Tax Filing',
          description: 'Comprehensive income tax services for individuals and businesses'
        }
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Tax Consultation',
          description: 'Expert tax planning and consultation services'
        }
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Online Self-Service Portal',
          description: '24/7 access to tax documents and services through secure portal'
        }
      }
    ]
  }
};

export default function Services() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12">Our Services</h1>

        {/* Income Tax Services */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 mb-12 sm:mb-16">
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl font-semibold">Income Tax Services</h2>
            <p className="text-gray-600">
              Comprehensive income tax services for individuals and businesses, ensuring
              compliance with the latest tax regulations while maximizing your savings.
            </p>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Individual Income Tax Return Filing
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Business Tax Return Preparation
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Tax Planning and Strategy
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Digital Document Submission
              </li>
            </ul>
          </div>
          <div className="bg-blue-50 p-6 sm:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-4">Service Features</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-blue-600">📝</div>
                <p className="ml-3">Expert preparation and review of tax returns</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-blue-600">⏰</div>
                <p className="ml-3">Timely filing and compliance</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-blue-600">💰</div>
                <p className="ml-3">Maximum tax saving strategies</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Tax Consultation */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 mb-12 sm:mb-16">
          <div className="bg-green-50 p-6 sm:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow order-2 md:order-1">
            <h3 className="text-xl font-semibold mb-4">Consultation Benefits</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-600">🎯</div>
                <p className="ml-3">Personalized tax planning strategies</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-600">📊</div>
                <p className="ml-3">Financial analysis and recommendations</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-green-600">🤝</div>
                <p className="ml-3">One-on-one expert guidance</p>
              </li>
            </ul>
          </div>
          <div className="space-y-4 sm:space-y-6 order-1 md:order-2">
            <h2 className="text-2xl sm:text-3xl font-semibold">Tax Consultation</h2>
            <p className="text-gray-600">
              Get expert advice on tax matters through our professional consultation services.
              We help you understand your tax obligations and plan for the future.
            </p>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Personal Tax Planning
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Business Tax Strategy
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Investment Tax Implications
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                Compliance Guidance
              </li>
            </ul>
          </div>
        </div>

        {/* Online Self-Service */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl font-semibold">Online Self-Service Portal</h2>
            <p className="text-gray-600">
              Take control of your tax preparation with our user-friendly online portal.
              Submit documents, track progress, and manage your tax affairs securely.
            </p>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                24/7 Access to Documents
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                Secure Document Upload
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                Real-time Status Updates
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                Direct Communication Channel
              </li>
            </ul>
          </div>
          <div className="bg-purple-50 p-6 sm:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-4">Portal Features</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-purple-600">🔒</div>
                <p className="ml-3">Secure and encrypted data handling</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-purple-600">📱</div>
                <p className="ml-3">Mobile-responsive interface</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 text-purple-600">💬</div>
                <p className="ml-3">Instant messaging support</p>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 sm:mt-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join our platform and experience professional tax services at your fingertips.
          </p>
          <div className="space-x-4">
            <Link
              href="/register"
              className="inline-block bg-blue-600 text-white px-5 sm:px-6 py-2 sm:py-3 rounded-md text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/contact"
              className="inline-block bg-gray-100 text-gray-700 px-5 sm:px-6 py-2 sm:py-3 rounded-md text-sm sm:text-base font-semibold hover:bg-gray-200 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}