"use client";

import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";
import { LinkifiedText } from "@/components/ui/LinkifiedText";

export interface ExistingReferenceData {
  referenceId: number;
  referencedField: string | null;
  type: string;
  value: string;
  language: string | null;
  accessedAt: string | null;
  comment: string | null;
}

interface Props {
  references: ExistingReferenceData[];
  /** Text shown when `referencedField` is null/empty. Defaults to "—". */
  fieldFallbackLabel?: string;
  onDelete: (referenceId: number) => void;
}

export function ExistingReferencesTable({
  references,
  fieldFallbackLabel = "—",
  onDelete,
}: Props) {
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="min-w-full text-xs divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Field</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Reference Type</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">APA style citation (7th ed.)</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Language</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Accessed At</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Comment</th>
            <th scope="col" className="px-3 py-2"><span className="sr-only"></span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {references.map((ref) => (
            <tr key={ref.referenceId} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">
                {ref.referencedField ?? fieldFallbackLabel}
              </td>
              <td className="px-3 py-2 text-gray-600">{ref.type}</td>
              <td className="px-3 py-2 max-w-xs truncate">
                <LinkifiedText text={ref.value} />
              </td>
              <td className="px-3 py-2 text-gray-600">
                {ref.language
                  ? `${LANGUAGE_NAME_MAP[ref.language as keyof typeof LANGUAGE_NAME_MAP] ?? ref.language} (${ref.language})`
                  : "—"}
              </td>
              <td className="px-3 py-2 text-gray-600">
                {ref.accessedAt ? new Date(ref.accessedAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2 text-gray-600">{ref.comment ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(ref.referenceId)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Delete reference"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
