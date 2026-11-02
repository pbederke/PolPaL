"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";

interface Variable {
  variableId: number;
  entryEntityIdVar: string;
  varTitle: string;
  varContent: string;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
}

interface VersionInfo {
  projectKey: string;
  datasetKey: string;
  versionKey: string;
  version: string;
  versionName: string | null;
  datasetNameShort: string | null;
  projectName: string | null;
}

interface FormData {
  entryEntityIdVar: string;
  varTitle: string;
  varContent: string;
}

export default function CreateVariableClient() {
  const router = useRouter();
  const params = useParams();
  const versionKey = params.versionKey as string;

  const { auth, loadingAuth } = useAuth();

  const [variables, setVariables] = useState<Variable[]>([]);
  const [availableVars, setAvailableVars] = useState<string[]>([]);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    entryEntityIdVar: "",
    varTitle: "",
    varContent: "",
  });

  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? "")) {
      setLoadingData(false);
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchData() {
      setLoadingData(true);
      setErrorData(null);

      try {
        const [varsRes, versionRes] = await Promise.all([
          fetch(`/api/variables/${versionKey}`, { credentials: "include", signal }),
          fetch(`/api/versions/${versionKey}`, { credentials: "include", signal }),
        ]);

        if (!varsRes.ok) throw new Error(await varsRes.text());
        if (!versionRes.ok) throw new Error(await versionRes.text());

        const { variables: vars, availableVars: avail } = await varsRes.json();
        const version = await versionRes.json();

        setVariables(vars);
        setAvailableVars(avail);
        setVersionInfo(version);

        if (avail.length > 0) {
          setFormData((prev) => ({ ...prev, entryEntityIdVar: avail[0] }));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setErrorData(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        if (!abortController.signal.aborted) setLoadingData(false);
      }
    }

    fetchData();
    return () => abortController.abort();
  }, [versionKey, loadingAuth, auth?.role]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorSubmit(null);
    setLoadingSubmit(true);

    try {
      const res = await fetch(`/api/variables/${versionKey}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create variable");
      }

      const backPath = versionInfo
        ? `/data/projects/${versionInfo.projectKey}/${versionInfo.datasetKey}/${versionKey}`
        : `/data/projects`;

      router.push(backPath);
      router.refresh();
    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingData || loadingAuth) {
    return <LoadingSpinner title="Loading data..." message="Fetching variable information. Please wait." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? "")) {
    return <AccessDenied message="ADMIN or DATAMANAGER rights are required to add variable information." />;
  }

  if (errorData) {
    return <ErrorState message="We encountered an issue while loading data." error={errorData} />;
  }

  const backHref = versionInfo
    ? `/data/projects/${versionInfo.projectKey}/${versionInfo.datasetKey}/${versionKey}`
    : `/data/projects`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        ...(versionInfo ? [
          { label: versionInfo.projectName ?? versionInfo.projectKey, href: `/data/projects/${versionInfo.projectKey}` },
          { label: versionInfo.datasetNameShort ?? versionInfo.datasetKey, href: `/data/projects/${versionInfo.projectKey}/${versionInfo.datasetKey}` },
          { label: versionInfo.versionName ? `${versionInfo.versionName}: ${versionInfo.version}` : versionInfo.version, href: backHref },
        ] : [{ label: versionKey, href: backHref }]),
        { label: "Add Variable Information" },
      ]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Add Variable Information</h1>
        <p className="text-lg text-gray-600">
          Document an <code className="text-sm bg-gray-100 px-1 rounded">entryEntityIdVar</code> variable for version{" "}
          <strong>{versionKey}</strong>.
        </p>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Variable</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorSubmit && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg aria-hidden="true" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 whitespace-pre-line">{errorSubmit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Variable selector */}
          <div>
            <label htmlFor="entryEntityIdVar" className="block text-sm font-medium text-gray-700 mb-1">
              Variable <span className="text-red-500">*</span>
            </label>
            {availableVars.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                All variables for this version already have documentation.
              </p>
            ) : (
              <select
                id="entryEntityIdVar"
                name="entryEntityIdVar"
                value={formData.entryEntityIdVar}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {availableVars.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Only variables without existing documentation are listed.
            </p>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="varTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="varTitle"
              type="text"
              name="varTitle"
              value={formData.varTitle}
              onChange={handleChange}
              required
              placeholder="Title of this variable (not a code, but a human-friendly name)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="varContent" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="varContent"
              name="varContent"
              value={formData.varContent}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Preferably description taken from the codebook. Include source if possible, e.g.m (V-Dem Codebook v16 - March 2026, https://www.v-dem.net/documents/70/codebook_v16.pdf, accessed 2026-05-22])."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loadingSubmit || availableVars.length === 0}
              className="px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSubmit ? "Saving…" : "Save Variable"}
            </button>
            <a
              href={backHref}
              className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>

      {/* Existing Variables */}
      {variables.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Existing Variable Documentation ({variables.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {variables.map((v) => (
              <div key={v.variableId} className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                    {v.entryEntityIdVar}
                  </code>
                  <span className="text-sm font-semibold text-gray-900">{v.varTitle}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.varContent}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Created {new Date(v.createdAt).toISOString().split("T")[0]}
                  {v.createdAt !== v.updatedAt && ` · Updated ${new Date(v.updatedAt).toISOString().split("T")[0]}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
