"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { formatPartialDate } from "@/lib/shared/utils";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { CardReferences, type CardReference } from "@/components/ui/CardReferences";
import { useAuth } from "@/context/AuthContext";

export interface EntityMemberCardReference {
    referenceId: number;
    referencedField: string | null;
    type: string;
    value: string;
    language: string | null;
    accessedAt: string | null;
    comment: string | null;
    createdAt: string;
}

export interface EntityMemberCardData {
    groupingMemberId: number;
    polpalId: number;
    nameShort: string;
    nameEnglish: string;
    name: string | null;
    entityType?: string | null;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    comment: string | null;
    References: EntityMemberCardReference[];
}

export interface EntityMemberUpdateInput {
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    comment: string | null;
}

type DatePart = "start" | "end";

export function EntityMemberCard({
    member,
    onDelete,
    onUpdate,
    onReferencesChange,
    canDelete = false,
    canEdit = false,
    canEditRefs = false,
}: {
    member: EntityMemberCardData;
    onDelete?: (groupingMemberId: number) => void;
    onUpdate?: (groupingMemberId: number, data: EntityMemberUpdateInput) => Promise<void> | void;
    onReferencesChange?: (references: CardReference[]) => void;
    canDelete?: boolean;
    canEdit?: boolean;
    canEditRefs?: boolean;
}) {
    const { auth } = useAuth();
    const [showRefs, setShowRefs] = useState(false);
    const [editing, setEditing] = useState(false);
    const [dateParts, setDateParts] = useState<Record<DatePart, { year: number | ""; month: number | ""; day: number | "" }>>({
        start: { year: member.startYear ?? "", month: member.startMonth ?? "", day: member.startDay ?? "" },
        end: { year: member.endYear ?? "", month: member.endMonth ?? "", day: member.endDay ?? "" },
    });
    const [comment, setComment] = useState<string>(member.comment ?? "");
    const [editError, setEditError] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);

    const startDate = formatPartialDate(member.startYear, member.startMonth, member.startDay);
    const endDate = formatPartialDate(member.endYear, member.endMonth, member.endDay);
    const dateRange = (member.startYear || member.endYear)
        ? `${startDate || "?"} → ${endDate || "?"}`
        : "";

    const startEditing = () => {
        setDateParts({
            start: { year: member.startYear ?? "", month: member.startMonth ?? "", day: member.startDay ?? "" },
            end: { year: member.endYear ?? "", month: member.endMonth ?? "", day: member.endDay ?? "" },
        });
        setComment(member.comment ?? "");
        setEditError(null);
        setEditing(true);
    };

    const submitEdit = async () => {
        if (!onUpdate) return;
        setEditLoading(true);
        setEditError(null);
        try {
            const toValue = (part: DatePart, field: "year" | "month" | "day") =>
                dateParts[part][field] === "" ? null : dateParts[part][field];
            await onUpdate(member.groupingMemberId, {
                startYear: toValue("start", "year"),
                startMonth: toValue("start", "month"),
                startDay: toValue("start", "day"),
                endYear: toValue("end", "year"),
                endMonth: toValue("end", "month"),
                endDay: toValue("end", "day"),
                comment: comment.trim() === "" ? null : comment,
            });
            setEditing(false);
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : String(err));
        } finally {
            setEditLoading(false);
        }
    };

    const setPart = (part: DatePart, field: "year" | "month" | "day", value: number | "") =>
        setDateParts((prev) => ({ ...prev, [part]: { ...prev[part], [field]: value } }));

    return (
        <section className="border border-gray-200 border-l-4 border-l-green-400 rounded-lg p-2 bg-white shadow-sm space-y-2">
            {/* Header: nameShort | nameEnglish | name | entityType | date range | delete */}
            <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[5rem_1fr_1fr_8rem_11rem_auto_3rem] items-center gap-2 text-xs min-w-0">
                <Link
                    href={`/data/entities/${member.polpalId}`}
                    className="text-primary hover:underline truncate font-semibold text-xs text-gray-800 px-3"
                    title={member.nameEnglish}
                >
                    {member.nameShort}
                </Link>
                <span className="hidden sm:block text-gray-500 truncate" title={member.nameEnglish}>{member.nameEnglish}</span>
                <span className="hidden sm:block text-gray-500 truncate text-left" title={member.name ?? undefined}>{member.name}</span>
                <div className="hidden sm:flex justify-start text-left">
                    {member.entityType && <EntityTypeBadge entityType={member.entityType} size="xs" />}
                </div>
                <span className="text-gray-500 whitespace-nowrap justify-start text-left inline-flex items-center gap-1">
                    {dateRange}
                </span>
                <div className="hidden sm:flex justify-start text-left">
                    <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-primary/90 transition-colors whitespace-nowrap"
                        onClick={() => setShowRefs((v) => !v)}
                    >
                        {showRefs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span className="inline-block w-10 text-left">{(member.References?.length ?? 0)} ref{(member.References?.length ?? 0) !== 1 ? "s" : " "}</span>
                    </button>
                </div>
                <div className="hidden sm:flex justify-end">
                    {canEdit && onUpdate && (
                        <button
                            type="button"
                            onClick={startEditing}
                            className="text-gray-400 hover:text-primary/90 transition-colors"
                            aria-label="Edit member"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                    )}
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(member.groupingMemberId)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                            aria-label="Delete member"
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
                    {(["start", "end"] as DatePart[]).map((part) => (
                        <div key={part} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="w-10 text-gray-500 capitalize">{part}</span>
                            <label className="text-gray-500">Year</label>
                            <input
                                type="number"
                                placeholder="-"
                                value={dateParts[part].year}
                                onChange={(e) => setPart(part, "year", e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-20 rounded border border-gray-300 px-2 py-1"
                            />
                            <label className="text-gray-500">Month</label>
                            <input
                                type="number"
                                min={1}
                                max={12}
                                placeholder="-"
                                value={dateParts[part].month}
                                onChange={(e) => setPart(part, "month", e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-16 rounded border border-gray-300 px-2 py-1"
                            />
                            <label className="text-gray-500">Day</label>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                placeholder="-"
                                value={dateParts[part].day}
                                onChange={(e) => setPart(part, "day", e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-16 rounded border border-gray-300 px-2 py-1"
                            />
                        </div>
                    ))}
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
            {member.comment && auth.loggedIn && (
                <p className="border-t px-3 pt-2 text-xs text-gray-500 italic">{member.comment}</p>
            )}

            {/* References expanded */}
            {showRefs && (
                <CardReferences
                    references={member.References}
                    fkField="groupingMemberId"
                    fkValue={member.groupingMemberId}
                    canEdit={canEditRefs}
                    onReferencesChange={(refs) => onReferencesChange?.(refs)}
                />
            )}
        </section>
    );
}
