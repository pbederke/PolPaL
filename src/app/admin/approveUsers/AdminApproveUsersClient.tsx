"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useState, useMemo } from "react";
import SearchInput from "@/components/ui/SearchInput";
import PaginationControls from "@/components/ui/PaginationControls";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleDisplay } from "@/components/ui/RoleName";
import { RoleEnum } from "@/lib/shared/enums";
import { Check, X, Ban, Clock, Users as UsersIcon } from "lucide-react";

interface Users {
  userId: number;
  username: string;
  nameFirst: string;
  nameLast: string;
  email: string;
  emailVerified: boolean;
  role: RoleEnum;
  approvedByAdmin: boolean;
  createdAt: string;
}

export default function AdminUsersApprovalPage() {

  // =====================
  // State & Auth
  // =====================
  const { auth, loadingAuth } = useAuth();
  const [users, setUsers] = useState<Users[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [approvingUser, setApprovingUser] = useState<Users | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleEnum | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [decliningUser, setDecliningUser] = useState<Users | null>(null);
  const [loadingDecline, setLoadingDecline] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineNote, setDeclineNote] = useState("");

  // =====================
  // Effects
  // =====================

  // Fetch all users if user is ADMIN
  useEffect(() => {
    if (loadingAuth) return;
    if (!auth.loggedIn || auth.role !== RoleEnum.ADMIN) {
      if (auth.loggedIn) {
        setError("You do not have access to this page. ADMIN rights required.");
      }
      return;
    }
    const controller = new AbortController();
    async function fetchUsers() {
      setLoadingRequests(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/approveUsers/`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load users to approve.");
        const data = await res.json();
        setUsers(data);
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name === 'AbortError') return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Error fetching users to approve.");
      } finally {
        setLoadingRequests(false);
      }
    }
    fetchUsers();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Close dialogs on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showRoleDialog && !loadingApprove) setShowRoleDialog(false);
      if (showDeclineDialog && !loadingDecline) setShowDeclineDialog(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showRoleDialog, showDeclineDialog, loadingApprove, loadingDecline]);

  // =====================
  // Memoized Data
  // =====================

  // Sort users by userId
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.userId - b.userId);
  }, [users]);

  // Filter users by search string (case-insensitive)
  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return sortedUsers;
    return sortedUsers.filter((i) =>
      [i.nameFirst, i.nameLast, i.email, i.username].some((f) =>
        f?.toLowerCase().includes(s)
      )
    );
  }, [sortedUsers, search]);

  // Pagination calculations
  const pageCount = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredUsers, currentPage]);

  // Handle approve button click
  const handleApproveClick = (user: Users) => {
    setApprovingUser(user);
    setSelectedRole(user.role);
    setShowRoleDialog(true);
  };

  // Confirm approval with selected role
  const handleConfirmApprove = async () => {
    if (!approvingUser || !selectedRole) return;

    setLoadingApprove(true);
    try {
      const res = await fetch(
        `/api/admin/approveUsers/${approvingUser.userId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvedByAdmin: true, role: selectedRole }),
        }
      );

      if (!res.ok) throw new Error("Failed to approve user.");

      // Remove approved user from the list (page only tracks pending requests)
      setUsers((prev) => prev.filter((u) => u.userId !== approvingUser.userId));

      setShowRoleDialog(false);
      setApprovingUser(null);
      setSelectedRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error approving user.");
    } finally {
      setLoadingApprove(false);
    }
  };

  // Handle decline button click — open dialog
  const handleDeclineClick = (user: Users) => {
    setDecliningUser(user);
    setDeclineNote("");
    setShowDeclineDialog(true);
  };

  // Confirm decline with note
  const handleConfirmDecline = async () => {
    if (!decliningUser || !declineNote.trim()) return;

    setLoadingDecline(true);
    try {
      const res = await fetch(
        `/api/admin/approveUsers/${decliningUser.userId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ declineNote: declineNote.trim() }),
        }
      );

      if (!res.ok) throw new Error("Failed to decline user approval.");

      setUsers((prev) => prev.filter(u => u.userId !== decliningUser.userId));
      setShowDeclineDialog(false);
      setDecliningUser(null);
      setDeclineNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error declining user approval.");
    } finally {
      setLoadingDecline(false);
    }
  };

  // =====================
  // Render: Access Denied for non-ADMIN
  // =====================
  if (auth.role !== "ADMIN" && !loadingAuth) {
    return <AccessDenied message="ADMIN rights are required to view and manage users." />;
  }

  // Render loading state
  if (loadingRequests) {
    return <LoadingSpinner title="Loading approval requests..." message="Fetching user approval requests. Please wait a moment." />;
  }

  // Render error state
  if (error) {
    return <ErrorState message="We encountered an issue while loading the user approval requests." error={error} backHref="/" />;
  }

  const pendingCount = users.length;

  // =====================
  // Render: Main Admin Users Table
  // =====================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Approve User Requests" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Approve User Requests</h1>
          <p className="text-gray-500">Review and manage incoming user registration requests.</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="bg-orange-100 rounded-full p-1.5">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-orange-700 leading-none">{pendingCount}</p>
            <p className="text-xs text-orange-600 font-medium mt-0.5">Pending requests</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or username…" />
        </div>

        {/* Result count */}
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
          {filteredUsers.length === users.length
            ? `${filteredUsers.length} request${filteredUsers.length !== 1 ? "s" : ""}`
            : `${filteredUsers.length} of ${users.length} request${users.length !== 1 ? "s" : ""}`}
        </div>

        {/* User Cards */}
        <div className="p-4">
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No requests found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedUsers.map((user) => {
                  const initials = `${user.nameFirst?.[0] ?? ""}${user.nameLast?.[0] ?? ""}`.toUpperCase();
                  return (
                    <div
                      key={user.userId}
                      className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                        user.approvedByAdmin
                          ? "border-green-200 bg-green-50/30"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          user.approvedByAdmin
                            ? "bg-green-100 text-green-700"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {initials || "?"}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="font-semibold text-gray-900 truncate">
                              {user.nameFirst} {user.nameLast}
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                              @{user.username}
                            </span>
                            {user.emailVerified && (
                              <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                <Check className="h-3 w-3" />
                                Verified
                              </span>
                            )}
                            {user.approvedByAdmin ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                <Check className="h-3 w-3" />
                                Approved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>

                        {/* Details + Actions */}
                        <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500 mr-4">
                          <div className="text-center">
                            <p className="font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Role</p>
                            <RoleDisplay userRole={user.role} size="xs" className="font-medium text-gray-700" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Registered</p>
                            <p className="text-gray-700">
                              {new Date(user.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {!user.approvedByAdmin && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApproveClick(user)}
                              disabled={loadingDecline && decliningUser?.userId === user.userId}
                              className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              onClick={() => handleDeclineClick(user)}
                              disabled={loadingDecline && decliningUser?.userId === user.userId}
                              className="flex items-center gap-1.5 bg-white border border-red-300 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {loadingDecline && decliningUser?.userId === user.userId ? (
                                <span className="hidden sm:inline">Declining…</span>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Decline</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <PaginationControls
                  currentPage={currentPage}
                  pageCount={pageCount}
                  onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                />
              </div>
            </>
          )}
        </div>

        {/* Role Selection Dialog */}
        {showRoleDialog && approvingUser && (
          <div aria-hidden="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div role="dialog" aria-modal="true" aria-labelledby="approve-dialog-title" className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 id="approve-dialog-title" className="text-lg font-semibold text-gray-900">Approve User</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Assign a role before approving.</p>
                </div>
                <button
                  onClick={() => setShowRoleDialog(false)}
                  disabled={loadingApprove}
                  aria-label="Close dialog"
                  className="text-gray-400 hover:text-gray-600 rounded-md p-1 hover:bg-gray-100"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {`${approvingUser.nameFirst?.[0] ?? ""}${approvingUser.nameLast?.[0] ?? ""}`.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{approvingUser.nameFirst} {approvingUser.nameLast}</p>
                  <p className="text-xs text-gray-500 truncate">@{approvingUser.username} · {approvingUser.email}</p>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="approve-role-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Role
                </label>
                <select
                  id="approve-role-select"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
                  value={selectedRole ?? ""}
                  onChange={(e) => setSelectedRole(e.target.value as RoleEnum)}
                  disabled={loadingApprove}
                >
                  {Object.values(RoleEnum).filter((role) => role !== RoleEnum.ROBOT).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmApprove}
                  disabled={loadingApprove || !selectedRole}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  {loadingApprove ? "Approving…" : "Confirm Approval"}
                </button>
                <button
                  onClick={() => setShowRoleDialog(false)}
                  disabled={loadingApprove}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decline Dialog */}
        {showDeclineDialog && decliningUser && (
          <div aria-hidden="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div role="dialog" aria-modal="true" aria-labelledby="decline-dialog-title" className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 id="decline-dialog-title" className="text-lg font-semibold text-gray-900">Decline Request</h2>
                  <p className="text-sm text-gray-500 mt-0.5">The user will be notified by email.</p>
                </div>
                <button
                  onClick={() => setShowDeclineDialog(false)}
                  disabled={loadingDecline}
                  aria-label="Close dialog"
                  className="text-gray-400 hover:text-gray-600 rounded-md p-1 hover:bg-gray-100"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {`${decliningUser.nameFirst?.[0] ?? ""}${decliningUser.nameLast?.[0] ?? ""}`.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{decliningUser.nameFirst} {decliningUser.nameLast}</p>
                  <p className="text-xs text-gray-500 truncate">@{decliningUser.username} · {decliningUser.email}</p>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="decline-reason-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for declining <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="decline-reason-textarea"
                  aria-required="true"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 focus:outline-none resize-none"
                  rows={4}
                  maxLength={500}
                  placeholder="Please provide a reason. This will be included in the email sent to the user."
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  disabled={loadingDecline}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{declineNote.length}/500</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDecline}
                  disabled={loadingDecline || !declineNote.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Ban aria-hidden="true" className="h-4 w-4" />
                  {loadingDecline ? "Declining…" : "Confirm Decline"}
                </button>
                <button
                  onClick={() => setShowDeclineDialog(false)}
                  disabled={loadingDecline}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}