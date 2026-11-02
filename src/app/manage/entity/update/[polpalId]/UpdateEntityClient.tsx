"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { EntityTypesEnum, LanguageCodeEnum, RoleEnum } from "@/lib/shared/enums";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ReferenceTypeEnum } from "@/lib/shared/enums";
import { NewReferenceFormRow } from "@/components/manage/NewReferenceFormRow";
import { ExistingReferencesTable } from "@/components/manage/ExistingReferencesTable";
import { useAuth } from "@/context/AuthContext";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Entity {
  isHidden: boolean;
  isHiddenReason: string | null;
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: EntityTypesEnum;
  wikipediaUrl: string;
  wikidataId: string;
  comment: string | null;
  EntitiesInCountries?: {
    countrycodePolpal: string;
  }[];
};

interface EntityFormData {
  isHidden: boolean;
  isHiddenReason: string | null;
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: EntityTypesEnum;
  wikipediaUrl: string;
  wikidataId: string;
  comment?: string;
}

interface EntityReference {
  referenceId: number;
  referencedField: string | null;
  type: ReferenceTypeEnum;
  value: string;
  language: string | null;
  accessedAt: string | null;
  comment: string | null;
  createdAt: string;
}

interface ReferencesFormData {
  referencedField: string;
  type: ReferenceTypeEnum;
  value: string;
  language: string;
  accessedAt: string;
  comment: string;
}

const ENTITY_REFERENCE_FIELDS: { value: string; label: string }[] = [
  { value: "entityType", label: "Entity Type" },
];

const ENTITY_TYPE_OPTIONS = [
  EntityTypesEnum.PARTY,
  EntityTypesEnum.GROUPING,
  EntityTypesEnum.UNASSIGNED,
  EntityTypesEnum.UNKNOWN,
  EntityTypesEnum.OTHERS,
  EntityTypesEnum.INDEPENDENT,
];

