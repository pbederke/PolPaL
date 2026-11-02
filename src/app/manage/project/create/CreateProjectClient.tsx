"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";

interface ProjectFormData {
  projectKey: string | null;
  projectNameShort: string | null;
  projectName: string | null;
  projectUrl?: string | null;
  projectDescription?: string | null;
  isHidden: boolean;
  isHiddenReason?: string | null;
  comment?: string | null;
}

export default function CreateProjectClient() {

  // Initialize router for navigation
  const router = useRouter();

  // Authentication
  const { auth, loadingAuth } = useAuth();

  // State for loading and error handling
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // State for form data
  const [formData, setFormData] = useState<ProjectFormData>({
    projectKey: null,
    projectNameShort: null,
    projectName: null,
    projectUrl: null,
    projectDescription: null,
    isHidden: true,
    isHiddenReason: null,
    comment: null,
  });

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

    try {
      const res = await fetch(`/api/projects/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        // Handle Zod-style validation errors array
        if (Array.isArray(data) && data[0]?.message) {
          throw new Error(data.map((err: { message: string }) => err.message).join("\n"));
        }

        throw new Error(data.message || "Failed to create project");
      }

      router.push(`/data/projects/${formData.projectKey}`);
    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingAuth) {
    return <LoadingSpinner title="Loading..." message="Please wait a moment." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN or DATAMANAGER rights are required to create projects." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: "add" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Create Project
            </h1>
            <p className="text-lg text-gray-600">Add a new data project to the PolPaL database.</p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-8">
          {/* Error Display */}
          {errorSubmit && (
            <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg aria-hidden="true" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errorSubmit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Key */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Key
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 mb-4">
                <label
                  htmlFor="projectKey"
                  className="block text-sm font-medium text-gray-700"
                >
                  Project Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="projectKey"
                  name="projectKey"
                  value={formData?.projectKey ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., ches"
                />
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="space-y-2">
                <label
                  htmlFor="projectNameShort"
                  className="block text-sm font-medium text-gray-700"
                >
                  Short Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="projectNameShort"
                  name="projectNameShort"
                  value={formData?.projectNameShort ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., CHES"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  value={formData?.projectName ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Chapel Hill Expert Survey"
                />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <label
                htmlFor="projectUrl"
                className="block text-sm font-medium text-gray-700"
              >
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="projectUrl"
                name="projectUrl"
                value={formData?.projectUrl ?? ""}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="projectDescription">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="projectDescription"
                name="projectDescription"
                value={formData.projectDescription ?? ""}
                onChange={handleChange}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                placeholder="Describe the research project..."
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
              onClick={() => router.push(`/data/projects`)}
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
              {loadingSubmit ? "Saving…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
