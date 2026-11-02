"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Database, Tag, Link2 } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import { EntityTypesEnum } from "@/lib/shared/enums";
import CountryFlag from "@/components/ui/DisplayFlags";
import { EntityCard, EntityCardEntity, EntityCardValidationProps } from "@/components/ui/EntityCard";
import { VariableDocumentation, type Variable } from "@/components/ui/VariableDocumentation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationLink {
  userId: number;
  validated: 'APPROVED' | 'REJECTED' | 'NONE';
  comment: string | null;
  updatedAt: string;
}

interface LinkedEntity {
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
    polpalId: number;
    nameShort: string;
    nameEnglish: string;
    name: string | null;
    entityType: EntityTypesEnum;
    wikipediaUrl: string | null;
    wikidataId: string | null;
    EntityNames: {
      entityNameId: number;
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
  };
  ValidationLinks: ValidationLink[];
}

interface EntryData {
  entryId: number;
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
  uniqueObservationId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  Countries: {
    countrycodePolpal: string;
    countryname: string;
    iso2c: string | null;
  };
  Projects: {
    projectName: string;
    projectNameShort: string;
  };
  Datasets: {
    datasetName: string;
    datasetNameShort: string;
  };
  Versions: {
    version: string;
    versionName: string;
  };
  LinksEntryToEntity: LinkedEntity[];
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
      <span className="text-xs text-gray-500 tracking-wide font-medium">{label}</span>
      <span className="text-sm text-gray-800 font-semibold mt-1">
        {value ?? <span className="text-gray-400 italic font-normal">N/A</span>}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EntryDetailClient() {
  const params = useParams();
  const entryId = params.entryId as string;

  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;

  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);

