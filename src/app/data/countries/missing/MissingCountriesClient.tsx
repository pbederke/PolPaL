"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SearchInput from "@/components/ui/SearchInput";
import { EntityTypesEnum } from "@/lib/shared/enums";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";

type Entities = {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: EntityTypesEnum;
  wikipediaUrl: string | null;
  wikidataId: string | null;
  EntitiesInCountries: unknown[];
};

export default function EntitiesWithoutCountryPage() {
  // State for entities without country assignment
  const [entities, setEntities] = useState<Entities[]>([]);

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // State for search term
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch entities without country assignment on component mount
  useEffect(() => {
    // Create an AbortController to allow request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;

    // Clear previous error and set loading state
    setErrorData(null);
    setLoadingData(true);

    // Fetch entities without country assignment from API
    async function fetchEntitiesWithoutCountry() {
      try {
        const res = await fetch(`/api/entities/without-country`, {
          credentials: "include",
          signal,
        });
        if (!res.ok) throw new Error("Failed to fetch entities");
        const data = await res.json();
        setEntities(data);
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
    fetchEntitiesWithoutCountry();
    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, []);

  // Filter entities based on search term (searching in nameShort, nameEnglish, name, and polpalId)
  const filteredEntities = entities
    .filter((p) =>
      [p.nameShort, p.nameEnglish, p.name, p.polpalId.toString()].some((field) =>
        field?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading entities without country assignment..." message="Fetching entities. Please wait a moment." />;
  }

  // Render error state
  if (errorData || !entities) {
    return <ErrorState message="We encountered an issue while loading the entities without country assignment." error={errorData} backHref="/data/countries" backLabel="Back to Countries" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: "Entities Without Country Assignment" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Entities Without Country Assignment</h1>
          <p className="text-lg text-gray-600">Political entities that are not assigned to any country</p>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 rounded-lg p-3">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">About Missing Country Assignments</h2>
        </div>
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            In case an entity is not assigned to any country, it will be listed here. This might
            indicate missing data, entities that are not country-specific, or the deletion of a country.
            It is possible that some entities listed here are correctly unassigned to any country (for the moment).
          </p>
          <p className="text-gray-700 leading-relaxed">
            If any of these entities are to be assigned to a country, please contact the PolPaL team.
          </p>
        </div>
      </div>

      {/* Entities Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-red-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Unassigned Entities</h2>
              <p className="text-sm text-gray-600">
                {filteredEntities.length === entities.length
                  ? `All ${entities.length} entit${entities.length !== 1 ? 'ies' : 'y'}`
                  : `Showing ${filteredEntities.length} of ${entities.length} entit${entities.length !== 1 ? 'ies' : 'y'}`}
              </p>
            </div>
          </div>

          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search entities..." />
        </div>

        {errorData && <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg border border-red-200">{errorData}</div>}

        {filteredEntities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No entities without country assignment found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 w-24 text-left font-semibold text-gray-900">PolPaL ID</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-24 text-left font-semibold text-gray-900">Type</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-900">Short Name</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-gray-900">English Name</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-28 text-left font-semibold text-gray-900">Wikipedia URL</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-24 text-left font-semibold text-gray-900">Wikidata ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEntities.map((p) => (
                  <tr key={p.polpalId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/data/entities/${p.polpalId}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {p.polpalId}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <EntityTypeBadge entityType={p.entityType} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.nameShort || "–"}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-700">{p.nameEnglish || "–"}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-700">{p.name || "–"}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-600 truncate">
                      {p.wikipediaUrl ? (
                        <a href={p.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Link
                        </a>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-600 truncate">{p.wikidataId || "–"}</td>
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
