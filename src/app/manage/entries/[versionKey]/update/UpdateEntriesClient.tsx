"use client";

import Papa from "papaparse";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Versions = {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  versionKey: string;
  version: string;
  versionName?: string | null;
  versionUrl: string;
  versionCitation: string[];
  shownOnWebsite: boolean;
};

type Countries = {
  countrycodePolpal: string;
  countryname: string;
};

type CsvEntry = Record<string, string | number | undefined>;

type ExistingEntry = {
  uniqueObservationId: string;
  usedFile: string;
  dateDownloaded: string;
  projectKey: string;
  datasetKey: string;
  versionKey: string;
  entryCountryVar: string | null;
  entryCountry: string | null;
  entryYearVar: string | null;
  entryYear: number | null;
  entryMonthVar: string | null;
  entryMonth: number | null;
  entryDayVar: string | null;
  entryDay: number | null;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShortVar: string | null;
  entryEntityNameShort: string | null;
  entryEntityNameEnglishVar: string | null;
  entryEntityNameEnglish: string | null;
  entryEntityNameVar: string | null;
  entryEntityName: string | null;
  additionalInformation: string | null;
  countrycodePolpal: string;
  note: string | null;
};

type ChangedField = { field: string; oldValue: string; newValue: string };

type UpdatedEntry = {
  csvRow: CsvEntry;
  changedFields: ChangedField[];
};

type DiffResult = {
  toCreate: CsvEntry[];
  toUpdate: UpdatedEntry[];
  toDelete: ExistingEntry[];
  unchangedCount: number;
};

// ---------------------------------------------------------------------------
// Fields compared in the diff (all non-metadata scalar fields)
// ---------------------------------------------------------------------------

const DIFF_FIELDS: (keyof ExistingEntry)[] = [
  "usedFile",
  "dateDownloaded",
  "projectKey",
  "datasetKey",
  "versionKey",
  "entryCountryVar",
  "entryCountry",
  "entryYearVar",
  "entryYear",
  "entryMonthVar",
  "entryMonth",
  "entryDayVar",
  "entryDay",
  "entryEntityIdVar",
  "entryEntityId",
  "entryEntityNameShortVar",
  "entryEntityNameShort",
  "entryEntityNameEnglishVar",
  "entryEntityNameEnglish",
  "entryEntityNameVar",
  "entryEntityName",
  "additionalInformation",
  "countrycodePolpal",
  "note",
];

