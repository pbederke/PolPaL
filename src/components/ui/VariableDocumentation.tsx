"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ButtonAdd } from "@/components/ui/Buttons";

export interface Variable {
  variableId: number;
  entryEntityIdVar: string;
  varTitle: string;
  varContent: string;
  createdAt: string;
  updatedAt: string;
}

interface VariableDocumentationProps {
  variables: Variable[];
  defaultOpen?: boolean;
  onDelete?: (variableId: number) => Promise<void>;
  isLoggedIn?: boolean;
  addHref?: string;
}

export function VariableDocumentation({ variables, defaultOpen = false, onDelete, isLoggedIn = false, addHref }: VariableDocumentationProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(variableId: number) {
    if (!onDelete) return;
    setDeleting(variableId);
    try {
      await onDelete(variableId);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  if (variables.length === 0 && !isLoggedIn) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="bg-purple-100 rounded-lg p-2 flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-800">Variable Documentation</h2>
          <p className="text-xs text-gray-500">
            {variables.length} variable{variables.length !== 1 ? "s" : ""} documented
          </p>
        </div>
        {addHref && (
          <ButtonAdd
            href={addHref}
            ariaLabel="Add variable documentation"
            size="sm"
          />
        )}
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {variables.map((v) => (
            <div key={v.variableId} className="px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <code className="text-xs bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-mono text-purple-700">
                  {v.entryEntityIdVar}
                </code>
                <span className="text-sm font-semibold text-gray-900 flex-1">{v.varTitle}</span>
                {onDelete && (
                  confirmDelete === v.variableId ? (
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        type="button"
                        disabled={deleting === v.variableId}
                        onClick={() => handleDelete(v.variableId)}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 disabled:opacity-50"
                      >
                        {deleting === v.variableId ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        disabled={deleting === v.variableId}
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(v.variableId)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={`Delete documentation for ${v.entryEntityIdVar}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )
                )}
              </div>
              <p className="text-xs text-gray-600 whitespace-pre-wrap bg-purple-50 px-2 py-1.5 rounded mt-1">{v.varContent}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
