"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListPlus } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { NewReferenceFormRow } from "@/components/manage/NewReferenceFormRow";
import { LanguageCodeEnum, ReferenceTypeEnum, RoleEnum } from "@/lib/shared/enums";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";
import { EntityNameCard } from "@/components/ui/EntityNameCard";
import type { EntityNameCardReference } from "@/components/ui/EntityNameCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import NotFoundState from "@/components/ui/NotFoundState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/ui/AccessDenied";

interface ReferencesFormData {
  referencedField: string;
  type: ReferenceTypeEnum;
  value: string;
  language: LanguageCodeEnum;
  accessedAt: string;
  comment: string;
}

const ENTITY_NAME_REFERENCE_FIELDS: { value: string; label: string }[] = [];

interface EntityNameFormData {
  polpalId: number;
  nameShort: string;
  name: string;
  language: string;
  comment?: string | null;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  References: ReferencesFormData[];
}

interface MultipleNamesFormData {
  polpalId: number;
  names: EntityNameFormData[];
}

interface Entity {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  name: string;
  EntitiesInCountries: {
    countrycodePolpal: string;
  }[];
  EntityNames: EntityNameRecord[];
}

interface EntityNameRecord {
  entityNameId: number;
  nameShort: string;
  name: string;
  language: string;
  comment?: string | null;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  References?: EntityNameCardReference[];
}

const emptyReference = (): ReferencesFormData => ({
  referencedField: "",
  type: ReferenceTypeEnum.Website,
  value: "",
  language: LanguageCodeEnum.en,
  accessedAt: new Date().toISOString().split("T")[0],
  comment: "",
});

const emptyName = (polpalId: number): EntityNameFormData => ({
  polpalId,
  nameShort: "",
  name: "",
  language: LanguageCodeEnum.en,
  startYear: null,
  startMonth: null,
  startDay: null,
  endYear: null,
  endMonth: null,
  endDay: null,
  comment: "",
  References: [emptyReference()],
});

