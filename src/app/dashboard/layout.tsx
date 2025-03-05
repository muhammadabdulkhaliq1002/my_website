'use client';

import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { FaUser, FaIdCard, FaPhone, FaBirthdayCake, FaCalendarAlt, FaQuestionCircle } from 'react-icons/fa';
import { Spinner } from '@/components/ui/Spinner';

// Create context for financial year
export const FinancialYearContext = createContext<{
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}>({
  selectedYear: '',
  setSelectedYear: () => {},
});

export const useFinancialYear = () => useContext(FinancialYearContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get current financial year
  const getCurrentFY = () => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    return month >= 3 ? `${year}-${year + 1 - 2000}` : `${year - 1}-${year - 2000}`;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  // Initialize selectedYear from URL or localStorage, fallback to current FY
  const [selectedYear, setSelectedYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlYear = searchParams.get('fy');
      const savedYear = localStorage.getItem('selectedFinancialYear');
      return urlYear || savedYear || getCurrentFY();
    }
    return getCurrentFY();
  });

  // Generate financial years list (current year and previous 2 years)
  const generateFinancialYears = () => {
    const currentYear = parseInt(getCurrentFY().split('-')[0]);
    return [
      `${currentYear}-${currentYear + 1 - 2000}`,
      `${currentYear - 1}-${currentYear - 2000}`,
      `${currentYear - 2}-${currentYear - 1 - 2000}`
    ];
  };

  const financialYears = generateFinancialYears();

  // Update URL and localStorage when financial year changes
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    setSelectedYear(newYear);
    localStorage.setItem('selectedFinancialYear', newYear);
    
    // Update URL with new financial year
    const params = new URLSearchParams(searchParams);
    params.set('fy', newYear);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { 
      href: '/dashboard/tax-returns', 
      label: 'Tax Returns', 
      icon: '📑',
      submenu: [
        { href: '/dashboard/tax-returns/components/TaxReturnForm', label: 'File ITR-1', icon: '📝' },
      ]
    },
  ];

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  return (
    <FinancialYearContext.Provider value={{ selectedYear, setSelectedYear }}>
      <div className="flex h-screen bg-gray-100">
        {/* Overlay for mobile */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30
            transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            w-64 md:w-auto md:flex-shrink-0
            bg-white shadow-lg transition-transform duration-200 ease-in-out
          `}
        >
          <div className="flex flex-col h-full">
            <nav className="flex-1 overflow-y-auto">
              <ul className="p-4 space-y-2">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                      className={`flex items-center p-3 rounded-lg ${
                        pathname === item.href
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">{item.icon}</span>
                      <span className="ml-3">{item.label}</span>
                    </Link>
                    {item.submenu && (
                      <ul className="ml-8 mt-2 space-y-2">
                        {item.submenu.map((subitem) => (
                          <li key={subitem.href}>
                            <Link
                              href={subitem.href}
                              onClick={() => isMobile && setIsSidebarOpen(false)}
                              className={`flex items-center p-2 rounded-lg text-sm ${
                                pathname === subitem.href
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-lg" aria-hidden="true">{subitem.icon}</span>
                              <span className="ml-2">{subitem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <header className="bg-white shadow-sm">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-col space-y-4">
                {/* Top Row - Basic Info */}
                <div className="flex items-start gap-6">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 md:hidden mt-1"
                    aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                  >
                    <span aria-hidden="true">☰</span>
                  </button>
                  <div className="flex items-start gap-4 flex-grow sm:flex-grow-0">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {isLoading ? (
                        <Spinner className="w-6 h-6 text-blue-600" />
                      ) : (
                        <FaUser className="text-blue-600 text-2xl" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl font-semibold text-gray-900 truncate mb-2">
                        {isLoading ? (
                          <div className="h-7 w-48 bg-gray-200 animate-pulse rounded" aria-label="Loading name..." />
                        ) : (
                          <span title={session?.user?.name || ''}>{session?.user?.name}</span>
                        )}
                      </h1>
                      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-y-2 gap-x-4 text-gray-500">
                        {isLoading ? (
                          <div className="space-y-2 w-full">
                            <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
                            <div className="h-5 w-36 bg-gray-200 animate-pulse rounded" />
                            <div className="h-5 w-28 bg-gray-200 animate-pulse rounded" />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 group relative">
                              <FaIdCard className="text-blue-600 flex-shrink-0" aria-hidden="true" />
                              <span className="text-sm whitespace-nowrap" title="Permanent Account Number">
                                {session?.user?.pan || 'No PAN'}
                              </span>
                              <span className="hidden group-hover:block absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full 
                                           bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                Permanent Account Number
                              </span>
                            </div>
                            <span className="hidden sm:inline text-gray-300" aria-hidden="true">|</span>
                            <div className="flex items-center gap-2">
                              <FaPhone className="text-blue-600 flex-shrink-0" aria-hidden="true" />
                              {session?.user?.phone ? (
                                <a href={`tel:${session.user.phone}`} className="text-sm whitespace-nowrap hover:text-blue-600 transition-colors">
                                  {session.user.phone}
                                </a>
                              ) : (
                                <span className="text-sm text-gray-400">No phone number</span>
                              )}
                            </div>
                            <span className="hidden sm:inline text-gray-300" aria-hidden="true">|</span>
                            <div className="flex items-center gap-2">
                              <FaBirthdayCake className="text-blue-600 flex-shrink-0" aria-hidden="true" />
                              <span className="text-sm whitespace-nowrap">
                                {session?.user?.dateOfBirth ? new Date(session.user.dateOfBirth).toLocaleDateString() : 'No DOB'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row - Additional Info & Financial Year */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {isLoading ? (
                      <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
                    ) : (
                      <>
                        <a href={`mailto:${session?.user?.email}`} className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                          {session?.user?.email}
                        </a>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto group relative">
                    <FaCalendarAlt className="text-blue-600" aria-hidden="true" />
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={handleYearChange}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 pr-8 appearance-none"
                        disabled={isLoading}
                        aria-label="Select Financial Year"
                      >
                        {financialYears.map((year) => (
                          <option key={year} value={year}>
                            FY {year}
                          </option>
                        ))}
                      </select>
                      <FaQuestionCircle 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-help"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="hidden group-hover:block absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full 
                                 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      Select financial year to view relevant data
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </FinancialYearContext.Provider>
  );
}