  useEffect(() => {
    if (!entryId) return;
    const abortController = new AbortController();

    const fetchData = async () => {
      setLoadingData(true);
      setErrorData(null);
      try {
        const res = await fetch(
          `/api/entries/by-entryId/${encodeURIComponent(entryId)}`,
          { credentials: "include", signal: abortController.signal }
        );
        if (res.status === 404) {
          setEntry(null);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const entryData: EntryData = await res.json();
        setEntry(entryData);

        const varsRes = await fetch(`/api/variables/${encodeURIComponent(entryData.versionKey)}`, { signal: abortController.signal });
        if (varsRes.ok) {
          const { variables: allVars }: { variables: Variable[] } = await varsRes.json();
          setVariables(allVars.filter(v => v.entryEntityIdVar === entryData.entryEntityIdVar));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setErrorData(err instanceof Error ? err.message : String(err));
      } finally {
        if (!abortController.signal.aborted) setLoadingData(false);
      }
    };

    fetchData();
    return () => abortController.abort();
  }, [entryId]);

  if (loadingData) {
    return <LoadingSpinner title="Loading entry data..." message={<>Fetching entry data&hellip;</>} />;
  }

  if (errorData) {
    return (
      <ErrorState
        message={<>We encountered an issue while loading entry data.</>}
        error={errorData}
        backHref="/"
        backLabel="Back to Homepage"
      />
    );
  }

  if (!entry) {
    return (
      <NotFoundState
        title="Entry Not Found"
        message={<>No entry with ID <code>{entryId}</code> could be found.</>}
        backHref="/"
        backLabel="Back to Homepage"
      />
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: entry.Projects.projectName, href: `/data/projects/${entry.projectKey}` },
        { label: entry.Datasets.datasetNameShort, href: `/data/projects/${entry.projectKey}/${entry.datasetKey}` },
        { label: entry.Versions.version, href: `/data/projects/${entry.projectKey}/${entry.datasetKey}/${entry.versionKey}` },
        { label: entry.countrycodePolpal, href: `/data/projects/${entry.projectKey}/${entry.datasetKey}/${entry.versionKey}/${entry.countrycodePolpal}` },
        { label: entry.uniqueObservationId },
      ]} />

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Unique Observation ID</p>
            <h1 className="text-2xl font-bold text-gray-900 break-all">{entry.uniqueObservationId}</h1>
            <p className="text-sm text-gray-500 mt-1">Entry ID: {entry.entryId}</p>
          </div>
        </div>
      </div>

      {/* Source */}
      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-800/60" />
          Source
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoRow
            label="PROJECT"
            value={
              <Link href={`/data/projects/${entry.projectKey}`} className="text-gray-800 hover:underline hover:text-primary flex flex-col">
                <span>{entry.Projects.projectName}</span>
                <span className="text-gray-500 font-normal text-xs">({entry.Projects.projectNameShort})</span>
              </Link>
            }
          />
          <InfoRow
            label="DATASET"
            value={
              <Link href={`/data/projects/${entry.projectKey}/${entry.datasetKey}`} className="text-gray-800 hover:underline hover:text-primary flex flex-col">
                <span>{entry.Datasets.datasetName}</span>
                <span className="text-gray-500 font-normal text-xs">({entry.Datasets.datasetNameShort})</span>
              </Link>
            }
          />
          <InfoRow
            label="VERSION"
            value={
              <Link href={`/data/projects/${entry.projectKey}/${entry.datasetKey}/${entry.versionKey}`} className="text-gray-800 hover:underline hover:text-primary flex flex-col">
                <span>{entry.Versions.version}</span>
                {entry.Versions.versionName && (
                  <span className="text-gray-500 font-normal text-xs">({entry.Versions.versionName})</span>
                )}
              </Link>
            }
          />
          <InfoRow label="FILE" value={entry.usedFile} />
          <InfoRow label="DATE DOWNLOADED" value={entry.dateDownloaded} />
          <InfoRow label="IMPORTED || UPDATED" value={`${entry.createdAt.slice(0, 10)} || ${entry.updatedAt.slice(0, 10)}`} />
        </div>
      </section>

      {/* Dataset Entry Information */}
      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-800" />
          Entry in Dataset
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoRow
            label="PolPaL Country"
            value={
              <Link href={`/data/countries/${entry.countrycodePolpal}`} className="text-gray-800 hover:underline hover:text-primary flex items-center gap-2">
                <CountryFlag
                  iso2c={entry.Countries.iso2c}
                  countrycodePolpal={entry.countrycodePolpal}
                  countryname={entry.Countries.countryname}
                  size={24}
                />
                {entry.Countries.countryname}
                {entry.Countries.iso2c && (
                  <span className="text-gray-500 font-normal text-xs">({entry.Countries.countrycodePolpal})</span>
                )}
              </Link>
            }
          />
          {entry.entryCountryVar && (
            <InfoRow label={entry.entryCountryVar} value={entry.entryCountry} />
          )}
          <InfoRow label={entry.entryEntityIdVar} value={entry.entryEntityId} />
          {entry.entryEntityNameShortVar && (
            <InfoRow label={entry.entryEntityNameShortVar} value={entry.entryEntityNameShort} />
          )}
          {entry.entryEntityNameEnglishVar && (
            <InfoRow label={entry.entryEntityNameEnglishVar} value={entry.entryEntityNameEnglish} />
          )}
          {entry.entryEntityNameVar && (
            <InfoRow label={entry.entryEntityNameVar} value={entry.entryEntityName} />
          )}
          {entry.entryYearVar && (
            <InfoRow label={`${entry.entryYearVar} (Year)`} value={entry.entryYear} />
          )}
          {entry.entryMonthVar && (
            <InfoRow label={`${entry.entryMonthVar} (Month)`} value={entry.entryMonth} />
          )}
          {entry.entryDayVar && (
            <InfoRow label={`${entry.entryDayVar} (Day)`} value={entry.entryDay} />
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <InfoRow label="Unique Observation ID" value={entry.uniqueObservationId} />
          </div>
          {entry.additionalInformation && (() => {
            let parsed: Record<string, unknown> | null = null;
            try { parsed = JSON.parse(entry.additionalInformation!); } catch { /* not JSON */ }
            return (
              <div className="sm:col-span-2 lg:col-span-3">
                {parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (
                  <div className="flex flex-col bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium px-4 pt-3 pb-2">
                      Additional Information
                    </span>
                    <div className="divide-y divide-gray-100">
                      {Object.entries(parsed).map(([key, val]) => (
                        <div key={key} className="flex items-baseline gap-3 px-4 py-2">
                          <span className="text-xs text-gray-500 font-mono min-w-[10rem] shrink-0">{key}</span>
                          <span className="text-sm text-gray-800 font-medium break-all">
                            {val === null || val === undefined
                              ? <span className="text-gray-400 italic font-normal">N/A</span>
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <InfoRow label="Additional Information" value={entry.additionalInformation} />
                )}
              </div>
            );
          })()}
          {entry.note && (
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoRow label="Note" value={<span className="whitespace-pre-wrap">{entry.note}</span>} />
            </div>
          )}
        </div>
      </section>

      {/* Variable Documentation */}
      <VariableDocumentation
        variables={variables}
        isLoggedIn={isLoggedIn}
        addHref={["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "") ? `/manage/variables/create/${entry.versionKey}` : undefined}
      />

      {/* PolPaL Links */}
      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-gray-800" />
          PolPaL Links
          <span className="ml-1 text-sm font-normal text-gray-500">
            ({entry.LinksEntryToEntity.length} link{entry.LinksEntryToEntity.length !== 1 ? "s" : ""})
          </span>
        </h2>

        {entry.LinksEntryToEntity.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No PolPaL entities linked to this entry.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entry.LinksEntryToEntity.map((link) => {
              const entityData: EntityCardEntity = {
                polpalId: link.Entities.polpalId,
                nameShort: link.Entities.nameShort,
                nameEnglish: link.Entities.nameEnglish,
                name: link.Entities.name ?? '',
                entityType: link.Entities.entityType,
                wikipediaUrl: link.Entities.wikipediaUrl,
                wikidataId: link.Entities.wikidataId,
                EntityNames: link.Entities.EntityNames as EntityCardEntity['EntityNames'],
                appearanceFirst: link.Entities.appearanceFirst,
                appearanceLast: link.Entities.appearanceLast,
              };

              const approvedCount = link.ValidationLinks.filter((v) => v.validated === 'APPROVED').length;
              const rejectedCount = link.ValidationLinks.filter((v) => v.validated === 'REJECTED').length;
              const currentUserValidation = auth.userId
                ? link.ValidationLinks.find((v) => v.userId === Number(auth.userId))
                : undefined;
              const currentUserVote = currentUserValidation
                ? (currentUserValidation.validated === 'APPROVED' ? 'APPROVED' : currentUserValidation.validated === 'REJECTED' ? 'REJECTED' : null)
                : null;
              const validation: EntityCardValidationProps = {
                isCreator: false,
                approvedCount,
                rejectedCount,
                currentUserVote,
                commentsWithVotes: link.ValidationLinks.filter((v) => v.comment).map((v) => ({
                  userId: v.userId,
                    verified: v.validated === 'APPROVED' ? 'APPROVED' : v.validated === 'REJECTED' ? 'REJECTED' : 'NONE',
                  comment: v.comment,
                  updatedAt: v.updatedAt,
                })),
                submitting: false,
                currentUserId: auth.userId ? Number(auth.userId) : null,
              };

              return (
                <EntityCard
                  key={link.linkEntriesToEntityId}
                  entity={entityData}
                  showLogo
                  isLoggedIn={isLoggedIn}
                  observationDates={[{ year: entry.entryYear, month: entry.entryMonth, day: entry.entryDay }]}
                  linkStart={!entry.entryYear ? { year: link.startYear, month: link.startMonth, day: link.startDay } : undefined}
                  linkEnd={!entry.entryYear ? { year: link.endYear, month: link.endMonth, day: link.endDay } : undefined}
                  linkComments={link.comment ? [{ comment: link.comment }] : undefined}
                  validation={validation}
                  defaultShowComments
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
