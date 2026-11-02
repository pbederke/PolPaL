"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";


interface DatasetFormData {
  projectKey: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  datasetUrl: string;
  datasetDescription: string;
  isHidden: boolean;
  isHiddenReason?: string | null;
  comment?: string | null;
}

type Project = {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
};

export default function CreateDatasetClient() {
  // Initialize router for navigation
  const router = useRouter();

  // Authentication
  const { auth, loadingAuth } = useAuth();

  // Get projectKey from URL params
  const searchParams = useSearchParams();
  const projectKey = searchParams.get("projectKey") ?? "";

  // State for project data
  const [project, setProject] = useState<Project | null>(null);

  // State for loading and error handling
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // State for form data
  const [formData, setFormData] = useState<DatasetFormData>({
    projectKey,
    datasetKey: "",
    datasetNameShort: "",
    datasetName: "",
    datasetUrl: "",
    datasetDescription: "",
    isHidden: true,
    isHiddenReason: null,
    comment: null,
  });

  // Fetch project data on load
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
        const projectRes = await fetch(`/api/projects/${projectKey}`, {
          credentials: "include",
          signal,
        });

        if (!projectRes.ok) throw new Error("Failed to fetch project data");

        const projectData = await projectRes.json();
        setProject(projectData);
        setFormData((prev) => ({ ...prev, projectKey: projectData.projectKey }));
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
  }, [projectKey, loadingAuth, auth?.role]);

  // Handle form input changes
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSubmit(null);
    setLoadingSubmit(true);

    // Combine projectKey and datasetKey to create a unique datasetKey
    const uniqueDatasetKey = `${formData.projectKey}-${formData.datasetKey}`;
    const payload = { ...formData, datasetKey: uniqueDatasetKey };

    try {
      const res = await fetch(`/api/datasets/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data) && data[0]?.message) {
          throw new Error(data.map((err: { message: string }) => err.message).join("\n"));
        }
        throw new Error(data.message || "Failed to create dataset");
      }

      router.push(`/data/projects/${payload.projectKey}/${uniqueDatasetKey}`);
    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Render loading state
  if (loadingData || loadingAuth) {
    return <LoadingSpinner title="Loading data..." message="Fetching data. Please wait a moment." />;
  }

  // Render access denied state
  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN or DATAMANAGER rights are required to create datasets." />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message="We encountered an issue while loading data." error={errorData} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: project?.projectNameShort ?? projectKey, href: `/data/projects/${project?.projectKey}` },
        { label: "add dataset" },
      ]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Add New Dataset</h1>
        <p className="text-lg text-gray-600">Create a new dataset within the {project?.projectNameShort || "project"} research project.</p>
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
                <label className="block text-sm font-medium text-gray-700" htmlFor="projectKey">
                  Project Key
                </label>
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
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="datasetKey">
                  Dataset Key <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500 font-mono text-sm">
                    {formData.projectKey}-
                  </span>
                  <input
                    type="text"
                    id="datasetKey"
                    name="datasetKey"
                    value={formData.datasetKey}
                    onChange={handleChange}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                    placeholder="e.g., 2024"
                  />
                </div>
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
                  placeholder="e.g., CHES 2024"
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
                  placeholder="e.g., 2024 Chapel Hill Expert Survey"
                />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="datasetUrl">
                URL
              </label>
              <input
                type="url"
                id="datasetUrl"
                name="datasetUrl"
                value={formData.datasetUrl ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="datasetDescription">
                Description
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
              onClick={() => router.push(`/data/projects/${formData.projectKey}`)}
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
              {loadingSubmit ? "Saving…" : "Create Dataset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}