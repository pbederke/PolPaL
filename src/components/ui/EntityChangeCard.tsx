"use client";

import Link from "next/link";
import { formatPartialDate } from "@/lib/shared/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { CardReferences, type CardReference } from "@/components/ui/CardReferences";
import { useAuth } from "@/context/AuthContext";

export interface EntityChangeCardReference {
    referenceId: number;
    type: string;
    value: string;
    language: string | null;
    accessedAt: string | null;
    comment: string | null;
    createdAt: string;
}

export interface EntityChangeCardData {
    entityChangeId: number;
    polpalId: number;
    nameShort: string;
    nameEnglish: string;
    name: string | null;
    countrycodePolpal: string[];
    changeYear: number;
    changeMonth: number | null;
    changeDay: number | null;
    changeType: string;
    comment: string | null;
    References: EntityChangeCardReference[];
}

export interface EntityChangeUpdateInput {
    changeYear: number;
    changeMonth: number | null;
    changeDay: number | null;
    comment: string | null;
}

export function EntityChangeCard({
    change,
    onDelete,
    onUpdate,
    onReferencesChange,
    canDelete = false,
    canEdit = false,
    canEditRefs = false,
}: {
    change: EntityChangeCardData;
    onDelete?: (entityChangeId: number) => void;
    onUpdate?: (entityChangeId: number, data: EntityChangeUpdateInput) => Promise<void> | void;
    onReferencesChange?: (references: CardReference[]) => void;
    canDelete?: boolean;
    canEdit?: boolean;
    canEditRefs?: boolean;
}) {
    const { auth } = useAuth();
    const [showRefs, setShowRefs] = useState(false);
    const [editing, setEditing] = useState(false);
    const [dateYear, setDateYear] = useState<number>(change.changeYear);
    const [dateMonth, setDateMonth] = useState<number | "">(change.changeMonth ?? "");
    const [dateDay, setDateDay] = useState<number | "">(change.changeDay ?? "");
    const [comment, setComment] = useState<string>(change.comment ?? "");
    const [editError, setEditError] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);

    const startEditing = () => {
        setDateYear(change.changeYear);
        setDateMonth(change.changeMonth ?? "");
        setDateDay(change.changeDay ?? "");
        setComment(change.comment ?? "");
        setEditError(null);
        setEditing(true);
    };

    const submitEdit = async () => {
        if (!onUpdate) return;
        setEditLoading(true);
        setEditError(null);
        try {
            await onUpdate(change.entityChangeId, {
                changeYear: dateYear,
                changeMonth: dateMonth === "" ? null : dateMonth,
                changeDay: dateDay === "" ? null : dateDay,
                comment: comment.trim() === "" ? null : comment,
            });
            setEditing(false);
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : String(err));
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <section className="border border-gray-200 border-l-4 border-l-orange-400 rounded-lg p-2 bg-white shadow-sm space-y-2">
            {/* Header: changeType | entity | countries | date | delete */}
            <div className="grid grid-cols-[5rem_5rem_4rem] sm:grid-cols-[5rem_5rem_10fr_10fr_4rem_4rem_3rem] items-center gap-2 text-xs min-w-0">
                <span className="text-gray-500 px-3 font-mono truncate">{change.changeType}</span>
                <Link
                    href={`/data/entities/${change.polpalId}`}
                    className="text-primary hover:underline truncate  text-left font-semibold text-xs text-gray-800"
                    title={change.nameEnglish}
                >
                    {change.nameShort}
                </Link>
                <span className="hidden sm:block text-gray-500 truncate text-left" title={change.nameEnglish}>{change.nameEnglish}</span>
                <span className="hidden sm:block text-gray-500 truncate text-left" title={change.name ?? undefined}>{change.name}</span>
                <span className="text-gray-500 whitespace-nowrap text-left inline-flex items-center gap-1">
                    {formatPartialDate(change.changeYear, change.changeMonth, change.changeDay) || "?"}
                </span>
                <div className="hidden sm:flex justify-end text-left">
                    <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-primary/90 transition-colors whitespace-nowrap"
                        onClick={() => setShowRefs((v) => !v)}
                    >
                        {showRefs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span className="inline-block w-10 text-left">{(change.References?.length ?? 0)} ref{(change.References?.length ?? 0) !== 1 ? "s" : ""}</span>
                    </button>
                </div>
                <div className="hidden sm:flex justify-end text-center">
                    {canEdit && onUpdate && (
                        <button
                            type="button"
                            onClick={startEditing}
                            className="text-gray-400 hover:text-primary/90 transition-colors"
                            aria-label="Edit entity change"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                    )}
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(change.entityChangeId)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                            aria-label="Delete entity change"
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
                <div className="border-t px-3 pt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <label className="text-gray-500">Year</label>
                        <input
                            type="number"
                            value={dateYear}
                            onChange={(e) => setDateYear(Number(e.target.value))}
                            className="w-20 rounded border border-gray-300 px-2 py-1"
                        />
                        <label className="text-gray-500">Month</label>
                        <input
                            type="number"
                            min={1}
                            max={12}
                            placeholder="-"
                            value={dateMonth}
                            onChange={(e) => setDateMonth(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-16 rounded border border-gray-300 px-2 py-1"
                        />
                        <label className="text-gray-500">Day</label>
                        <input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="-"
                            value={dateDay}
                            onChange={(e) => setDateDay(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-16 rounded border border-gray-300 px-2 py-1"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Comment</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
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
            {change.comment && auth.loggedIn && (
                <p className="border-t px-3 pt-2 text-xs text-gray-500 italic">{change.comment}</p>
            )}

            {/* References expanded */}
            {showRefs && (
                <CardReferences
                    references={change.References}
                    fkField="entityChangeId"
                    fkValue={change.entityChangeId}
                    canEdit={canEditRefs}
                    onReferencesChange={(refs) => onReferencesChange?.(refs)}
                />
            )}
        </section>
    );
}
