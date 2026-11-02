"use client";

import Papa from "papaparse";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";

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

// ---- Auto-link types ----

type PreviousVersion = {
  versionKey: string;
  version: string;
  versionName: string | null;
};

type OldLinkData = {
  polpalId: number;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  comment: string | null;
  Entities: { nameShort: string | null; nameEnglish: string | null } | null;
};

type OldEntryWithLinks = {
  uniqueObservationId: string;
  projectKey: string;
  datasetKey: string;
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
  LinksEntryToEntity: OldLinkData[];
};

type AutoLinkMatch = {
  newUniqueObservationId: string;
  links: Omit<OldLinkData, "Entities">[];
  entityLabels: string[];
};

// Fields excluded from the match key
const MATCH_KEY_EXCLUDE = new Set(["versionKey", "uniqueObservationId", "usedFile", "dateDownloaded"]);

function makeMatchKey(entry: CsvEntry | OldEntryWithLinks): string {
  if ("LinksEntryToEntity" in entry) {
    // OldEntryWithLinks
    return [
      entry.projectKey ?? "",
      entry.datasetKey ?? "",
      entry.entryCountryVar ?? "",
      entry.entryCountry ?? "",
      entry.entryYearVar ?? "",
      entry.entryYear?.toString() ?? "",
      entry.entryMonthVar ?? "",
      entry.entryMonth?.toString() ?? "",
      entry.entryDayVar ?? "",
      entry.entryDay?.toString() ?? "",
      entry.entryEntityIdVar ?? "",
      entry.entryEntityId ?? "",
      entry.entryEntityNameShortVar ?? "",
      entry.entryEntityNameShort ?? "",
      entry.entryEntityNameEnglishVar ?? "",
      entry.entryEntityNameEnglish ?? "",
      entry.entryEntityNameVar ?? "",
      entry.entryEntityName ?? "",
      entry.additionalInformation ?? "",
      entry.countrycodePolpal ?? "",
      entry.note ?? "",
    ].join("|");
  }
  // CsvEntry
  const keys = [
    "projectKey", "datasetKey",
    "entryCountryVar", "entryCountry",
    "entryYearVar", "entryYear",
    "entryMonthVar", "entryMonth",
    "entryDayVar", "entryDay",
    "entryEntityIdVar", "entryEntityId",
    "entryEntityNameShortVar", "entryEntityNameShort",
    "entryEntityNameEnglishVar", "entryEntityNameEnglish",
    "entryEntityNameVar", "entryEntityName",
    "additionalInformation", "countrycodePolpal", "note",
  ];
  return keys
    .filter((k) => !MATCH_KEY_EXCLUDE.has(k))
    .map((k) => entry[k]?.toString() ?? "")
    .join("|");
}

