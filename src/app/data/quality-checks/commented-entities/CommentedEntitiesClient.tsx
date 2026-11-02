"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useMemo, useState } from "react";
import { Filter, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import SearchInput from "@/components/ui/SearchInput";
import { EntityTypesEnum } from "@/lib/shared/enums";
import PaginationControls from "@/components/ui/PaginationControls";
import { EntityCard } from "@/components/ui/EntityCard";
import CountryFlag from "@/components/ui/DisplayFlags";
import Link from "next/link";

interface CommentedEntity {
  polpalId: number;
  isHidden: boolean;
  isHiddenReason: string | null;
  nameShort: string;
  nameEnglish: string;
  name: string | null;
  entityType: EntityTypesEnum;
  wikipediaUrl: string | null;
  wikidataId: string | null;
  comment: string;
  EntitiesInCountries: {
    countrycodePolpal: string;
    Countries: {
      iso2c: string | null;
      countryname: string | null;
      region: string | null;
    } | null;
  }[];
}

const COUNTRY_PREVIEW = 8;

function EntityCommentCard({
  entity,
  isLoggedIn,
}: {
  entity: CommentedEntity;
  isLoggedIn: boolean;
}) {
  const [showAllCountries, setShowAllCountries] = useState(false);
  const countries = entity.EntitiesInCountries;
  const overflow = countries.length > COUNTRY_PREVIEW;
  const visibleCountries = overflow && !showAllCountries ? countries.slice(0, COUNTRY_PREVIEW) : countries;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-yellow-200 flex flex-col overflow-hidden">

      {/* Country flags */}
      <div className="flex flex-wrap items-center gap-1 px-3 pt-3">
        {visibleCountries.map((eic) => (
          <Link
            key={eic.countrycodePolpal}
            href={`/data/countries/${eic.countrycodePolpal}`}
            title={eic.Countries?.countryname ?? eic.countrycodePolpal}
          >
            <CountryFlag
              iso2c={eic.Countries?.iso2c ?? null}
              countrycodePolpal={eic.countrycodePolpal}
              countryname={eic.Countries?.countryname ?? eic.countrycodePolpal}
              size={20}
            />
          </Link>
        ))}
        {overflow && (
          <button
            type="button"
            onClick={() => setShowAllCountries((v) => !v)}
            className="text-[10px] text-primary hover:underline font-medium"
          >
            {showAllCountries ? "Show less" : `+${countries.length - COUNTRY_PREVIEW} more`}
          </button>
        )}
      </div>

      {/* EntityCard */}
      <div className="p-3">
        <EntityCard
          entity={{
            polpalId: entity.polpalId,
            nameShort: entity.nameShort,
            nameEnglish: entity.nameEnglish,
            name: entity.name ?? "",
            entityType: entity.entityType,
            wikipediaUrl: entity.wikipediaUrl,
            wikidataId: entity.wikidataId,
            EntityNames: [],
          }}
          isLoggedIn={isLoggedIn}
        />
      </div>

      {/* Comment */}
      {entity.comment && (
        <div className="flex items-start gap-1.5 text-xs text-yellow-800 bg-yellow-50 border-t border-yellow-100 px-3 py-2">
          <MessageSquare className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{entity.comment}</span>
        </div>
      )}
    </div>
  );
}

