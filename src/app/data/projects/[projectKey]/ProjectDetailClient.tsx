"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import { ButtonAdd, ButtonUpdate, ButtonDelete } from "@/components/ui/Buttons";
import { LanguageCodeEnum, ReferenceTypeEnum } from "@/lib/shared/enums";
import ReactMarkdown from "react-markdown";
import CountryFlag from "@/components/ui/DisplayFlags";

interface Project {
  projectIsHidden: boolean;
  projectIsHiddenReason: string | null;
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  projectUrl?: string;
  projectDescription?: string;
  projectComment?: string | null;
  References: References[];
  Datasets: {
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    datasetUrl?: string;
    datasetIsHidden: boolean;
    datasetIsHiddenReason: string | null;
    References: References[];
    Versions: {
      versionIsHidden: boolean;
      versionIsHiddenReason: string | null;
      versionKey: string;
      version: string;
      versionName?: string;
      versionUrl?: string;
      versionCitation?: string[] | null;
      countries: {
        countrycodePolpal: string;
        countryname: string;
        iso2c: string | null;
      }[];
    }[];
  }[];
};

interface References {
  referenceId: number;
  referencedField: string | null;
  type: ReferenceTypeEnum;
  value: string;
  language: LanguageCodeEnum | null;
  accessedAt: string | null;
  comment: string | null;
}

