"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EntityTypesEnum, LanguageCodeEnum, ReferenceTypeEnum, RoleEnum } from "@/lib/shared/enums";
import { NewReferenceFormRow } from "@/components/manage/NewReferenceFormRow";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { ChevronDown, ChevronRight } from "lucide-react";

interface EntityFormData {
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: EntityTypesEnum;
  wikipediaUrl: string;
  wikidataId: string;
  comment?: string;
}

interface ReferencesFormData {
  referencedField: string;
  type: ReferenceTypeEnum;
  value: string;
  language: LanguageCodeEnum;
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
];

function EntityTypeSelect({
  value,
  onChange,
}: {
  value: EntityTypesEnum;
  onChange: (val: EntityTypesEnum) => void;
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
          {ENTITY_TYPE_OPTIONS.map((opt) => (
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

export default function CreateEntityClient() {

  // Auth
  const { auth, loadingAuth } = useAuth();

  // Router
  const router = useRouter();

  // Search params
  const searchParams = useSearchParams();
  const countrycodePolpal = searchParams.get("countrycodePolpal") ?? "";

  // State for loading and error handling
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // State for info card
  const [showInfo, setShowInfo] = useState(false);

  // State for references
  const [referencesData, setReferencesData] = useState<ReferencesFormData[]>([]);

  const emptyReference = (): ReferencesFormData => ({
    referencedField: "entityType",
    type: ReferenceTypeEnum.Website,
    value: "",
    language: LanguageCodeEnum.en,
    accessedAt: new Date().toISOString().split("T")[0], // Default to today's date
    comment: "",
  });

  const handleReferenceChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReferencesData((prev) => prev.map((ref, i) => (i === index ? { ...ref, [name]: value } : ref)));
  };

  const addReference = () => setReferencesData((prev) => [...prev, emptyReference()]);
  const removeReference = (index: number) => setReferencesData((prev) => prev.filter((_, i) => i !== index));

  // State for form data
  const [formData, setFormData] = useState<EntityFormData>({
    nameShort: "",
    nameEnglish: "",
    name: "",
    entityType: EntityTypesEnum.UNASSIGNED,
    wikidataId: "",
    wikipediaUrl: "",
    comment: "",
  });

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

      const res = await fetch(`/api/entities`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create entity");
      }

      const createdEntity = await res.json();

      const resCountry = await fetch(`/api/entities-in-countries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polpalId: createdEntity.polpalId,
          countrycodePolpal: countrycodePolpal,
        }),
      })

      if (!resCountry.ok) {
        const errorText = await resCountry.text();
        throw new Error(errorText || "Failed to assign entity to country");
      }

      // Post references separately
      const validRefs = referencesData.filter((r) => r.value.trim() !== "");
      if (validRefs.length > 0) {
        await Promise.all(
          validRefs.map((r) =>
            fetch(`/api/references`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                polpalId: createdEntity.polpalId,
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

      setFormData({
        nameShort: "",
        nameEnglish: "",
        name: "",
        entityType: EntityTypesEnum.UNASSIGNED,
        wikidataId: "",
        wikipediaUrl: "",
        comment: "",
      });

      // Navigate to the created entity page using the returned ID
      router.push(`/data/entities/${createdEntity.polpalId}`);

    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    };
  };

  // Render loading state
  if (loadingAuth) {
    return <LoadingSpinner title="Loading countries..." message="Fetching country data. Please wait a moment." />;
  }

  // Render access denied state
  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER or EDITOR rights are required to create entities." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: countrycodePolpal ?? "missing", href: `/data/countries/${countrycodePolpal}` },
        { label: "add entity" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Create Entity</h1>
            <p className="text-lg text-gray-600">Add a new political entity to the PolPaL database for &quot;{countrycodePolpal || "this country"}&quot;.</p>
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
                  placeholder="e.g., https://en.wikipedia.org/wiki/Social_Democratic_Party_of_Germany"
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
                {referencesData.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">({referencesData.length} pending)</span>
                )}
              </h2>
              <button type="button" onClick={addReference} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                + Add Reference
              </button>
            </div>

            {referencesData.length === 0 && (
              <p className="text-sm text-gray-500 italic">No references added yet.</p>
            )}

            {referencesData.length > 0 && (
              <div className="space-y-4">
                {referencesData.map((ref, index) => (
                  <NewReferenceFormRow
                    key={index}
                    index={index}
                    data={ref}
                    fields={ENTITY_REFERENCE_FIELDS}
                    fieldDefaultLabel="Entity Type"
                    fieldLocked
                    onChange={(e) => handleReferenceChange(index, e)}
                    onRemove={() => removeReference(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-6 border-t border-gray-200 gap-4">
            <button
              type="button"
              onClick={() => router.push(`/data/countries/${countrycodePolpal}`)}
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
                  Creating...
                </>
              ) : (
                "Create Entity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
