"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { formatPartialDate } from "@/lib/shared/utils";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";
import { CardReferences, type CardReference } from "@/components/ui/CardReferences";
import { useAuth } from "@/context/AuthContext";

export interface EntityNameCardReference {
    referenceId: number;
    type: string;
    value: string;
    language: string | null;
    accessedAt: string | null;
    comment: string | null;
    createdAt: string;
}

export interface EntityNameCardData {
    entityNameId: number;
    nameShort: string;
    name: string;
    language: string;
    comment: string | null;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    References: EntityNameCardReference[];
}

export interface EntityNameUpdateInput {
    nameShort: string;
    name: string;
    language: string;
    comment: string | null;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
}

type DatePart = "start" | "end";

function DateFieldGroup({
    label,
    year,
    month,
    day,
    onYear,
    onMonth,
    onDay,
}: {
    label: string;
    year: number | "";
    month: number | "";
    day: number | "";
    onYear: (v: number | "") => void;
    onMonth: (v: number | "") => void;
    onDay: (v: number | "") => void;
}) {
    const inputCls = "w-full min-w-0 rounded border border-gray-300 px-2 py-1";
    return (
        <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="block space-y-0.5">
                <span className="block text-[10px] uppercase tracking-wide text-gray-400">{label} Year</span>
                <input
                    type="number"
                    placeholder="-"
                    value={year}
                    onChange={(e) => onYear(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                />
            </label>
            <label className="block space-y-0.5">
                <span className="block text-[10px] uppercase tracking-wide text-gray-400">{label} Month</span>
                <input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="-"
                    value={month}
                    onChange={(e) => onMonth(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                />
            </label>
            <label className="block space-y-0.5">
                <span className="block text-[10px] uppercase tracking-wide text-gray-400">{label} Day</span>
                <input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="-"
                    value={day}
                    onChange={(e) => onDay(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                />
            </label>
        </div>
    );
}

export function EntityNameCard({
    entityName,
    onDelete,
    onUpdate,
    onReferencesChange,
    canDelete = false,
    canEdit = false,
    canEditRefs = false,
}: {
    entityName: EntityNameCardData;
    onDelete?: (entityNameId: number) => void;
    onUpdate?: (entityNameId: number, data: EntityNameUpdateInput) => Promise<void> | void;
    onReferencesChange?: (references: CardReference[]) => void;
    canDelete?: boolean;
    canEdit?: boolean;
    canEditRefs?: boolean;
}) {
    const { auth } = useAuth();
    const [showRefs, setShowRefs] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<{
        nameShort: string;
        name: string;
        language: string;
        comment: string;
        dateParts: Record<DatePart, { year: number | ""; month: number | ""; day: number | "" }>;
    }>({
        nameShort: entityName.nameShort,
        name: entityName.name,
        language: entityName.language,
        comment: entityName.comment ?? "",
        dateParts: {
            start: { year: entityName.startYear ?? "", month: entityName.startMonth ?? "", day: entityName.startDay ?? "" },
            end: { year: entityName.endYear ?? "", month: entityName.endMonth ?? "", day: entityName.endDay ?? "" },
        },
    });
    const [editError, setEditError] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);

    const startEditing = () => {
        setForm({
            nameShort: entityName.nameShort,
            name: entityName.name,
            language: entityName.language,
            comment: entityName.comment ?? "",
            dateParts: {
                start: { year: entityName.startYear ?? "", month: entityName.startMonth ?? "", day: entityName.startDay ?? "" },
                end: { year: entityName.endYear ?? "", month: entityName.endMonth ?? "", day: entityName.endDay ?? "" },
            },
        });
        setEditError(null);
        setEditing(true);
    };

    const submitEdit = async () => {
        if (!onUpdate) return;
        if (!form.nameShort.trim() || !form.name.trim() || !form.language.trim()) {
            setEditError("Name short, name and language are required");
            return;
        }
        setEditLoading(true);
        setEditError(null);
        try {
            const toValue = (part: DatePart, field: "year" | "month" | "day") =>
                form.dateParts[part][field] === "" ? null : form.dateParts[part][field];
            await onUpdate(entityName.entityNameId, {
                nameShort: form.nameShort.trim(),
                name: form.name.trim(),
                language: form.language.trim(),
                comment: form.comment.trim() === "" ? null : form.comment,
                startYear: toValue("start", "year"),
                startMonth: toValue("start", "month"),
                startDay: toValue("start", "day"),
                endYear: toValue("end", "year"),
                endMonth: toValue("end", "month"),
                endDay: toValue("end", "day"),
            });
            setEditing(false);
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : String(err));
        } finally {
            setEditLoading(false);
        }
    };

    const setPart = (part: DatePart, field: "year" | "month" | "day", value: number | "") =>
        setForm((prev) => ({ ...prev, dateParts: { ...prev.dateParts, [part]: { ...prev.dateParts[part], [field]: value } } }));

    return (
        <section className="border border-gray-200 border-l-4 border-l-purple-300 rounded-lg p-2 bg-white shadow-sm space-y-2">
            {/* Header: 4 fixed columns — nameShort | name | language | date */}
            <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[5rem_1fr_8rem_12rem_auto_3rem] items-center gap-2 text-xs min-w-0">
                <span className="text-gray-800 font-semibold truncate" title={entityName.nameShort}>
                    {entityName.nameShort}
                </span>
                <span className="hidden sm:block text-gray-800 truncate" title={entityName.name}>
                    {entityName.name}
                </span>
                <span className="hidden sm:block text-gray-500 font-mono truncate text-left" title={entityName.language}>
                    {LANGUAGE_NAME_MAP[entityName.language as keyof typeof LANGUAGE_NAME_MAP] ?? entityName.language} ({entityName.language})
                </span>
                <span className="text-gray-500 whitespace-nowrap text-left sm:px-5 inline-flex items-center gap-1">
                    {(entityName.startYear || entityName.endYear)
                        ? `${formatPartialDate(entityName.startYear, entityName.startMonth, entityName.startDay) || "?"} → ${formatPartialDate(entityName.endYear, entityName.endMonth, entityName.endDay) || "?"}`
                        : ""}
                </span>
                <div className="hidden sm:flex justify-end">
                    <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-primary/90 transition-colors whitespace-nowrap"
                        onClick={() => setShowRefs((v) => !v)}
                    >
                        {showRefs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span className="inline-block w-10 text-left">{(entityName.References?.length ?? 0)} ref{(entityName.References?.length ?? 0) !== 1 ? "s" : ""}</span>
                    </button>
                </div>
                <div className="hidden sm:flex justify-end">
                    {canEdit && onUpdate && (
                        <button
                            type="button"
                            onClick={startEditing}
                            className="text-gray-400 hover:text-primary/90 transition-colors"
                            aria-label="Edit entity name"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                    )}
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(entityName.entityNameId)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                            aria-label="Delete entity name"
                        >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Editor */}
            {editing && (
                <div className="border-t px-3 pt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">Name Short <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={form.nameShort}
                                onChange={(e) => setForm((prev) => ({ ...prev, nameShort: e.target.value }))}
                                className="w-full rounded border border-gray-300 px-2 py-1"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded border border-gray-300 px-2 py-1"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700">Language</label>
                            <input
                                type="text"
                                value={form.language}
                                onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                                className="w-full sm:w-40 rounded border border-gray-300 px-2 py-1 bg-gray-100"
                                disabled={true}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DateFieldGroup
                            label="Start"
                            year={form.dateParts.start.year}
                            month={form.dateParts.start.month}
                            day={form.dateParts.start.day}
                            onYear={(v) => setPart("start", "year", v)}
                            onMonth={(v) => setPart("start", "month", v)}
                            onDay={(v) => setPart("start", "day", v)}
                        />
                        <DateFieldGroup
                            label="End"
                            year={form.dateParts.end.year}
                            month={form.dateParts.end.month}
                            day={form.dateParts.end.day}
                            onYear={(v) => setPart("end", "year", v)}
                            onMonth={(v) => setPart("end", "month", v)}
                            onDay={(v) => setPart("end", "day", v)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Comment</label>
                        <textarea
                            value={form.comment}
                            onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                            rows={2}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs resize-y"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={submitEdit}
                            disabled={editLoading}
                            className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                </div>
            )}

            {/* Comment — visible only for logged in users */}
            {entityName.comment && auth.loggedIn && (
                <p className="border-t px-3 pt-2 text-xs text-gray-500 italic">{entityName.comment}</p>
            )}

            {/* References expanded */}
            {showRefs && (
                <CardReferences
                    references={entityName.References}
                    fkField="entityNameId"
                    fkValue={entityName.entityNameId}
                    canEdit={canEditRefs}
                    onReferencesChange={(refs) => onReferencesChange?.(refs)}
                />
            )}
        </section>
    );
}
