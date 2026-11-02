"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { RoleEnum } from "@/lib/shared/enums";
import { RoleDisplay } from "@/components/ui/RoleName";
import { EntityCard, EntityCardEntity } from "@/components/ui/EntityCard";
import { EntryCard, EntryCardSingleData } from "@/components/ui/EntryCard";

interface User {
  userId: number;
  username: string;
  nameFirst: string;
  nameLast: string;
  email: string;
  role: RoleEnum;
  approvedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { auth, loadingAuth, refreshAuth } = useAuth();
  const userId = auth.userId;

  const [user, setUser] = useState<User | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [entities, setEntities] = useState<EntityCardEntity[]>([]);
  const [entitiesTotal, setEntitiesTotal] = useState(0);
  const [loadingEntities, setLoadingEntities] = useState(false);

  interface UserLink { linkEntriesToEntityId: number; entry: EntryCardSingleData; entity: EntityCardEntity; startYear?: number | null; startMonth?: number | null; startDay?: number | null; endYear?: number | null; endMonth?: number | null; endDay?: number | null; }
  const [links, setLinks] = useState<UserLink[]>([]);
  const [linksTotal, setLinksTotal] = useState(0);
  const [loadingLinks, setLoadingLinks] = useState(false);

  type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  interface Ticket { id: number; title: string; description: string; url: string | null; status: TicketStatus; createdAt: string; updatedAt: string; }
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  type ValidationStatus = 'APPROVED' | 'REJECTED' | 'NONE';
  interface ValidatedLink { validationId: number; validated: ValidationStatus; comment: string | null; linkEntriesToEntityId: number; entry: EntryCardSingleData; entity: EntityCardEntity; startYear?: number | null; startMonth?: number | null; startDay?: number | null; endYear?: number | null; endMonth?: number | null; endDay?: number | null; }
  const [validatedLinks, setValidatedLinks] = useState<ValidatedLink[]>([]);
  const [validatedLinksTotal, setValidatedLinksTotal] = useState(0);
  const [loadingValidatedLinks, setLoadingValidatedLinks] = useState(false);

