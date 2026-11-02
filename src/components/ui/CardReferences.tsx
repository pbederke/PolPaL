"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { LanguageCodeEnum, ReferenceTypeEnum } from "@/lib/shared/enums";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";
import { LinkifiedText } from "@/components/ui/LinkifiedText";

export interface CardReference {
    referenceId: number;
    type: string;
    value: string;
    language?: string | null;
    accessedAt?: string | null;
    comment?: string | null;
    createdAt?: string;
    referencedField?: string | null;
}

export type ReferenceFkField = "entityChangeId" | "entityNameId" | "groupingMemberId";

interface RefFormState {
    type: string;
    value: string;
    language: string;
    accessedAt: string;
    comment: string;
}

const emptyForm = (): RefFormState => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return {
        type: Object.keys(ReferenceTypeEnum)[0] ?? "",
        value: "",
        language: "en",
        accessedAt: today,
        comment: "",
    };
};

export function CardReferences({
    references,
    fkField,
    fkValue,
    canEdit = false,
    onReferencesChange,
}: {
    references: CardReference[];
    fkField: ReferenceFkField;
    fkValue: number;
    canEdit?: boolean;
    onReferencesChange: (references: CardReference[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const [editingRefId, setEditingRefId] = useState<number | null>(null);
    const [form, setForm] = useState<RefFormState>(emptyForm);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const startEdit = (ref: CardReference) => {
        setEditingRefId(ref.referenceId);
        setForm({
            type: ref.type,
            value: ref.value,
            language: ref.language ?? "",
            accessedAt: ref.accessedAt ? ref.accessedAt.slice(0, 10) : "",
            comment: ref.comment ?? "",
        });
        setError(null);
        setAdding(true);
    };

    const submitAdd = async () => {
        if (!form.value.trim()) {
            setError("Reference value is required");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (editingRefId !== null) {
                const res = await fetch(`/api/references/${editingRefId}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: form.type,
                        value: form.value.trim(),
                        language: form.language || null,
                        accessedAt: form.accessedAt || null,
                        comment: form.comment || null,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                const updated = await res.json();
                onReferencesChange(references.map((r) => (r.referenceId === editingRefId ? updated : r)));
            } else {
                const res = await fetch("/api/references", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        [fkField]: fkValue,
                        type: form.type,
                        value: form.value.trim(),
                        language: form.language || null,
                        accessedAt: form.accessedAt || null,
                        comment: form.comment || null,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                const created = await res.json();
                onReferencesChange([...references, created]);
            }
            setForm(emptyForm());
            setAdding(false);
            setEditingRefId(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (referenceId: number) => {
        if (!confirm("Are you sure you want to delete this reference?")) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/references/${referenceId}`, { method: "DELETE", credentials: "include" });
            if (!res.ok) throw new Error(await res.text());
            onReferencesChange(references.filter((r) => r.referenceId !== referenceId));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const setField = (field: keyof RefFormState, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="space-y-1">
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                {references.map((ref) => (
                    <div key={ref.referenceId} className="px-3 py-2 text-xs space-y-0.5">
                        <div className="grid grid-cols-[5rem_1fr_8rem_8rem_auto] items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-700">{ref.type}</span>
                            <LinkifiedText text={ref.value} />
                            {ref.language && (
                                <span className="text-gray-400 text-left">
                                    {LANGUAGE_NAME_MAP[ref.language as keyof typeof LANGUAGE_NAME_MAP] ?? ref.language} ({ref.language})
                                </span>
                            )}
                            {ref.accessedAt && (
                                <span className="text-gray-400 text-left">
                                    accessed {new Date(ref.accessedAt).toLocaleDateString()}
                                </span>
                            )}
                            {canEdit && (
                                <div className="flex items-center gap-1 justify-self-end">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(ref)}
                                        disabled={loading}
                                        className="text-gray-400 hover:text-primary/90 p-0.5 disabled:opacity-50"
                                        aria-label="Edit reference"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(ref.referenceId)}
                                        disabled={loading}
                                        className="text-gray-400 hover:text-red-500 p-0.5 disabled:opacity-50"
                                        aria-label="Delete reference"
                                    >
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        {ref.comment && <p className="text-gray-500 italic border-t pt-2">{ref.comment}</p>}
                    </div>
                ))}
            </div>

            {canEdit && (
                <div className="px-1">
                    {adding ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_1fr] gap-2">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">Type</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setField("type", e.target.value)}
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                    >
                                        {Object.keys(ReferenceTypeEnum).map((k) => (
                                            <option key={k} value={k}>{k}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">Language</label>
                                    <select
                                        value={form.language}
                                        onChange={(e) => setField("language", e.target.value)}
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                    >
                                        <option value="">None</option>
                                        {(Object.keys(LanguageCodeEnum) as (keyof typeof LanguageCodeEnum)[]).map((k) => (
                                            <option key={k} value={k}>
                                                {LANGUAGE_NAME_MAP[k] ? `${LANGUAGE_NAME_MAP[k]} (${k})` : k}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">Accessed At</label>
                                    <input
                                        type="date"
                                        value={form.accessedAt}
                                        onChange={(e) => setField("accessedAt", e.target.value)}
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">APA (7th ed.) <span className="text-red-500">*</span></label>
                                <textarea
                                    value={form.value}
                                    onChange={(e) => setField("value", e.target.value)}
                                    rows={2}
                                    placeholder="APA (7th ed.) reference"
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs resize-y"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">Comment</label>
                                <textarea
                                    value={form.comment}
                                    onChange={(e) => setField("comment", e.target.value)}
                                    rows={2}
                                    placeholder="Optional"
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs resize-y"
                                />
                            </div>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={submitAdd}
                                    disabled={loading}
                                    className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {editingRefId !== null ? "Save" : "Add"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAdding(false); setEditingRefId(null); setError(null); }}
                                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setForm(emptyForm()); setEditingRefId(null); setError(null); setAdding(true); }}
                            className="text-xs text-gray-400 hover:text-primary/90 transition-colors"
                        >
                            + Add reference
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
