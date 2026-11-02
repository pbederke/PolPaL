"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Filter, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import { EntityTypesEnum, LanguageCodeEnum, ValidationEnum } from "@/lib/shared/enums";
import PaginationControls from "@/components/ui/PaginationControls";
import { EntityCard } from "@/components/ui/EntityCard";
import { EntryCard } from "@/components/ui/EntryCard";
import CountryFlag from "@/components/ui/DisplayFlags";

interface RejectedEntry {
  entryId: number;
  uniqueObservationId: string;
  entryYear: number | null;
  entryMonth: number | null;
  entryDay: number | null;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShort: string | null;
  entryEntityNameEnglish: string | null;
  entryEntityName: string | null;
  countrycodePolpal: string;
  countryname: string | null;
  iso2c: string | null;
  versionKey: string;
  Projects: { projectNameShort: string };
  Datasets: { datasetNameShort: string };
  Versions: { version: string };
  LinksEntryToEntity: {
    linkEntriesToEntityId: number;
    polpalId: number;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    comment: string | null;
    Entities: {
      nameShort: string;
      nameEnglish: string;
      name: string;
      entityType: EntityTypesEnum;
      wikipediaUrl: string | null;
      wikidataId: string | null;
      EntityNames: {
        entityNameId: number;
        nameShort: string;
        name: string;
        language: LanguageCodeEnum;
        startYear: number | null;
        startMonth: number | null;
        startDay: number | null;
        endYear: number | null;
        endMonth: number | null;
        endDay: number | null;
      }[];
    };
    ValidationLinks: {
      validated: ValidationEnum;
      comment: string | null;
    }[];
  }[];
}

