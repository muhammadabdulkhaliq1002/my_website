import React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const NavbarSession = dynamic(() => import("./NavbarSession"), { ssr: false });

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 text-gray-200 py-1.5 px-4 shadow-lg fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-opacity-95 transition-colors">
      <div className="container mx-auto flex items-center">
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/Logo.PNG"
              alt="Integrated Accounting Logo"
              width={36}
              height={36}
              className="mr-2.5"
            />
          </Link>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h1 className="text-[13px] md:text-[15px] font-bold leading-snug truncate">
              Integrated Accounting and Taxation Services
            </h1>
            <span className="text-[11px] md:text-[12px] text-gray-400 opacity-90 -mt-0.5">
              Registration | Accounting | Tax | Compliances
            </span>
          </div>
        </div>
        <div className="nav-links flex-shrink-0 ml-6 pl-4 border-l border-gray-700">
          <ul className="flex items-center space-x-3">
            <NavbarSession />
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
