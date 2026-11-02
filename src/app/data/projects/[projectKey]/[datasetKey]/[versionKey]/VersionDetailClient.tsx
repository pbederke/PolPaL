"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ghcolors } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import { ButtonUpload, ButtonReupload, ButtonUpdate, ButtonDelete, ButtonDownload } from "@/components/ui/Buttons";
import { VariableDocumentation, type Variable } from "@/components/ui/VariableDocumentation";
import CountryFlag from "@/components/ui/DisplayFlags";
import ReactMarkdown from "react-markdown";
import { LanguageCodeEnum, ReferenceTypeEnum } from "@/lib/shared/enums";

interface Version {
  projectIsHidden: boolean;
  projectKey: string;
  projectNameShort: string | null;
  projectName: string | null;
  datasetIsHidden: boolean;
  datasetKey: string;
  datasetNameShort: string | null;
  datasetName: string | null;
  versionIsHidden: boolean;
  versionIsHiddenReason: string | null;
  versionKey: string;
  version: string;
  versionName: string | null;
  versionUrl: string | null;
  versionCitation: string[] | null;
  commentVersion: string | null;
  commentEntries: string | null;
  References: References[] | null;
  usedFile: string | null;
  dateDownloaded: string | null;
  entriesCreatedAt: string | null;
  entriesUpdatedAt: string | null;
  countryCounts: {
    countrycodePolpal: string;
    countryname: string;
    iso2c: string | null;
    entryCount: number;
    linkedEntryCount: number;
    uniquePolpalIdCount: number;
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

export default function VersionDetailClient() {
  // Auth and routing
  const { auth } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!auth?.userId;

  // Get URL params
  const params = useParams();
  const projectKey = params.projectKey as string;
  const datasetKey = params.datasetKey as string;
  const versionKey = params.versionKey as string;

  // State for version data
  const [version, setVersion] = useState<Version | null>(null);

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // UI state
  const [searchCountries, setSearchCountries] = useState("");
  const [openR, setOpenR] = useState(false);
  const [showVersionDetails, setShowVersionDetails] = useState(true);

  // Variables state
  const [variables, setVariables] = useState<Variable[]>([]);

  async function handleDeleteVariable(variableId: number) {
    const res = await fetch(`/api/variables/${versionKey}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variableId }),
    });
    if (!res.ok) throw new Error(await res.text());
    setVariables(prev => prev.filter(v => v.variableId !== variableId));
  }

  // R script state
  const [rCode, setRCode] = useState<string | null>(null);
  const [errorR, setErrorR] = useState<boolean>(false);

  // Fetch version details and country counts
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {

      setLoadingData(true);
      setErrorData(null);

      try {
        // Fetch version info
        const versionRes = await fetch(
          `/api/versions/${versionKey}/entries`,
          {
            credentials: "include",
            signal,
          }
        );
        if (!versionRes.ok) throw new Error(await versionRes.text());
        const versionData: Version = await versionRes.json();

        if (!versionData) {
          throw new Error("Version not found or you don't have permission to view it.");
        }

        setVersion(versionData);

        // Fetch variable documentation (public endpoint, ignore errors silently)
        const varsRes = await fetch(`/api/variables/${versionKey}`, { credentials: "include", signal });
        if (varsRes.ok) {
          const varsData = await varsRes.json();
          setVariables(varsData.variables ?? []);
        }

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

    // Cleanup function to abort the request
    return () => {
      abortController.abort();
    };
  }, [versionKey]);

  // Fetch R script content
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const scriptPath = `/Rscripts/${versionKey}.R`;

    fetch(scriptPath, { signal })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.text();
      })
      .then(setRCode)
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setErrorR(true);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [versionKey]);

  // Handlers for deleting version and entries
  const handleDeleteVersion = (versionKey: string) => {
    setDeleteComment("");
    setDeleteError(null);
    setDeleteTarget(versionKey);
  };

  const handleDeleteVersionConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const comment = deleteComment.trim();
      const res = await fetch(`/api/versions/${deleteTarget}`, {
        method: "DELETE",
        credentials: "include",
        ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setDeleteTarget(null);
      router.push(`/data/projects/${projectKey}/${datasetKey}`);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handler for deleting all entries of the version
  const handleDeleteEntries = async (versionKey: string) => {
    if (!confirm("Are you sure you want to delete all entries for this version?")) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    try {
      const res = await fetch(
        `/api/entries/${versionKey}`,
        {
          method: "DELETE",
          credentials: "include",
          signal,
        }
      );
      if (!res.ok) throw new Error(await res.text());

      // Reload entries after deletion
      setLoadingData(true);
      setErrorData(null);
      fetch(`/api/versions/${versionKey}/entries`, {
        credentials: "include",
        signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setVersion(data);
        })
        .catch((err) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            setErrorData(err instanceof Error ? err.message : String(err));
          }
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setLoadingData(false);
          }
        });
    } catch (err) {
      alert(`Failed to delete entries: ${err}`);
      setLoadingData(false);
    }
  };

  function downloadEntriesCsvStream() {
    const link = document.createElement("a");
    link.href = `/api/downloads/entries/${versionKey}/stream`;
    link.click();
  }

  // Filter + sort datasets
  const filteredCountries = useMemo(() => {
    const lowerSearch = searchCountries.toLowerCase().trim();

    return (version?.countryCounts || [])
      .filter((cc) => {
        const countrycodePolpal = cc.countrycodePolpal?.toLowerCase() || "";
        const countryname = cc.countryname?.toLowerCase() || "";
        const iso2c = cc.iso2c?.toLowerCase() || "";

        return (
          countrycodePolpal.includes(lowerSearch) ||
          countryname.includes(lowerSearch) ||
          iso2c.includes(lowerSearch)
        );
      })
      .sort((a, b) => (a.countrycodePolpal || "").localeCompare(b.countrycodePolpal || ""));
  }, [version, searchCountries]);

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading version data..." message={<>Fetching countries for <em>{versionKey}</em></>} />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading the versions for <em>{versionKey}</em>.</>} error={errorData} backHref="/data/projects/" backLabel="Back to Data Projects" />;
  }

  if ((!version && !loadingData) || (!isLoggedIn && (version?.projectIsHidden || version?.datasetIsHidden || version?.versionIsHidden))) {
    return (
      <NotFoundState
        title="Version Not Found"
        message={<>The version <em>{versionKey}</em> could not be found or you don&apos;t have permission to view it.</>}
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
        { label: version?.projectName ?? projectKey, href: `/data/projects/${projectKey}` },
        { label: version?.datasetNameShort ?? datasetKey, href: `/data/projects/${projectKey}/${datasetKey}` },
        { label: <>{version?.versionName && <>{version?.versionName}: </>}{version?.version}</> },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              {version?.projectName}
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              {version?.datasetName}
            </h1>
            <p className="text-sm text-gray-500">
              Version {version?.version} {version?.versionName && `(${version.versionName})`}
            </p>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="text-center">
              <div className="text-lg lg:text-2xl font-bold text-amber-600">{version?.countryCounts?.length ?? 0}</div>
              <div className="text-[10px] lg:text-xs text-gray-500 uppercase tracking-wide mt-0.5">Countries</div>
            </div>
            <div className="w-px h-8 lg:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg lg:text-2xl font-bold text-green-600">{version?.countryCounts?.reduce((sum, cc) => sum + cc.entryCount, 0) ?? 0}</div>
              <div className="text-[10px] lg:text-xs text-gray-500 uppercase tracking-wide mt-0.5">Entries</div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
                <>
                  <ButtonUpdate href={`/manage/version/update/${versionKey}`} ariaLabel="Update Version" />
                  <ButtonDelete onClick={() => handleDeleteVersion(versionKey)} ariaLabel="Delete Version" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hidden status for logged-in users */}
        {isLoggedIn && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">
              {version?.versionIsHidden ? (
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
              {version?.versionIsHidden
                ? (version.versionIsHiddenReason ?? "Version is hidden (no reason provided)")
                : "Version is public"}
            </span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {errorData && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 whitespace-pre-line">{errorData}</p>
            </div>
          </div>
        </div>
      )}

      {/* Version Details */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowVersionDetails((prev) => !prev)}
          className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="bg-blue-100 rounded-xl p-3 flex-shrink-0">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">Version Details</h2>
            <p className="text-sm text-gray-500">Source file, dates, citation and notes</p>
          </div>
          {showVersionDetails ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showVersionDetails && (
          <div className="px-6 pb-6">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Project</label>
                <p className="text-gray-900">
                  {version?.projectName ? (
                    <>
                      {version.projectName}
                      {version.projectNameShort && (
                        <span className="text-gray-500 text-sm block">{version.projectNameShort}</span>
                      )}
                    </>
                  ) : (
                    <span className="italic text-gray-400">Unknown project</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dataset</label>
                <p className="text-gray-900">
                  {version?.datasetName ? (
                    <>
                      {version.datasetName}
                      {version.datasetNameShort && (
                        <span className="text-gray-500 text-sm block">{version.datasetNameShort}</span>
                      )}
                    </>
                  ) : (
                    <span className="italic text-gray-400">Unknown dataset</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Version</label>
                <p className="text-gray-900">
                  {version?.version ?? (
                    <span className="italic text-gray-400">Unknown version</span>
                  )}
                  {version?.versionName && (
                    <span className="text-gray-500 text-sm block">{version.versionName}</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Version URL</label>
                <p className="text-gray-900 break-all">
                  {version?.versionUrl ? (
                    <a
                      href={version.versionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={version.versionUrl}
                      className="text-primary hover:underline inline-flex items-start gap-1"
                    >
                      {version.versionUrl.length > 30 ? `${version.versionUrl.slice(0, 30)}…` : version.versionUrl}
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    </a>
                  ) : (
                    "missing"
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Source File</label>
                <p className="text-gray-900">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">
                    {version?.usedFile ?? (
                      <span className="italic text-gray-400">Unknown file</span>
                    )}
                  </code>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Downloaded</label>
                <p className="text-gray-900">
                  {version?.dateDownloaded
                    ? new Date(version.dateDownloaded).toISOString().split('T')[0]
                    : "missing"}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">First Import</label>
                <p className="text-gray-900">
                  {version?.entriesCreatedAt
                    ? new Date(version.entriesCreatedAt).toISOString().split('T')[0]
                    : "missing"}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Update</label>
                <p className="text-gray-900">
                  {version?.entriesUpdatedAt
                    ? new Date(version.entriesUpdatedAt).toISOString().split('T')[0]
                    : "missing"}
                </p>
              </div>
            </div>

            {/* Citation Section */}
            {((version?.versionCitation && version.versionCitation.length > 0) || isLoggedIn) && (
              <div className="pt-6 border-t border-gray-200 mb-4">
                {/* Citation Section */}
                {version?.versionCitation && version.versionCitation.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Citation{version.versionCitation.length > 1 && `s`}
                    </h3>
                    <ul className="space-y-3 text-gray-700 leading-relaxed">
                      {version.versionCitation.map((citation, idx) => {
                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                        const parts = citation.split(urlRegex);

                        return (
                          <li key={idx} className="p-3 rounded-lg text-sm text-justify">
                            {parts.map((part, i) => {
                              if (urlRegex.test(part)) {
                                const trimmedUrl = part.replace(/[.,;!?]+$/, "");
                                return (
                                  <a
                                    key={i}
                                    href={trimmedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline break-all text-justify"
                                  >
                                    {trimmedUrl}
                                  </a>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}



            {/* Version Comment */}
            {(version?.commentVersion && isLoggedIn) && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Comment (Version)
                </h3>
                <div className="text-gray-700 text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-gray-500">
                  <ReactMarkdown>{version.commentVersion}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Entries Comment */}
            {(version?.commentEntries) && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Comment (Entries)
                </h3>
                <div className="text-gray-700 text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-gray-500">
                  <ReactMarkdown>{version.commentEntries}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variable Documentation */}
      <VariableDocumentation
        variables={variables}
        onDelete={["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "") ? handleDeleteVariable : undefined}
        isLoggedIn={!!auth?.userId}
        addHref={["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "") ? `/manage/variables/create/${versionKey}` : undefined}
      />

      {/* Countries Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-amber-100 rounded-xl p-3 shrink-0 border border-amber-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Countries</h2>
              <p className="text-sm text-gray-600">
                {filteredCountries.length === version?.countryCounts?.length
                  ? `All ${filteredCountries.length} countr${filteredCountries.length !== 1 ? 'ies' : 'y'}`
                  : `Showing ${filteredCountries.length} of ${version?.countryCounts?.length} countr${version?.countryCounts?.length !== 1 ? 'ies' : 'y'}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Countries */}
            {(version?.countryCounts?.length ?? 0) > 0 && (
              <>
                <Link
                  href={`/data/projects/${projectKey}/${datasetKey}/${versionKey}/all-entries`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  All External Entries
                </Link>
                <SearchInput value={searchCountries} onChange={setSearchCountries} placeholder="Search countries..." />
                <ButtonDownload
                  onClick={downloadEntriesCsvStream}
                  ariaLabel={`Download ${versionKey}`}
                  text="Download"
                  disabled={version?.countryCounts?.length === 0}
                />
              </>
            )}
            {/* Action Buttons */}
            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <div className="flex flex-wrap gap-2">
                {version?.countryCounts &&
                  version.countryCounts.length > 0 ? (
                  <>
                    <ButtonReupload
                      href={`/manage/entries/${versionKey}/update`}
                      text=""
                      ariaLabel={`Update Entries for Version ${versionKey}`}
                    />
                    <ButtonDelete
                      onClick={() => handleDeleteEntries(versionKey)}
                      text=""
                      ariaLabel="Delete Entries"
                    />
                  </>
                ) : (
                  <ButtonUpload
                    href={`/manage/entries/${versionKey}/create`}
                    text=""
                    ariaLabel={`Add New Entries for Version ${versionKey}`}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-2">
          {filteredCountries.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No entries found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding entries to this version.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm font-medium">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500">Code</th>
                    <th className="px-4 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500">Country</th>
                    <th className="hidden sm:table-cell px-4 py-2 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500"># PolPaL Entities</th>
                    <th className="hidden sm:table-cell px-4 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500">% Linked</th>
                    {isLoggedIn && <th className="w-24"></th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCountries.map((cc) => {
                    const countrycodePolpal = cc.countrycodePolpal;
                    return (
                      <tr key={countrycodePolpal} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            key={cc.countrycodePolpal}
                            href={`/data/projects/${projectKey}/${datasetKey}/${versionKey}/${cc.countrycodePolpal}`}
                            className="relative inline-flex items-center justify-center w-12 h-8 rounded overflow-hidden border border-gray-300 hover:border-amber-400 hover:shadow-sm"
                            title={`${cc.countrycodePolpal}${cc.iso2c ? ` (${cc.iso2c})` : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="absolute inset-0 flex items-center justify-center">
                              <CountryFlag
                                iso2c={cc.iso2c}
                                countrycodePolpal={cc.countrycodePolpal}
                                countryname={cc.countryname}
                                size={64}
                              />
                            </span>
                            <span className="absolute inset-0 bg-black/25" />
                            <span className="relative z-10 text-[9px] font-bold text-white drop-shadow">
                              {cc.countrycodePolpal}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/data/projects/${projectKey}/${datasetKey}/${versionKey}/${cc.countrycodePolpal}`}
                            className="text-primary hover:underline"
                          >
                            {cc.countryname}
                          </Link>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-center">
                          {cc?.uniquePolpalIdCount || "–"}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">
                              {(
                                (cc.linkedEntryCount / cc.entryCount) *
                                100
                              ).toFixed(0)}
                              %
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-1000 ease-out ${cc.linkedEntryCount / cc.entryCount < 0.3
                                  ? "bg-red-500"
                                  : cc.linkedEntryCount / cc.entryCount < 0.7
                                    ? "bg-yellow-400"
                                    : "bg-green-500"
                                  }`}
                                style={{
                                  width: `${(cc.linkedEntryCount / cc.entryCount) * 100
                                    }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        {isLoggedIn && (
                          <td className="hidden sm:table-cell px-4 py-3 text-left">
                            <Link
                              href={`/data/linking/${versionKey}/${countrycodePolpal}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                            >
                              Linking
                            </Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
          }
        </div>
      </div>

      {/* R Script Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <button
          onClick={() => setOpenR((prev) => !prev)}
          className="flex items-center gap-3 text-left w-full p-6 hover:bg-gray-50 transition-colors rounded-xl"
        >
          <div className="bg-orange-100 rounded-xl p-3 flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">R Script for Data Import</h2>
            <p className="text-sm text-gray-600 mt-1">
              {errorR ? "Script not available" : rCode ? "Ready to download" : "Loading..."}
            </p>
          </div>
          {openR ? (
            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
        </button>

        {openR && (
          <div className="border-t border-gray-200 p-6">
            {errorR ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">No R script available for this version.</p>
              </div>
            ) : rCode ? (
              <div className="space-y-4">
                {/* Download button */}
                <div className="flex justify-start">
                  <button
                    onClick={() => {
                      const blob = new Blob([rCode], {
                        type: "text/plain;charset=utf-8",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${versionKey}.R`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download {versionKey}.R
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    language="r"
                    style={ghcolors}
                    wrapLines
                    customStyle={{
                      background: "#fafafa",
                      padding: "16px",
                      margin: 0,
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                      borderRadius: "0",
                    }}
                  >
                    {rCode}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading R script...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">Delete version?</h2>
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
              <button onClick={handleDeleteVersionConfirm} disabled={deleteLoading}
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