"use client";

import { LanguageCodeEnum, ReferenceTypeEnum } from "@/lib/shared/enums";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";

export interface NewReferenceData {
  referencedField: string;
  type: ReferenceTypeEnum;
  value: string;
  language: string;
  accessedAt: string;
  comment: string;
}

export interface RefField {
  value: string;
  label: string;
}

interface Props {
  index: number;
  data: NewReferenceData;
  fields: RefField[];
  /** Text shown as the first (empty-value) option in the Field select. Defaults to "Select a field". */
  fieldDefaultLabel?: string;
  /** If true, the field is shown as a read-only label instead of a select. */
  fieldLocked?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onRemove: () => void;
}

export function NewReferenceFormRow({
  index,
  data,
  fields,
  fieldDefaultLabel = "Select a field",
  fieldLocked = false,
  onChange,
  onRemove,
}: Props) {
  return (
    <div className="border border-gray-200 rounded-md p-4 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
        aria-label="Remove reference"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <p className="text-sm font-medium text-gray-700 mb-4">Reference #{index + 1}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 pr-6">
        <div className="space-y-1">
          <label htmlFor="ref-field-select" className="block text-sm font-medium text-gray-700">Field</label>
          {fieldLocked ? (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600">
              {data.referencedField || fieldDefaultLabel}
            </div>
          ) : (
            <select
              id="ref-field-select"
              name="referencedField"
              value={data.referencedField}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">{fieldDefaultLabel}</option>
              {fields.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="ref-type-select" className="block text-sm font-medium text-gray-700">
            Reference Type <span className="text-red-500">*</span>
          </label>
          <select
            id="ref-type-select"
            name="type"
            value={data.type}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          >
            {Object.keys(ReferenceTypeEnum).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 pr-6 mt-4">
        <div className="space-y-1">
          <label htmlFor="ref-value-input" className="block text-sm font-medium text-gray-700">
            APA (7th ed.) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="ref-value-input"
            name="value"
            value={data.value}
            onChange={onChange}
            rows={3}
            placeholder="e.g., Arel-Bundock, V., Enevoldsen, N., & Yetman, C. (2018). countrycode: An R package to convert country names and country codes. The Journal of Open Source Software, 3(28), 848. https://doi.org/10.21105/joss.00848"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-y"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 pr-6 mt-4">
        <div className="space-y-1">
          <label htmlFor="ref-language-select" className="block text-sm font-medium text-gray-700">Language</label>
          <select
            id="ref-language-select"
            name="language"
            value={data.language}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          >
            {(Object.keys(LanguageCodeEnum) as (keyof typeof LanguageCodeEnum)[]).map((k) => (
              <option key={k} value={k}>
                {LANGUAGE_NAME_MAP[k] ? `${LANGUAGE_NAME_MAP[k]} (${k})` : k}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="ref-accessed-at-input" className="block text-sm font-medium text-gray-700">Accessed At</label>
          <input
            id="ref-accessed-at-input"
            type="date"
            name="accessedAt"
            value={data.accessedAt}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 pr-6 mt-4">
        <div className="space-y-1">
          <label htmlFor="ref-comment-input" className="block text-sm font-medium text-gray-700">Comment</label>
          <textarea
            id="ref-comment-input"
            name="comment"
            value={data.comment}
            onChange={onChange}
            rows={2}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-y"
          />
        </div>
      </div>

    </div >
  );
}
