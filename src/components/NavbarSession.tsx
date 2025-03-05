"use client";
import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

const NavbarSession: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  const linkClass = (path: string) => {
    const baseClass = "px-2.5 py-1.5 transition-all duration-300 relative text-[13px]";
    const activeClass = pathname === path 
      ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600 after:transform after:scale-x-100 after:transition-transform after:duration-300" 
      : "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600 after:transform after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300";
    return `${baseClass} ${activeClass}`;
  };

  return (
    <ul className="flex items-center space-x-2">
      { !session ? (
        <>
          <li>
            <Link href="/" className={linkClass("/")}>Home</Link>
          </li>
          <li>
            <Link href="/services" className={linkClass("/services")}>Services</Link>
          </li>
          <li>
            <Link href="/contact" className={linkClass("/contact")}>Contact</Link>
          </li>
          <li>
            <Link href="/login" className={linkClass("/login")}>Login</Link>
          </li>
          <li>
            <Link 
              href="/register" 
              className="ml-1 px-2.5 py-1.5 bg-blue-600 text-white rounded text-[13px] hover:bg-blue-700 transition-colors duration-300"
            >
              Register
            </Link>
          </li>
        </>
      ) : (
        <>
          <li>
            <Link href="/dashboard/profile" className={linkClass("/dashboard/profile")}>Profile</Link>
          </li>
          <li className="border-l border-gray-600 h-4 mx-1.5" aria-hidden="true" />
          <li>
            <button 
              onClick={handleLogout} 
              className={linkClass("")}
            >
              Logout
            </button>
          </li>
        </>
      )}
    </ul>
  );
};

export default NavbarSession;
