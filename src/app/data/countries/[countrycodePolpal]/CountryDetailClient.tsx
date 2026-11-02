"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, TrendingUp } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { HomepageFigure } from "@/components/ui/HomepageFigure";
import type { EntityYearItem } from "@/components/ui/HomepageFigure";
import SearchInput from "@/components/ui/SearchInput";
import { EntityTypesEnum } from "@/lib/shared/enums";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ButtonAdd, ButtonDelete, ButtonUpdate } from "@/components/ui/Buttons";
import CountryFlag from "@/components/ui/DisplayFlags";
import { CountryEntityCard } from "@/components/ui/CountryEntityCard";

interface Countries {
  countrycodePolpal: string;
  countryname: string;
  iso2c?: string;
  iso3c?: string;
  iso3n?: string;
  region?: string;
  regionCode?: number;
  regionSub?: string;
  regionSubCode?: number;
  regionIntermediate?: string;
  regionIntermediateCode?: number;
}

interface EntitiesInCountries {
  polpalId: number;
  partyfactsId?: number | null;
  nameEnglish: string;
  nameShort: string;
  name: string;
  entityType: EntityTypesEnum;
  wikipediaUrl: string;
  wikidataId: string;
  color: string | null;
  EntityNames: {
    nameShort: string;
    name: string;
    language: string;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
  }[];
  appearanceFirst: number | null;
  appearanceLast: number | null;
  datasetCount: number;

}

interface VersionFlat {
  versionKey: string;
  version: string;
  versionName: string | null;
  versionUrl: string;
  versionCitation: string[];
  versionIsHidden: boolean;
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  projectUrl: string;
  projectIsHidden: boolean;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  datasetUrl: string;
  datasetIsHidden: boolean;
}

interface VersionInfo {
  versionKey: string;
  version: string;
  versionName: string | null;
  versionUrl: string;
  versionCitation: string[];
}

interface DatasetInfo {
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  datasetUrl: string;
  versions: VersionInfo[];
}

interface ProjectInfo {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  projectUrl: string;
  datasets: DatasetInfo[];
}

type SortKey =
  | "polpalId"
  | "nameShort"
  | "nameEnglish"
  | "entityType"

type SortDirection = "asc" | "desc";

