"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut } from "lucide-react";

interface Count {
  count: number;
}

export default function Header() {
  // Authentication and routing hooks
  const { auth, loadingAuth, refreshAuth } = useAuth();
  const loggedIn = auth.loggedIn;
  const router = useRouter();
  const pathname = usePathname();

  // Dropdown state management
  const [showDropdownInternal, setShowDropdownInternal] = useState(false);
  const dropdownRefInternal = useRef<HTMLDivElement>(null);

  const [, setShowDropdownLinking] = useState(false);
  const dropdownRefLinking = useRef<HTMLDivElement>(null);

  const [showDropdownUser, setShowDropdownUser] = useState(false);
  const dropdownRefUser = useRef<HTMLDivElement>(null);

  const [showMobileNav, setShowMobileNav] = useState(false);

  // State for countries data
  const [count, setCount] = useState<Count>({ count: 0 });

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(false);
  const [, setErrorData] = useState<string | null>(null);

  // Fetch countries data on mount
  useEffect(() => {
    // Only fetch if user is ADMIN
    if (auth.role !== "ADMIN" || loadingAuth) {
      return;
    }

    // Create an AbortController to allow request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;

    // Clear previous error and set loading state
    setErrorData(null);
    setLoadingData(true);

    // Fetch countries data from API
    async function fetchCount() {
      try {
        const res = await fetch(`/api/admin/approveUsersCount`, {
          credentials: "include",
          signal,
        });
        if (!res.ok) throw new Error("Failed to load count.");
        const data = await res.json();
        setCount(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch data", err);
          setErrorData(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchCount();
    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, [auth.role, loadingAuth]);

  // Handle user logout
  const handleLogout = async () => {
    await fetch(`/api/authentication/logout`, {
      method: "POST",
      credentials: "include",
    });
    await refreshAuth();
    router.push("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutsideInternal = (event: MouseEvent) => {
      if (
        dropdownRefInternal.current &&
        !dropdownRefInternal.current.contains(event.target as Node)
      ) {
        setShowDropdownInternal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideInternal);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideInternal);
    };
  }, []);

  useEffect(() => {
    setShowDropdownInternal(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutsideLinking = (event: MouseEvent) => {
      if (
        dropdownRefLinking.current &&
        !dropdownRefLinking.current.contains(event.target as Node)
      ) {
        setShowDropdownLinking(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideLinking);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideLinking);
    };
  }, []);

  useEffect(() => {
    setShowDropdownLinking(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutsideUser = (event: MouseEvent) => {
      if (
        dropdownRefUser.current &&
        !dropdownRefUser.current.contains(event.target as Node)
      ) {
        setShowDropdownUser(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideUser);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideUser);
    };
  }, []);

  useEffect(() => {
    setShowDropdownUser(false);
  }, [pathname]);

  useEffect(() => {
    setShowMobileNav(false);
  }, [pathname]);

  // Close all dropdowns on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDropdownInternal(false);
        setShowDropdownLinking(false);
        setShowDropdownUser(false);
        setShowMobileNav(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 left-0 w-full bg-gray-50 shadow-sm border-b border-gray-200 z-50">
      {/* Welcome banner */}
      <div className="bg-primary/70 text-white font-semibold py-2 px-4 text-center text-sm">
        We are happy to announce that PolPaL has officially launched and is now available for public use!
      </div>

      {/* Mobile banner */}
      <div className="lg:hidden bg-primary/10 text-primary font-semibold border border-primary/20 py-2 px-4 text-center text-sm">
        For the best experience, use a wider screen.
      </div>

      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between px-4 lg:px-6 lg:px-8 relative">
        {/* Left: Logo */}
        <Link href="/">
          <div className="flex items-center gap-3 py-4 group">
            <Image
              src="/images/logos/polpal_logo_provisional.png"
              alt="PolPaL Logo"
              width={100}
              height={40}
              className="h-8 w-8 brightness-0 group-hover:brightness-100 transition"
            />
            <span className="font-bold text-xl text-gray-900 group-hover:text-primary/90 transition-colors">
              PolPaL
            </span>
          </div>
        </Link>

        {/* Right: Auth / Contact (moved before nav in DOM so nav wraps to row 2 on small screens) */}
        <div className="flex items-center gap-2 lg:gap-4 py-4">
          {loadingAuth ? null : auth.loggedIn ? (
            <>
              <div className="relative" ref={dropdownRefUser}>
                <button
                  onClick={() => setShowDropdownUser(!showDropdownUser)}
                  aria-haspopup="true"
                  aria-expanded={showDropdownUser}
                  className="text-xs font-semibold text-gray-700 hover:text-primary focus:outline-none max-w-[100px] lg:max-w-none truncate"
                >
                  {auth.username} ▾
                </button>
                {showDropdownUser && (
                  <div className="absolute right-0 mt-2 w-32 bg-white text-gray-700 rounded-lg shadow-lg border border-gray-200 z-50">
                    <Link
                      href="/user"
                      className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors first:rounded-t-lg"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/user/tickets"
                      className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors"
                    >
                      Tickets
                    </Link>
                    {["ADMIN", "DATAMANAGER", "EDITOR"].includes(auth.role ?? "") && (
                      <Link
                        href="/data/quality-checks"
                        className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors"
                      >
                        Quality Checks
                      </Link>
                    )}
                    {["ADMIN"].includes(auth.role ?? "") && (
                      <Link
                        href="/admin/"
                        className="relative block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors last:rounded-b-lg"
                      >
                        Admin
                        {!loadingData && count.count > 0 && (
                          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {count.count}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-700 font-semibold text-xs px-3 py-2 rounded-md shadow-md hover:bg-gray-100 transition"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/authentication/login"
                className="flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-700 font-semibold text-xs px-3 py-2 rounded-md shadow-md hover:bg-gray-100 transition"
              >
                <LogIn className="h-3 w-3" />
                <span className="hidden lg:inline">Login</span>
              </Link>
            </>
          )}
        </div>

        {/* Hamburger button — mobile only, centered */}
        <button
          type="button"
          onClick={() => setShowMobileNav((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={showMobileNav}
          className="lg:hidden absolute left-1/2 -translate-x-1/2 p-1.5 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors focus:outline-none"
        >
          {showMobileNav ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Center: Navigation — desktop only */}
        <nav className="hidden lg:flex lg:flex-nowrap lg:items-center lg:justify-center lg:gap-6 lg:py-4 lg:absolute lg:left-1/2 lg:-translate-x-1/2 text-gray-700 text-sm font-medium">
          <Link
            href="/data/countries"
            className="whitespace-nowrap hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
          >
            Entities
          </Link>
          <Link
            href="/data/projects"
            className="whitespace-nowrap hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
          >
            Data Projects
          </Link>
          <div className="relative" ref={dropdownRefInternal}>
            <button
              onClick={() => setShowDropdownInternal(!showDropdownInternal)}
              aria-haspopup="true"
              aria-expanded={showDropdownInternal}
              className="whitespace-nowrap hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
            >
              Documentation ▾
            </button>
            {showDropdownInternal && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-700 rounded-lg shadow-lg border border-gray-200 z-50">
                <Link
                  href="/documentation/about"
                  className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors first:rounded-t-lg"
                >
                  About
                </Link>
                <Link
                  href="/documentation/codebook"
                  className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors last:rounded-b-lg"
                >
                  Codebook & Documents
                </Link>
                <Link
                  href="/documentation/tutorials"
                  className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors last:rounded-b-lg"
                >
                  Tutorials
                </Link>
                <Link
                  href="/documentation/working-on"
                  className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors last:rounded-b-lg"
                >
                  Data Integration Status
                </Link>
                <Link
                  href="/documentation/news"
                  className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors last:rounded-b-lg"
                >
                  News
                </Link>
              </div>
            )}
          </div>
          {loggedIn ? (
            
            /*
            <div className="relative" ref={dropdownRefLinking}>
              <button
                onClick={() => setShowDropdownLinking(!showDropdownLinking)}
                className="whitespace-nowrap hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              >
                Linking & Validation ▾
              </button>
              {showDropdownLinking && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-gray-700 rounded-lg shadow-lg border border-gray-200 z-50">
                  <Link
                    href="/data/linking"
                    className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors first:rounded-t-lg"
                  >
                    Linking
                  </Link>
                  <Link
                    href="/data/quality-checks"
                    className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors last:rounded-b-lg"
                  >
                    Quality Checks
                  </Link>
                </div>
              )}
            </div>
            */

            <Link
              href="/data/linking"
              className="block px-4 py-3 text-sm hover:bg-gray-50 hover:text-primary transition-colors first:rounded-t-lg whitespace-nowrap"
            >
              Linking
            </Link>

          ) : (
            <Link
              href="/documentation/contribute"
              className="whitespace-nowrap hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
            >
              Contribute to PolPaL
            </Link>
          )}
          <Link
            href="/data/download"
            className="whitespace-nowrap hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
          >
            Download
          </Link>
        </nav>

      </div>

      {/* Mobile nav panel */}
      {showMobileNav && (
        <nav className="lg:hidden border-t border-gray-200 bg-white shadow-md text-gray-700 text-sm font-medium">
          <div className="flex flex-col divide-y divide-gray-100">
            <Link href="/data/countries" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
              Entities
            </Link>
            <Link href="/data/projects" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
              Data Projects
            </Link>
            <Link href="/documentation/about" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
              About
            </Link>
            <Link href="/documentation/codebook" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
              Codebook
            </Link>
            <Link href="/documentation/news" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
              News
            </Link>
            {loggedIn ? (
              <Link href="/data/linking" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
                Linking
              </Link>
            ) : (
              <Link href="/documentation/contribute" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
                Contribute to PolPaL
              </Link>
            )}
            <Link href="/data/download" className="px-6 py-3 hover:bg-gray-50 hover:text-primary transition-colors" onClick={() => setShowMobileNav(false)}>
              Download
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
