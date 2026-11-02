"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import Link from "next/link";
import CountryFlag from "@/components/ui/DisplayFlags";
import SearchInput from "@/components/ui/SearchInput";

const COUNTRIES_COLLAPSE_THRESHOLD = 7;

type Country = {
  countrycodePolpal: string;
  iso2c: string | null;
  countryname: string;
};

type Version = {
  versionIsHidden: boolean;
  versionKey: string;
  version: string;
  versionName: string | null;
  versionUrl: string;
  versionCitation: string[] | null;
  countries: Country[];
};

type Dataset = {
  datasetIsHidden: boolean;
  datasetKey: string;
  datasetName: string;
  datasetNameShort: string;
  datasetUrl: string | null;
  Versions: Version[];
};

type Project = {
  projectIsHidden: boolean;
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  projectUrl: string | null;
  Datasets: Dataset[];
};

type FlatRow = {
  project: Project;
  dataset: Dataset;
  version: Version | null;
};

function rowMatchesSearch(row: FlatRow, q: string): boolean {
  const { project, dataset, version } = row;
  const citationStr = version?.versionCitation?.join(" ") ?? "";
  const countryStr = version?.countries.map((c) => `${c.countrycodePolpal} ${c.countryname}`).join(" ") ?? "";
  const hay = [
    project.projectKey, project.projectNameShort, project.projectName,
    dataset.datasetKey, dataset.datasetNameShort, dataset.datasetName,
    version?.version ?? "", version?.versionName ?? "",
    citationStr, countryStr,
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

export default function WorkingOnClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCountries = (versionKey: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(versionKey)) next.delete(versionKey); else next.add(versionKey);
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects", { credentials: "include", signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch projects: HTTP ${res.status}`);
        const data = await res.json();
        setProjects(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
    return () => controller.abort();
  }, []);

  const allRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const project of projects) {
      for (const dataset of project.Datasets) {
        if (dataset.Versions.length > 0) {
          for (const version of dataset.Versions) {
            rows.push({ project, dataset, version });
          }
        } else {
          rows.push({ project, dataset, version: null });
        }
      }
    }
    rows.sort((a, b) => {
      const pk = a.project.projectKey.localeCompare(b.project.projectKey);
      if (pk !== 0) return pk;
      const dk = a.dataset.datasetKey.localeCompare(b.dataset.datasetKey);
      if (dk !== 0) return dk;
      return (a.version?.version ?? "").localeCompare(b.version?.version ?? "");
    });
    return rows;
  }, [projects]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allRows;
    return allRows.filter((row) => rowMatchesSearch(row, q));
  }, [allRows, searchQuery]);

  const projectSpans = useMemo(() => {
    const spans = new Map<string, number>();
    for (const row of filteredRows) {
      spans.set(row.project.projectKey, (spans.get(row.project.projectKey) ?? 0) + 1);
    }
    return spans;
  }, [filteredRows]);

  const datasetSpans = useMemo(() => {
    const spans = new Map<string, number>();
    for (const row of filteredRows) {
      spans.set(row.dataset.datasetKey, (spans.get(row.dataset.datasetKey) ?? 0) + 1);
    }
    return spans;
  }, [filteredRows]);

  if (loading) {
    return <LoadingSpinner title="Loading data..." message="Fetching integrated data. Please wait." />;
  }

  if (error) {
    return <ErrorState message="Failed to load data." error={error} />;
  }

  const projectSeen = new Set<string>();
  const datasetSeen = new Set<string>();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Documentation" },
        { label: "Data Integration Status" },
      ]} />

      {/* Work in Progress Section */}
      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-4">
        <h1 className="text-2xl font-bold mb-4 text-primary">Data Integration Status</h1>
        <div className="space-y-4 text-justify">
          <p>
            PolPaL is continuously growing and we integrate new datasets regularly.
            Some of this data is not yet publicly available.
            Below you can explore the data we are working on for integration.
            If you are interested in providing your help for one of the data
            listed below or have questions about the data integration process and status,
            please reach out to us via email (see <Link href="/documentation/contact" className="text-primary hover:underline">
              Contact
            </Link>).
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        {/* Integrated Data Projects Table */}
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-purple-100 rounded-xl p-3 shrink-0 border border-purple-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Integrated Data</h2>
              <p className="text-sm text-gray-600">
                {filteredRows.length === allRows.length
                  ? `All integrated ${allRows.length} data version${allRows.length !== 1 ? 's' : ''}`
                  : `Showing ${filteredRows.length} of ${allRows.length} project${allRows.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {/* Search field */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search bar */}
            <SearchInput
              className="w-100"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search projects, datasets, versions, countries, authors..."
            />
          </div>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No projects found.</p>
        ) : (
          <>

            {filteredRows.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No results match your search.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs text-gray-800 border-collapse" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "27%" }} />
                  </colgroup>
                  <thead className="bg-gray-100 text-gray-700 whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold border-b bg-purple-100">Project</th>
                      <th className="px-4 py-2 text-left font-semibold border-b bg-blue-100">Dataset</th>
                      <th className="px-4 py-2 text-left font-semibold border-b bg-green-100">Version</th>
                      <th className="px-4 py-2 text-left font-semibold border-b bg-green-100">Citation</th>
                      <th className="px-4 py-2 text-left font-semibold border-b bg-amber-100">Countries</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredRows.map((row) => {
                      const showProject = !projectSeen.has(row.project.projectKey);
                      if (showProject) projectSeen.add(row.project.projectKey);
                      const showDataset = !datasetSeen.has(row.dataset.datasetKey);
                      if (showDataset) datasetSeen.add(row.dataset.datasetKey);
                      return (
                        <tr key={`${row.version?.versionKey ?? row.dataset.datasetKey}`} className="hover:bg-gray-50 transition-colors">
                          {showProject && (
                            <td
                              className="px-4 py-3 align-top border-b border-r border-gray-100 bg-purple-50/30"
                              rowSpan={projectSpans.get(row.project.projectKey)}
                            >
                              <div className="font-semibold text-primary">
                                <Link href={`/data/projects/${row.project.projectKey}`} className="hover:underline">
                                  {row.project.projectNameShort}
                                </Link>
                              </div>
                              <div className="text-gray-700 mt-0.5">{row.project.projectName}</div>
                              <div className="mt-1">
                                {row.project.projectIsHidden ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 border border-amber-200">WiP</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 border border-green-200">Public</span>
                                )}
                              </div>
                            </td>
                          )}
                          {showDataset && (
                            <td
                              className="px-4 py-3 align-top border-b border-r border-gray-100 bg-blue-50/30"
                              rowSpan={datasetSpans.get(row.dataset.datasetKey)}
                            >
                              <div className="font-medium text-primary">
                                <Link href={`/data/projects/${row.project.projectKey}/${row.dataset.datasetKey}`} className="hover:underline">
                                  {row.dataset.datasetNameShort}
                                </Link>
                              </div>
                              <div className="text-gray-600 mt-0.5">{row.dataset.datasetName}</div>
                              <div className="mt-1">
                                {row.dataset.datasetIsHidden ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 border border-amber-200">WiP</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 border border-green-200">Public</span>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 align-top border-b border-r border-gray-100 bg-green-50/30">
                            {row.version ? (
                              <div>
                                <Link
                                  href={`/data/projects/${row.project.projectKey}/${row.dataset.datasetKey}/${row.version.versionKey}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {row.version.version}
                                </Link>
                                {row.version.versionName && (
                                  <div className="text-gray-600 mt-0.5">{row.version.versionName}</div>
                                )}
                                <div className="mt-1">
                                  {row.version.versionIsHidden ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 border border-amber-200">WiP</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 border border-green-200">Public</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No versions</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top border-b border-r border-gray-100 text-[11px] bg-green-50/30 text-gray-600 max-w-[250px]">
                            {row.version?.versionCitation && row.version.versionCitation.length > 0 ? (
                              <ul className="space-y-1">
                                {row.version.versionCitation.map((cite, i) => (
                                  <li key={i} className="leading-relaxed">{cite}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top border-b border-gray-100 bg-amber-50/30">
                            {row.version && row.version.countries.length > 0 ? (
                              (() => {
                                const expanded = expandedCountries.has(row.version.versionKey);
                                const countries = row.version.countries;
                                const shouldCollapse = countries.length > COUNTRIES_COLLAPSE_THRESHOLD;
                                const visibleCountries = shouldCollapse && !expanded
                                  ? countries.slice(0, COUNTRIES_COLLAPSE_THRESHOLD)
                                  : countries;
                                return (
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {visibleCountries.map((c) => (
                                      <Link
                                        key={c.countrycodePolpal}
                                        href={`/data/projects/${row.project.projectKey}/${row.dataset.datasetKey}/${row.version!.versionKey}/${c.countrycodePolpal}`}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-100 transition-colors"
                                        title={c.countryname}
                                      >
                                        <CountryFlag iso2c={c.iso2c} countrycodePolpal={c.countrycodePolpal} countryname={c.countryname} size={18} />
                                        {c.countrycodePolpal}
                                      </Link>
                                    ))}
                                    {shouldCollapse && (
                                      <button
                                        type="button"
                                        onClick={() => toggleCountries(row.version!.versionKey)}
                                        className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                                      >
                                        {expanded ? "[-]" : `[+${countries.length - COUNTRIES_COLLAPSE_THRESHOLD}]`}
                                      </button>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </section>
    </main>
  );
}
