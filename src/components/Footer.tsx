'use client';

import Link from 'next/link';
import { FaMapMarkerAlt, FaEnvelope, FaPhone, FaClock } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white" role="contentinfo" aria-label="Site Footer">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <section aria-label="Contact Information">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <address className="not-italic space-y-2">
              <p className="text-gray-300 flex items-center gap-2">
                <FaMapMarkerAlt className="flex-shrink-0" />
                <span>
                  Muhammad Abdul Khaliq<br />
                  H No 6-261, Khari Bowli<br />
                  Mominpura Gulbarga<br />
                  Karnataka 585104
                </span>
              </p>
              <a href="mailto:ca.abdulkhaliq@gmail.com" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                <FaEnvelope className="flex-shrink-0" />
                ca.abdulkhaliq@gmail.com
              </a>
              <a href="tel:+918147717003" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                <FaPhone className="flex-shrink-0" />
                +91 8147717003
              </a>
            </address>
          </section>
          
          <nav aria-label="Footer Navigation" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/services" className="text-gray-300 hover:text-white transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>

          <section aria-label="Business Hours" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
            <dl className="space-y-2">
              <div className="flex items-start gap-2">
                <FaClock className="flex-shrink-0 mt-1" />
                <div>
                  <div>
                    <dt className="text-gray-300 inline">Monday - Friday:</dt>
                    <dd className="text-gray-300 inline ml-2">9:00 AM - 6:00 PM</dd>
                  </div>
                  <div>
                    <dt className="text-gray-300 inline">Saturday:</dt>
                    <dd className="text-gray-300 inline ml-2">10:00 AM - 4:00 PM</dd>
                  </div>
                  <div>
                    <dt className="text-gray-300 inline">Sunday:</dt>
                    <dd className="text-gray-300 inline ml-2">Closed</dd>
                  </div>
                </div>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} Integrated Accounting and Taxation Services. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;