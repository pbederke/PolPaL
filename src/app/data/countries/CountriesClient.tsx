"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ButtonAdd } from "@/components/ui/Buttons";
import CountryFlag from "@/components/ui/DisplayFlags";

interface Countries {
  countrycodePolpal: string;
  iso2c: string | null;
  countryname: string;
  region: string;
  inactive: boolean;
  entitiesCount: number;
}

type SortKey = keyof Omit<Countries, "iso2c" | "countrynameOfficialEN">; // exclude iso2c and countrynameOfficialEN
type SortDirection = "asc" | "desc";

export default function CountriesPage() {
  // State for countries data
  const [countries, setCountries] = useState<Countries[]>([]);

  // Get auth context
  const { auth } = useAuth();
  const loggedIn = !!auth?.userId;

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // State for search and sorting
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("countrycodePolpal");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // State for info card
  const [showInfo, setShowInfo] = useState(false);

  // Fetch countries data on mount
  useEffect(() => {
    // Create an AbortController to allow request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;

    // Clear previous error and set loading state
    setErrorData(null);
    setLoadingData(true);

    // Fetch countries data from API
    async function fetchCountries() {
      try {
        const res = await fetch(`/api/countries/counts/`, {
          credentials: "include",
          signal,
        });
        if (!res.ok) throw new Error("Failed to load countries.");
        const data = await res.json();
        setCountries(data);
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

    fetchCountries();
    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, []);

  // Handle sorting when column header is clicked
  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }, [sortKey]);

  // Custom compare function for sorting, with special handling for entitiesCount = 0
  function compare(a: Countries, b: Countries) {
    // Push countries with 0 entities to the bottom
    if (a.entitiesCount === 0 && b.entitiesCount > 0) return 1;
    if (b.entitiesCount === 0 && a.entitiesCount > 0) return -1;

    const valA = a[sortKey];
    const valB = b[sortKey];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else if (typeof valA === "number" && typeof valB === "number") {
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }
    return 0;
  }

  // Filter and sort countries based on search and sorting state
  const filteredCountries = useMemo(() =>
    countries
      .filter((c) =>
        (loggedIn || c.entitiesCount > 0) &&
        [c.countrycodePolpal, c.countryname, c.region].some((field) =>
          field?.toLowerCase().includes(search.toLowerCase())
        )
      )
      .sort(compare),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countries, search, sortKey, sortDirection]
  );

  // Render sort arrow in column header
  function renderSortArrow(column: SortKey) {
    if (column !== sortKey) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading countries..." message="Fetching countries. Please wait a moment." />;
  }

  // Render error state
  if (errorData || !countries) {
    return <ErrorState message="We encountered an issue while loading the countries." error={errorData} backHref="/" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Countries</h1>
        <p className="mt-2 text-sm text-gray-700">
          Countries and territories covered in PolPaL
        </p>
      </div>

      {/* Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowInfo((prev) => !prev)}
          className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="bg-blue-100 rounded-lg p-3 flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">About</h2>
          </div>
          {showInfo ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showInfo && <div className="px-6 pb-6">
          <p className="text-gray-700 mb-4 leading-relaxed text-justify">
            The basis for the list of countries and territories is the R package <em>countrycode</em>, which has been expanded as needed. Flags are used from the <em>country-flag-icons</em> package when available, and supplemented with local files when not.
          </p>
          <p className="text-gray-600 italic text-xs leading-relaxed">
            ** The designation of countries or territories does not imply any judgement by PolPaL or any of its members regarding the legal status of such countries or territories. **
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2 mt-1">
              <span className="text-xs text-gray-600 leading-relaxed">
                Arel-Bundock et al., (2018). countrycode: An R package to convert country names and country codes. Journal of Open Source Software, 3(28), 848,{' '}
                <a
                  href="https://doi.org/10.21105/joss.00848"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  https://doi.org/10.21105/joss.00848
                </a>
                <ExternalLink className="h-2 w-2 flex-shrink-0 text-gray-500 inline ml-1" />
              </span>
            </div>
            <div className="flex items-start gap-2 mt-1">
              <span className="text-xs text-gray-600 leading-relaxed">
                Kuchumov, N. (2026). country-flag-icons.{' '}
                <a
                  href="https://gitlab.com/catamphetamine/country-flag-icons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  https://gitlab.com/catamphetamine/country-flag-icons
                  <ExternalLink className="h-2 w-2 flex-shrink-0 text-gray-500 inline ml-1" />
                </a>
              </span>
            </div>
          </div>
        </div>}
      </div>

      {/* Countries Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">All Countries</h2>
              <p className="text-sm text-gray-600">
                {filteredCountries.length === countries?.length
                  ? `All ${filteredCountries.length} countr${filteredCountries.length !== 1 ? 'ies' : 'y'}`
                  : `Showing ${filteredCountries.length} of ${countries.length} countr${countries.length !== 1 ? 'ies' : 'y'}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/data/entities"
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors whitespace-nowrap"
            >
              Browse all PolPaL entities
            </Link>
            <Link
              href="/data/countries/missing"
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors whitespace-nowrap"
            >
              PolPaL entities w/o countries
            </Link>

            <SearchInput value={search} onChange={setSearch} placeholder="Search countries..." />

            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <ButtonAdd
                text=""
                href="/manage/country/create"
                ariaLabel="Add Country"
              />
            )}
          </div>
        </div>

        {errorData && <div className="text-red-600 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">{errorData}</div>}

        {filteredCountries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No countries found</h3>
            <p className="mt-1 text-sm text-gray-500">No countries match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-xs font-medium">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort("countrycodePolpal")}
                    title="Sort by Code"
                  >
                    Code{renderSortArrow("countrycodePolpal")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort("countryname")}
                    title="Sort by Name"
                  >
                    Name{renderSortArrow("countryname")}
                  </th>
                  <th
                    scope="col"
                    className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort("region")}
                    title="Sort by Region"
                  >
                    Region{renderSortArrow("region")}
                  </th>
                  <th
                    scope="col"
                    className="hidden sm:table-cell px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort("entitiesCount")}
                    title="Sort by Entities"
                  >
                    # PolPaL Entities{renderSortArrow("entitiesCount")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredCountries.map((country) => (
                  <tr key={country.countrycodePolpal} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        key={country.countrycodePolpal}
                        href={`/data/countries/${country.countrycodePolpal}`}
                        className="relative inline-flex items-center justify-center w-12 h-8 rounded overflow-hidden border border-gray-300 hover:border-amber-400 hover:shadow-sm"
                        title={`${country.countrycodePolpal}${country.iso2c ? ` (${country.iso2c})` : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="absolute inset-0 flex items-center justify-center">
                          <CountryFlag
                            iso2c={country.iso2c}
                            countrycodePolpal={country.countrycodePolpal}
                            countryname={country.countryname}
                            size={64}
                          />
                        </span>
                        <span className="absolute inset-0 bg-black/25" />
                        <span className="relative z-10 text-[9px] font-bold text-white drop-shadow">
                          {country.countrycodePolpal}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/data/countries/${country.countrycodePolpal}`}
                        className="text-primary hover:underline"
                      >
                        {country.countryname}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-700">{country.region}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-gray-700">{country.entitiesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}