function EntityTypeSelect({
  value,
  onChange,
  options = ENTITY_TYPE_OPTIONS,
}: {
  value: EntityTypesEnum;
  onChange: (val: EntityTypesEnum) => void;
  options?: EntityTypesEnum[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      >
        <EntityTypeBadge entityType={value} />
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1">
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${value === opt ? "bg-gray-50" : ""}`}
              >
                <EntityTypeBadge entityType={opt} />
                {value === opt && (
                  <svg className="w-4 h-4 text-primary ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function UpdateEntityClient() {

  // Initialize router for navigation
  const router = useRouter();
  const { auth, loadingAuth } = useAuth();

  // Get projectKey from URL params
  const params = useParams();
  const polpalId = params.polpalId as string;

  // State for entity data
  const [entity, setEntity] = useState<Entity | null>(null);

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // State for info card
  const [showInfo, setShowInfo] = useState(false);

  // State for form data
  const [formData, setFormData] = useState<EntityFormData>({
    isHidden: false,
    isHiddenReason: null,
    nameShort: "",
    nameEnglish: "",
    name: "",
    entityType: EntityTypesEnum.UNKNOWN,
    wikipediaUrl: "",
    wikidataId: "",
    comment: "",
  });

  // State for link count (used to guard isHidden)
  const [linkCount, setLinkCount] = useState<number>(0);

  // State for references
  const [existingReferences, setExistingReferences] = useState<EntityReference[]>([]);
  const [newReferences, setNewReferences] = useState<ReferencesFormData[]>([]);

  const emptyReference = (): ReferencesFormData => ({
    referencedField: "entityType",
    type: ReferenceTypeEnum.Website,
    value: "",
    language: LanguageCodeEnum.en,
    accessedAt: new Date().toISOString().split("T")[0], // Default to today's date
    comment: "",
  });

  // Fetch current entity data on load
  useEffect(() => {
    if (loadingAuth) return; // wait for auth to settle
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
      setLoadingData(false); // allow render to proceed to AccessDenied
      return;
    } // skip fetch if unauthorized

    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchData() {
      setLoadingData(true);
      setErrorData(null);

      try {
        const [entityRes, referencesRes] = await Promise.all([
          fetch(`/api/entities/${polpalId}/edit`, { credentials: "include", signal }),
          fetch(`/api/references/entities/${polpalId}`, { credentials: "include", signal }),
        ]);

        if (!entityRes.ok) { throw new Error("Failed to fetch entity details"); }

        const [entityData, refsData] = await Promise.all([
          entityRes.json(),
          referencesRes.ok ? referencesRes.json() : Promise.resolve([]),
        ]);

        setLinkCount(typeof entityData?.linkCount === 'number' ? entityData.linkCount : 0);

        setFormData({
          isHidden: entityData.isHidden || false,
          isHiddenReason: entityData.isHiddenReason || null,
          nameShort: entityData.nameShort || "",
          nameEnglish: entityData.nameEnglish || "",
          name: entityData.name || "",
          entityType: entityData.entityType || EntityTypesEnum.UNKNOWN,
          wikipediaUrl: entityData.wikipediaUrl || "",
          wikidataId: entityData.wikidataId || "",
          comment: entityData.comment || "",
        });

        setEntity(entityData);
        setExistingReferences(refsData);

      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch data", err);
          setErrorData(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();

    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, [polpalId, loadingAuth, auth?.role]);

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorSubmit(null);
    setLoadingSubmit(true);

    try {
      const res = await fetch(`/api/entities/${polpalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data) && data[0]?.message) {
          throw new Error(data.map((err: { message: string }) => err.message).join("\n"));
        }
        throw new Error(data.message || "Failed to update version");
      }

      // Post new references separately
      const validNewRefs = newReferences.filter((r) => r.value.trim() !== "");
      if (validNewRefs.length > 0) {
        await Promise.all(
          validNewRefs.map((r) =>
            fetch(`/api/references`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                polpalId: parseInt(polpalId, 10),
                referencedField: r.referencedField || null,
                type: r.type,
                value: r.value.trim(),
                language: r.language || null,
                accessedAt: r.accessedAt || null,
                comment: r.comment || null,
              }),
            })
          )
        );
      }

      router.push(`/data/entities/${polpalId}`);
    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Handle delete existing reference
  const handleDeleteReference = async (referenceId: number) => {
    if (!confirm("Are you sure you want to delete this reference?")) return;
    try {
      const res = await fetch(`/api/references/${referenceId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete reference");
      setExistingReferences((prev) => prev.filter((r) => r.referenceId !== referenceId));
    } catch (err: unknown) {
      alert(`Error deleting reference: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleNewReferenceChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewReferences((prev) => prev.map((ref, i) => (i === index ? { ...ref, [name]: value } : ref)));
  };

  const addNewReference = () => setNewReferences((prev) => [...prev, emptyReference()]);
  const removeNewReference = (index: number) => setNewReferences((prev) => prev.filter((_, i) => i !== index));

  // Render loading state
  if (loadingData || loadingAuth) {
    return <LoadingSpinner title="Loading entity..." message="Fetching entity data. Please wait a moment." />;
  }

  // Render access denied state
  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER, EDITOR or CONTRIBUTOR rights are required to update entities." />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message="We encountered an issue while loading data." error={errorData} />;
  }

  // Restrict access to ADMIN/DATAMANAGER for entity types outside the standard editable set
  if (entity && !([EntityTypesEnum.PARTY, EntityTypesEnum.GROUPING, EntityTypesEnum.UNASSIGNED] as EntityTypesEnum[]).includes(entity.entityType) && !["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "")) {
    return <AccessDenied message="Only ADMIN and DATAMANAGER can update entities of this type." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: <CountryBreadcrumbLinks countries={entity?.EntitiesInCountries} showWorld={["UNKNOWN", "INDEPENDENT", "RESIDUAL", "OTHERS"].includes(entity?.entityType ?? "")} /> },
        { label: entity ? `${entity.nameEnglish} (${entity.nameShort})` : "...", href: `/data/entities/${polpalId}` },
        { label: "update" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Update Entity: {entity?.nameEnglish} ({entity?.nameShort})</h1>
            <p className="text-lg text-gray-600">Modify the information for &quot;{entity?.nameEnglish || "this entity"}&quot; (PolPaL ID: {polpalId}).</p>
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowInfo((prev) => !prev)}
          className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="bg-blue-100 rounded-lg p-3 flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">PolPaL entity definitions</h2>
          </div>
          {showInfo ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showInfo && (
          <div className="px-6 pb-6">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 w-48 border-b border-gray-200">
                      Entity Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-b border-gray-200">
                      Definition
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">PolPaL party</td>
                    <td className="px-4 py-4 space-y-2">
                      <p>
                        A political party is an identifiable collective political actor whose
                        continuity can be traced across time through organizational, electoral,
                        ideological, parliamentary, or governmental attributes.
                      </p>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>
                          <strong>Collective organization</strong> — It is more than an individual
                          candidate or temporary personal label.
                        </li>
                        <li>
                          <strong>Recognizable identity</strong> — It has a name, label,
                          organization, leadership, program, or other marker allowing it to be
                          distinguished from other actors.
                        </li>
                        <li>
                          <strong>Temporal and territorial location</strong> — Its existence is
                          recorded for a particular country or political territory and period.
                        </li>
                        <li>
                          <strong>Cross-dataset traceability</strong> — At least one reliable source
                          identifies the actor; other datasets may then be linked to it.
                        </li>
                      </ol>
                      <p>
                        The actor need not satisfy every condition in every year. A party may
                        contest elections in one period, hold parliamentary seats in another, and
                        survive mainly as an organization during a third.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">PolPaL grouping</td>
                    <td className="px-4 py-4 space-y-2">
                      <p>
                        A political grouping is an identifiable, party-level collective actor with a
                        recognized membership boundary composed of two or more distinct political
                        parties, an explicit or institutionalized basis for collective action, and
                        activity beyond the mere co-occurrence of its member parties.
                      </p>
                      <p>
                        <strong>Do not</strong> code a PolPaL grouping from joint presence, joint measurement, or
                        joint behavior alone. Code it only when the political parties are connected
                        by a recognized group-level identity, institution, or intentional
                        coordination arrangement.
                      </p>
                      <p>Examples that do not fulfil the definition of a PolPaL grouping:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          One person belongs to multiple parties or organizations (e.g., CHISOLS)
                          — Person-level affiliation → Multiple PolPaL parties
                        </li>
                        <li>
                          Several parties compose a government — Party–cabinet or
                          party–government relations → Multiple PolPaL parties
                        </li>
                        <li>
                          Several parties appear as survey response options (e.g., WVS) — Survey
                          instrument metadata → Multiple PolPaL parties
                        </li>
                        <li>
                          A respondent names multiple parties they feel close to — Respondent-level
                          party proximity → Multiple PolPaL parties
                        </li>
                        <li>
                          Two parties vote for the same bill — Legislative voting behavior or
                          issue-specific cooperation → Multiple PolPaL parties
                        </li>
                        <li>
                          Parties have similar ideological positions — Ideological similarity or
                          party-position data → Multiple PolPaL parties
                        </li>
                        <li>
                          Parties are mentioned together in a document — Textual co-occurrence →
                          Multiple PolPaL parties
                        </li>
                        <li>
                          One party forms its own parliamentary group — Parliamentary manifestation
                          of that party; no separate grouping → Multiple PolPaL parties
                        </li>
                      </ul>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">Unassigned</td>
                    <td className="px-4 py-4">
                      <p>
                        The entity type of the PolPaL entity has not been assigned yet. This is the
                        standard assignment of all PolPaL entities at the beginning.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-8">
          {/* Error Display */}
          {errorSubmit && (
            <div role="alert" className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg aria-hidden="true" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 whitespace-pre-line">{errorSubmit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information Section */}
          <div className="mb-8">
            {entity?.isHidden && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-700">
                <p className="text-sm text-red-700 text-justify">
                  <span className="font-semibold">This entity is currently marked as hidden.</span>
                  {entity.isHiddenReason && <span className="block mt-2">{entity.isHiddenReason}</span>}
                </p>
              </div>
            )}
            {["ADMIN", "DATAMANAGER", "EDITOR"].includes(auth.role ?? "") && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Hidden
                </h2>
                <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <label htmlFor="isHidden" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        id="isHidden"
                        type="checkbox"
                        name="isHidden"
                        checked={formData.isHidden}
                        disabled={linkCount > 0}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isHidden: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span>Hidden Status</span>
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formData.isHidden ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {formData.isHidden ? "Hidden" : "Visible"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Hidden entities are not displayed in the public dataset. Only ADMIN,
                    DATAMANAGER, and EDITOR can change this status.
                  </p>
                  {linkCount > 0 && (
                    <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-700 rounded-md px-3 py-2">
                      This entity has <strong>{linkCount}</strong> linkage{linkCount !== 1 ? "s" : ""} to external dataset entries. Remove all links before hiding it (link count must be 0).
                    </p>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      What does hidden mean?
                    </summary>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p>
                        PolPaL entities should be set hidden if they stem from the migration
                        process from Party Facts but don&apos;t fit the criteria of PolPaL. These
                        entities can be duplicates across countries, non-political entities,
                        or other entities that don&apos;t meet the PolPaL definition. Because these
                        entities stem from the migration process, they are not deleted but set
                        to hidden. This allows for the possibility of future re-evaluation and
                        potential to set it visible again if new information arises.
                      </p>
                    </div>
                  </details>
                </div>
                {formData.isHidden && (
                  <div className="mb-4">
                    <label htmlFor="isHiddenReason" className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Hidden Status <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="isHiddenReason"
                      name="isHiddenReason"
                      value={formData.isHiddenReason || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isHiddenReason: e.target.value }))}
                      required={formData.isHidden}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Provide a reason for why this entity is hidden"
                    />
                  </div>
                )}
              </>
            )}
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">
              Basic Information
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type <span className="text-red-500">*</span>
                </label>
                <EntityTypeSelect
                  value={formData.entityType}
                  onChange={(val) => setFormData((prev) => ({ ...prev, entityType: val }))}
                  options={["ADMIN", "DATAMANAGER"].includes(auth.role ?? "")
                    ? ENTITY_TYPE_OPTIONS
                    : [EntityTypesEnum.PARTY, EntityTypesEnum.GROUPING, EntityTypesEnum.UNASSIGNED]
                  }
                />
                <p className="text-xs text-gray-500">
                  The entity type of the PolPaL entity.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="nameShort" className="block text-sm font-medium text-gray-700 mb-2">
                  Name Short <span className="text-red-500">*</span>
                </label>
                <input
                  id="nameShort"
                  type="text"
                  name="nameShort"
                  value={formData.nameShort ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., SPD"
                />
                <p className="text-xs text-gray-500">
                  Current or latest abbreviation of the PolPaL entity in its original language.
                </p>
              </div>

              <div className="mb-6 space-y-2">
                <label htmlFor="nameEnglish" className="block text-sm font-medium text-gray-700 mb-2">
                  Name English <span className="text-red-500">*</span>
                </label>
                <input
                  id="nameEnglish"
                  type="text"
                  name="nameEnglish"
                  value={formData.nameEnglish ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Social Democratic Party of Germany"
                />
                <p className="text-xs text-gray-500">
                  Current or latest English name of the PolPaL entity.
                </p>
              </div>

              <div className="mb-6 space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Sozialdemokratische Partei Deutschlands"
                />
                <p className="text-xs text-gray-500">
                  Current or latest name of the PolPaL entity in its original language.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">
              Additional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-6 space-y-2">
                <label htmlFor="wikipediaUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Wikipedia URL
                </label>
                <input
                  id="wikipediaUrl"
                  type="url"
                  name="wikipediaUrl"
                  value={formData.wikipediaUrl ?? ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://en.wikipedia.org/wiki/..."
                />
                <p className="text-xs text-gray-500">
                  The full URL of the Wikipedia page of the PolPaL entity, preferably the English Wikipedia page.
                </p>
              </div>

              <div className="mb-6 space-y-2">
                <label htmlFor="wikidataId" className="block text-sm font-medium text-gray-700 mb-2">
                  Wikidata ID
                </label>
                <input
                  id="wikidataId"
                  type="text"
                  name="wikidataId"
                  value={formData.wikidataId ?? ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Q49768"
                />
                <p className="text-xs text-gray-500">
                  The Wikidata ID of the PolPaL Entity.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Comment
              </label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="TO BE DISCUSSED: XYZ"
              />
              <p className="text-xs text-gray-500">
                Comment for additional notes regarding the PolPaL entity (further discussions, clarifications, distinction to other PolPaL entities).
              </p>
            </div>
          </div>

          {/* References Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                References (Entity Type)
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({existingReferences.length} existing{newReferences.length > 0 ? `, ${newReferences.length} pending` : ""})
                </span>
              </h2>
              <button type="button" onClick={addNewReference} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                + Add Reference
              </button>
            </div>

            {/* Existing references */}
            {existingReferences.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Existing References</h3>
                <ExistingReferencesTable
                  references={existingReferences}
                  onDelete={handleDeleteReference}
                />
              </div>
            )}

            {existingReferences.length === 0 && newReferences.length === 0 && (
              <p className="text-sm text-gray-500 italic">No references recorded yet.</p>
            )}

            {/* New pending references */}
            {newReferences.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">New References (will be saved on submit)</h3>
                {newReferences.map((ref, index) => (
                  <NewReferenceFormRow
                    key={index}
                    index={index}
                    data={ref}
                    fields={ENTITY_REFERENCE_FIELDS}
                    fieldDefaultLabel="Entity Type"
                    fieldLocked
                    onChange={(e) => handleNewReferenceChange(index, e)}
                    onRemove={() => removeNewReference(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-6 border-t border-gray-200 gap-4">
            <button
              type="button"
              onClick={() => router.push(`/data/entities/${entity?.polpalId}`)}
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              disabled={loadingSubmit}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSubmit ? (
                <>
                  <svg aria-hidden="true" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div >
    </div >
  );
}
