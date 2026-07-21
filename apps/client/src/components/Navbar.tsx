"use client";

import Image from "next/image";
import Link from "next/link";
import SearchBar from "./SearchBar";
import { Bell, Home, ShoppingCart } from "lucide-react";
import ShoppingCartIcon from "./ShoppingCartIcon";
import { SignInButton, SignedOut, useUser } from "@clerk/nextjs";
import ProfileButton from "./ProfileButton";

const Navbar = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const displayName =
    user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress ||
    "Profile";

  return (
    <nav className="w-full flex items-center justify-between border-b border-gray-200 pb-4">
      {/* LEFT */}
      <Link href="/" className="flex items-center">
        <Image
          src="/logo.png"
          alt="Trends"
          width={36}
          height={36}
          className="w-6 h-6 md:w-9 md:h-9"
        />
        <p className="hidden md:block text-md font-medium tracking-wider">
          TRENDS.
        </p>
      </Link>
      {/* RIGHT */}
      <div className="flex items-center gap-6">
        <SearchBar />
        <Link href="/">
          <Home className="w-4 h-4 text-gray-600" />
        </Link>
        <Bell className="w-4 h-4 text-gray-600" />
        <ShoppingCartIcon />
        {isLoaded && isSignedIn ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-gray-700">
              {/* {displayName} */}
            </span>
            <ProfileButton />
          </div>
        ) : (
          <SignedOut>
            <SignInButton>
              <button className="text-sm font-medium text-gray-700">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