export default function UploadCsvEntries() {

  // Router
  const router = useRouter();

  // Authentication
  const { auth, loadingAuth } = useAuth();

  // Extract versionKey from URL and derive datasetKey and projectKey
  const params = useParams();
  const versionKeyFromUrl = (params.versionKey as string).trim();
  const datasetKey = versionKeyFromUrl.split("-").slice(0, 2).join("-");
  const projectKey = datasetKey.split("-").slice(0, 1).join("-");

  // State for version data
  const [version, setVersion] = useState<Versions | null>(null);

  // State for loading and error handling 
  const [loadingVersion, setLoadingVersion] = useState(true);
  const [errorVersion, setErrorVersion] = useState<string | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [errorCountries, setErrorCountries] = useState<string | null>(null);
  const [countriesLoaded, setCountriesLoaded] = useState(false);

  // State for file handling and upload process
  const [file, setFile] = useState<File | null>(null);

  // State for CSV preview and validation
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [parsedEntries, setParsedEntries] = useState<CsvEntry[]>([]);
  const [mismatchedRows, setMismatchedRows] = useState<number[]>([]);
  const [duplicateObservationIds, setDuplicateObservationIds] = useState<string[]>([]);
  const [availableCountryCodes, setAvailableCountryCodes] = useState<Countries[]>([]);
  const [invalidCountryCodes, setInvalidCountryCodes] = useState<string[]>([]);

  // State for status messages to user
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "warning" | null>(null);

  // Upload progress (0–100)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // State for submit loading
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // ---- Auto-link state ----
  const [previousVersions, setPreviousVersions] = useState<PreviousVersion[]>([]);
  const [selectedPreviousVersionKey, setSelectedPreviousVersionKey] = useState<string>("");
  const [loadingPreviousVersions, setLoadingPreviousVersions] = useState(false);
  const [loadingAutoLinkPreview, setLoadingAutoLinkPreview] = useState(false);
  const [autoLinkMatches, setAutoLinkMatches] = useState<AutoLinkMatch[] | null>(null);
  const [autoLinkConfirmed, setAutoLinkConfirmed] = useState(true);

  // Define accepted fields for entries to prevent unexpected data from CSV
  const acceptedFields = new Set([
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
    "countrycodePolpal",
    "uniqueObservationId",
    "note",
    "authorId",
    "authorIdOriginal",
  ]);

  // Fetch countries data on mount
  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
      setLoadingCountries(false);
      return;
    }
    // Create an AbortController to allow request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;

    // Clear previous error and set loading state
    setErrorCountries(null);
    setLoadingCountries(true);

    // Fetch countries data from API
    async function fetchCountries() {
      try {
        const countriesRes = await fetch(`/api/countries`, {
          credentials: "include",
          signal,
        });

        if (!countriesRes.ok) throw new Error("Failed to fetch countries");

        // Try to parse JSON safely
        const text = await countriesRes.text();
        if (!text) {
          console.warn("No countries returned from API");
          setAvailableCountryCodes([]);
          setCountriesLoaded(true);
          return;
        }

        const data: Countries[] = JSON.parse(text);
        console.log("Countries loaded successfully:", data.length, "countries");
        console.log("First 5 countries:", data.slice(0, 5).map(c => c.countrycodePolpal));
        setAvailableCountryCodes(data);
        setCountriesLoaded(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch countries", err);
          setErrorCountries(err instanceof Error ? err.message : "Failed to fetch countries");
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingCountries(false);
        }
      }
    }

    fetchCountries();
    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, [loadingAuth, auth?.role]);

  // Fetch version data on mount
  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
      setLoadingVersion(false);
      return;
    }
    // Create an AbortController to allow request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;

    // Clear previous error and set loading state
    setErrorVersion(null);
    setLoadingVersion(true);

    async function fetchVersion() {
      try {
        const versionRes = await fetch(`/api/versions/${versionKeyFromUrl}`, {
          credentials: "include",
          signal,
        })
        if (!versionRes.ok) throw new Error("Failed to load version.");
        const versionData = await versionRes.json();
        setVersion(versionData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch version", err);
          setErrorVersion(err instanceof Error ? err.message : "Failed to fetch version");
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingVersion(false);
        }
      }
    }

    fetchVersion();
    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, [versionKeyFromUrl, loadingAuth, auth?.role]);

  // Fetch previous versions once CSV is valid
  useEffect(() => {
    if (statusType !== "success" || !datasetKey) return;
    setLoadingPreviousVersions(true);
    setPreviousVersions([]);
    setSelectedPreviousVersionKey("");
    setAutoLinkMatches(null);

    fetch(`/api/versions/by-dataset/${datasetKey}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: PreviousVersion[]) => {
        setPreviousVersions(data.filter((v) => v.versionKey !== versionKeyFromUrl));
      })
      .catch((err) => console.error("Failed to fetch previous versions", err))
      .finally(() => setLoadingPreviousVersions(false));
  }, [statusType, datasetKey, versionKeyFromUrl]);

  // Compute auto-link matches from a selected previous version
  const computeAutoLinkPreview = useCallback(async (sourceVersionKey: string) => {
    if (!sourceVersionKey || !parsedEntries.length) {
      setAutoLinkMatches(null);
      return;
    }
    setLoadingAutoLinkPreview(true);
    setAutoLinkMatches(null);
    try {
      const res = await fetch(`/api/entries/${sourceVersionKey}/with-links`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch previous version entries");
      const oldEntries: OldEntryWithLinks[] = await res.json();

      // Build map: matchKey → { uniqueObservationId, links[] }
      const oldMap = new Map<string, { uniqueObservationId: string; links: OldLinkData[] }>();
      for (const old of oldEntries) {
        if (old.LinksEntryToEntity.length === 0) continue;
        const key = makeMatchKey(old);
        if (!oldMap.has(key)) {
          oldMap.set(key, { uniqueObservationId: old.uniqueObservationId, links: old.LinksEntryToEntity });
        }
      }

      // Compare each new CSV entry against old entries
      const matches: AutoLinkMatch[] = [];
      for (const newEntry of parsedEntries) {
        const key = makeMatchKey(newEntry);
        const oldMatch = oldMap.get(key);
        if (!oldMatch) continue;
        const newId = newEntry.uniqueObservationId?.toString();
        if (!newId) continue;
        matches.push({
          newUniqueObservationId: newId,
          links: oldMatch.links.map(({ polpalId, startYear, startMonth, startDay, endYear, endMonth, endDay, comment }) => ({ polpalId, startYear, startMonth, startDay, endYear, endMonth, endDay, comment })),
          entityLabels: oldMatch.links.map((l) =>
            l.Entities?.nameShort ?? l.Entities?.nameEnglish ?? String(l.polpalId)
          ),
        });
      }
      setAutoLinkMatches(matches);
    } catch (err) {
      console.error("Auto-link preview failed", err);
      setAutoLinkMatches([]);
    } finally {
      setLoadingAutoLinkPreview(false);
    }
  }, [parsedEntries]);

  // Trigger preview when user picks a version
  const handleVersionSelect = (versionKey: string) => {
    setSelectedPreviousVersionKey(versionKey);
    if (versionKey) {
      computeAutoLinkPreview(versionKey);
    } else {
      setAutoLinkMatches(null);
    }
  };

  // Change handler for file input - parses CSV and prepares preview and validation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setPreviewRows([]);
    setParsedEntries([]);
    setMismatchedRows([]);
    setInvalidCountryCodes([]);
    setStatusMessage(null);
    // Reset auto-link state when a new file is selected
    setPreviousVersions([]);
    setSelectedPreviousVersionKey("");
    setAutoLinkMatches(null);

    if (!selectedFile) return;

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawEntries: CsvEntry[] = results.data as CsvEntry[];
        if (!rawEntries.length) {
          setStatusMessage("CSV has no data rows.");
          return;
        }

        const header = results.meta.fields || [];

        // Define numeric fields
        const numericFields = new Set([
          "entryYear",
          "entryMonth",
          "entryDay",
          "authorId",
          "authorIdOriginal",
        ]);

        // Map CSV rows to backend format with type conversion
        const entries: CsvEntry[] = rawEntries.map((row) => {
          const entry: CsvEntry = {};
          const additional: Record<string, string | number | undefined> = {};

          header.forEach((key) => {
            let value = row[key] || undefined;

            // Convert numeric fields
            if (value !== undefined && numericFields.has(key)) {
              const num = Number(value);
              value = isNaN(num) ? undefined : num;
            }

            if (acceptedFields.has(key)) {
              entry[key] = value;
            } else {
              additional[key] = value;
            }
          });

          entry.additionalInformation =
            Object.keys(additional).length > 0
              ? JSON.stringify(additional)
              : undefined;

          return entry;
        });

        // Check for mismatched versionKey and invalid countrycodes
        const mismatches: number[] = [];
        const invalidCodes: string[] = [];

        entries.forEach((row, index) => {
          if ((row.versionKey?.toString().trim() || "") !== versionKeyFromUrl) {
            mismatches.push(index);
          }

          const code = row.countrycodePolpal?.toString().trim();
          // Only validate country codes if we have successfully loaded the country list
          if (
            code &&
            countriesLoaded &&
            !availableCountryCodes.some(
              (country) => country.countrycodePolpal === code
            )
          ) {
            console.log(`Invalid country code detected: ${code}`);
            console.log("Available country codes loaded:", availableCountryCodes.length);
            console.log("Countries loaded state:", countriesLoaded);
            console.log("Sample available codes:", availableCountryCodes.slice(0, 5).map(c => c.countrycodePolpal));
            invalidCodes.push(code);
          }
        });


        // Check for missing required columns
        const requiredFields = [
          "usedFile",
          "dateDownloaded",
          "entryEntityId",
          "entryEntityIdVar",
          "countrycodePolpal",
          "projectKey",
          "datasetKey",
          "versionKey",
        ];
        const missingCounts: Record<string, number> = {};
        requiredFields.forEach((field) => {
          missingCounts[field] = entries.filter(
            (row) => row[field] === undefined || row[field] === null || row[field]?.toString().trim() === ""
          ).length;
        });
        const missingVars = requiredFields.filter((field) => missingCounts[field] > 0);

        // Check for duplicate uniqueObservationId
        const idCount: Record<string, number> = {};
        entries.forEach((row) => {
          const id = row.uniqueObservationId?.toString().trim();
          if (id) {
            idCount[id] = (idCount[id] || 0) + 1;
          }
        });
        const duplicates = Object.entries(idCount)
          .filter(([, count]) => count > 1)
          .map(([id]) => id);
        setDuplicateObservationIds(duplicates);

        if (missingVars.length > 0) {
          setStatusMessage(
            `CSV is missing required values: ` +
            missingVars
              .map((v) => `${v} (${missingCounts[v]} missing)`)
              .join(", ")
          );
          setStatusType("error");
        } else if (!countriesLoaded) {
          setStatusMessage(
            "Countries are still loading. Please wait before uploading CSV."
          );
          setStatusType("warning");
        } else if (duplicates.length > 0) {
          setStatusMessage(
            `CSV contains ${duplicates.length} duplicated uniqueObservationId value(s): ${duplicates.join(", ")}`
          );
          setStatusType("error");
        } else if (invalidCodes.length > 0) {
          const uniqueInvalidCodes = [...new Set(invalidCodes)];
          setStatusMessage(
            `CSV contains invalid countrycodePolpal(s): ${uniqueInvalidCodes.join(", ")}`
          );
          setStatusType("error");
          setInvalidCountryCodes(uniqueInvalidCodes);
        } else if (mismatches.length > 0) {
          setStatusMessage(
            `CSV contains ${mismatches.length} row(s) with a different versionKey than "${versionKeyFromUrl}".`
          );
          setStatusType("error");
          setInvalidCountryCodes([]);
        } else {
          // Check all country codes used in CSV
          const usedCountryCodes = [...new Set(entries
            .map(row => row.countrycodePolpal?.toString().trim())
            .filter(code => code)
          )];

          const validCodes = usedCountryCodes.filter(code =>
            availableCountryCodes.some(country => country.countrycodePolpal === code)
          );

          setStatusMessage(
            `Uploaded file parsed successfully with ${entries.length} row(s). ` +
            `Country codes: ${validCodes.length}/${usedCountryCodes.length} valid (${validCodes.join(", ")})`
          );
          setStatusType("success");
          setInvalidCountryCodes([]);
        }

        setParsedEntries(entries);
        setMismatchedRows(mismatches);

        // Prepare preview (first 4 rows)
        const preview = [
          header,
          ...entries
            .slice(0, 4)
            .map((e) => header.map((h) => e[h]?.toString() || "")),
        ];
        setPreviewRows(preview);
      },
      error: (err) => {
        setStatusMessage(`CSV parsing error: ${err instanceof Error ? err.message : String(err)}`);
      },
    });
  };

  // Upload handler - sends parsed entries to backend in chunks with validation and error handling
  const handleUpload = async () => {
    if (!parsedEntries.length) {
      setStatusMessage("No data to upload.");
      return;
    }
    if (
      mismatchedRows.length > 0 ||
      invalidCountryCodes.length > 0 ||
      duplicateObservationIds.length > 0
    ) {
      setStatusMessage("Cannot upload: CSV has errors.");
      return;
    }

    setLoadingSubmit(true);
    setUploadProgress(0);
    setStatusMessage("Validating country codes with database before upload…");

    try {
      // Double-check all country codes against current database state
      const usedCountryCodes = [...new Set(parsedEntries
        .map(row => row.countrycodePolpal?.toString().trim())
        .filter(code => code)
      )];

      // Refresh countries list to ensure it's current
      const countryRes = await fetch(`/api/countries`);
      if (!countryRes.ok) throw new Error("Failed to fetch latest country data");
      const latestCountries: Countries[] = await countryRes.json();

      // Check for any invalid codes with current data
      const invalidCodes = usedCountryCodes.filter(code =>
        !latestCountries.some(country => country.countrycodePolpal === code)
      );

      if (invalidCodes.length > 0) {
        throw new Error(
          `Invalid country codes found: ${invalidCodes.join(", ")}. ` +
          `Please check that these countries exist in the database.`
        );
      }

      setStatusMessage("Country codes validated. Starting chunked upload...");

      // Chunked upload — 1000 entries per HTTP request
      const chunkSize = 1000;
      const totalEntries = parsedEntries.length;
      const totalChunks = Math.ceil(totalEntries / chunkSize);
      let totalCreated = 0;
      let totalSkipped = 0;
      let totalProcessed = 0;
      const failedChunks: number[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalEntries);
        const chunk = parsedEntries.slice(start, end);

        try {
          const res = await fetch(`/api/entries/import/`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chunk),
          });

          if (!res.ok) {
            const errorText = await res.text();

            // Try to parse the error response for more details
            let detailedError = errorText;
            try {
              const errorObj = JSON.parse(errorText);
              if (errorObj.message) {
                detailedError = errorObj.message;
              }
            } catch {
              // If it's not JSON, use the raw text
            }

            throw new Error(`HTTP ${res.status}: ${detailedError}`);
          }

          const data = await res.json();

          // Properly handle all possible response formats from different strategies
          const chunkCreated = data.createdCount || data.totalCreated || 0;
          const chunkSkipped = data.skippedCount || data.totalSkipped || 0;
          const chunkProcessed = data.totalProcessed || (chunkCreated + chunkSkipped) || chunk.length;

          totalCreated += chunkCreated;
          totalSkipped += chunkSkipped;
          totalProcessed += chunkProcessed;

          // Show detailed progress with strategy info
          const progress = Math.round((i + 1) / totalChunks * 100);
          setUploadProgress(progress);
          setStatusMessage(
            `Uploading… chunk ${i + 1} of ${totalChunks} (${progress}%) — ${totalCreated} created so far`
          );

          // Enhanced logging
          console.log(`Chunk ${i + 1}: Created ${chunkCreated}, Skipped ${chunkSkipped}, Strategy: ${data.strategy || 'unknown'}`);

        } catch (error: unknown) {
          console.error(`Error uploading chunk ${i + 1}:`, error);
          failedChunks.push(i + 1);

          // For individual chunk failures, continue with other chunks
          setStatusMessage(
            `Warning: Chunk ${i + 1}/${totalChunks} failed: ${error instanceof Error ? error.message : String(error)}. Continuing with remaining chunks...`
          );

          // Add small delay before continuing
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final summary with error handling
      if (failedChunks.length > 0) {
        throw new Error(
          `Upload completed with errors. Failed chunks: ${failedChunks.join(', ')}. ` +
          `Successfully imported ${totalCreated} entries, skipped ${totalSkipped}.`
        );
      }

      // Validate that we processed all expected entries
      if (totalProcessed !== totalEntries) {
        console.warn(`Processing mismatch: Expected ${totalEntries}, processed ${totalProcessed}`);
      }

      // ---- Auto-link step ----
      const shouldAutoLink =
        autoLinkConfirmed &&
        autoLinkMatches !== null &&
        autoLinkMatches.length > 0;

      if (shouldAutoLink) {
        setStatusMessage(`Entries imported. Creating ${autoLinkMatches!.length} auto-link(s)…`);

        const autoLinkRows = autoLinkMatches!.flatMap((match) =>
          match.links.map((link) => ({
            uniqueObservationId: match.newUniqueObservationId,
            polpalId: link.polpalId,
            startYear: link.startYear,
            startMonth: link.startMonth,
            startDay: link.startDay,
            endYear: link.endYear,
            endMonth: link.endMonth,
            endDay: link.endDay,
            comment: link.comment,
          }))
        );

        try {
          const linkRes = await fetch("/api/links/auto-import", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(autoLinkRows),
          });

          if (!linkRes.ok) {
            const errText = await linkRes.text();
            console.error("Auto-link import failed:", errText);
            setStatusMessage(
              `Entries imported successfully (${totalCreated} created), but auto-linking failed: ${errText}. ` +
              `You can add links manually.`
            );
            setStatusType("warning");
          } else {
            const linkData = await linkRes.json();
            setStatusMessage(
              `Upload completed! Created: ${totalCreated}, Skipped: ${totalSkipped}. ` +
              `Auto-linked ${linkData.created} link(s) from previous version.`
            );
            setStatusType("success");
          }
        } catch (linkErr: unknown) {
          console.error("Auto-link import error:", linkErr);
          setStatusMessage(
            `Entries imported successfully (${totalCreated} created), but auto-linking failed. ` +
            `You can add links manually.`
          );
          setStatusType("warning");
        }
      } else {
        const duplicateMessage = totalSkipped > 0 ?
          ` (${totalSkipped} were skipped)` : '';

        setStatusMessage(
          `Upload completed successfully! ` +
          `Created: ${totalCreated}, Skipped: ${totalSkipped}${duplicateMessage}, Total processed: ${totalProcessed}/${totalEntries} entries. ` +
          `Completed in ${totalChunks} chunks.`
        );
        setStatusType("success");
      }

      // Enhanced logging for debugging
      console.log(`Upload Summary:`, {
        totalEntries,
        totalProcessed,
        totalCreated,
        totalSkipped,
        totalChunks,
        failedChunks: failedChunks.length
      });

      // Reset fields after successful upload
      setFile(null);
      setParsedEntries([]);
      setPreviewRows([]);
      setMismatchedRows([]);
      setInvalidCountryCodes([]);
      setUploadProgress(null);
      setPreviousVersions([]);
      setSelectedPreviousVersionKey("");
      setAutoLinkMatches(null);

      // Redirect back to previous page after a short delay
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error: unknown) {
      console.error("Upload error:", error);
      setStatusType("error");

      // Extract meaningful error information
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for foreign key constraint violations and extract country code info
      if (errorMessage.includes("Foreign key constraint violated") &&
        errorMessage.includes("Entries_countrycodePolpal_fkey")) {

        // Get all country codes that were in the upload for debugging
        const usedCountryCodes = [...new Set(parsedEntries
          .map(row => row.countrycodePolpal?.toString().trim())
          .filter(code => code)
        )];

        setStatusMessage(
          `Error: Upload failed: Foreign key constraint violation on country code. ` +
          `One of these country codes doesn't exist in the database: ${usedCountryCodes.join(", ")}. ` +
          `Please verify all country codes exist or contact an administrator.`
        );
      } else if (errorMessage.includes("Upload failed") && errorMessage.includes("500")) {
        setStatusMessage(
          `Error: Upload failed: Internal server error. ` +
          `Please try again or contact an administrator if the problem persists.`
        );
      } else if (errorMessage.includes("Failed chunks:")) {
        // Handle partial success scenarios
        setStatusMessage(
          `Warning: Upload partially completed with errors. ${errorMessage} ` +
          `You may need to retry the upload or contact an administrator.`
        );
      } else {
        setStatusMessage(`Error: Upload failed: ${errorMessage}`);
      }
    } finally {
      setLoadingSubmit(false);
      if (uploadProgress !== 100) setUploadProgress(null);
    }
  };

  // Render loading state
  if (loadingVersion || loadingCountries || loadingAuth) {
    return <LoadingSpinner title="Loading data..." message="Fetching data. Please wait a moment." />;
  }

  // Render access denied state
  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN or DATAMANAGER rights are required to import entries." />;
  }

  // Render error state
  if (errorCountries || errorVersion) {
    return <ErrorState message="We encountered an issue while loading the data." error={errorVersion || errorCountries} backHref="/" backLabel="Back to Homepage" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: version?.projectName ?? projectKey, href: `/data/projects/${projectKey}` },
        { label: version?.datasetNameShort ?? datasetKey, href: `/data/projects/${projectKey}/${datasetKey}` },
        { label: version?.version ?? versionKeyFromUrl, href: `/data/projects/${projectKey}/${datasetKey}/${versionKeyFromUrl}` },
        { label: "Import" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Import Entries — {version?.projectNameShort ?? projectKey} · {version?.datasetNameShort ?? datasetKey} · {version?.version ?? versionKeyFromUrl}
        </h1>
        <p className="text-lg text-gray-600">
          Upload a CSV file to import new entries into this version.
        </p>
      </div>

      <div className="space-y-4">
        {/* File upload */}
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
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Parse summary */}
        {parsedEntries.length > 0 && statusType !== "error" && (() => {
          const usedCodes = [...new Set(parsedEntries.map(r => r.countrycodePolpal?.toString().trim()).filter(Boolean))];
          return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">File Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{parsedEntries.length.toLocaleString()}</p>
                  <p className="text-sm text-green-600 mt-1">Rows to import</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{usedCodes.length}</p>
                  <p className="text-sm text-blue-600 mt-1">Unique country codes</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">{(file!.size / 1024).toFixed(1)} KB</p>
                  <p className="text-sm text-gray-500 mt-1">File size</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* CSV preview */}
        {file && previewRows.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">CSV Preview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {previewRows[0].map((cell, cellIndex) => (
                      <th scope="col" key={cellIndex} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewRows.slice(1).map((row, rowIndex) => {
                    const isMismatch = mismatchedRows.includes(rowIndex);
                    return (
                      <tr key={rowIndex} className={`hover:bg-gray-50 transition ${isMismatch ? "bg-red-50" : ""}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className={`px-4 py-3 whitespace-nowrap ${isMismatch ? "text-red-600" : "text-gray-700"}`}>
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

        {/* ---- Auto-link section (only shown when CSV is valid and previous versions exist or are loading) ---- */}
        {statusType === "success" && parsedEntries.length > 0 && (loadingPreviousVersions || previousVersions.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border border-primary/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-primary/70 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">Auto-link from previous version</h2>
              <span className="text-xs text-gray-500 font-normal ml-1">(optional)</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select a previous version of this dataset to automatically copy entity links for matching entries.
              Entries are matched on all content fields (excluding version key, observation ID, file name, and download date).
            </p>

            {loadingPreviousVersions ? (
              <p className="text-sm text-gray-500">Loading previous versions…</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="prev-version-select" className="block text-xs font-medium text-gray-700 mb-1">
                    Previous version
                  </label>
                  <select
                    id="prev-version-select"
                    value={selectedPreviousVersionKey}
                    onChange={(e) => handleVersionSelect(e.target.value)}
                    disabled={loadingAutoLinkPreview}
                    className="block w-full sm:w-72 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">None / skip auto-linking</option>
                    {previousVersions.map((v) => (
                      <option key={v.versionKey} value={v.versionKey}>
                        {v.version}{v.versionName ? ` — ${v.versionName}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-link preview loading */}
                {loadingAutoLinkPreview && (
                  <p className="text-sm text-gray-500">Comparing entries…</p>
                )}

                {/* Auto-link preview results */}
                {!loadingAutoLinkPreview && autoLinkMatches !== null && (
                  <div className="space-y-3">
                    <div className={`rounded-lg border p-4 ${autoLinkMatches.length > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                      <p className="text-sm font-semibold text-gray-900">
                        {autoLinkMatches.length > 0
                          ? `${autoLinkMatches.length} of ${parsedEntries.length} entries can be auto-linked`
                          : "No matching entries found in the selected version"}
                      </p>
                      {autoLinkMatches.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {autoLinkMatches.reduce((sum, m) => sum + m.links.length, 0)} individual link(s) across{" "}
                          {new Set(autoLinkMatches.flatMap((m) => m.links.map((l) => l.polpalId))).size} unique entit(ies) will be created with userId&nbsp;1.
                        </p>
                      )}
                    </div>

                    {/* Sample preview table */}
                    {autoLinkMatches.length > 0 && (
                      <>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">New observation ID</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">Entities to link</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {autoLinkMatches.slice(0, 10).map((match) => (
                                <tr key={match.newUniqueObservationId} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">{match.newUniqueObservationId}</td>
                                  <td className="px-4 py-2 text-gray-700">
                                    {match.entityLabels.join(", ")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {autoLinkMatches.length > 10 && (
                          <p className="text-xs text-gray-500">
                            Showing 10 of {autoLinkMatches.length} matches.
                          </p>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoLinkConfirmed}
                            onChange={(e) => setAutoLinkConfirmed(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">Include auto-links on import</span>
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upload progress bar */}
        {loadingSubmit && uploadProgress !== null && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading…</span>
              <span className="text-sm font-semibold text-primary">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className={`flex items-start gap-3 text-sm p-4 rounded-lg font-medium ${
            statusType === "success"
              ? "text-green-800 bg-green-50 border border-green-200"
              : statusType === "error"
                ? "text-red-800 bg-red-50 border border-red-200"
                : "text-amber-800 bg-amber-50 border border-amber-200"
          }`}>
            {statusType === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
            {statusType === "error" && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Validation error details */}
        {invalidCountryCodes.length > 0 && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-200 p-4 rounded-lg">
            <strong className="block mb-1">Invalid Country Codes:</strong>
            <code className="text-xs bg-red-100 px-2 py-1 rounded">{invalidCountryCodes.join(", ")}</code>
          </div>
        )}

        {duplicateObservationIds.length > 0 && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-200 p-4 rounded-lg">
            <strong className="block mb-1">Duplicated Observation IDs:</strong>
            <code className="text-xs bg-red-100 px-2 py-1 rounded">{duplicateObservationIds.join(", ")}</code>
          </div>
        )}

        {loadingSubmit && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-lg">
            Import can take some time — do not close this page.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={handleUpload}
            disabled={
              loadingSubmit ||
              statusType === "error" ||
              !file ||
              !parsedEntries.length ||
              !countriesLoaded ||
              mismatchedRows.length > 0 ||
              invalidCountryCodes.length > 0
            }
            className="py-2 px-6 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-medium rounded-lg transition disabled:cursor-not-allowed"
          >
            {loadingSubmit ? "Importing…" : "Import"}
          </button>
          <Link
            href={`/data/projects/${projectKey}/${datasetKey}/${versionKeyFromUrl}`}
            className="py-2 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition text-center"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