export default function CreateEntityNameClient() {
  const router = useRouter();

  // Authentication
  const { auth, loadingAuth } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const polpalIdParam = searchParams.get("polpalId");
  const polpalId = polpalIdParam ? Number(polpalIdParam) : undefined;
  const [entity, setEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState<MultipleNamesFormData>({
    polpalId: polpalId ?? 0,
    names: [emptyName(polpalId ?? 0)],
  });

  useEffect(() => {
    setLoadingData(true);
    setErrorData(null);
    setEntity(null);
    if (!polpalId) return;
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
      setLoadingData(false);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/entities/${polpalId}`, { credentials: "include", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch entity info");
        const data = await res.json();
        setEntity(data);
        setFormData((prev) => ({
          ...prev,
          polpalId: data.polpalId,
          names: prev.names.map((name) => ({ ...name, polpalId: data.polpalId })),
        }));
      })
      .catch((err) => {
        if (!(err instanceof Error) || err.name === "AbortError") return;
        setErrorData("Failed to load entity info");
      })
      .finally(() => setLoadingData(false));
    return () => controller.abort();
  }, [polpalId, loadingAuth, auth?.role]);

  const handleChange = (
    nameIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const numericFields = ["startYear", "startMonth", "startDay", "endYear", "endMonth", "endDay"];
    let processedValue: string | number | null = value;
    if (numericFields.includes(name)) {
      processedValue = value === "" ? null : Number(value);
    }
    setFormData((prev) => ({
      ...prev,
      names: prev.names.map((nameData, index) =>
        index === nameIndex ? { ...nameData, [name]: processedValue } : nameData
      ),
    }));
  };

  const handleReferenceChange = (
    nameIndex: number,
    refIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      names: prev.names.map((nameData, idx) =>
        idx === nameIndex
          ? {
            ...nameData,
            References: nameData.References.map((ref, rIdx) =>
              rIdx === refIndex ? { ...ref, [name]: value } : ref
            ),
          }
          : nameData
      ),
    }));
  };

  const addReference = (nameIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      names: prev.names.map((nameData, idx) =>
        idx === nameIndex
          ? { ...nameData, References: [...nameData.References, emptyReference()] }
          : nameData
      ),
    }));
  };

  const removeReference = (nameIndex: number, refIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      names: prev.names.map((nameData, idx) =>
        idx === nameIndex
          ? { ...nameData, References: nameData.References.filter((_, rIdx) => rIdx !== refIndex) }
          : nameData
      ),
    }));
  };

  const addNewName = () => {
    setFormData((prev) => ({
      ...prev,
      names: [...prev.names, emptyName(prev.polpalId)],
    }));
  };

  const removeNameEntry = (nameIndex: number) => {
    if (formData.names.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      names: prev.names.filter((_, index) => index !== nameIndex),
    }));
  };

  // All required fields (Short Name and Full Name) must be filled for every name entry,
  // and every reference row must have a non-empty value
  const isFormValid = formData.names.every(
    (n) =>
      n.nameShort.trim() !== "" &&
      n.name.trim() !== "" &&
      (n.References ?? []).every((r) => r.value.trim() !== "")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorData(null);

    for (let i = 0; i < formData.names.length; i++) {
      const nameData = formData.names[i];
      if (!nameData.nameShort.trim()) {
        setErrorData(`Name ${i + 1}: Name Short is required.`);
        return;
      }
      if (!nameData.name.trim()) {
        setErrorData(`Name ${i + 1}: Name is required.`);
        return;
      }
    }

    setLoadingData(true);
    try {
      for (const nameData of formData.names) {
        const { References, ...namePayload } = nameData;

        const res = await fetch(`/api/entity-names/`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(namePayload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to create entity name");
        }

        const createdName = await res.json();

        const validRefs = References.filter((r) => r.value.trim() !== "");
        if (validRefs.length > 0) {
          await Promise.all(
            validRefs.map((r) =>
              fetch(`/api/references`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  entityNameId: createdName.entityNameId,
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
      }

      router.push(`/data/entities/${entity?.polpalId}`);
      router.refresh();
    } catch (err) {
      setErrorData(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingData(false);
    }
  };

  // Render loading state
  if (loadingData || loadingAuth) {
    return <LoadingSpinner title="Loading data..." message="Fetching data. Please wait a moment." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER, EDITOR or CONTRIBUTOR rights are required to create entity names." />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message="We encountered an issue while loading the data." error={errorData} backHref="/" />;
  }

  if (!entity && !loadingData) {
    return (
      <NotFoundState
        title="Data Not Found"
        message="The data could not be found or you don't have permission to view it."
        showRetry
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: <CountryBreadcrumbLinks countries={entity?.EntitiesInCountries} /> },
        { label: entity ? `${entity.nameShort}` : "...", href: `/data/entities/${polpalId}` },
        { label: "add additional names" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Add additional names to{" "}
              {entity ? `${entity.nameEnglish} (${entity.nameShort})` : "..."}
            </h1>
            <p className="text-lg text-gray-600">
              Add additional names, abbreviations, or translations for this entity.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errorData && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorData}</p>
            </div>
          </div>
        </div>
      )}

      {/* Existing Names Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Names (already recorded)</h2>

        {!entity?.EntityNames || entity.EntityNames.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-sm">No names yet.</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {[...entity.EntityNames]
              .sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0))
              .map((name) => (
                <EntityNameCard
                  key={name.entityNameId}
                  entityName={{
                    ...name,
                    comment: name.comment ?? null,
                    startYear: name.startYear ?? null,
                    startMonth: name.startMonth ?? null,
                    startDay: name.startDay ?? null,
                    endYear: name.endYear ?? null,
                    endMonth: name.endMonth ?? null,
                    endDay: name.endDay ?? null,
                    References: name.References ?? [],
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* Add Names Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Additional Names</h2>
          <button
            type="button"
            onClick={addNewName}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ListPlus className="w-4 h-4 mr-2" />
            Add Name
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {/* Names List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {formData.names.map((nameData, nameIndex) => (
              <div
                key={nameIndex}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Card Header */}
                <div className="bg-purple-50 border-b border-purple-100 px-4 py-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-400 text-xs font-bold text-white shrink-0">
                        {nameIndex + 1}
                      </span>
                      <span className="font-bold text-sm text-gray-900">
                        {nameData.nameShort || `Name ${nameIndex + 1}`}
                      </span>
                      {nameData.language && (
                        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                          {nameData.language}
                        </span>
                      )}
                    </div>
                    {nameData.name && nameData.name !== nameData.nameShort && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{nameData.name}</div>
                    )}
                  </div>
                  {formData.names.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNameEntry(nameIndex)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors flex-shrink-0 mt-0.5"
                      title="Remove name"
                      aria-label={`Remove name entry ${nameIndex + 1}`}
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Form fields */}
                <div className="p-4 space-y-4 flex-1">
                  {/* Short Name + Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Language <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="language" value={nameData.language}
                        aria-label={`Language for entry ${nameIndex + 1}`}
                        onChange={(e) => handleChange(nameIndex, e)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        {Object.entries(LanguageCodeEnum).map(([, code]) => (
                          <option key={code} value={code}>{LANGUAGE_NAME_MAP[code] || code} ({code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Short Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" name="nameShort" value={nameData.nameShort}
                        aria-label={`Short name for entry ${nameIndex + 1}`}
                        onChange={(e) => handleChange(nameIndex, e)}
                        placeholder="Abbr."
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" name="name" value={nameData.name}
                      aria-label={`Full name for entry ${nameIndex + 1}`}
                      onChange={(e) => handleChange(nameIndex, e)}
                      placeholder="Full name"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Start + End Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Start Date
                      </label>
                      <div className="flex gap-1.5">
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Year</div>
                          <input type="number" name="startYear" placeholder="YYYY" value={nameData.startYear ?? ""} aria-label={`Start year for entry ${nameIndex + 1}`} onChange={(e) => handleChange(nameIndex, e)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Mo</div>
                          <input type="number" name="startMonth" placeholder="MM" min={1} max={12} value={nameData.startMonth ?? ""} aria-label={`Start month for entry ${nameIndex + 1}`} onChange={(e) => handleChange(nameIndex, e)}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Day</div>
                          <input type="number" name="startDay" placeholder="DD" min={1} max={31} value={nameData.startDay ?? ""} aria-label={`Start day for entry ${nameIndex + 1}`} onChange={(e) => handleChange(nameIndex, e)}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        End Date
                      </label>
                      <div className="flex gap-1.5">
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Year</div>
                          <input type="number" name="endYear" placeholder="YYYY" value={nameData.endYear ?? ""} aria-label={`End year for entry ${nameIndex + 1}`} onChange={(e) => handleChange(nameIndex, e)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Mo</div>
                          <input type="number" name="endMonth" placeholder="MM" min={1} max={12} value={nameData.endMonth ?? ""} aria-label={`End month for entry ${nameIndex + 1}`} onChange={(e) => handleChange(nameIndex, e)}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Day</div>
                          <input type="number" name="endDay" placeholder="DD" min={1} max={31} value={nameData.endDay ?? ""} aria-label={`End day for entry ${nameIndex + 1}`} onChange={(e) => handleChange(nameIndex, e)}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Comment</label>
                    <input
                      type="text" name="comment" value={nameData.comment ?? ""}
                      aria-label={`Comment for entry ${nameIndex + 1}`}
                      onChange={(e) => handleChange(nameIndex, e)}
                      placeholder="Optional"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* References */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">References</label>
                      <button
                        type="button"
                        onClick={() => addReference(nameIndex)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-primary bg-blue-50 border border-transparent rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                      >
                        + Add Reference
                      </button>
                    </div>
                    {((nameData.References ?? []).length === 0) ? (
                      <p className="text-xs text-gray-400">No references (optional)</p>
                    ) : (
                      <div className="space-y-2">
                        {nameData.References.map((ref, refIndex) => (
                          <NewReferenceFormRow
                            key={refIndex}
                            index={refIndex}
                            data={ref}
                            fields={ENTITY_NAME_REFERENCE_FIELDS}
                            fieldDefaultLabel="Entire Name"
                            fieldLocked
                            onChange={(e) => handleReferenceChange(nameIndex, refIndex, e)}
                            onRemove={() => removeReference(nameIndex, refIndex)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-6 border-t border-gray-200 gap-4 mt-6">
            <button
              type="button"
              onClick={() => router.push(`/data/entities/${entity?.polpalId}`)}
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              disabled={loadingData}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loadingData || !isFormValid}
            >
              {loadingData ? (
                <>
                  <svg aria-hidden="true" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                `Create ${formData.names.length} Name${formData.names.length > 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