export default function ProjectDatasetsClient() {

  // State for project info and datasets
  const [project, setProject] = useState<Project | null>(null);

  // Auth and router
  const { auth } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!auth?.userId;

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Get projectKey from URL params
  const params = useParams();
  const projectKey = params.projectKey as string;

  // State for dataset search
  const [searchDatasets, setSearchDatasets] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Track expanded datasets
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const toggleDataset = (datasetKey: string) =>
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(datasetKey)) next.delete(datasetKey); else next.add(datasetKey);
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

  // Fetch project info and datasets on mount and when projectKey changes
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {

      setLoadingData(true);
      setErrorData(null);

      try {
        // Fetch project info
        const projectRes = await fetch(
          `/api/projects/${projectKey}/datasets`,
          {
            credentials: "include",
            signal,
          }
        );
        if (!projectRes.ok) throw new Error(await projectRes.text());
        const projectData: Project = await projectRes.json();

        if (!projectData) {
          throw new Error('Project not found');
        }

        setProject(projectData);

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

    // Cleanup function to abort the request if component unmounts or projectKey changes
    return () => {
      abortController.abort();
    };
  }, [projectKey]);

  // Handler for deleting the project
  const handleDeleteProject = (projectKey: string) => {
    setDeleteComment("");
    setDeleteError(null);
    setDeleteTarget(projectKey);
  };

  const handleDeleteProjectConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const comment = deleteComment.trim();
      const res = await fetch(`/api/projects/${deleteTarget}`, {
        method: "DELETE",
        credentials: "include",
        ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setDeleteTarget(null);
      setProject(null);
      router.push("/data/projects");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter out hidden datasets for non-logged-in users
  const visibleDatasets = useMemo(() => {
    if (isLoggedIn) return project?.Datasets || [];
    return (project?.Datasets || []).filter((ds) => !ds.datasetIsHidden);
  }, [project, isLoggedIn]);

  // Filter + sort datasets
  const filteredDatasets = useMemo(() => {
    const lowerSearch = searchDatasets.toLowerCase().trim();

    return visibleDatasets
      .map((ds) => {
        const datasetMatches = !lowerSearch ||
          ds.datasetNameShort?.toLowerCase().includes(lowerSearch) ||
          ds.datasetName?.toLowerCase().includes(lowerSearch);

        const filteredVersions = ds.Versions.filter((v) =>
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

        if (datasetMatches || filteredVersions.length > 0) {
          return { ...ds, Versions: filteredVersions };
        }
        return null;
      })
      .filter((ds): ds is NonNullable<typeof ds> => ds !== null)
      .sort((a, b) => (a.datasetNameShort || "").localeCompare(b.datasetNameShort || ""));
  }, [visibleDatasets, searchDatasets]);

  const totalVersions = useMemo(() => visibleDatasets.reduce((sum, ds) => sum + ds.Versions.length, 0), [visibleDatasets]);

  const expandAll = () => {
    setExpandedDatasets(new Set(filteredDatasets.map((ds) => ds.datasetKey)));
    setExpandedVersions(new Set(filteredDatasets.flatMap((ds) => ds.Versions.map((v) => v.versionKey))));
  };
  const collapseAll = () => {
    setExpandedDatasets(new Set());
    setExpandedVersions(new Set());
  };

  const [showDetails, setShowDetails] = useState(true);

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading project data..." message={<>Fetching datasets for <em>{projectKey}</em></>} />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading the datasets for <em>{projectKey}</em>.</>} error={errorData} backHref="/data/projects/" backLabel="Back to Data Projects" />;
  }

  if ((!project && !loadingData) || (project?.projectIsHidden && !isLoggedIn)) {
    return (
      <NotFoundState
        title="Project Not Found"
        message={<>The project <em>{projectKey}</em> could not be found or you don&apos;t have permission to view it.</>}
        backHref="/data/projects"
        backLabel="Back to Data Projects"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: project?.projectName ?? projectKey },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              {project ? project.projectName : projectKey}
            </h1>
            <p className="text-sm text-gray-500">
              {project?.projectNameShort && `(${project.projectNameShort})`}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{visibleDatasets.length}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mt-0.5">Datasets</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{totalVersions}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mt-0.5">Versions</div>
            </div>
            {/* Action Buttons */}
            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <div className="flex flex-wrap gap-2">
                <ButtonUpdate href={`/manage/project/update/${projectKey}`} ariaLabel="Update Project" />
                <ButtonDelete onClick={() => handleDeleteProject(projectKey)} ariaLabel="Delete Project" />
              </div>
            )}
          </div>
        </div>

        {/* Hidden status for logged-in users */}
        {isLoggedIn && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">
              {project?.projectIsHidden ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Hidden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Public
                </span>
              )}
            </h3>
            <span className="text-sm text-gray-700">
              {project?.projectIsHidden
                ? (project.projectIsHiddenReason ?? "Project is hidden (no reason provided)")
                : "Project is public"}
            </span>
          </div>
        )}
      </div>

      {/* Project Details */}
      {project && (project.projectDescription || project.projectUrl) && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="bg-blue-100 rounded-xl p-3 flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">Project Information</h2>
              <p className="text-sm text-gray-500">Description, URL and other project details</p>
            </div>
            {showDetails ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </button>
          {showDetails && (
            <div className="px-6 pb-6">
              <div className="space-y-6">
                {/* Project Description */}
                {project.projectDescription && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</h3>
                    <div className="text-gray-700 text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-gray-500">
                      <ReactMarkdown>{project.projectDescription}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {/* Project URL */}
                {project.projectUrl && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">External URL</h3>
                    <Link
                      href={project.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-2 break-all"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      {project.projectUrl}
                    </Link>
                  </div>
                )}
                {/* Project Comment */}
                {(project?.projectComment && isLoggedIn) && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Comment
                    </h3>
                    <div className="text-gray-700 text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-gray-500">
                      <ReactMarkdown>{project.projectComment}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Datasets Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-blue-100 rounded-xl p-3 shrink-0 border border-blue-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Datasets</h2>
              <p className="text-sm text-gray-600">
                {filteredDatasets.length === visibleDatasets.length
                  ? `All ${visibleDatasets.length} dataset${visibleDatasets.length !== 1 ? 's' : ''}`
                  : `Showing ${filteredDatasets.length} of ${visibleDatasets.length} dataset${visibleDatasets.length !== 1 ? 's' : ''}`}
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
              className="w-84"
              value={searchDatasets}
              onChange={setSearchDatasets}
              placeholder="Search datasets, versions, countries, authors..."
            />
            {/* Action Buttons */}
            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <ButtonAdd
                href={`/manage/dataset/create?projectKey=${projectKey}`}
                text=""
                ariaLabel="Add New Dataset"
              />
            )}
          </div>
        </div>

        {filteredDatasets.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No datasets found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new dataset for {project?.projectNameShort ?? projectKey}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full table-fixed divide-y divide-gray-200 text-[11px] leading-tight">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 w-12"></th>
                  <th className="px-4 py-3 w-32 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Dataset Abbr.</th>
                  <th className="px-4 py-3 w-56 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Dataset</th>
                  <th className="hidden sm:table-cell px-4 py-3 w-24 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap"># Versions</th>
                  <th className="hidden sm:table-cell px-4 py-3 w-36 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Reference(s)</th>
                  <th className="hidden sm:table-cell px-4 py-3 w-56 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">URL</th>
                  {isLoggedIn && <th className="hidden sm:table-cell px-4 py-3 w-20 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Status</th>}
                  {isLoggedIn && <th className="hidden sm:table-cell px-4 py-3 w-40 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">Reason</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredDatasets.flatMap((ds) => {
                  const visibleVersions = isLoggedIn
                    ? ds.Versions
                    : ds.Versions.filter((v) => !v.versionIsHidden);
                  const isExpanded = expandedDatasets.has(ds.datasetKey);
                  return [
                    <tr
                      key={ds.datasetKey}
                      className="bg-blue-50 hover:bg-blue-100 cursor-pointer"
                      onClick={() => toggleDataset(ds.datasetKey)}
                    >
                      <td className="px-2 py-3 border-l-4 border-blue-400">
                        <div className="flex items-center justify-start gap-1">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-100 rounded px-0.5 py-0.5 leading-none">DS</span>
                          {visibleVersions.length > 0 && (
                            isExpanded
                              ? <ChevronDown className="w-3 h-3 text-gray-400" />
                              : <ChevronRight className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <Link
                          href={`/data/projects/${project?.projectKey}/${ds.datasetKey}`}
                          className="text-primary font-semibold hover:underline"
                          title={ds.datasetNameShort}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ds.datasetNameShort}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <Link
                          href={`/data/projects/${project?.projectKey}/${ds.datasetKey}`}
                          className="text-primary hover:underline"
                          title={ds.datasetName}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ds.datasetName}
                        </Link>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-center text-gray-800">
                        {visibleVersions.length}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-400">—</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-800">
                        {ds.datasetUrl ? (
                          <Link
                            href={ds.datasetUrl}
                            target="_blank"
                            className="text-black flex items-center gap-1 hover:underline hover:text-primary"
                            title={ds.datasetUrl}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="inline-block w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{ds.datasetUrl}</span>
                          </Link>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      {isLoggedIn && (
                        <td className="hidden sm:table-cell px-4 py-3">
                          {ds.datasetIsHidden ? (
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
                          <span className="block truncate" title={ds.datasetIsHiddenReason ?? ""}>{ds.datasetIsHiddenReason ?? "—"}</span>
                        </td>
                      )}
                    </tr>,
                    ...(isExpanded
                      ? visibleVersions.flatMap((v) => {
                        const vExpanded = expandedVersions.has(v.versionKey);
                        const countries = v.countries ?? [];
                        return [
                          <tr
                            key={`v-${ds.datasetKey}-${v.versionKey}`}
                            className="bg-green-50 hover:bg-green-100 cursor-pointer"
                            onClick={() => toggleVersion(v.versionKey)}
                          >
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
                            <td className="px-4 py-2 pl-6 text-gray-600">
                              <Link
                                href={`/data/projects/${project?.projectKey}/${ds.datasetKey}/${v.versionKey}`}
                                className="text-primary hover:underline"
                                title={v.version}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {v.version}
                              </Link>
                            </td>
                            <td className="px-4 py-2 pl-6 text-gray-600">
                              <Link
                                href={`/data/projects/${project?.projectKey}/${ds.datasetKey}/${v.versionKey}`}
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
                                <td colSpan={isLoggedIn ? 7 : 5} className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {countries.map((c) => (
                                      <Link
                                        key={c.countrycodePolpal}
                                        href={`/data/projects/${project?.projectKey}/${ds.datasetKey}/${v.versionKey}/${c.countrycodePolpal}`}
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
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">Delete project?</h2>
            <p className="text-sm text-gray-600">This will permanently delete <span className="font-medium">{deleteTarget}</span>. This action cannot be undone.</p>
            <div>
              <label htmlFor="delete-comment" className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea id="delete-comment" value={deleteComment} onChange={(e) => setDeleteComment(e.target.value)} rows={3} maxLength={1000}
                placeholder="Add a note that will be saved in the changelog…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                disabled={deleteLoading} />
            </div>
            {deleteError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{deleteError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleteLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">Cancel</button>
              <button onClick={handleDeleteProjectConfirm} disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