  useEffect(() => {
    if (loadingAuth) return;

    if (!auth.loggedIn || !userId) {
      setErrorData("You do not have access to this page. Please log in.");
      setLoadingData(false);
      return;
    }

    const abortController = new AbortController();
    setErrorData(null);
    setLoadingData(true);

    async function fetchUser() {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          credentials: "include",
          signal: abortController.signal,
        });
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          throw new Error(`Failed to load user data: ${errorText}`);
        }
        setUser(await res.json());
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setErrorData(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        if (!abortController.signal.aborted) setLoadingData(false);
      }
    }

    fetchUser();
    return () => abortController.abort();
  }, [auth.loggedIn, userId, loadingAuth]);

  useEffect(() => {
    if (!userId || !user) return;
    setLoadingEntities(true);
    fetch(`/api/users/${userId}/entities?limit=3`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : { items: [], total: 0 })
      .then((data: { items: EntityCardEntity[]; total: number }) => { setEntities(data.items); setEntitiesTotal(data.total); })
      .catch(() => setEntities([]))
      .finally(() => setLoadingEntities(false));
  }, [userId, user]);

  useEffect(() => {
    if (!userId || !user) return;
    setLoadingLinks(true);
    fetch(`/api/users/${userId}/links?limit=2`, { credentials: "include" }).then((r) => r.ok ? r.json() : { items: [], total: 0 })
      .then((data: { items: { linkEntriesToEntityId: number; startYear?: number | null; startMonth?: number | null; startDay?: number | null; endYear?: number | null; endMonth?: number | null; endDay?: number | null; Entries: Record<string, unknown>; Entities: EntityCardEntity }[]; total: number }) => {
        setLinksTotal(data.total);
        setLinks(
          data.items.map((l) => ({
            linkEntriesToEntityId: l.linkEntriesToEntityId,
            entry: {
              type: "single" as const,
              entryId: String((l.Entries as { entryId: number }).entryId),
              entryEntityIdVar: (l.Entries as { entryEntityIdVar: string }).entryEntityIdVar,
              entryEntityId: (l.Entries as { entryEntityId: string }).entryEntityId,
              entryEntityNameShort: (l.Entries as { entryEntityNameShort?: string | null }).entryEntityNameShort,
              entryEntityNameEnglish: (l.Entries as { entryEntityNameEnglish?: string | null }).entryEntityNameEnglish,
              entryEntityName: (l.Entries as { entryEntityName?: string | null }).entryEntityName,
              year: (l.Entries as { entryYear?: number | null }).entryYear,
              month: (l.Entries as { entryMonth?: number | null }).entryMonth,
              day: (l.Entries as { entryDay?: number | null }).entryDay,
              additionalInformation: (l.Entries as { additionalInformation?: string | null }).additionalInformation,
            },
            entity: l.Entities,
            startYear: l.startYear,
            startMonth: l.startMonth,
            startDay: l.startDay,
            endYear: l.endYear,
            endMonth: l.endMonth,
            endDay: l.endDay,
          }))
        );
      })
      .catch(() => setLinks([]))
      .finally(() => setLoadingLinks(false));
  }, [userId, user]);

  useEffect(() => {
    if (!userId || !user) return;
    setLoadingValidatedLinks(true);
    fetch(`/api/users/${userId}/validated-links?limit=2`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { items: [], total: 0 })
      .then((data: { items: { validationId: number; validated: ValidationStatus; comment: string | null; Link: { linkEntriesToEntityId: number; startYear?: number | null; startMonth?: number | null; startDay?: number | null; endYear?: number | null; endMonth?: number | null; endDay?: number | null; Entries: Record<string, unknown>; Entities: EntityCardEntity } }[]; total: number }) => {
        setValidatedLinksTotal(data.total);
        setValidatedLinks(
          data.items.map((r) => ({
            validationId: r.validationId,
            validated: r.validated,
            comment: r.comment,
            linkEntriesToEntityId: r.Link.linkEntriesToEntityId,
            entry: {
              type: 'single' as const,
              entryId: String((r.Link.Entries as { entryId: number }).entryId),
              entryEntityIdVar: (r.Link.Entries as { entryEntityIdVar: string }).entryEntityIdVar,
              entryEntityId: (r.Link.Entries as { entryEntityId: string }).entryEntityId,
              entryEntityNameShort: (r.Link.Entries as { entryEntityNameShort?: string | null }).entryEntityNameShort,
              entryEntityNameEnglish: (r.Link.Entries as { entryEntityNameEnglish?: string | null }).entryEntityNameEnglish,
              entryEntityName: (r.Link.Entries as { entryEntityName?: string | null }).entryEntityName,
              year: (r.Link.Entries as { entryYear?: number | null }).entryYear,
              month: (r.Link.Entries as { entryMonth?: number | null }).entryMonth,
              day: (r.Link.Entries as { entryDay?: number | null }).entryDay,
              additionalInformation: (r.Link.Entries as { additionalInformation?: string | null }).additionalInformation,
            },
            entity: r.Link.Entities,
            startYear: r.Link.startYear,
            startMonth: r.Link.startMonth,
            startDay: r.Link.startDay,
            endYear: r.Link.endYear,
            endMonth: r.Link.endMonth,
            endDay: r.Link.endDay,
          }))
        );
      })
      .catch(() => setValidatedLinks([]))
      .finally(() => setLoadingValidatedLinks(false));
  }, [userId, user]);

  useEffect(() => {
    if (!userId || !user) return;
    setLoadingTickets(true);
    fetch('/api/report-tickets', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : [])
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [userId, user]);

  const handleLogout = async () => {
    await fetch("/api/authentication/logout", { method: "POST", credentials: "include" });
    await refreshAuth();
    router.push("/");
  };

  const handlePasswordReset = async () => {
    if (!user) return;
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      const res = await fetch("/api/authentication/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        setResetSuccess(true);
      } else {
        const data = await res.json();
        setResetError(data.message || "Failed to send reset link.");
      }
    } catch {
      setResetError("An error occurred. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loadingAuth) return <LoadingSpinner title="Authenticating user..." message="Please wait a moment." />;
  if (loadingData) return <LoadingSpinner title="Loading user data..." message="Fetching user data. Please wait a moment." />;
  if (errorData || !user) {
    const isSessionError = errorData?.includes("session has expired") || errorData?.includes("log in");
    return (
      <ErrorState
        message="We encountered an issue while loading the user data."
        error={errorData}
        backHref={isSessionError ? "/authentication/login" : "/"}
        backLabel={isSessionError ? "Go to Login" : "Back to Homepage"}
      />
    );
  }

  const roleColors: Record<RoleEnum, string> = {
    [RoleEnum.ADMIN]: "bg-purple-100 text-purple-800",
    [RoleEnum.DATAMANAGER]: "bg-blue-100 text-blue-800",
    [RoleEnum.EDITOR]: "bg-yellow-100 text-yellow-800",
    [RoleEnum.CONTRIBUTOR]: "bg-green-100 text-green-800",
    [RoleEnum.USER]: "bg-gray-100 text-gray-800",
    [RoleEnum.ROBOT]: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: `Profile` },
      ]} />

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-row items-center gap-5 flex-1 min-w-0">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/30 to-primary rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
            {user.nameFirst.charAt(0)}{user.nameLast.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user.nameFirst} {user.nameLast}</h1>
            <p className="text-gray-500 text-sm mb-3">@{user.username}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sm:self-start px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Logout
        </button>
      </div>

      {/* Account details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Account Information</h2>
        </div>

        <dl className="divide-y divide-gray-100 grid sm:grid-cols-2">
          {[
            {
              label: "Full Name", value: `${user.nameFirst} ${user.nameLast}`, icon: (
                <svg aria-hidden="true" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )
            },
            {
              label: "Email", value: user.email, icon: (
                <svg aria-hidden="true" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              )
            },
            {
              label: "Username", value: `@${user.username}`, icon: (
                <svg aria-hidden="true" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-start gap-3 px-6 py-3.5">
              <div className="shrink-0 w-5 flex justify-center mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
                <dd className="text-sm text-gray-900 font-medium break-all mt-0.5">{value}</dd>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-3 px-6 py-3.5">
            <div className="shrink-0 w-5 flex justify-center mt-0.5">
              <svg aria-hidden="true" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] ?? "bg-gray-100 text-gray-800"}`}>
                  <RoleDisplay userRole={user.role} />
                </span>
              </dd>
            </div>
          </div>
        </dl>

        <div className="px-6 py-5 bg-gray-50 border-t border-gray-100">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <svg aria-hidden="true" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Password</h3>
              <p className="text-sm text-gray-500 mb-4">
                A reset link will be sent to <span className="font-medium text-gray-700">{user.email}</span>.
              </p>
              {resetSuccess ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  <svg aria-hidden="true" className="w-4 h-4 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Reset link sent! Check your inbox.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {resetLoading ? (
                      <>
                        <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      "Send password reset link"
                    )}
                  </button>
                  {resetError && (
                    <p role="alert" className="mt-3 text-sm text-red-600">{resetError}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Open tickets */}
      {(() => {
        const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Open Tickets
                {!loadingTickets && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({openTickets.length})</span>
                )}
              </h2>
              {!loadingTickets && tickets.length > 0 && (
                <a href="/user/tickets" className="text-sm text-primary hover:underline">
                  View all ({tickets.length})
                </a>
              )}
            </div>
            {loadingTickets ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : openTickets.length === 0 ? (
              <p className="text-sm text-gray-500">No open tickets.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {openTickets.slice(0, 3).map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900 leading-snug">{ticket.title}</span>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {ticket.status === 'OPEN' ? 'Open' : 'In Progress'}
                      </span>
                    </div>
                    {ticket.description && (
                      <p className="mt-1 text-gray-500 line-clamp-2">{ticket.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Created entities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Created Entities
            {!loadingEntities && (
              <span className="ml-2 text-xs font-normal text-gray-400">({entitiesTotal})</span>
            )}
          </h2>
          {!loadingEntities && entitiesTotal > 4 && (
            <a href="/user/created-entities" className="text-sm text-primary hover:underline">
              View all ({entitiesTotal})
            </a>
          )}
        </div>
        {loadingEntities ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : entities.length === 0 ? (
          <p className="text-sm text-gray-500">No entities created yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {entities.map((entity, index) => (
              <div key={entity.polpalId} className={index > 0 ? "hidden sm:block" : undefined}>
                <EntityCard entity={entity} showLogo isLoggedIn={auth.loggedIn} hideAppearance />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Created links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Created Links
            {!loadingLinks && (
              <span className="ml-2 text-xs font-normal text-gray-400">({linksTotal})</span>
            )}
          </h2>
          {!loadingLinks && linksTotal > 2 && (
            <a href="/user/linked-entities" className="text-sm text-primary hover:underline">
              View all ({linksTotal})
            </a>
          )}
        </div>
        {loadingLinks ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-gray-500">No links created yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {links.map((link, index) => (
              <div key={link.linkEntriesToEntityId} className={index > 0 ? "hidden sm:grid rounded-lg border border-gray-200 p-3 sm:grid-cols-2 sm:gap-3 sm:border-0 sm:p-0 sm:rounded-none" : "rounded-lg border border-gray-200 p-3 flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:border-0 sm:p-0 sm:rounded-none"}>
                <EntryCard entry={link.entry} />
                <div className="flex items-center gap-2 sm:hidden">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 shrink-0">linked to</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                <EntityCard
                  entity={link.entity}
                  showLogo
                  isLoggedIn={auth.loggedIn}
                  hideAppearance
                  observationDates={[{ year: link.entry.year, month: link.entry.month, day: link.entry.day }]}
                  linkStart={!link.entry.year ? { year: link.startYear, month: link.startMonth, day: link.startDay } : undefined}
                  linkEnd={!link.entry.year ? { year: link.endYear, month: link.endMonth, day: link.endDay } : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validated links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Validated Links
            {!loadingValidatedLinks && (
              <span className="ml-2 text-xs font-normal text-gray-400">({validatedLinksTotal})</span>
            )}
          </h2>
          {!loadingValidatedLinks && validatedLinksTotal > 2 && (
            <a href="/user/validated-links" className="text-sm text-primary hover:underline">
              View all ({validatedLinksTotal})
            </a>
          )}
        </div>
        {loadingValidatedLinks ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : validatedLinks.length === 0 ? (
          <p className="text-sm text-gray-500">No validated links yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {validatedLinks.map((link, index) => (
              <div key={link.validationId} className={index > 0 ? "hidden sm:grid rounded-lg border border-gray-200 p-3 sm:grid-cols-2 sm:gap-3 sm:border-0 sm:p-0 sm:rounded-none" : "rounded-lg border border-gray-200 p-3 flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:border-0 sm:p-0 sm:rounded-none"}>
                <EntryCard entry={link.entry} />
                <div className="flex items-center gap-2 sm:hidden">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 shrink-0">linked to</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                <EntityCard
                  entity={link.entity}
                  showLogo
                  isLoggedIn={auth.loggedIn}
                  hideAppearance
                  observationDates={[{ year: link.entry.year, month: link.entry.month, day: link.entry.day }]}
                  linkStart={!link.entry.year ? { year: link.startYear, month: link.startMonth, day: link.startDay } : undefined}
                  linkEnd={!link.entry.year ? { year: link.endYear, month: link.endMonth, day: link.endDay } : undefined}
                  validation={{
                    isCreator: false,
                    approvedCount: link.validated === 'APPROVED' ? 1 : 0,
                    rejectedCount: link.validated === 'REJECTED' ? 1 : 0,
                    currentUserVote: link.validated,
                    commentsWithVotes: link.comment ? [{ userId: auth.userId ? Number(auth.userId) : null, verified: link.validated, comment: link.comment, updatedAt: '', observationDate: { year: link.entry.year, month: link.entry.month, day: link.entry.day } }] : [],
                    submitting: false,
                    currentUserId: auth.userId ? Number(auth.userId) : null,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technical details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 list-none">
            <span>Technical Details</span>
            <svg aria-hidden="true" className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <dl className="mt-4 text-xs text-gray-600 space-y-1">
            <div><span className="font-medium">User ID:</span> {user.userId}</div>
            <div><span className="font-medium">Created:</span> {user.createdAt}</div>
            <div><span className="font-medium">Updated:</span> {user.updatedAt}</div>
          </dl>
        </details>
      </div>
    </div>
  );
}