export default function CountryDetailClient() {
  const router = useRouter();

  // State for country data, entities data, and versions data
  const [countryData, setCountryData] = useState<Countries | null>(null);
  const [entitiesData, setEntitiesData] = useState<EntitiesInCountries[]>([]);
  const [versionsData, setVersionsData] = useState<VersionFlat[]>([]);
  const [entityByYear, setEntityByYear] = useState<EntityYearItem[]>([]);

  const { auth } = useAuth();

  // Get country code from URL params
  const params = useParams();
  const countrycodePolpal = params.countrycodePolpal as string;

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // State for info card
  const [showInfo, setShowInfo] = useState(false);

  // State for appearances figure
  const [showFigure, setShowFigure] = useState(false);

  // State for search and sorting
  const [entitySearch, setEntitySearch] = useState("");
  const [sortKey] = useState<SortKey>("nameShort");
  const [sortDirection] = useState<SortDirection>("asc");

  // Version search state
  const [versionSearch, setVersionSearch] = useState("");

  const isLoggedIn = !!auth?.userId;

  const visibleVersions = !isLoggedIn
    ? versionsData.filter((v) => !v.versionIsHidden && !v.projectIsHidden && !v.datasetIsHidden)
    : versionsData;

  // Expandable state for versions tree
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const toggleProject = (key: string) =>
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const toggleDataset = (projectKey: string, datasetKey: string) =>
    setExpandedDatasets((prev) => {
      const k = `${projectKey}-${datasetKey}`;
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });

  const expandAll = () => {
    setExpandedProjects(new Set(groupedVersions.map((p) => p.projectKey)));
    setExpandedDatasets(new Set(groupedVersions.flatMap((p) => p.datasets.map((d) => `${p.projectKey}-${d.datasetKey}`))));
  };
  const collapseAll = () => {
    setExpandedProjects(new Set());
    setExpandedDatasets(new Set());
  };

  const lowerSearch = versionSearch.toLowerCase().trim();
  const filteredForSearch = !lowerSearch
    ? visibleVersions
    : versionsData.filter((v) =>
      v.projectNameShort.toLowerCase().includes(lowerSearch) ||
      v.projectName.toLowerCase().includes(lowerSearch) ||
      v.datasetNameShort.toLowerCase().includes(lowerSearch) ||
      v.datasetName.toLowerCase().includes(lowerSearch) ||
      v.version.toLowerCase().includes(lowerSearch) ||
      (v.versionName && v.versionName.toLowerCase().includes(lowerSearch)) ||
      (v.versionCitation && v.versionCitation.some((c) => c.toLowerCase().includes(lowerSearch)))
    );

  const projectMap = new Map<string, { project: ProjectInfo; datasets: Map<string, DatasetInfo> }>();
  for (const v of filteredForSearch) {
    if (!projectMap.has(v.projectKey)) {
      projectMap.set(v.projectKey, {
        project: { projectKey: v.projectKey, projectNameShort: v.projectNameShort, projectName: v.projectName, projectUrl: v.projectUrl, datasets: [] },
        datasets: new Map(),
      });
    }
    const entry = projectMap.get(v.projectKey)!;
    if (!entry.datasets.has(v.datasetKey)) {
      entry.datasets.set(v.datasetKey, {
        datasetKey: v.datasetKey,
        datasetNameShort: v.datasetNameShort,
        datasetName: v.datasetName,
        datasetUrl: v.datasetUrl,
        versions: [],
      });
    }
    entry.datasets.get(v.datasetKey)!.versions.push({
      versionKey: v.versionKey,
      version: v.version,
      versionName: v.versionName,
      versionUrl: v.versionUrl,
      versionCitation: v.versionCitation,
    });
  }
  const groupedVersions = Array.from(projectMap.values())
    .sort((a, b) => a.project.projectName.localeCompare(b.project.projectName))
    .map((entry) => ({
      ...entry.project,
      datasets: Array.from(entry.datasets.values())
        .sort((a, b) => a.datasetName.localeCompare(b.datasetName))
        .map((d) => ({
          ...d,
          versions: d.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })),
        })),
    }));

  // Fetch country and entities data on mount and when country code changes
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchAllData() {

      setLoadingData(true);
      setErrorData(null);

      try {
        const [countryRes, entitiesRes, versionsRes, entityByYearRes] = await Promise.all([
          fetch(`/api/countries/${countrycodePolpal}`, {
            credentials: "include",
            signal,
          }),
          fetch(`/api/entities-in-countries/entities/${countrycodePolpal}`, {
            credentials: "include",
            signal,
          }),
          fetch(`/api/countries/${countrycodePolpal}/versions`, {
            credentials: "include",
            signal,
          }),
          fetch(`/api/internal/entities-by-year/${countrycodePolpal}`, {
            credentials: "include",
            signal,
          }),
        ]);

        if (!countryRes.ok) throw new Error("Failed to load country info");
        if (!entitiesRes.ok) throw new Error("Failed to load entities info");
        if (!versionsRes.ok) throw new Error("Failed to load versions info");
        if (!entityByYearRes.ok) throw new Error("Failed to load entity appearances");

        const [countryData, entitiesData, versionsData, entityByYearData] = await Promise.all([
          countryRes.json(),
          entitiesRes.json(),
          versionsRes.json(),
          entityByYearRes.json(),
        ]);

        setCountryData(countryData);
        setEntitiesData(entitiesData);
        setVersionsData(versionsData);
        setEntityByYear(Array.isArray(entityByYearData) ? entityByYearData : []);

      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error fetching data:", err);
          setErrorData(err instanceof Error ? err.message : String(err));
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchAllData();
    return () => {
      abortController.abort();
    };
  }, [countrycodePolpal]);

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle delete country — opens the confirmation modal
  const handleDeleteCountry = () => {
    setDeleteComment("");
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleDeleteCountryConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const comment = deleteComment.trim();
      const res = await fetch(`/api/countries/${countrycodePolpal}`, {
        method: "DELETE",
        credentials: "include",
        ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setDeleteModalOpen(false);
      router.push("/data/countries");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Close modal on Escape
  useEffect(() => {
    if (!deleteModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteLoading) {
        setDeleteModalOpen(false);
        setDeleteError(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [deleteModalOpen, deleteLoading]);

  // Combine all entities into one list
  const allEntities = useMemo(() => entitiesData, [entitiesData]);

  // Get the value to sort by based on the current sort key
  function getSortValue(item: EntitiesInCountries, key: SortKey) {
    switch (key) {
      case "polpalId":
        return item.polpalId;
      case "nameShort":
        return item.nameShort;
      case "nameEnglish":
        return item.nameEnglish;
      case "entityType":
        return item.entityType;
      default:
        return "";
    }
  }

  // Adapted for API response: Entities.LinksEntryToEntity (not LinkEntryToEntity), and Entries is an object not array
  const filteredEntities = useMemo(() => {
    return allEntities
      .filter((p) => {
        const lower = entitySearch.toLowerCase();

        const matchesEntityNames = p.EntityNames?.some(
          (n) =>
            n.nameShort?.toLowerCase().includes(lower) ||
            n.name?.toLowerCase().includes(lower)
        );

        return (
          p.polpalId.toString().includes(lower) ||
          p.nameShort?.toLowerCase().includes(lower) ||
          p.nameEnglish?.toLowerCase().includes(lower) ||
          p.name?.toLowerCase().includes(lower) ||
          p.entityType?.toLowerCase().includes(lower) ||
          matchesEntityNames
        );
      })
      .sort((a, b) => {
        const valA = getSortValue(a, sortKey);
        const valB = getSortValue(b, sortKey);

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [allEntities, entitySearch, sortKey, sortDirection]);

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading PolPaL entities..." message={<>Fetching PolPaL entities in {countrycodePolpal}. Please wait a moment.</>} />;
  }

  // Render error state
  if (errorData || !entitiesData || !countryData) {
    return <ErrorState message={<>We encountered an issue while loading PolPaL entities in {countrycodePolpal}.</>} error={errorData} backHref="/data/countries" backLabel="Back to Countries" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: countryData.countrycodePolpal },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              {countryData.countryname} ({countryData.countrycodePolpal})
              <CountryFlag
                iso2c={countryData.iso2c}
                countrycodePolpal={countryData.countrycodePolpal}
                countryname={countryData.countryname}
                size={40}
              />
            </h1>
            <p className="text-sm text-gray-500">Browse available PolPaL entities and data versions for {countryData.countryname}.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {["ADMIN", "DATAMANAGER", "EDITOR"].includes(auth.role ?? "") && (
              <ButtonUpdate
                text=""
                href={`/manage/country/update/${countryData.countrycodePolpal}`}
                ariaLabel="Update Country"
              />
            )}
            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <ButtonDelete
                text=""
                onClick={handleDeleteCountry}
                ariaLabel="Delete Country"
              />
            )}
          </div>
        </div>
      </div>

      {/* Country Details */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowInfo((prev) => !prev)}
          className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
        >

          <div className="bg-blue-100 rounded-xl p-3 flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">Country Information</h2>
            <p className="text-sm text-gray-600">
              ISO 3166 codes and UN Geoscheme information for {countryData.countryname}
            </p>
          </div>
          {showInfo ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showInfo && <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                ISO 3166 Codes <a href="https://www.iso.org/iso-3166-country-codes.html" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary hover:text-primary/80 inline-block" /></a>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alpha-2</span>
                  <span className="text-sm font-semibold text-gray-900 font-mono">{countryData.iso2c || "—"}</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alpha-3</span>
                  <span className="text-sm font-semibold text-gray-900 font-mono">{countryData.iso3c || "—"}</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Numeric-3</span>
                  <span className="text-sm font-semibold text-gray-900 font-mono">{countryData.iso3n || "—"}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                UN Geoscheme <a href="https://unstats.un.org/unsd/methodology/m49/" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary hover:text-primary/80 inline-block" /></a>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Region</span>
                  <span className="text-sm font-semibold text-gray-900 text-right">
                    {countryData.region
                      ? `${countryData.region} (${countryData.regionCode ?? "—"})`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subregion</span>
                  <span className="text-sm font-semibold text-gray-900 text-right">
                    {countryData.regionSub
                      ? `${countryData.regionSub} (${countryData.regionSubCode ?? "—"})`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Intermediate</span>
                  <span className="text-sm font-semibold text-gray-900 text-right">
                    {countryData.regionIntermediate
                      ? `${countryData.regionIntermediate} (${countryData.regionIntermediateCode ?? "—"})`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>}
      </div>

      {/* PolPaL Entity Appearances Over Time */}
      {entityByYear.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowFigure((prev) => !prev)}
            className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">
                PolPaL Entity Appearances Over Time
              </h2>
              <p className="text-sm text-gray-600">
                Appearance of PolPaL entities in {countryData.countryname} in datasets across years (1880 onwards; pre-1880 grouped)
              </p>
            </div>
            {showFigure ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </button>
          {showFigure && <div className="px-6 pb-6">
            <HomepageFigure data={entityByYear} />
          </div>}
        </div>
      )}

      {/* Entities Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-green-100 rounded-lg p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                PolPaL entities in {countryData.countryname}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredEntities.length === entitiesData.length
                  ? `All ${entitiesData.length} entit${entitiesData.length !== 1 ? 'ies' : 'y'}`
                  : `Showing ${filteredEntities.length} of ${entitiesData.length} entit${entitiesData.length !== 1 ? 'ies' : 'y'}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={entitySearch} onChange={setEntitySearch} placeholder="Search entities..." />

            {["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "") && (
              <ButtonAdd
                text=""
                href={
                  auth.role === "CONTRIBUTOR"
                    ? `/user/tickets?title=${encodeURIComponent(`Request: Create new entity in ${countryData.countrycodePolpal}`)}&description=${encodeURIComponent(`Country: ${countryData.countryname} (${countryData.countrycodePolpal})\n\nPlease describe the entity to be created:\n- Short name (nameShort):\n- English name (nameEnglish):\n- Entity type (PARTY / GROUPING / OTHER):\n- Additional information (e.g., Wikipedia Page):`)}&url=${encodeURIComponent(`${window.location.origin}/data/countries/${countryData.countrycodePolpal}`)}`
                    : `/manage/entity/create?countrycodePolpal=${countryData.countrycodePolpal}`
                }
                ariaLabel={auth.role === "CONTRIBUTOR" ? "Request creation of a new PolPaL entity" : "Add new Entity"}
              />
            )}
          </div>
        </div>

        {filteredEntities.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <h3 className="text-sm font-medium text-gray-900">No entities found</h3>
            <p className="text-sm text-gray-500">No entities match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-0">
            {/* Column header */}
            <div className="grid grid-cols-[1rem_4rem_0.75rem_5rem] sm:grid-cols-[1rem_4rem_0.75rem_5rem_1fr_1fr_6rem_4rem_4rem] lg:grid-cols-[1rem_4rem_0.75rem_5rem_1fr_1fr_6rem_9rem_4rem_4rem] items-center gap-2 px-2 pb-1 border-t border-gray-200 mt-1 py-2 border-l border-r border-gray-200 bg-gray-50 font-medium text-gray-800 uppercase tracking-wide rounded-tl rounded-tr font-semibold border-l-4 border-r-4">
              <span />
              <span className="text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">PolPaL ID</span>
              <span />
              <span className="text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">Short Name</span>
              <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide px-5">English Name</span>
              <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide px-5">Name</span>
              <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">Type</span>
              <span className="hidden lg:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide px-5">Appearance</span>
              <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">Datasets</span>
              <span className="hidden sm:inline" />
            </div>
            {filteredEntities.map((entity) => (
              <CountryEntityCard key={entity.polpalId} entity={entity} />
            ))}
          </div>
        )}
      </div>

      {/* Data Versions — expandable tree */}
      {versionsData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Data Versions for {countryData.countryname}
                </h2>
                <p className="text-sm text-gray-600">
                  {groupedVersions.reduce((s, p) => s + p.datasets.reduce((s2, d) => s2 + d.versions.length, 0), 0)} version{groupedVersions.reduce((s, p) => s + p.datasets.reduce((s2, d) => s2 + d.versions.length, 0), 0) !== 1 ? "s" : ""} with entries in this country
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              >Expand All</button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              >Collapse All</button>
              <SearchInput
                className="w-83"
                value={versionSearch}
                onChange={setVersionSearch}
                placeholder="Search projects, datasets, versions, authors..."
              />
            </div>
          </div>

          {groupedVersions.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full table-fixed divide-y divide-gray-200 text-[11px] leading-tight">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-2 py-3 w-12" />
                    <th scope="col" className="px-4 py-3 w-28 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Project Abbr.</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Project</th>
                    <th scope="col" className="hidden sm:table-cell px-4 py-3 w-24 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap"># Datasets</th>
                    <th scope="col" className="hidden sm:table-cell px-4 py-3 w-24 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap"># Versions</th>
                    <th scope="col" className="hidden lg:table-cell px-4 py-3 w-36 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Reference(s)</th>
                    <th scope="col" className="hidden lg:table-cell px-4 py-3 w-56 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">URL</th>
                    <th scope="col" className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {groupedVersions.flatMap((p) => [
                    <tr
                      key={`proj-${p.projectKey}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleProject(p.projectKey)}
                    >
                      <td className="px-2 py-3 border-l-4 border-purple-300">
                        <div className="flex items-center justify-start gap-1">
                          <span className="text-[9px] font-bold text-purple-600 bg-purple-50 rounded px-1 py-0.5 leading-none">P</span>
                          {p.datasets.length > 0 && (
                            expandedProjects.has(p.projectKey)
                              ? <ChevronDown className="w-3 h-3 text-gray-400" />
                              : <ChevronRight className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <Link
                          href={`/data/projects/${p.projectKey}`}
                          className="text-primary font-semibold hover:underline whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.projectNameShort}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <Link
                          href={`/data/projects/${p.projectKey}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.projectName}
                        </Link>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-700 text-center">
                        {p.datasets.length}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-700 text-center">
                        {p.datasets.reduce((s, d) => s + d.versions.length, 0)}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-gray-400">—</td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {p.projectUrl ? (
                          <Link
                            href={p.projectUrl}
                            target="_blank"
                            className="text-black flex items-center gap-1 hover:underline hover:text-primary"
                            title={p.projectUrl}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="inline-block w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{p.projectUrl}</span>
                          </Link>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>,
                    ...(expandedProjects.has(p.projectKey)
                      ? p.datasets.flatMap((d) => {
                        const dsKey = `${p.projectKey}-${d.datasetKey}`;
                        const datasetVersionsCount = d.versions.length;
                        return [
                          <tr
                            key={`ds-${dsKey}`}
                            className="bg-blue-50 cursor-pointer"
                            onClick={() => toggleDataset(p.projectKey, d.datasetKey)}
                          >
                            <td className="px-2 py-2 border-l-4 border-blue-400">
                              <div className="flex items-center justify-start gap-1">
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-100 rounded px-0.5 py-0.5 leading-none">DS</span>
                                {datasetVersionsCount > 0 && (
                                  expandedDatasets.has(dsKey)
                                    ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                    : <ChevronRight className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 pl-6 text-gray-700">
                              <Link
                                href={`/data/projects/${p.projectKey}/${d.datasetKey}`}
                                className="text-primary hover:underline whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {d.datasetNameShort}
                              </Link>
                            </td>
                            <td className="px-4 py-2 pl-6 text-gray-700">
                              <Link
                                href={`/data/projects/${p.projectKey}/${d.datasetKey}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {d.datasetName}
                              </Link>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-2 text-gray-400 text-center">—</td>
                            <td className="hidden sm:table-cell px-4 py-2 text-gray-700 text-center">{datasetVersionsCount}</td>
                            <td className="hidden lg:table-cell px-4 py-2 text-gray-400">—</td>
                            <td className="hidden lg:table-cell px-4 py-2">
                              {d.datasetUrl ? (
                                <Link
                                  href={d.datasetUrl}
                                  target="_blank"
                                  className="text-black flex items-center gap-1 hover:underline hover:text-primary"
                                  title={d.datasetUrl}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="inline-block w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[200px]">{d.datasetUrl}</span>
                                </Link>
                              ) : (
                                <span className="text-gray-400">–</span>
                              )}
                            </td>
                            <td className="px-4 py-2" />
                          </tr>,
                          ...(expandedDatasets.has(dsKey)
                            ? d.versions.map((v) => (
                              <tr key={`v-${dsKey}-${v.versionKey}`} className="bg-green-50">
                                <td className="px-2 py-2 border-l-4 border-green-500">
                                  <div className="flex items-center justify-start gap-1">
                                    <span className="text-[9px] font-bold text-green-600 bg-green-100 rounded px-1 py-0.5 leading-none">V</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 pl-8 text-gray-600">
                                  <Link
                                    href={`/data/projects/${p.projectKey}/${d.datasetKey}/${v.versionKey}`}
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {v.version}
                                  </Link>
                                </td>
                                <td className="px-4 py-2 pl-8 text-gray-600">
                                  <Link
                                    href={`/data/projects/${p.projectKey}/${d.datasetKey}/${v.versionKey}`}
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {v.versionName ?? v.version}
                                  </Link>
                                </td>
                                <td className="hidden sm:table-cell px-4 py-2 text-gray-400 text-center">—</td>
                                <td className="hidden sm:table-cell px-4 py-2 text-gray-400 text-center">—</td>
                                <td className="hidden lg:table-cell px-4 py-2 text-gray-600 text-[10px]">
                                  {v.versionCitation && v.versionCitation.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-0.5">
                                      {v.versionCitation.map((c, i) => (
                                        <li key={i} className="truncate max-w-[200px]" title={c}>{c}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="hidden lg:table-cell px-4 py-2">
                                  {v.versionUrl ? (
                                    <Link
                                      href={v.versionUrl}
                                      target="_blank"
                                      className="text-black flex items-center gap-1 hover:underline hover:text-primary"
                                      title={v.versionUrl}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="inline-block w-3 h-3 shrink-0" />
                                      <span className="truncate max-w-[200px]">{v.versionUrl}</span>
                                    </Link>
                                  ) : (
                                    <span className="text-gray-400">–</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <Link
                                    href={`/data/projects/${p.projectKey}/${d.datasetKey}/${v.versionKey}/${countrycodePolpal}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 hover:border-green-400 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))
                            : []),
                        ];
                      })
                      : []),
                  ])}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No versions found</h3>
              <p className="mt-1 text-sm text-gray-500">No versions match your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-delete-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4"
          >
            <h2 id="country-delete-title" className="text-lg font-semibold text-gray-900">
              Delete &ldquo;{countryData?.countryname}&rdquo;?
            </h2>
            <p className="text-sm text-gray-600">
              This will permanently delete <span className="font-medium">{countryData?.countryname}</span> ({countrycodePolpal}). This action cannot be undone.
            </p>
            <div>
              <label htmlFor="country-delete-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="country-delete-comment"
                value={deleteComment}
                onChange={(e) => setDeleteComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Add a note that will be saved in the changelog…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                disabled={deleteLoading}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{deleteError}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteError(null); }}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCountryConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
