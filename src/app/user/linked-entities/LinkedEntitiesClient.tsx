"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { EntityCard, EntityCardEntity } from "@/components/ui/EntityCard";
import { EntryCard, EntryCardSingleData } from "@/components/ui/EntryCard";

const PAGE_SIZE = 12;

// Lightweight summary item returned by /links/summary
type SummaryItem = {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  versionKey: string;
  version: string;
  versionName: string | null;
};

interface UserLink {
  linkEntriesToEntityId: number;
  entry: EntryCardSingleData;
  entity: EntityCardEntity;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  countrycodePolpal: string;
  countryname: string;
}

type RawEntry = {
  entryId: number;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShort?: string | null;
  entryEntityNameEnglish?: string | null;
  entryEntityName?: string | null;
  entryYear?: number | null;
  entryMonth?: number | null;
  entryDay?: number | null;
  additionalInformation?: string | null;
  countrycodePolpal: string;
  Countries: { countryname: string };
};

type RawLink = {
  linkEntriesToEntityId: number;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  Entries: RawEntry;
  Entities: EntityCardEntity;
};

export default function LinkedEntitiesClient() {
  const { auth, loadingAuth } = useAuth();
  const userId = auth.userId;

  // Phase 1: lightweight summary for dropdowns
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Phase 2: full links for selected version
  const [links, setLinks] = useState<UserLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const [page, setPage] = useState(1);
  const [filterProject, setFilterProject] = useState("");
  const [filterDataset, setFilterDataset] = useState("");
  const [filterVersion, setFilterVersion] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  // Phase 1: fetch summary on mount
  useEffect(() => {
    if (loadingAuth) return;
    const controller = new AbortController();
    const load = async () => {
      if (!auth.loggedIn || !userId) {
        setSummaryError("You do not have access to this page. Please log in.");
        setLoadingSummary(false);
        return;
      }
      fetch(`/api/users/${userId}/links/summary`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data: SummaryItem[]) => setSummary(data))
        .catch((err) => { if (err instanceof Error && err.name !== "AbortError") setSummaryError(err instanceof Error ? err.message : String(err)); })
        .finally(() => { if (!controller.signal.aborted) setLoadingSummary(false); });
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, userId, loadingAuth]);

  // Phase 2: fetch full links when version is selected
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!filterVersion || !userId) {
        setLinks([]);
        return;
      }
      setLoadingLinks(true);
      setPage(1);
      fetch(`/api/users/${userId}/links?versionKey=${encodeURIComponent(filterVersion)}`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((raw: RawLink[]) =>
          setLinks(raw.map((l) => ({
            linkEntriesToEntityId: l.linkEntriesToEntityId,
            entry: {
              type: "single" as const,
              entryId: String(l.Entries.entryId),
              entryEntityIdVar: l.Entries.entryEntityIdVar,
              entryEntityId: l.Entries.entryEntityId,
              entryEntityNameShort: l.Entries.entryEntityNameShort,
              entryEntityNameEnglish: l.Entries.entryEntityNameEnglish,
              entryEntityName: l.Entries.entryEntityName,
              year: l.Entries.entryYear,
              month: l.Entries.entryMonth,
              day: l.Entries.entryDay,
              additionalInformation: l.Entries.additionalInformation,
            },
            entity: l.Entities,
            startYear: l.startYear,
            startMonth: l.startMonth,
            startDay: l.startDay,
            endYear: l.endYear,
            endMonth: l.endMonth,
            endDay: l.endDay,
            countrycodePolpal: l.Entries.countrycodePolpal,
            countryname: l.Entries.Countries.countryname,
          })))
        )
        .catch((err) => { if (err instanceof Error && err.name !== "AbortError") setSummaryError(err instanceof Error ? err.message : String(err)); })
        .finally(() => { if (!controller.signal.aborted) setLoadingLinks(false); });
    };
    load();
    return () => controller.abort();
  }, [filterVersion, userId]);

  if (loadingAuth || loadingSummary) return <LoadingSpinner title="Loading..." message="Fetching your links." />;
  if (summaryError) return <ErrorState message="Failed to load links." error={summaryError} backHref="/user" backLabel="Back to Profile" />;

  // Build cascading dropdown options from summary
  const allProjects = Array.from(
    new Map(summary.map((s) => [s.projectKey, { key: s.projectKey, nameShort: s.projectNameShort, name: s.projectName }])).values()
  ).sort((a, b) => a.nameShort.localeCompare(b.nameShort));

  const summaryForDataset = filterProject ? summary.filter((s) => s.projectKey === filterProject) : summary;
  const allDatasets = Array.from(
    new Map(summaryForDataset.map((s) => [s.datasetKey, { key: s.datasetKey, nameShort: s.datasetNameShort, name: s.datasetName }])).values()
  ).sort((a, b) => a.nameShort.localeCompare(b.nameShort));

  const summaryForVersion = filterDataset ? summaryForDataset.filter((s) => s.datasetKey === filterDataset) : summaryForDataset;
  const allVersions = Array.from(
    new Map(summaryForVersion.map((s) => [s.versionKey, { key: s.versionKey, version: s.version, versionName: s.versionName }])).values()
  ).sort((a, b) => a.version.localeCompare(b.version));

  // Country options derived from loaded links
  const allCountries = Array.from(
    new Map(links.map((l) => [l.countrycodePolpal, { code: l.countrycodePolpal, name: l.countryname }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Apply country filter client-side
  const filteredLinks = filterCountry ? links.filter((l) => l.countrycodePolpal === filterCountry) : links;

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const pageLinks = filteredLinks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = filterProject || filterDataset || filterVersion || filterCountry;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Profile", href: "/user" },
        { label: "Created Links" },
      ]} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Created Links</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filterVersion
                ? filterCountry
                  ? `${filteredLinks.length} of ${links.length} links for selected version`
                  : `${links.length} links for selected version`
                : "Select a version to load links"}
            </p>
          </div>
        </div>

        {/* Cascading filters */}
        <div className="mb-6 pb-4 border-b border-gray-100 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Project</label>
              <select
                value={filterProject}
                onChange={(e) => { setFilterProject(e.target.value); setFilterDataset(""); setFilterVersion(""); setFilterCountry(""); }}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
              >
                <option value="">All projects</option>
                {allProjects.map((p) => (
                  <option key={p.key} value={p.key}>{p.nameShort}{p.name && p.name !== p.nameShort ? ` – ${p.name}` : ""}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Dataset</label>
              <select
                value={filterDataset}
                onChange={(e) => { setFilterDataset(e.target.value); setFilterVersion(""); setFilterCountry(""); }}
                disabled={!filterProject}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed truncate"
              >
                <option value="">All datasets</option>
                {allDatasets.map((d) => (
                  <option key={d.key} value={d.key}>{d.nameShort}{d.name && d.name !== d.nameShort ? ` – ${d.name}` : ""}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Version</label>
              <select
                value={filterVersion}
                onChange={(e) => { setFilterVersion(e.target.value); setFilterCountry(""); }}
                disabled={!filterDataset}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed truncate"
              >
                <option value="">Select version…</option>
                {allVersions.map((v) => (
                  <option key={v.key} value={v.key}>{v.versionName ? `${v.versionName} (${v.version})` : v.version}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Country</label>
              <select
                value={filterCountry}
                onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
                disabled={!filterVersion || loadingLinks}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed truncate"
              >
                <option value="">All countries</option>
                {allCountries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <button
                onClick={() => { setFilterProject(""); setFilterDataset(""); setFilterVersion(""); setFilterCountry(""); setPage(1); }}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Content area */}
        {!filterVersion ? (
          <p className="text-sm text-gray-400 italic">Choose a project, dataset, and version above to browse your links.</p>
        ) : loadingLinks ? (
          <LoadingSpinner title="Loading links…" message="Fetching links for the selected version." />
        ) : filteredLinks.length === 0 ? (
          <p className="text-sm text-gray-500">{links.length === 0 ? "No links found for this version." : "No links match the selected country."}</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {pageLinks.map((link) => (
                <div key={link.linkEntriesToEntityId} className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:border-0 sm:p-0 sm:rounded-none">
                  <EntryCard entry={link.entry} />
                  <div className="flex items-center gap-2 sm:hidden">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-xs text-gray-400 shrink-0">linked to</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <EntityCard
                    entity={link.entity}
                    showLogo
                    isLoggedIn={auth.loggedIn}
                    observationDates={[{ year: link.entry.year, month: link.entry.month, day: link.entry.day }]}
                    linkStart={!link.entry.year ? { year: link.startYear, month: link.startMonth, day: link.startDay } : undefined}
                    linkEnd={!link.entry.year ? { year: link.endYear, month: link.endMonth, day: link.endDay } : undefined}
                    hideAppearance
                  />
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
