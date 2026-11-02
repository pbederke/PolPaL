"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";


interface Dataset {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetIsHidden: boolean;
  datasetIsHiddenReason: string | null;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  datasetUrl: string | null;
  datasetDescription: string | null;
  comment: string | null;
}

interface DatasetFormData {
  projectKey: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  datasetUrl: string | null;
  datasetDescription: string | null;
  isHidden: boolean;
  isHiddenReason: string | null;
  comment: string | null;
}

export default function UpdateDatasetClient() {
  const router = useRouter();

  const params = useParams();
  const datasetKey = params.datasetKey as string;

  // Authentication
  const { auth, loadingAuth } = useAuth();

  const [dataset, setDataset] = useState<Dataset | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  const [formData, setFormData] = useState<DatasetFormData>({
    projectKey: "",
    datasetKey,
    datasetNameShort: "",
    datasetName: "",
    datasetUrl: null,
    datasetDescription: null,
    isHidden: false,
    isHiddenReason: null,
    comment: null,
  });

  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
      setLoadingData(false);
      return;
    }
    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchData() {
      setLoadingData(true);
      setErrorData(null);

      try {
        const datasetRes = await fetch(`/api/datasets/${datasetKey}`, { credentials: "include", signal });

        if (!datasetRes.ok) { throw new Error("Failed to fetch dataset details"); }

        const datasetData = await datasetRes.json();

        setFormData({
          projectKey: datasetData.projectKey,
          datasetKey: datasetData.datasetKey,
          datasetNameShort: datasetData.datasetNameShort || "",
          datasetName: datasetData.datasetName || "",
          datasetUrl: datasetData.datasetUrl || null,
          datasetDescription: datasetData.datasetDescription || null,
          isHidden: datasetData.datasetIsHidden ?? false,
          isHiddenReason: datasetData.datasetIsHiddenReason || null,
          comment: datasetData.comment || null,
        });

        setDataset(datasetData);

      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Failed to fetch data", err);
          setErrorData(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [datasetKey, loadingAuth, auth?.role]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      ...(name === "isHidden" && !newValue ? { isHiddenReason: null } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorSubmit(null);
    setLoadingSubmit(true);

    try {
      const res = await fetch(`/api/datasets/${datasetKey}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data) && data[0]?.message) {
          throw new Error(data.map((err: { message: string }) => err.message).join("\n"));
        }
        throw new Error(data.message || "Failed to update dataset");
      }

      router.push(`/data/projects/${formData.projectKey}/${formData.datasetKey}`);
      router.refresh();
    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingData || loadingAuth) {
    return <LoadingSpinner title="Loading dataset..." message="Fetching dataset data. Please wait a moment." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN or DATAMANAGER rights are required to update datasets." />;
  }

  if (errorData) {
    return <ErrorState message="We encountered an issue while loading data." error={errorData} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: dataset?.projectName ?? formData.projectKey, href: `/data/projects/${dataset?.projectKey}` },
        { label: dataset?.datasetNameShort ?? formData.datasetKey, href: `/data/projects/${dataset?.projectKey}/${dataset?.datasetKey}` },
        { label: "update" },
      ]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Update Dataset: {formData.datasetName}</h1>
        <p className="text-lg text-gray-600">Modify the information for {formData.datasetNameShort}.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-8">

          {errorSubmit && (
            <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
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

          {/* Keys */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Keys</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="projectKey">Project Key</label>
                <input
                  readOnly
                  disabled
                  type="text"
                  id="projectKey"
                  name="projectKey"
                  value={formData.projectKey}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
                />
              </div>
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="datasetKey">Dataset Key</label>
                <input
                  readOnly
                  disabled
                  type="text"
                  id="datasetKey"
                  name="datasetKey"
                  value={formData.datasetKey}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Dataset Information */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Dataset Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="datasetNameShort">
                  Short Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="datasetNameShort"
                  name="datasetNameShort"
                  value={formData.datasetNameShort}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., CHES"
                />
              </div>
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="datasetName">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="datasetName"
                  name="datasetName"
                  value={formData.datasetName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Chapel Hill Expert Survey"
                />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="datasetUrl">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="datasetUrl"
                name="datasetUrl"
                value={formData.datasetUrl ?? ""}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="datasetDescription">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="datasetDescription"
                name="datasetDescription"
                value={formData.datasetDescription ?? ""}
                onChange={handleChange}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                placeholder="Description of the dataset..."
              />
            </div>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="comment">
                Comment <span className="text-xs font-normal text-gray-400">(internal)</span>
              </label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment ?? ""}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                placeholder="Internal notes or remarks..."
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Visibility</h2>
            <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                id="isHidden"
                name="isHidden"
                checked={formData.isHidden}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Hidden</span>
                <p className="text-xs text-gray-500 mt-0.5">Not publicly visible in listings and search</p>
              </div>
            </label>
            {formData.isHidden && (
              <div className="space-y-2 mt-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="isHiddenReason">
                  Reason for hiding
                </label>
                <input
                  type="text"
                  id="isHiddenReason"
                  name="isHiddenReason"
                  value={formData.isHiddenReason ?? ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., duplicate, insufficient information..."
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-6 border-t border-gray-200 gap-4">
            <button
              type="button"
              onClick={() => router.push(`/data/projects/${formData.projectKey}/${formData.datasetKey}`)}
              disabled={loadingSubmit}
              className="w-full sm:w-auto px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full sm:w-auto px-5 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loadingSubmit && (
                <svg aria-hidden="true" className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loadingSubmit ? "Saving…" : "Update Dataset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
