"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface Users {
  userId: number;
  username: string;
  nameFirst: string;
  nameLast: string;
  email: string;
  role: RoleEnum;
  approvedByAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

const ALL_ROLES: RoleEnum[] = [
  RoleEnum.ADMIN,
  RoleEnum.DATAMANAGER,
  RoleEnum.EDITOR,
  RoleEnum.CONTRIBUTOR,
  RoleEnum.USER,
  RoleEnum.ROBOT,
];

export default function AdminUsersPage() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Users[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingAuth) return;
    if (!auth.loggedIn || auth.role !== RoleEnum.ADMIN) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      fetch(`/api/admin/users?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load users."); return res.json(); })
        .then(({ items, total, pageCount }: { items: Users[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching users."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: Users) => {
    const res = await fetch(`/api/admin/users/${item.userId}`, { method: "DELETE", credentials: "include" });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.userId !== item.userId));
    setTotal((prev) => prev - 1);
  };

  const handleUpdate = (updated: Users) => {
    setItems((prev) => prev.map((i) => (i.userId === updated.userId ? updated : i)));
  };

  const handleCreate = (created: Users) => {
    setItems((prev) => [...prev, created]);
    setTotal((prev) => prev + 1);
  };

  const [showCreate, setShowCreate] = useState(false);

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights are required to view and manage users." />;

  return (
    <>
    {showCreate && (
      <CreateUserModal
        onCreated={(u) => { handleCreate(u); setShowCreate(false); }}
        onClose={() => setShowCreate(false)}
      />
    )}
    <AdminMasterDetail
      title="Users"
      headerAction={
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition"
        >
          + Create user
        </button>
      }
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Users" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.userId}
      getItemLabel={(i) => i.username}
      getSearchText={(i) => [i.username, i.nameFirst, i.nameLast, i.email, i.role].join(" ")}
      renderDetail={(i) => <UserDetail user={i} onUpdated={handleUpdate} />}
      onDelete={handleDelete}
      getDeleteTitle={(i) => `Delete user #${i.userId}?`}
      getDeleteDescription={(i) => `This will permanently delete user "${i.username}" (${i.email}). This action cannot be undone.`}
    />
    </>
  );
}

function CreateUserModal({ onCreated, onClose }: { onCreated: (u: Users) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    username: '',
    nameFirst: '',
    nameLast: '',
    email: '',
    password: '',
    role: RoleEnum.USER as RoleEnum,
    approvedByAdmin: true,
    emailVerified: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.message || 'Create failed.'); return; }
      onCreated(data as Users);
    } catch {
      setSaveError('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-dialog-title"
        className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="create-user-dialog-title" className="text-lg font-semibold text-gray-900">Create user</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="username" id="create-username">
              <input id="create-username" required className={inputClass} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </FormField>
            <FormField label="email" id="create-email">
              <input id="create-email" required type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </FormField>
            <FormField label="nameFirst" id="create-nameFirst">
              <input id="create-nameFirst" required className={inputClass} value={form.nameFirst} onChange={(e) => setForm((f) => ({ ...f, nameFirst: e.target.value }))} />
            </FormField>
            <FormField label="nameLast" id="create-nameLast">
              <input id="create-nameLast" required className={inputClass} value={form.nameLast} onChange={(e) => setForm((f) => ({ ...f, nameLast: e.target.value }))} />
            </FormField>
            <FormField label="password" id="create-password">
              <input id="create-password" required type="password" minLength={8} className={inputClass} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </FormField>
            <FormField label="role" id="create-role">
              <select id="create-role" className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleEnum }))}>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="approvedByAdmin" id="create-approvedByAdmin">
              <select id="create-approvedByAdmin" className={inputClass} value={form.approvedByAdmin ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, approvedByAdmin: e.target.value === 'true' }))}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FormField>
            <FormField label="emailVerified" id="create-emailVerified">
              <select id="create-emailVerified" className={inputClass} value={form.emailVerified ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, emailVerified: e.target.value === 'true' }))}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FormField>
          </div>
          {saveError && <p className="text-sm text-red-600" role="alert">{saveError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {saving ? 'Creating…' : 'Create user'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDetail({ user, onUpdated }: { user: Users; onUpdated: (u: Users) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user.username,
    nameFirst: user.nameFirst,
    nameLast: user.nameLast,
    email: user.email,
    role: user.role,
    approvedByAdmin: user.approvedByAdmin,
    emailVerified: user.emailVerified,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      username: user.username,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      email: user.email,
      role: user.role,
      approvedByAdmin: user.approvedByAdmin,
      emailVerified: user.emailVerified,
    });
    setEditing(false);
    setSaveError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.userId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.message || "Save failed."); return; }
      onUpdated(data as Users);
      setEditing(false);
    } catch {
      setSaveError("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

  if (!editing) {
    return (
      <>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="userId">{user.userId}</Field>
          <Field label="username">{user.username}</Field>
          <Field label="nameFirst">{user.nameFirst}</Field>
          <Field label="nameLast">{user.nameLast}</Field>
          <Field label="email">
            <Link href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</Link>
          </Field>
          <Field label="role">{user.role}</Field>
          <Field label="approvedByAdmin">{user.approvedByAdmin ? "yes" : "no"}</Field>
          <Field label="emailVerified">{user.emailVerified ? "yes" : "no"}</Field>
          <Field label="createdAt">{new Date(user.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(user.updatedAt).toLocaleDateString()}</Field>
        </dl>
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition"
          >
            Edit user
          </button>
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="username" id="edit-username">
          <input
            id="edit-username"
            required
            className={inputClass}
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
        </FormField>
        <FormField label="email" id="edit-email">
          <input
            id="edit-email"
            required
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
        <FormField label="nameFirst" id="edit-nameFirst">
          <input
            id="edit-nameFirst"
            required
            className={inputClass}
            value={form.nameFirst}
            onChange={(e) => setForm((f) => ({ ...f, nameFirst: e.target.value }))}
          />
        </FormField>
        <FormField label="nameLast" id="edit-nameLast">
          <input
            id="edit-nameLast"
            required
            className={inputClass}
            value={form.nameLast}
            onChange={(e) => setForm((f) => ({ ...f, nameLast: e.target.value }))}
          />
        </FormField>
        <FormField label="role" id="edit-role">
          <select
            id="edit-role"
            className={inputClass}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleEnum }))}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </FormField>
        <FormField label="approvedByAdmin" id="edit-approvedByAdmin">
          <select
            id="edit-approvedByAdmin"
            className={inputClass}
            value={form.approvedByAdmin ? "true" : "false"}
            onChange={(e) => setForm((f) => ({ ...f, approvedByAdmin: e.target.value === "true" }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </FormField>
        <FormField label="emailVerified" id="edit-emailVerified">
          <select
            id="edit-emailVerified"
            className={inputClass}
            value={form.emailVerified ? "true" : "false"}
            onChange={(e) => setForm((f) => ({ ...f, emailVerified: e.target.value === "true" }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </FormField>
      </div>
      {saveError && <p className="text-sm text-red-600" role="alert">{saveError}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setSaveError(null); }}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

function FormField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-500 tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