export default function CommentedEntitiesClient() {
  const [entities, setEntities] = useState<CommentedEntity[] | null>(null);

  const [filterRegion, setFilterRegion] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

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
        const res = await fetch("/api/entities/commented-entities/", {
          credentials: "include",
          signal,
        });
        if (res.status === 401) return;
        if (!res.ok) throw new Error(await res.text());
        const data: CommentedEntity[] = await res.json();
        setEntities(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setErrorData(err instanceof Error ? err.message : String(err));
      } finally {
        if (!abortController.signal.aborted) setLoadingData(false);
      }
    };

    fetchData();
    return () => abortController.abort();
  }, []);

  const availableRegions = useMemo(() => {
    if (!entities) return [];
    const regions = new Set<string>();
    for (const entity of entities) {
      for (const eic of entity.EntitiesInCountries) {
        if (eic.Countries?.region) regions.add(eic.Countries.region);
      }
    }
    return Array.from(regions).sort();
  }, [entities]);

  const availableCountries = useMemo(() => {
    if (!entities) return [];
    const seen = new Map<string, string>();
    for (const entity of entities) {
      for (const eic of entity.EntitiesInCountries) {
        if (!filterRegion || eic.Countries?.region === filterRegion) {
          if (!seen.has(eic.countrycodePolpal)) {
            seen.set(eic.countrycodePolpal, eic.Countries?.countryname ?? eic.countrycodePolpal);
          }
        }
      }
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entities, filterRegion]);

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    const lower = search.trim().toLowerCase();
    return entities.filter((entity) => {
      if (!entity.comment) return false;
      if (filterCountry && !entity.EntitiesInCountries.some((eic) => eic.countrycodePolpal === filterCountry)) return false;
      if (filterRegion && !entity.EntitiesInCountries.some((eic) => eic.Countries?.region === filterRegion)) return false;
      if (lower) {
        return (
          String(entity.polpalId).includes(lower) ||
          entity.nameShort.toLowerCase().includes(lower) ||
          entity.nameEnglish.toLowerCase().includes(lower) ||
          (entity.name?.toLowerCase().includes(lower) ?? false) ||
          entity.comment.toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [entities, filterRegion, filterCountry, search]);

  useEffect(() => { setCurrentPage(1); }, [filterRegion, filterCountry, search]);

  const pageCount = Math.max(1, Math.ceil(filteredEntities.length / pageSize));
  const pagedEntities = filteredEntities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loadingData) {
    return <LoadingSpinner title="Loading commented entities..." message="Fetching entities with comments. Please wait a moment." />;
  }

  if (errorData) {
    return <ErrorState message="We encountered an issue while loading commented entities." error={errorData} backHref="/" backLabel="Back to Homepage" />;
  }

  if (!entities && !loadingData || !isLoggedIn) {
    return (
      <NotFoundState
        title="Commented Entities Not Found"
        message="No commented entities could be found or you don't have permission to view them."
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
        { label: "Commented Entities" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Quality Check: Commented Entities
            </h1>
            <p className="text-gray-500 text-sm">
              All entities that have an internal comment attached.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center min-w-[10rem]">
              <MessageSquare className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <span className="text-2xl font-bold text-amber-700 block">{entities?.length ?? 0}</span>
              <span className="text-xs text-amber-500">commented entit{(entities?.length ?? 0) !== 1 ? "ies" : "y"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
            {(filterRegion || filterCountry || search) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                {[filterRegion, filterCountry, search].filter(Boolean).length} active
              </span>
            )}
          </div>
          {(filterRegion || filterCountry || search) && (
            <button
              type="button"
              onClick={() => { setFilterRegion(""); setFilterCountry(""); setSearch(""); }}
              className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ID, name, comment..."
              className="w-full"
              size="sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Region</label>
            <select
              value={filterRegion}
              onChange={(e) => { setFilterRegion(e.target.value); setFilterCountry(""); }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All regions</option>
              {availableRegions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Country
              {filterRegion && <span className="ml-1 font-normal text-gray-400">(filtered by region)</span>}
            </label>
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
        </div>
      </div>

      {/* Results summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 mb-4">
            Showing <span className="font-medium text-gray-800">{filteredEntities.length}</span> of <span className="font-medium text-gray-800">{entities?.length ?? 0}</span> commented entit{(entities?.length ?? 0) !== 1 ? "ies" : "y"}
          </p>
        </div>

        {/* Entity cards */}
        {!entities || entities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No commented entities found</h3>
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
            <h3 className="text-sm font-medium text-gray-900">No results match your filters</h3>
            <button
              type="button"
              onClick={() => { setFilterRegion(""); setFilterCountry(""); setSearch(""); }}
              className="mt-2 text-xs text-primary hover:underline"
            >Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {pagedEntities.map((entity) => (
                <EntityCommentCard key={entity.polpalId} entity={entity} isLoggedIn={isLoggedIn} />
              ))}


            </div>
            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            />
          </>
        )}
      </div>
    </div>
  );
}