// Normalise a value for comparison: null / undefined / "" all treated as ""
function normalise(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UpdateEntriesClient() {
  const router = useRouter();

  // Authentication
  const { auth, loadingAuth } = useAuth();

  // Extract keys from URL
  const params = useParams();
  const versionKeyFromUrl = (params.versionKey as string).trim();
  const datasetKey = versionKeyFromUrl.split("-").slice(0, 2).join("-");
  const projectKey = datasetKey.split("-").slice(0, 1).join("-");

  // Version metadata
  const [version, setVersion] = useState<Versions | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);
  const [errorVersion, setErrorVersion] = useState<string | null>(null);

  // Countries
  const [availableCountryCodes, setAvailableCountryCodes] = useState<Countries[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [errorCountries, setErrorCountries] = useState<string | null>(null);
  const [countriesLoaded, setCountriesLoaded] = useState(false);

  // Existing DB entries for this version
  const [existingEntries, setExistingEntries] = useState<ExistingEntry[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [errorExisting, setErrorExisting] = useState<string | null>(null);

  // CSV / file state
  const [file, setFile] = useState<File | null>(null);
  const [parsedEntries, setParsedEntries] = useState<CsvEntry[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mismatchedRows, setMismatchedRows] = useState<number[]>([]);
  const [duplicateObservationIds, setDuplicateObservationIds] = useState<string[]>([]);
  const [invalidCountryCodes, setInvalidCountryCodes] = useState<string[]>([]);

  // Diff + confirm
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [confirmMode, setConfirmMode] = useState(false);

  // Collapsible sections
  const [showCreate, setShowCreate] = useState(true);
  const [showUpdate, setShowUpdate] = useState(true);
  const [showDelete, setShowDelete] = useState(true);

  // Pagination + filter for the tables
  const UPDATE_PAGE_SIZE = 50;
  const [createPage, setCreatePage] = useState(0);
  const [deletePage, setDeletePage] = useState(0);
  const [updatePage, setUpdatePage] = useState(0);
  const [updateFieldFilter, setUpdateFieldFilter] = useState<string>("");

  // Upload status
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "warning" | null>(null);

  // Accepted CSV fields (same as create page)
  const acceptedFields = new Set([
    "usedFile", "dateDownloaded", "projectKey", "datasetKey", "versionKey",
    "entryCountryVar", "entryCountry", "entryYearVar", "entryYear",
    "entryMonthVar", "entryMonth", "entryDayVar", "entryDay",
    "entryEntityIdVar", "entryEntityId", "entryEntityNameShortVar",
    "entryEntityNameShort", "entryEntityNameEnglishVar", "entryEntityNameEnglish",
    "entryEntityNameVar", "entryEntityName", "countrycodePolpal",
    "uniqueObservationId", "note", "authorId", "authorIdOriginal",
  ]);

  const numericFields = new Set(["entryYear", "entryMonth", "entryDay", "authorId", "authorIdOriginal"]);

  // ---------------------------------------------------------------------------
  // Data fetching on mount (parallel)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
      setLoadingCountries(false);
      return;
    }
    const ac = new AbortController();
    setErrorCountries(null);
    setLoadingCountries(true);
    (async () => {
      try {
        const res = await fetch(`/api/countries`, { credentials: "include", signal: ac.signal });
        if (!res.ok) throw new Error("Failed to fetch countries");
        const text = await res.text();
        const data: Countries[] = text ? JSON.parse(text) : [];
        setAvailableCountryCodes(data);
        setCountriesLoaded(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setErrorCountries(err instanceof Error ? err.message : "Failed to fetch countries");
      } finally {
        if (!ac.signal.aborted) setLoadingCountries(false);
      }
    })();
    return () => ac.abort();
  }, [loadingAuth, auth?.role]);

  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
      setLoadingVersion(false);
      return;
    }
    const ac = new AbortController();
    setErrorVersion(null);
    setLoadingVersion(true);
    (async () => {
      try {
        const res = await fetch(`/api/versions/${versionKeyFromUrl}`, { credentials: "include", signal: ac.signal });
        if (!res.ok) throw new Error("Failed to load version.");
        setVersion(await res.json());
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setErrorVersion(err instanceof Error ? err.message : "Failed to fetch version");
      } finally {
        if (!ac.signal.aborted) setLoadingVersion(false);
      }
    })();
    return () => ac.abort();
  }, [versionKeyFromUrl, loadingAuth, auth?.role]);

  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
      setLoadingExisting(false);
      return;
    }
    const ac = new AbortController();
    setErrorExisting(null);
    setLoadingExisting(true);
    (async () => {
      try {
        const res = await fetch(`/api/entries/${versionKeyFromUrl}`, { credentials: "include", signal: ac.signal });
        if (!res.ok) throw new Error("Failed to load existing entries.");
        setExistingEntries(await res.json());
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setErrorExisting(err instanceof Error ? err.message : "Failed to fetch existing entries");
      } finally {
        if (!ac.signal.aborted) setLoadingExisting(false);
      }
    })();
    return () => ac.abort();
  }, [versionKeyFromUrl, loadingAuth, auth?.role]);

  // ---------------------------------------------------------------------------
  // CSV parsing + validation
  // ---------------------------------------------------------------------------

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setPreviewRows([]);
    setParsedEntries([]);
    setMismatchedRows([]);
    setInvalidCountryCodes([]);
    setDiffResult(null);
    setConfirmMode(false);
    setStatusMessage(null);
    setStatusType(null);

    if (!selectedFile) return;

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawEntries: CsvEntry[] = results.data as CsvEntry[];
        if (!rawEntries.length) {
          setStatusMessage("CSV has no data rows.");
          setStatusType("error");
          return;
        }

        const header = results.meta.fields || [];

        const entries: CsvEntry[] = rawEntries.map((row) => {
          const entry: CsvEntry = {};
          const additional: Record<string, string | number | undefined> = {};
          header.forEach((key) => {
            let value = row[key] || undefined;
            if (value !== undefined && numericFields.has(key)) {
              const num = Number(value);
              value = isNaN(num) ? undefined : num;
            }
            if (acceptedFields.has(key)) entry[key] = value;
            else additional[key] = value;
          });
          entry.additionalInformation =
            Object.keys(additional).length > 0 ? JSON.stringify(additional) : undefined;
          return entry;
        });

        // versionKey mismatches
        const mismatches = entries
          .map((row, i) => ((row.versionKey?.toString().trim() || "") !== versionKeyFromUrl ? i : -1))
          .filter((i) => i !== -1);

        // Invalid country codes
        const invalidCodes = countriesLoaded
          ? [...new Set(
              entries
                .map((row) => row.countrycodePolpal?.toString().trim())
                .filter((code): code is string =>
                  !!code && !availableCountryCodes.some((c) => c.countrycodePolpal === code)
                )
            )]
          : [];

        // Required fields
        const requiredFields = [
          "usedFile", "dateDownloaded", "entryEntityId", "entryEntityIdVar",
          "countrycodePolpal", "projectKey", "datasetKey", "versionKey",
        ];
        const missingCounts: Record<string, number> = {};
        requiredFields.forEach((f) => {
          missingCounts[f] = entries.filter(
            (row) => row[f] === undefined || row[f] === null || row[f]?.toString().trim() === ""
          ).length;
        });
        const missingVars = requiredFields.filter((f) => missingCounts[f] > 0);

        // Within-file duplicate uniqueObservationIds
        const idCount: Record<string, number> = {};
        entries.forEach((row) => {
          const id = row.uniqueObservationId?.toString().trim();
          if (id) idCount[id] = (idCount[id] || 0) + 1;
        });
        const duplicates = Object.entries(idCount).filter(([, c]) => c > 1).map(([id]) => id);
        setDuplicateObservationIds(duplicates);

        // Set preview
        const preview = [
          header,
          ...entries.slice(0, 4).map((e) => header.map((h) => e[h]?.toString() || "")),
        ];
        setPreviewRows(preview);
        setParsedEntries(entries);
        setMismatchedRows(mismatches);
        setInvalidCountryCodes(invalidCodes);

        // Status
        if (missingVars.length > 0) {
          setStatusMessage(`CSV is missing required values: ${missingVars.map((v) => `${v} (${missingCounts[v]} missing)`).join(", ")}`);
          setStatusType("error");
        } else if (!countriesLoaded) {
          setStatusMessage("Countries are still loading. Please wait before uploading CSV.");
          setStatusType("warning");
        } else if (duplicates.length > 0) {
          setStatusMessage(`CSV contains ${duplicates.length} duplicated uniqueObservationId value(s): ${duplicates.join(", ")}`);
          setStatusType("error");
        } else if (invalidCodes.length > 0) {
          setStatusMessage(`CSV contains invalid countrycodePolpal(s): ${invalidCodes.join(", ")}`);
          setStatusType("error");
        } else if (mismatches.length > 0) {
          setStatusMessage(`CSV contains ${mismatches.length} row(s) with a different versionKey than "${versionKeyFromUrl}".`);
          setStatusType("error");
        } else {
          setStatusMessage(`Parsed ${entries.length} row(s) successfully. Computing diff…`);
          setStatusType("success");
          // Compute diff immediately after parse
          computeDiff(entries);
        }
      },
      error: (err) => {
        setStatusMessage(`CSV parsing error: ${err instanceof Error ? err.message : String(err)}`);
        setStatusType("error");
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Diff computation (client-side)
  // ---------------------------------------------------------------------------

  function computeDiff(csvEntries: CsvEntry[]) {
    const existingMap = new Map<string, ExistingEntry>(
      existingEntries.map((e) => [e.uniqueObservationId, e])
    );
    const csvIdSet = new Set(
      csvEntries.map((e) => e.uniqueObservationId?.toString().trim()).filter(Boolean)
    );

    const toCreate: CsvEntry[] = [];
    const toUpdate: UpdatedEntry[] = [];
    let unchangedCount = 0;

    for (const csvRow of csvEntries) {
      const id = csvRow.uniqueObservationId?.toString().trim();
      if (!id) continue;
      const existing = existingMap.get(id);
      if (!existing) {
        toCreate.push(csvRow);
        continue;
      }
      const changedFields: ChangedField[] = [];
      for (const field of DIFF_FIELDS) {
        const oldVal = normalise(existing[field]);
        const newVal = normalise(csvRow[field as string] as string | number | undefined);
        if (oldVal !== newVal) {
          changedFields.push({ field, oldValue: oldVal, newValue: newVal });
        }
      }
      if (changedFields.length > 0) {
        toUpdate.push({ csvRow, changedFields });
      } else {
        unchangedCount++;
      }
    }

    const toDelete = existingEntries.filter((e) => !csvIdSet.has(e.uniqueObservationId));

    setDiffResult({ toCreate, toUpdate, toDelete, unchangedCount });
    setCreatePage(0);
    setDeletePage(0);
    setUpdatePage(0);
    setUpdateFieldFilter("");
    setConfirmMode(true);
    setStatusMessage(null);
    setStatusType(null);
  }

  // ---------------------------------------------------------------------------
  // Sync submit
  // ---------------------------------------------------------------------------

  const handleSync = async () => {
    if (!diffResult) return;
    setLoadingSubmit(true);
    setStatusMessage("Applying changes…");
    setStatusType(null);
    try {
      const payload = {
        toCreate: diffResult.toCreate,
        toUpdate: diffResult.toUpdate.map(({ csvRow }) => csvRow),
        toDelete: diffResult.toDelete.map((e) => e.uniqueObservationId),
      };
      const res = await fetch("/api/entries/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).message ?? text; } catch { /* raw text */ }
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }
      const data = await res.json();
      setStatusMessage(
        `Sync complete! Created: ${data.created}, Updated: ${data.updated}, Deleted: ${data.deleted}.`
      );
      setStatusType("success");
      setFile(null);
      setParsedEntries([]);
      setPreviewRows([]);
      setDiffResult(null);
      setConfirmMode(false);
      setTimeout(() => router.back(), 2000);
    } catch (error: unknown) {
      setStatusMessage(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      setStatusType("error");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading / error guards
  // ---------------------------------------------------------------------------

  if (loadingVersion || loadingCountries || loadingExisting || loadingAuth) {
    return <LoadingSpinner title="Loading data…" message="Fetching version info and existing entries. Please wait." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN or DATAMANAGER rights are required to update entries." />;
  }

  if (errorCountries || errorVersion || errorExisting) {
    return (
      <ErrorState
        message="We encountered an issue while loading the data."
        error={errorVersion || errorCountries || errorExisting}
        backHref="/"
        backLabel="Back to Homepage"
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: version?.projectName ?? projectKey, href: `/data/projects/${projectKey}` },
        { label: version?.datasetNameShort ?? datasetKey, href: `/data/projects/${projectKey}/${datasetKey}` },
        { label: version?.version ?? versionKeyFromUrl, href: `/data/projects/${projectKey}/${datasetKey}/${versionKeyFromUrl}` },
        { label: "Update" },
      ]} />

      {/* Page header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Update Entries — {version?.projectNameShort ?? projectKey} · {version?.datasetNameShort ?? datasetKey} · {version?.version ?? versionKeyFromUrl}
        </h1>
        <p className="text-lg text-gray-600">
          Upload a CSV representing the complete intended state for this version. Entries will be created, updated, or deleted to match the file.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {existingEntries.length.toLocaleString()} entr{existingEntries.length === 1 ? "y" : "ies"} currently in the database for this version.
        </p>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* UPLOAD STATE                                                        */}
      {/* ------------------------------------------------------------------- */}
      {!confirmMode && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-900 mb-2">
              Select CSV File
            </label>
            <label
              htmlFor="csv-upload"
              className={`flex items-center gap-4 w-full px-5 py-6 border-2 border-dashed rounded-lg cursor-pointer transition ${
                file
                  ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                  : "border-gray-300 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              {file ? (
                <FileText className="w-9 h-9 text-primary shrink-0" />
              ) : (
                <UploadCloud className="w-9 h-9 text-gray-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · CSV</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Click to upload</p>
                    <p className="text-xs text-gray-500 mt-0.5">CSV files only</p>
                  </>
                )}
              </div>
              {file && (
                <span className="text-xs text-primary font-medium shrink-0">Change file</span>
              )}
              <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* CSV preview */}
          {file && previewRows.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">CSV Preview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {previewRows[0].map((cell, i) => (
                        <th scope="col" key={i} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.slice(1).map((row, ri) => {
                      const isMismatch = mismatchedRows.includes(ri);
                      return (
                        <tr key={ri} className={`hover:bg-gray-50 transition ${isMismatch ? "bg-red-50" : ""}`}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`px-4 py-3 whitespace-nowrap ${isMismatch ? "text-red-600" : "text-gray-700"}`}>
                              {cell || <span className="text-gray-400 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Showing first {Math.min(4, previewRows.length - 1)} of {parsedEntries.length} rows
              </p>
            </div>
          )}

          {/* Status message */}
          {statusMessage && (
            <div className={`flex items-start gap-3 text-sm p-4 rounded-lg font-medium ${
              statusType === "success" ? "text-green-800 bg-green-50 border border-green-200"
              : statusType === "error" ? "text-red-800 bg-red-50 border border-red-200"
              : "text-amber-800 bg-amber-50 border border-amber-200"
            }`}>
              {statusType === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              {statusType === "error" && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {duplicateObservationIds.length > 0 && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 p-4 rounded-lg">
              <strong className="block mb-1">Duplicated Observation IDs in CSV:</strong>
              <code className="text-xs bg-red-100 px-2 py-1 rounded">{duplicateObservationIds.join(", ")}</code>
            </div>
          )}

          {invalidCountryCodes.length > 0 && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 p-4 rounded-lg">
              <strong className="block mb-1">Invalid Country Codes:</strong>
              <code className="text-xs bg-red-100 px-2 py-1 rounded">{invalidCountryCodes.join(", ")}</code>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Link
              href={`/data/projects/${projectKey}/${datasetKey}/${versionKeyFromUrl}`}
              className="py-2 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* CONFIRMATION STATE                                                  */}
      {/* ------------------------------------------------------------------- */}
      {confirmMode && diffResult && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Review Changes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{diffResult.toCreate.length}</p>
                <p className="text-sm text-green-600 mt-1">To create</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{diffResult.toUpdate.length}</p>
                <p className="text-sm text-blue-600 mt-1">To update</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{diffResult.toDelete.length}</p>
                <p className="text-sm text-red-600 mt-1">To delete</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{diffResult.unchangedCount}</p>
                <p className="text-sm text-gray-500 mt-1">Unchanged</p>
              </div>
            </div>
          </div>

          {/* To create */}
          {diffResult.toCreate.length > 0 && (() => {
            const totalCreatePages = Math.ceil(diffResult.toCreate.length / UPDATE_PAGE_SIZE);
            const createPageClamped = totalCreatePages > 0 ? Math.min(createPage, totalCreatePages - 1) : 0;
            const createSlice = diffResult.toCreate.slice(
              createPageClamped * UPDATE_PAGE_SIZE,
              (createPageClamped + 1) * UPDATE_PAGE_SIZE
            );
            return (
              <div className="bg-white rounded-lg shadow-sm border border-green-200 p-6">
                <button
                  onClick={() => setShowCreate((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-green-800">
                    New entries ({diffResult.toCreate.length})
                  </h3>
                  <span className="text-gray-400 text-xs">{showCreate ? "▲ hide" : "▼ show"}</span>
                </button>
                {showCreate && (
                  <div className="mt-4 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-green-50 border-b border-green-200">
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">uniqueObservationId</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">countrycodePolpal</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">entryEntityIdVar</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">entryEntityId</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">entryYear</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">entryEntityNameShort</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">entryEntityNameEnglish</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-green-700">entryEntityName</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                          {createSlice.map((row, i) => (
                            <tr key={i} className="hover:bg-green-50">
                              <td className="px-3 py-2 font-mono text-green-800 whitespace-nowrap">{row.uniqueObservationId?.toString()}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.countrycodePolpal?.toString() ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityIdVar?.toString() ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityId?.toString() ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryYear?.toString() ?? <em>missing</em>}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityNameShort?.toString() ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityNameEnglish?.toString() ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityName?.toString() ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalCreatePages > 1 && (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          Showing {createPageClamped * UPDATE_PAGE_SIZE + 1}–{Math.min((createPageClamped + 1) * UPDATE_PAGE_SIZE, diffResult.toCreate.length)} of {diffResult.toCreate.length}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCreatePage((p) => Math.max(0, p - 1))}
                            disabled={createPageClamped === 0}
                            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
                          >
                            ← Prev
                          </button>
                          <span className="px-3 py-1">{createPageClamped + 1} / {totalCreatePages}</span>
                          <button
                            onClick={() => setCreatePage((p) => Math.min(totalCreatePages - 1, p + 1))}
                            disabled={createPageClamped === totalCreatePages - 1}
                            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* To update */}
          {diffResult.toUpdate.length > 0 && (() => {
            // All unique field names that changed across any entry — for the dropdown
            const allChangedFields = [...new Set(
              diffResult.toUpdate.flatMap(({ changedFields }) => changedFields.map((cf) => cf.field))
            )].sort();

            // Apply field filter: show entries that include the selected field among their changes
            const filteredUpdate = updateFieldFilter
              ? diffResult.toUpdate.filter(({ changedFields }) =>
                  changedFields.some((cf) => cf.field === updateFieldFilter)
                )
              : diffResult.toUpdate;

            const totalUpdatePages = Math.ceil(filteredUpdate.length / UPDATE_PAGE_SIZE);
            const updatePageClamped = totalUpdatePages > 0 ? Math.min(updatePage, totalUpdatePages - 1) : 0;
            const pageSlice = filteredUpdate.slice(
              updatePageClamped * UPDATE_PAGE_SIZE,
              (updatePageClamped + 1) * UPDATE_PAGE_SIZE
            );
            return (
              <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
                <button
                  onClick={() => setShowUpdate((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-blue-800">
                    Modified entries ({diffResult.toUpdate.length})
                  </h3>
                  <span className="text-gray-400 text-xs">{showUpdate ? "▲ hide" : "▼ show"}</span>
                </button>
                {showUpdate && (
                  <div className="mt-4 space-y-3">
                    {/* Field filter dropdown */}
                    <div className="flex items-center gap-3">
                      <label htmlFor="update-field-filter" className="text-xs font-medium text-gray-700 whitespace-nowrap">
                        Filter by changed field:
                      </label>
                      <select
                        id="update-field-filter"
                        value={updateFieldFilter}
                        onChange={(e) => {
                          setUpdateFieldFilter(e.target.value);
                          setUpdatePage(0);
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">All fields ({diffResult.toUpdate.length} entries)</option>
                        {allChangedFields.map((field) => {
                          const count = diffResult.toUpdate.filter(({ changedFields }) =>
                            changedFields.some((cf) => cf.field === field)
                          ).length;
                          return (
                            <option key={field} value={field}>
                              {field} ({count} entr{count === 1 ? "y" : "ies"})
                            </option>
                          );
                        })}
                      </select>
                      {updateFieldFilter && (
                        <button
                          onClick={() => { setUpdateFieldFilter(""); setUpdatePage(0); }}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-blue-50 border-b border-blue-200">
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-blue-700">uniqueObservationId</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-blue-700">Changed fields</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {pageSlice.map(({ csvRow: row, changedFields }, i) => (
                            <tr key={i} className="hover:bg-blue-50 align-top">
                              <td className="px-3 py-2 font-mono text-blue-800 whitespace-nowrap">{row.uniqueObservationId?.toString()}</td>
                              <td className="px-3 py-2">
                                <ul className="space-y-1">
                                  {changedFields.map((cf, j) => (
                                    <li key={j} className="flex flex-wrap gap-1 items-center">
                                      <span className="font-medium text-gray-700">{cf.field}:</span>
                                      <span className="line-through text-red-600 bg-red-50 px-1 rounded">{cf.oldValue || <em>empty</em>}</span>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-green-700 bg-green-50 px-1 rounded">{cf.newValue || <em>empty</em>}</span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalUpdatePages > 1 && (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          Showing {updatePageClamped * UPDATE_PAGE_SIZE + 1}–{Math.min((updatePageClamped + 1) * UPDATE_PAGE_SIZE, filteredUpdate.length)} of {filteredUpdate.length}{updateFieldFilter ? ` (filtered from ${diffResult.toUpdate.length})` : ""}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setUpdatePage((p) => Math.max(0, p - 1))}
                            disabled={updatePageClamped === 0}
                            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
                          >
                            ← Prev
                          </button>
                          <span className="px-3 py-1">{updatePageClamped + 1} / {totalUpdatePages}</span>
                          <button
                            onClick={() => setUpdatePage((p) => Math.min(totalUpdatePages - 1, p + 1))}
                            disabled={updatePageClamped === totalUpdatePages - 1}
                            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* To delete */}
          {diffResult.toDelete.length > 0 && (() => {
            const totalDeletePages = Math.ceil(diffResult.toDelete.length / UPDATE_PAGE_SIZE);
            const deletePageClamped = totalDeletePages > 0 ? Math.min(deletePage, totalDeletePages - 1) : 0;
            const deleteSlice = diffResult.toDelete.slice(
              deletePageClamped * UPDATE_PAGE_SIZE,
              (deletePageClamped + 1) * UPDATE_PAGE_SIZE
            );
            return (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <button
                  onClick={() => setShowDelete((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-red-800">
                    Entries to delete ({diffResult.toDelete.length})
                  </h3>
                  <span className="text-gray-400 text-xs">{showDelete ? "▲ hide" : "▼ show"}</span>
                </button>
                {showDelete && (
                  <div className="mt-4 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-red-50 border-b border-red-200">
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">uniqueObservationId</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">countrycodePolpal</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">entryEntityIdVar</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">entryEntityId</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">entryYear</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">entryEntityNameShort</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">entryEntityNameEnglish</th>
                            <th scope="col" className="px-3 py-2 text-left font-semibold text-red-700">entryEntityName</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {deleteSlice.map((row, i) => (
                            <tr key={i} className="hover:bg-red-50">
                              <td className="px-3 py-2 font-mono text-red-800 whitespace-nowrap">{row.uniqueObservationId}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.countrycodePolpal}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityIdVar}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityId}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryYear ?? <em>missing</em>}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityNameShort ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityNameEnglish ?? ""}</td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.entryEntityName ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalDeletePages > 1 && (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          Showing {deletePageClamped * UPDATE_PAGE_SIZE + 1}–{Math.min((deletePageClamped + 1) * UPDATE_PAGE_SIZE, diffResult.toDelete.length)} of {diffResult.toDelete.length}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeletePage((p) => Math.max(0, p - 1))}
                            disabled={deletePageClamped === 0}
                            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
                          >
                            ← Prev
                          </button>
                          <span className="px-3 py-1">{deletePageClamped + 1} / {totalDeletePages}</span>
                          <button
                            onClick={() => setDeletePage((p) => Math.min(totalDeletePages - 1, p + 1))}
                            disabled={deletePageClamped === totalDeletePages - 1}
                            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Unchanged notice */}
          {diffResult.unchangedCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              {diffResult.unchangedCount.toLocaleString()} entr{diffResult.unchangedCount === 1 ? "y" : "ies"} unchanged — not shown.
            </div>
          )}

          {/* No changes notice */}
          {diffResult.toCreate.length === 0 && diffResult.toUpdate.length === 0 && diffResult.toDelete.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              No changes detected. The CSV matches the current database state exactly.
            </div>
          )}

          {/* Status after sync */}
          {statusMessage && (
            <div className={`flex items-start gap-3 text-sm p-4 rounded-lg font-medium ${
              statusType === "success" ? "text-green-800 bg-green-50 border border-green-200"
              : statusType === "error" ? "text-red-800 bg-red-50 border border-red-200"
              : "text-amber-800 bg-amber-50 border border-amber-200"
            }`}>
              {statusType === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              {statusType === "error" && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleSync}
              disabled={
                loadingSubmit ||
                (diffResult.toCreate.length === 0 &&
                  diffResult.toUpdate.length === 0 &&
                  diffResult.toDelete.length === 0)
              }
              className="py-2 px-6 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-medium rounded-lg transition disabled:cursor-not-allowed"
            >
              {loadingSubmit ? "Applying…" : "Confirm & Apply"}
            </button>
            <button
              onClick={() => {
                setConfirmMode(false);
                setFile(null);
                setParsedEntries([]);
                setPreviewRows([]);
                setDiffResult(null);
                setStatusMessage(null);
                setStatusType(null);
              }}
              disabled={loadingSubmit}
              className="py-2 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition disabled:cursor-not-allowed"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
