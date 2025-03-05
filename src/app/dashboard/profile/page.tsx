import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { FaUser, FaIdCard, FaPhone, FaBirthdayCake, FaCalendar, FaEnvelope } from 'react-icons/fa';

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      fullName: true,
      email: true,
      phone: true,
      pan: true,
      dateOfBirth: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const financialYears = [
    "2025-26",
    "2024-25",
    "2023-24"
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="px-4 sm:px-6 py-2">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-6">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 md:hidden flex-shrink-0" aria-label="Close sidebar">
              <span aria-hidden="true">☰</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FaUser className="text-blue-600 text-sm" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {user.fullName}
              </h1>
              <div className="flex items-center gap-x-3 text-gray-500 overflow-x-auto hide-scrollbar mt-0.5">
                <div className="flex items-center gap-x-1.5 flex-shrink-0 group relative">
                  <FaIdCard className="text-blue-600 text-[13px]" aria-hidden="true" />
                  <span className="text-[13px]">{user.pan}</span>
                  <span className="hidden group-hover:block absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full    bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">Permanent Account Number</span>
                </div>
                <div className="h-3 border-l border-gray-300" />
                <div className="flex items-center gap-x-1.5 flex-shrink-0">
                  <FaBirthdayCake className="text-blue-600 text-[13px]" aria-hidden="true" />
                  <span className="text-[13px]">{formatDate(user.dateOfBirth)}</span>
                </div>
                <div className="h-3 border-l border-gray-300" />
                <div className="flex items-center gap-x-1.5 flex-shrink-0">
                  <FaPhone className="text-blue-600 text-[13px]" aria-hidden="true" />
                  <a href={`tel:${user.phone}`} className="text-[13px] hover:text-blue-600 transition-colors">
                    {user.phone}
                  </a>
                </div>
                <div className="h-3 border-l border-gray-300" />
                <div className="flex items-center gap-x-1.5 flex-shrink-0">
                  <FaEnvelope className="text-blue-600 text-[13px]" aria-hidden="true" />
                  <a href={`mailto:${user.email}`} className="text-[13px] hover:text-blue-600 transition-colors">
                    {user.email}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-x-1.5 flex-shrink-0 pl-4 border-l border-gray-200">
            <FaCalendar className="text-blue-600 text-[13px]" aria-hidden="true" />
            <select 
              className="text-[13px] border-gray-300 rounded hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-0.5 pl-1.5 pr-6 appearance-none bg-transparent min-w-[110px]"
              aria-label="Select Financial Year"
              defaultValue="2024-25"
            >
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
              <option value="2023-24">FY 2023-24</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}