'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-700 py-2 mt-4 shadow-sm border-t border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 relative">
        {/* Left text */}
        <div className="flex-1 flex items-center justify-center md:justify-start">
          <Link href="/documentation/imprint" className="text-sm hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors">
            Imprint
          </Link>
          <Link href="/documentation/data-protection" className="text-sm hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors">
            Data Protection
          </Link>
          <Link href="/documentation/contact" className="text-sm hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors">
            Contact
          </Link>
          <Link
            href="https://github.com/pbederke/PolPaL"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="PolPaL on GitHub"
            className="text-gray-700 hover:text-primary p-2 rounded-md transition-colors"
          >
            <Image src="/images/logos/github-logo.svg" alt="" width={16} height={16} />
          </Link>
        </div>

        {/* Center logos */}
        <div className="flex-1.5 flex items-center justify-between gap-5 outline outline-1 outline-gray-300 rounded-md px-5 py-2 bg-white">
          <Link
            href="https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/images/logos/eufunding_logo.png"
              alt="EU Funding Logo"
              width={90}
              height={28}
              className="hover:opacity-80 transition bg-white h-7 w-auto rounded"
            />
          </Link>
          <Link href="https://oscars-project.eu/" target="_blank" rel="noopener noreferrer">
            <Image
              src="/images/logos/oscars_logo.png"
              alt="OSCARS Logo"
              width={90}
              height={28}
              className="hover:opacity-80 transition bg-white h-7 w-auto rounded"
            />
          </Link>
          <Link href="https://www.gesis.org/" target="_blank" rel="noopener noreferrer">
            <Image
              src="/images/logos/gesis_logo.jpg"
              alt="GESIS Logo"
              width={90}
              height={28}
              className="hover:opacity-80 transition bg-white h-7 w-auto rounded"
            />
          </Link>
          <Link href="https://www.medem.eu/" target="_blank" rel="noopener noreferrer">
            <Image
              src="/images/logos/medem_logo.png"
              alt="MEDEM Logo"
              width={90}
              height={28}
              className="hover:opacity-80 transition bg-white h-7 w-auto rounded"
            />
          </Link>
        </div>

        {/* Right text */}
        <div className="flex-1 flex items-center justify-center md:justify-end mb-2 md:mb-0">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-gray-900">PolPaL</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
