'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AccessDenied } from '@/components/ui/AccessDenied';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

const PRIVILEGED_ROLES = ['ADMIN', 'DATAMANAGER', 'EDITOR'];

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Ticket {
    id: number;
    title: string;
    description: string;
    url: string | null;
    status: TicketStatus;
    createdAt: string;
    updatedAt: string;
    userId: number;
    user?: { username: string };
}

const STATUS_LABELS: Record<TicketStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
};

const STATUS_BADGE_CLASSES: Record<TicketStatus, string> = {
    OPEN: 'bg-blue-100 text-blue-800 border border-blue-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 border border-amber-200',
    RESOLVED: 'bg-green-100 text-green-800 border border-green-200',
    CLOSED: 'bg-gray-100 text-gray-500 border border-gray-200',
};

function StatusBadge({ status }: { status: TicketStatus }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_CLASSES[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

interface TicketCardProps {
    ticket: Ticket;
    isPrivileged: boolean;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, status: TicketStatus) => void;
    deletingId: number | null;
    updatingId: number | null;
    confirmDeleteId: number | null;
    setConfirmDeleteId: (id: number | null) => void;
}

function TicketCard({
    ticket, isPrivileged, onDelete, onStatusChange,
    deletingId, updatingId, confirmDeleteId, setConfirmDeleteId,
}: TicketCardProps) {
    const isDeleting = deletingId === ticket.id;
    const isUpdating = updatingId === ticket.id;
    const isConfirming = confirmDeleteId === ticket.id;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm hover:border-gray-300 transition-colors">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1 min-w-0">
                    {ticket.title}
                </h3>
                <div className="flex items-center gap-2 shrink-0 justify-end sm:justify-start">
                    {isPrivileged ? (
                        <select
                            value={ticket.status}
                            disabled={isUpdating}
                            onChange={(e) => onStatusChange(ticket.id, e.target.value as TicketStatus)}
                            className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 cursor-pointer"
                        >
                            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                    ) : (
                        <StatusBadge status={ticket.status} />
                    )}

                    {isConfirming ? (
                        <div className="flex items-center gap-1.5">
                            <span className="hidden sm:inline text-xs text-gray-500">Delete?</span>
                            <button
                                type="button"
                                onClick={() => { setConfirmDeleteId(null); onDelete(ticket.id); }}
                                disabled={isDeleting}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                            >
                                Yes
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                            >
                                No
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteId(ticket.id)}
                            disabled={isDeleting}
                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 p-1 rounded hover:bg-red-50"
                            aria-label="Delete ticket"
                        >
                            {isDeleting ? (
                                <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            ) : (
                                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                {ticket.description}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 pt-1 border-t border-gray-100">
                {ticket.url && (
                    <a
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary/90 hover:underline min-w-0 max-w-[160px] sm:max-w-xs"
                    >
                        <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="truncate">{ticket.url}</span>
                    </a>
                )}
                <span className="flex items-center gap-1 ml-auto">
                    {new Date(ticket.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                {isPrivileged && ticket.user && (
                    <span className="flex items-center gap-1">
                        <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {ticket.user.username}
                    </span>
                )}
                {isUpdating && <span className="text-amber-500">Saving…</span>}
            </div>
        </div>
    );
}

export default function TicketsClient() {
    const { auth, loadingAuth } = useAuth();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const isPrivileged = auth.role ? PRIVILEGED_ROLES.includes(auth.role) : false;

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/report-tickets', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load tickets');
            setTickets(await res.json());
        } catch {
            setError('Could not load tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (auth.loggedIn) fetchTickets();
    }, [auth.loggedIn, fetchTickets]);

    // Prefill the new-ticket form when arriving via a deep-link from an entity or country page.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const prefillTitle = params.get('title');
        const prefillDescription = params.get('description');
        const prefillUrl = params.get('url');
        if (prefillTitle || prefillDescription || prefillUrl) {
            if (prefillTitle) setFormTitle(prefillTitle.slice(0, 150));
            if (prefillDescription) setFormDescription(prefillDescription.slice(0, 2000));
            if (prefillUrl) setFormUrl(prefillUrl);
            setShowForm(true);
        }
    }, []);

    const [activeStatus, setActiveStatus] = useState<TicketStatus>('OPEN');
    const statusOptions: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const visibleTickets = tickets.filter((ticket) => ticket.status === activeStatus);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);
        try {
            const body = {
                title: formTitle.trim(),
                description: formDescription.trim(),
                url: formUrl.trim() || null,
            };
            const res = await fetch('/api/report-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setFormError(data.message ?? 'Failed to create ticket');
                return;
            }
            setFormTitle('');
            setFormDescription('');
            setFormUrl('');
            setShowForm(false);
            await fetchTickets();
        } catch {
            setFormError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: number) {
        setDeletingId(id);
        setActionError(null);
        try {
            const res = await fetch(`/api/report-tickets/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setActionError(data.message ?? 'Failed to delete ticket');
                return;
            }
            setTickets((prev) => prev.filter((t) => t.id !== id));
        } catch {
            setActionError('Network error. Please try again.');
        } finally {
            setDeletingId(null);
        }
    }

    async function handleStatusChange(id: number, status: TicketStatus) {
        setUpdatingId(id);
        setActionError(null);
        try {
            const res = await fetch(`/api/report-tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setActionError(data.message ?? 'Failed to update status');
                return;
            }
            setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
        } catch {
            setActionError('Network error. Please try again.');
        } finally {
            setUpdatingId(null);
        }
    }

    const sharedProps = {
        isPrivileged,
        onDelete: handleDelete,
        onStatusChange: handleStatusChange,
        deletingId,
        updatingId,
        confirmDeleteId,
        setConfirmDeleteId,
    };

    if (loadingAuth) return <LoadingSpinner title="Loading authentication..." message="Authenticating user. Please wait a moment." />;
    if (!auth.loggedIn) return <AccessDenied message="You need to be logged in to access this page." />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Profile", href: "/user" },
                { label: `Tickets` },
            ]} />
            {/* Page header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{isPrivileged ? 'All Submitted Tickets' : 'Your Submitted Tickets'}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        You can submit a new ticket or manage existing ones below.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => { setShowForm((v) => !v); setFormError(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                    {showForm ? (
                        <>
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancel
                        </>
                    ) : (
                        <>
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            New Ticket
                        </>
                    )}
                </button>
            </div>

            <div className="rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <p className="text-gray-700 mt-0.5 font-medium text-lg">
                        Ticket Guidelines
                    </p>
                    <p className="text-sm mt-0.5 text-gray-600">
                        Tickets are intended for the following purposes, but not limited to:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-0.5">
                        <li>Request revision of PolPaL entities (create/update/delete)</li>
                        <li>Request assignment of PolPaL entity to another country</li>
                        <li>Request clarification on external dataset entries and links</li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-1">
                        Please provide as much detail as possible when submitting a ticket, including a direct link if applicable.
                    </p>
                </div>
            </div>

            {/* Create form */}
            {
                showForm && (
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
                    >
                        <h2 className="font-semibold text-gray-800">Submit a new ticket</h2>

                        {formError && (
                            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="block text-sm font-medium text-gray-700" htmlFor="ticket-title">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <span className="text-xs text-gray-400">{formTitle.length}/150</span>
                            </div>
                            <input
                                id="ticket-title"
                                type="text"
                                required
                                maxLength={150}
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                placeholder="Brief summary of the issue"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="block text-sm font-medium text-gray-700" htmlFor="ticket-description">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <span className="text-xs text-gray-400">{formDescription.length}/2000</span>
                            </div>
                            <textarea
                                id="ticket-description"
                                required
                                maxLength={2000}
                                rows={4}
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y"
                                placeholder="Detailed description of the issue"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="ticket-url">
                                URL <span className="text-gray-400 font-normal text-xs">(optional)</span>
                            </label>
                            <input
                                id="ticket-url"
                                type="url"
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                placeholder="https://..."
                            />
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Submitting…
                                    </>
                                ) : 'Submit Ticket'}
                            </button>
                        </div>
                    </form>
                )
            }


            {/* Action error banner */}
            {
                actionError && (
                    <div role="alert" className="flex items-center justify-between text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        <span>{actionError}</span>
                        <button type="button" aria-label="Dismiss error" onClick={() => setActionError(null)} className="ml-4 text-red-500 hover:text-red-700">
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )
            }

            {/* Ticket lists */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {isPrivileged && (
                    <div className="bg-amber-50 rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-6">
                        <div>
                            <p className="text-sm text-amber-700 mt-0.5 font-medium">
                                As ADMIN, DATAMANAGER, or EDITOR, you can access all submitted tickets and update their status.
                            </p>
                        </div>
                    </div>
                )}
                {
                    loading ? (
                        <LoadingSpinner title="Loading tickets..." />
                    ) : error ? (
                        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
                    ) : (

                        <div className="space-y-5">
                            <div role="group" aria-label="Filter tickets by status" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {statusOptions.map((status) => {
                                    const isActive = activeStatus === status;
                                    const count = tickets.filter((ticket) => ticket.status === status).length;

                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            aria-pressed={isActive}
                                            onClick={() => setActiveStatus(status)}
                                            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors ${isActive ? STATUS_BADGE_CLASSES[status] : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <span>{STATUS_LABELS[status]}</span>
                                            <span className="text-xs tabular-nums">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <section aria-label={`${STATUS_LABELS[activeStatus]} tickets`} className="space-y-3">
                                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{STATUS_LABELS[activeStatus]}</h2>
                                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                        {visibleTickets.length}
                                    </span>
                                </div>
                                {visibleTickets.length === 0 ? (
                                    <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        No {STATUS_LABELS[activeStatus].toLowerCase()} tickets.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {visibleTickets.map((ticket) => (
                                            <TicketCard key={ticket.id} ticket={ticket} {...sharedProps} />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )
                }
            </div>
        </div >
    );
}