export default function RejectedValidationsClient() {

  // States for data
  const [rejectedValidations, setRejectedValidations] = useState<RejectedEntry[] | null>(null);
  const [deletingLink, setDeletingLink] = useState<Record<number, boolean>>({});
  const [sortBy, setSortBy] = useState<"desc" | "asc">("desc");
  const [filterCountry, setFilterCountry] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // State for loading and error handling
  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;

  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {
      setLoadingData(true);
      setErrorData(null);

      try {
        const res = await fetch(`/api/validate-links/rejected-validations/`, {
          credentials: "include",
          signal,
        });
        if (res.status === 401) return;
        if (!res.ok) throw new Error(await res.text());
        const data: RejectedEntry[] = await res.json();
        setRejectedValidations(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setErrorData(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    };

    fetchData();
    return () => { abortController.abort(); };
  }, []);

  useEffect(() => { setCurrentPage(1); }, [sortBy, filterCountry]);

  // EntityCard's onUnlink already shows its own confirm dialog, so no confirm here
  const deleteLink = useCallback(async (linkEntriesToEntityId: number, uniqueObservationId: string, polpalId: number) => {
    setDeletingLink((prev) => ({ ...prev, [linkEntriesToEntityId]: true }));
    try {
      const res = await fetch('/api/links/by-entries-polpal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uniqueObservationIds: [uniqueObservationId], polpalId }),
      });
      if (!res.ok) throw new Error(`Failed to delete link (${res.status})`);
      setRejectedValidations((prev) =>
        prev
          ?.map((entry) =>
            entry.uniqueObservationId === uniqueObservationId
              ? { ...entry, LinksEntryToEntity: entry.LinksEntryToEntity.filter((l) => l.linkEntriesToEntityId !== linkEntriesToEntityId) }
              : entry
          )
          .filter((entry) => entry.LinksEntryToEntity.length > 0) ?? null
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete link');
    } finally {
      setDeletingLink((prev) => { const n = { ...prev }; delete n[linkEntriesToEntityId]; return n; });
    }
  }, []);

  const totalRejections = (entry: RejectedEntry) =>
    entry.LinksEntryToEntity.reduce((sum, l) => sum + l.ValidationLinks.length, 0);

  const availableCountries = useMemo(() => {
    if (!rejectedValidations) return [];
    const seen = new Map<string, string>();
    for (const entry of rejectedValidations) {
      if (!seen.has(entry.countrycodePolpal)) {
        seen.set(entry.countrycodePolpal, entry.countryname ?? entry.countrycodePolpal);
      }
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rejectedValidations]);

  const sortedValidations = useMemo(() => {
    if (!rejectedValidations) return [];
    return [...rejectedValidations]
      .filter((entry) => !filterCountry || entry.countrycodePolpal === filterCountry)
      .sort((a, b) => {
        const diff = totalRejections(b) - totalRejections(a);
        return sortBy === "desc" ? diff : -diff;
      });
  }, [rejectedValidations, sortBy, filterCountry]);

  const pageCount = Math.max(1, Math.ceil(sortedValidations.length / pageSize));
  const pagedEntries = sortedValidations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loadingData) {
    return <LoadingSpinner title="Loading rejected validations..." message={<>Fetching rejected validations</>} />;
  }

  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading rejected validations.</>} error={errorData} backHref="/" backLabel="Back to Homepage" />;
  }

  if ((!rejectedValidations && !loadingData) || !isLoggedIn) {
    return (
      <NotFoundState
        title="Rejected Validations Not Found"
        message={<>No rejected validations could be found or you don&apos;t have permission to view them.</>}
        backHref="/"
        backLabel="Back to Homepage"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Quality Checks", href: "/data/quality-checks" },
        { label: "Rejected Validations" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Rejected Validations Overview
            </h1>
            <p className="text-gray-500 text-sm">
              Entries that have at least one link with a &quot;REJECTED&quot; validation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center min-w-[10rem]">
              <ShieldAlert className="h-4 w-4 text-red-500 mx-auto mb-1" />
              <span className="text-2xl font-bold text-red-700 block">{rejectedValidations?.length ?? 0}</span>
              <span className="text-xs text-red-500">entr{(rejectedValidations?.length ?? 0) !== 1 ? "ies" : "y"} with rejected links</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{sortedValidations.length}</span> of <span className="font-medium text-gray-900">{rejectedValidations?.length ?? 0}</span> entr{(rejectedValidations?.length ?? 0) !== 1 ? 'ies' : 'y'} with rejected links.
          </p>
          {filterCountry && (
            <button
              type="button"
              onClick={() => setFilterCountry("")}
              className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 transition-colors"
            >
              Clear country
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Country</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All countries</option>
              {availableCountries.map(({ code, name }) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Sort</label>
            <div className="flex rounded border border-gray-300 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSortBy("desc")}
                className={`px-3 py-1.5 transition-colors ${sortBy === "desc" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Most
              </button>
              <button
                type="button"
                onClick={() => setSortBy("asc")}
                className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${sortBy === "asc" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Fewest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Entry list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {!rejectedValidations || rejectedValidations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected validations found</h3>
          </div>
        ) : sortedValidations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
            <h3 className="text-sm font-medium text-gray-900">No results match your filters</h3>
            <button
              type="button"
              onClick={() => setFilterCountry("")}
              className="mt-2 text-xs text-primary hover:underline"
            >Clear filters</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pagedEntries.map((entry) => {
              const entryTotalRejections = totalRejections(entry);
              return (
                <div key={entry.entryId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header bar */}
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
                      <Link
                        href={`/data/countries/${entry.countrycodePolpal}`}
                        title={entry.countryname ?? entry.countrycodePolpal}
                        className="inline-flex items-center"
                      >
                        <CountryFlag
                          iso2c={entry.iso2c ?? undefined}
                          countrycodePolpal={entry.countrycodePolpal}
                          countryname={entry.countryname ?? entry.countrycodePolpal}
                          size={20}
                        />
                      </Link>
                      <span className="text-gray-300">·</span>
                      <span>{entry.Projects.projectNameShort}</span>
                      <span className="text-gray-300">·</span>
                      <span>{entry.Datasets.datasetNameShort}</span>
                      <span className="text-gray-300">·</span>
                      <span>{entry.Versions.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
                        </svg>
                        {entryTotalRejections} rejection{entryTotalRejections !== 1 ? "s" : ""}
                      </span>
                      <Link
                        href={`/data/linking/${entry.versionKey}/${entry.countrycodePolpal}`}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary/5 transition-colors"
                      >
                        Review
                      </Link>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Entry card */}
                    <EntryCard
                      entry={{
                        type: "single",
                        entryId: String(entry.entryId),
                        entryEntityIdVar: entry.entryEntityIdVar,
                        entryEntityId: entry.entryEntityId,
                        entryEntityNameShort: entry.entryEntityNameShort,
                        entryEntityNameEnglish: entry.entryEntityNameEnglish,
                        entryEntityName: entry.entryEntityName,
                        year: entry.entryYear,
                        month: entry.entryMonth,
                        day: entry.entryDay,
                        hasRejected: true,
                      }}
                    />

                    {/* Rejected links */}
                    <div className="flex flex-col gap-4">
                      {entry.LinksEntryToEntity.map((link) => (
                        <div key={link.linkEntriesToEntityId} className="flex flex-col gap-2">

                          {/* Entity card — onUnlink shows trash icon + confirm inside the card */}
                          <EntityCard
                            entity={{
                              polpalId: link.polpalId,
                              nameShort: link.Entities.nameShort,
                              nameEnglish: link.Entities.nameEnglish,
                              name: link.Entities.name,
                              entityType: link.Entities.entityType,
                              wikipediaUrl: link.Entities.wikipediaUrl,
                              wikidataId: link.Entities.wikidataId,
                              EntityNames: link.Entities.EntityNames,
                            }}
                            onUnlink={() => deleteLink(link.linkEntriesToEntityId, entry.uniqueObservationId, link.polpalId)}
                            deleting={!!deletingLink[link.linkEntriesToEntityId]}
                            isLoggedIn={isLoggedIn}
                            hideAppearance
                          />

                          {/* Rejection comments */}
                          {link.ValidationLinks.some((v) => v.comment) && (
                            <ul className="flex flex-col gap-0.5 ml-1">
                              {link.ValidationLinks.filter((v) => v.comment).map((v, i) => (
                                <li key={i} className="text-[10px] text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 italic">
                                  &ldquo;{v.comment}&rdquo;
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              variant="simple"
            />
          </div>
        )}
      </div>
    </div>
  );
}
