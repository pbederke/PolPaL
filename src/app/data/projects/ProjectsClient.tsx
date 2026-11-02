"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SearchInput from "@/components/ui/SearchInput";
import NotFoundState from "@/components/ui/NotFoundState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ButtonAdd } from "@/components/ui/Buttons";
import CountryFlag from "@/components/ui/DisplayFlags";

interface Projects {
  projectIsHidden: boolean;
  projectIsHiddenReason: string | null;
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  projectUrl: string;
  Datasets: {
    datasetIsHidden: boolean;
    datasetIsHiddenReason: string | null;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    datasetUrl: string;
    Versions: {
      versionIsHidden: boolean;
      versionIsHiddenReason: string | null;
      versionKey: string;
      version: string;
      versionName: string | null;
      versionUrl: string;
      versionCitation: string[] | null;
      countries: {
        countrycodePolpal: string;
        countryname: string;
        iso2c: string | null
      }[];
    }[];
  }[];
};

export default function ProjectsPage() {
  // State for projects
  const [projects, setProjects] = useState<Projects[]>([]);

  // Auth context
  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Search state
  const [searchProjects, setSearchProjects] = useState("");

  // Fetch datasets on mount
  useEffect(() => {
    // Create AbortController to cancel requests
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {

      setLoadingData(true);
      setErrorData(null);

      try {
        // Fetch projects with their datasets
        const projectsRes = await fetch(`/api/projects/`, {
          credentials: "include",
          signal // Pass signal to fetch
        });
        if (!projectsRes.ok) throw new Error(await projectsRes.text());

        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      } catch (err: unknown) {
        // Don't set error state if the request was aborted
        if (err instanceof Error && err.name !== 'AbortError') {
          setErrorData(err instanceof Error ? err.message : String(err));
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();

    // Cleanup function - runs when component unmounts
    return () => {
      abortController.abort(); // Cancel all ongoing requests
    };
  }, []);

  // Filter out hidden items for non-logged-in users
  const visibleProjects = useMemo(() => {
    if (isLoggedIn) return projects;
    return projects
      .filter((p) => !p.projectIsHidden)
      .map((p) => ({
        ...p,
        Datasets: p.Datasets
          .filter((d) => !d.datasetIsHidden)
          .map((d) => ({
            ...d,
            Versions: d.Versions.filter((v) => !v.versionIsHidden),
          })),
      }));
  }, [projects, isLoggedIn]);

  // Filter + sort projects
  const filteredProjects = useMemo(() => {
    const lowerSearch = searchProjects.toLowerCase().trim();

    return visibleProjects
      .map((p) => {
        const projectMatches = !lowerSearch ||
          p.projectNameShort.toLowerCase().includes(lowerSearch) ||
          p.projectName.toLowerCase().includes(lowerSearch);

        // Filter datasets, then within each dataset filter versions
        const filteredDatasets = p.Datasets
          .map((d) => {
            const datasetMatches = !lowerSearch ||
              d.datasetNameShort.toLowerCase().includes(lowerSearch) ||
              d.datasetName.toLowerCase().includes(lowerSearch);

            const filteredVersions = d.Versions.filter((v) =>
              datasetMatches ||
              v.version.toLowerCase().includes(lowerSearch) ||
              v.versionName?.toLowerCase().includes(lowerSearch) ||
              v.versionCitation?.some((c) => c.toLowerCase().includes(lowerSearch)) ||
              v.countries?.some(
                (c) =>
                  c.countrycodePolpal.toLowerCase().includes(lowerSearch) ||
                  c.countryname.toLowerCase().includes(lowerSearch)
              )
            );

            // Keep dataset only if it matches or has matching versions
            if (datasetMatches || filteredVersions.length > 0) {
              return { ...d, Versions: filteredVersions };
            }
            return null;
          })
          .filter(Boolean) as typeof p.Datasets;

        // Keep project only if it matches directly or has surviving datasets
        if (!lowerSearch || projectMatches || filteredDatasets.length > 0) {
          return {
            ...p,
            Datasets: filteredDatasets,
            datasetCount: filteredDatasets.length,
            versionCount: filteredDatasets.reduce((sum, d) => sum + d.Versions.length, 0),
          };
        }
        return null;
      })
      .filter(Boolean)
      .map((p) => ({
        ...p!,
        Datasets: [...p!.Datasets]
          .sort((a, b) => a.datasetNameShort.localeCompare(b.datasetNameShort))
          .map((d) => ({
            ...d,
            Versions: [...d.Versions].sort((a, b) =>
              a.version.localeCompare(b.version, undefined, { numeric: true })
            ),
          })),
      }))
      .sort((a, b) => a!.projectNameShort.localeCompare(b!.projectNameShort));
  }, [visibleProjects, searchProjects]);

  // Count unique projects for info card
  const numberOfProjects = useMemo(() => visibleProjects.length, [visibleProjects]);
  const totalDatasets = useMemo(() => visibleProjects.reduce((sum, p) => sum + p.Datasets.length, 0), [visibleProjects]);
  const totalVersions = useMemo(() => visibleProjects.reduce((sum, p) => p.Datasets.reduce((s, d) => s + d.Versions.length, sum), 0), [visibleProjects]);

  // Track expanded projects
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const toggleProject = (key: string) =>
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  // Track expanded datasets
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const toggleDataset = (projectKey: string, datasetKey: string) =>
    setExpandedDatasets((prev) => {
      const k = `${projectKey}-${datasetKey}`;
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });

  // Track expanded versions (to show countries)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const toggleVersion = (versionKey: string) =>
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionKey)) next.delete(versionKey); else next.add(versionKey);
      return next;
    });

  const expandAll = () => {
    setExpandedProjects(new Set(filteredProjects.map((p) => p.projectKey)));
    setExpandedDatasets(new Set(filteredProjects.flatMap((p) => p.Datasets.map((d) => `${p.projectKey}-${d.datasetKey}`))));
    setExpandedVersions(new Set(filteredProjects.flatMap((p) => p.Datasets.flatMap((d) => d.Versions.map((v) => v.versionKey)))));
  };
  const collapseAll = () => {
    setExpandedProjects(new Set());
    setExpandedDatasets(new Set());
    setExpandedVersions(new Set());
  };

  // State for info card
  const [showInfo, setShowInfo] = useState(true);


  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading data projects..." message="Fetching data projects. Please wait a moment." />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message="We encountered an issue while loading the data projects." error={errorData} backHref="/" />;
  }

  if (!projects && !loadingData) {
    return (
      <NotFoundState
        title="Projects Not Found"
        message="Projects could not be found or you don't have permission to view them."
        showRetry
      />
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Data Projects</h1>
            <p className="text-sm text-gray-500">Browse available research projects and datasets.</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{numberOfProjects}</div>
              <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-0.5">Projects</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{totalDatasets}</div>
              <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-0.5">Datasets</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{totalVersions}</div>
              <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mt-0.5">Versions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Card */}
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
            <h2 className="text-xl font-bold text-gray-800">Data Organization</h2>
            <p className="text-sm text-gray-500">How PolPaL structures external data into projects, datasets, and versions</p>
          </div>
          {showInfo ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showInfo && <div className="px-6 pb-6 text-justify">
          <p className="text-gray-700 mb-4 leading-relaxed">
            PolPaL links entries of political entities across datasets. Those datasets are provided by a variety of scholars, institutions, and research infrastructures — some updated regularly, others published and archived once. To accommodate these differences, PolPaL structures external data into three levels: <span className="font-semibold text-gray-800">data projects</span>, <span className="font-semibold text-gray-800">datasets</span>, and <span className="font-semibold text-gray-800">data versions</span>.
          </p>
          <ul className="space-y-4 text-gray-600">
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-semibold text-gray-800">Data Project:</span> The overarching research project, institution, or infrastructure responsible for one or more datasets. For example, the <em>Varieties of Democracy Institute</em> publishes several datasets and is represented as a single data project. When a dataset is published independently — outside the context of a broader project — the dataset itself also serves as the data project. For example, the <em>One-Party Membership Dataset (OPAMED)</em> is both the data project and the dataset.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-semibold text-gray-800">Dataset:</span> A specific collection of data nested within a data project, typically corresponding to one data file (plus any supplementary files). For example, while the European Social Survey is the data project, <em>ESS Round 1</em> and <em>ESS Round 2</em> are separate datasets within it. If the same data is split across multiple country files, each file is treated as a separate dataset.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-semibold text-gray-800">Data Version:</span> A release of the same dataset reflecting minor corrections or major updates. For example, <em>ESS11 edition 4.0</em> and <em>ESS11 edition 4.1</em> are two versions of the same dataset.
              </div>
            </li>
          </ul>
        </div>}
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
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
              <h2 className="text-xl font-bold text-gray-800">Data Projects</h2>
              <p className="text-sm text-gray-600">
                {filteredProjects.length === numberOfProjects
                  ? `All ${numberOfProjects} project${numberOfProjects !== 1 ? 's' : ''}`
                  : `Showing ${filteredProjects.length} of ${numberOfProjects} project${numberOfProjects !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Expand / Collapse */}
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >Expand All</button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >Collapse All</button>
            {/* Search bar */}
            <SearchInput
              className="w-100"
              value={searchProjects}
              onChange={setSearchProjects}
              placeholder="Search projects, datasets, versions, countries, authors..."
            />
            {/* Action Buttons */}
            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <ButtonAdd
                href="/manage/project/create"
                text=""
                ariaLabel="Add New Project"
              />
            )}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new research project.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full table-fixed divide-y divide-gray-200 text-[11px] leading-tight">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-3 w-12"></th>
                  <th scope="col" className="px-4 py-3 w-28 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Project Abbr.</th>
                  <th scope="col" className="px-4 py-3 w-48 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Project</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-24 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap"># Datasets</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-24 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap"># Versions</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-36 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Reference(s)</th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 w-56 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">URL</th>
                  {isLoggedIn && <th scope="col" className="hidden sm:table-cell px-4 py-3 w-20 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Status</th>}
                  {isLoggedIn && <th scope="col" className="hidden sm:table-cell px-4 py-3 w-40 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Reason</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredProjects.flatMap((p) => [
                  <tr
                    key={p.projectKey}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleProject(p.projectKey)}
                  >
                    <td className="px-2 py-3 border-l-4 border-purple-300">
                      <div className="flex items-center justify-start gap-1">
                        <span className="text-[9px] font-bold text-purple-600 bg-purple-50 rounded px-1 py-0.5 leading-none">P</span>
                        {p.Datasets.length > 0 && (
                          expandedProjects.has(p.projectKey)
                            ? <ChevronDown className="w-3 h-3 text-gray-400" />
                            : <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      <Link
                        href={`/data/projects/${p.projectKey}`}
                        className="text-primary font-semibold hover:underline"
                        title={p.projectNameShort}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.projectNameShort}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      <Link
                        href={`/data/projects/${p.projectKey}`}
                        className="text-primary hover:underline"
                        title={p.projectName}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.projectName}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-800 text-center">
                      {p.datasetCount ?? 0}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-800 text-center">
                      {p.versionCount ?? 0}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-400">—</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-800">
                      {p.projectUrl ? (
                        <Link
                          href={p.projectUrl}
                          target="_blank"
                          className="text-black flex items-center gap-1 hover:underline hover:text-primary"
                          title={p.projectUrl}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="inline-block w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {p.projectUrl}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                    {isLoggedIn && (
                      <td className="hidden sm:table-cell px-4 py-3">
                        {p.projectIsHidden ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Public
                          </span>
                        )}
                      </td>
                    )}
                    {isLoggedIn && (
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                        <span className="block truncate" title={p.projectIsHiddenReason ?? ""}>{p.projectIsHiddenReason ?? "—"}</span>
                      </td>
                    )}
                  </tr>,
                  ...(expandedProjects.has(p.projectKey)
                    ? p.Datasets.flatMap((d) => [
                      <tr
                        key={`ds-${p.projectKey}-${d.datasetKey}`}
                        className="bg-blue-50 cursor-pointer"
                        onClick={() => toggleDataset(p.projectKey, d.datasetKey)}
                      >
                        <td className="px-2 py-2 border-l-4 border-blue-400">
                          <div className="flex items-center justify-start gap-1">
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-100 rounded px-0.5 py-0.5 leading-none">DS</span>
                            {d.Versions.length > 0 && (
                              expandedDatasets.has(`${p.projectKey}-${d.datasetKey}`)
                                ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                : <ChevronRight className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 pl-6 text-gray-700">
                          <Link
                            href={`/data/projects/${p.projectKey}/${d.datasetKey}`}
                            className="text-primary hover:underline"
                            title={d.datasetNameShort}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {d.datasetNameShort}
                          </Link>
                        </td>
                        <td className="px-4 py-2 pl-6 text-gray-700">
                          <Link
                            href={`/data/projects/${p.projectKey}/${d.datasetKey}`}
                            className="text-primary hover:underline"
                            title={d.datasetName}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {d.datasetName}
                          </Link>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-400 text-center">—</td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-700 text-center">{d.Versions.length}</td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-400">—</td>
                        <td className="hidden sm:table-cell px-4 py-2">
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
                        {isLoggedIn && (
                          <td className="hidden sm:table-cell px-4 py-2">
                            {d.datasetIsHidden
                              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Hidden
                              </span>
                              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Public
                              </span>}
                          </td>
                        )}
                        {isLoggedIn && (
                          <td className="hidden sm:table-cell px-4 py-2 text-gray-500 text-xs max-w-[200px]">
                            <span className="block truncate" title={d.datasetIsHiddenReason ?? ""}>{d.datasetIsHiddenReason ?? "—"}</span>
                          </td>
                        )}
                      </tr>,
                      ...(expandedDatasets.has(`${p.projectKey}-${d.datasetKey}`)
                        ? d.Versions.flatMap((v) => {
                          const vExpanded = expandedVersions.has(v.versionKey);
                          const countries = v.countries ?? [];
                          return [
                            <tr key={`v-${p.projectKey}-${d.datasetKey}-${v.versionKey}`} className="bg-green-50 cursor-pointer" onClick={() => toggleVersion(v.versionKey)}>
                              <td className="px-2 py-2 border-l-4 border-green-500">
                                <div className="flex items-center justify-start gap-1">
                                  <span className="text-[9px] font-bold text-green-600 bg-green-100 rounded px-1 py-0.5 leading-none">V</span>
                                  {countries.length > 0 && (
                                    vExpanded
                                      ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                      : <ChevronRight className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 pl-8 text-gray-600">
                                <Link
                                  href={`/data/projects/${p.projectKey}/${d.datasetKey}/${v.versionKey}`}
                                  className="text-primary hover:underline"
                                  title={v.version}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {v.version}
                                </Link>
                              </td>
                              <td className="px-4 py-2 pl-8 text-gray-600 text-left">
                                <Link
                                  href={`/data/projects/${p.projectKey}/${d.datasetKey}/${v.versionKey}`}
                                  className="text-primary hover:underline"
                                  title={v.versionName ?? v.version}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {v.versionName || (
                                    <span className="text-gray-400 text-left">
                                      <em>unnamed</em>
                                    </span>
                                  )}
                                </Link>
                              </td>
                              <td className="hidden sm:table-cell px-4 py-2 text-gray-400 text-center">—</td>
                              <td className="hidden sm:table-cell px-4 py-2 text-gray-400 text-center">—</td>
                              <td className="hidden sm:table-cell px-4 py-2 text-gray-600 text-[10px]">
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
                              <td className="hidden sm:table-cell px-4 py-2">
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
                              {isLoggedIn && (
                                <td className="hidden sm:table-cell px-4 py-2">
                                  {v.versionIsHidden
                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Hidden</span>
                                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Public</span>}
                                </td>
                              )}
                              {isLoggedIn && (
                                <td className="hidden sm:table-cell px-4 py-2 text-gray-500 text-xs max-w-[200px]">
                                  <span className="block truncate" title={v.versionIsHiddenReason ?? ""}>{v.versionIsHiddenReason ?? "—"}</span>
                                </td>
                              )}
                            </tr>,
                            ...(vExpanded && countries.length > 0
                              ? [(
                                <tr key={`countries-${v.versionKey}`} className="bg-amber-50">
                                  <td className="px-2 py-2 border-l-4 border-amber-400 align-top">
                                    <div className="flex items-start justify-start">
                                      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 rounded px-1 py-0.5 leading-none">C</span>
                                    </div>
                                  </td>
                                  <td colSpan={isLoggedIn ? 8 : 6} className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {countries.map((c) => (
                                        <Link
                                          key={c.countrycodePolpal}
                                          href={`/data/projects/${p.projectKey}/${d.datasetKey}/${v.versionKey}/${c.countrycodePolpal}`}
                                          className="relative inline-flex items-center justify-center w-12 h-8 rounded overflow-hidden border border-gray-300 hover:border-amber-400 hover:shadow-sm"
                                          title={`${c.countrycodePolpal}${c.iso2c ? ` (${c.iso2c})` : ''}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <span className="absolute inset-0 flex items-center justify-center">
                                            <CountryFlag
                                              iso2c={c.iso2c}
                                              countrycodePolpal={c.countrycodePolpal}
                                              countryname={c.countrycodePolpal}
                                              size={64}
                                            />
                                          </span>
                                          <span className="absolute inset-0 bg-black/25" />
                                          <span className="relative z-10 text-[9px] font-bold text-white drop-shadow">
                                            {c.countrycodePolpal}
                                          </span>
                                        </Link>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )]
                              : []),
                          ];
                        })
                        : []),
                    ])
                    : []),
                ])}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
