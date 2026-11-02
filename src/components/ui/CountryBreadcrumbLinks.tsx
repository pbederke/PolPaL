"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const MAX_VISIBLE = 5;

interface CountryBreadcrumbLinksProps {
  countries: { countrycodePolpal: string; countryname?: string }[] | undefined | null;
  showWorld?: boolean;
}

export default function CountryBreadcrumbLinks({ countries, showWorld }: CountryBreadcrumbLinksProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  if (showWorld) {
    return (
      <Link href="/data/countries" className="text-primary hover:underline">
        World
      </Link>
    );
  }

  if (!Array.isArray(countries) || countries.length === 0) {
    return (
      <span className="text-gray-400 italic">
        <Link
          href="/data/countries/missing"
          className="text-primary italic hover:underline"
        >
          missing
        </Link>
      </span>
    );
  }

  const sorted = countries
    .slice()
    .sort((a, b) =>
      (a.countrycodePolpal ?? "").localeCompare(b.countrycodePolpal ?? "")
    );

  const visible = sorted.slice(0, MAX_VISIBLE);
  const overflow = sorted.slice(MAX_VISIBLE);

  return (
    <>
      {visible.map((pc, index) => (
        <span key={pc.countrycodePolpal} className="flex items-center">
          <Link
            href={`/data/countries/${pc.countrycodePolpal ?? ""}`}
            className="text-primary hover:underline"
            title={pc.countryname}
          >
            {pc.countrycodePolpal ?? "?"}
          </Link>
          {(index < visible.length - 1 || overflow.length > 0) && (
            <span className="mx-1">|</span>
          )}
        </span>
      ))}
      {overflow.length > 0 && (
        <span
          className="relative flex items-center cursor-default"
          onMouseEnter={() => { cancelClose(); setOpen(true); }}
          onMouseLeave={scheduleClose}
        >
          <span className="text-primary">…</span>
          {open && (
            <span
              className="absolute left-0 top-full mt-1 flex flex-wrap gap-1 bg-white border border-gray-200 rounded shadow-lg px-2 py-1 z-50 whitespace-nowrap"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {overflow.map((pc) => (
                <span key={pc.countrycodePolpal}>
                  <Link
                    href={`/data/countries/${pc.countrycodePolpal ?? ""}`}
                    className="text-primary hover:underline"
                    title={pc.countryname}
                  >
                    {pc.countrycodePolpal ?? "?"}
                  </Link>
                </span>
              ))}
            </span>
          )}
        </span>
      )}
    </>
  );
}
