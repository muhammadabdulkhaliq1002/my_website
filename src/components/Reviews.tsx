'use client';

export default function ProfileSection() {
  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-start gap-6">
          <button className="p-2 rounded-lg hover:bg-gray-100 md:hidden mt-1" aria-label="Close sidebar">
            <span aria-hidden="true">☰</span>
          </button>
          <div className="flex items-start gap-4 flex-grow sm:flex-grow-0">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 448 512"
                className="text-blue-600 text-2xl"
                aria-hidden="true"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-gray-900 truncate mb-2">
                <span title="Muhammad Abdul Khaliq">Muhammad Abdul Khaliq</span>
              </h1>
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-y-2 gap-x-4 text-gray-500">
                <div className="flex items-center gap-2 group relative">
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 576 512"
                    className="text-blue-600 flex-shrink-0"
                    aria-hidden="true"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M528 32H48C21.5 32 0 53.5 0 80v16h576V80c0-26.5-21.5-48-48-48zM0 432c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V128H0v304zm352-232c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zm0 64c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zm0 64c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zM176 192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z" />
                  </svg>
                  <span className="text-sm whitespace-nowrap" title="Permanent Account Number">
                    BJWPK8730Q
                  </span>
                  <span className="hidden group-hover:block absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    Permanent Account Number
                  </span>
                </div>
                <span className="hidden sm:inline text-gray-300" aria-hidden="true">
                  |
                </span>
                <div className="flex items-center gap-2">
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 512 512"
                    className="text-blue-600 flex-shrink-0"
                    aria-hidden="true"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z" />
                  </svg>
                  <span className="text-sm whitespace-nowrap">21/10/1985</span>
                </div>
                <span className="hidden sm:inline text-gray-300" aria-hidden="true">
                  |
                </span>
                <div className="flex items-center gap-2">
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 512 512"
                    className="text-blue-600 flex-shrink-0"
                    aria-hidden="true"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c-25.365 0-46 20.635-46 46 0 25.364 20.635 46 46 46s46-20.636 46-46c0-25.365-20.635-46-46-46z" />
                  </svg>
                  <a href="tel:+91 8147717003" className="text-sm whitespace-nowrap hover:text-blue-600 transition-colors">
                    +91 8147717003
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="mailto:ca.abdulkhaliq@yahoo.com"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              ca.abdulkhaliq@yahoo.com
            </a>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto group relative">
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 448 512"
              className="text-blue-600"
              aria-hidden="true"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 192h424c6.6 0 12 5.4 12 12v260c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V204c0-6.6 5.4-12 12-12zm436-44v-36c0-26.5-21.5-48-48-48h-48V12c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v52H160V12c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v36c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12z" />
            </svg>
            <div className="relative">
              <select
                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 pr-8 appearance-none"
                aria-label="Select Financial Year"
              >
                <option value="2024-25" selected>
                  FY 2024-25
                </option>
                <option value="2023-24">FY 2023-24</option>
                <option value="2022-23">FY 2022-23</option>
              </select>
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 512 512"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-help"
                aria-hidden="true"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zM262.655 90c-54.497 0-89.255 22.957-116.549 63.758-3.536 5.286-2.353 12.415 2.715 16.258l34.699 26.31c5.205 3.947 12.621 3.008 16.665-2.122 17.864-22.658 30.113-35.797 57.303-35.797 20.429 0 45.698 13.148 45.698 32.958 0 14.976-12.363 22.667-32.534 33.976C247.128 238.528 216 254.941 216 296v4c0 6.627 5.373 12 12 12h56c6.627 0 12-5.373 12-12v-1.333c0-28.462 83.186-29.647 83.186-106.667 0-58.002-60.165-102-116.531-102zM256 338c-25.365 0-46 20.635-46 46 0 25.364 20.635 46 46 46s46-20.636 46-46c0-25.365-20.635-46-46-46z" />
              </svg>
            </div>
            <span className="hidden group-hover:block absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              Select financial year to view relevant data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
