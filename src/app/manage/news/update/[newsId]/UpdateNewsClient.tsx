"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ListPlus, Trash2 } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";

interface News {
  id: string;
  title: string;
  content: string;
  links: string[] | null;
  publishedPublicAt: string;
  updatedPublicAt: string;
}

interface NewsFormData {
  title: string;
  content: string;
  links: string[] | null;
  publishedPublicAt: string;
  updatedPublicAt: string;
}

export default function UpdateNewsClient() {

  // Initialize router for navigation
  const router = useRouter();

  // Get newsId from URL params
  const params = useParams();
  const newsId = params.newsId as string;

  // Authentication
  const { auth, loadingAuth } = useAuth();

  // State for project data
  const [, setNews] = useState<News | null>(null);

  // State for loading and error handling
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // State for form data
  const [formData, setFormData] = useState<NewsFormData>({
    title: "",
    content: "",
    links: null,
    publishedPublicAt: "",
    updatedPublicAt: "",
  });

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle link changes
  const handleLinkChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newLinks = prev.links ? [...prev.links] : [];
      newLinks[index] = value;
      return { ...prev, links: newLinks };
    });
  };

  // Remove link but always keep at least 1
  const removeLinkField = (index: number) => {
    setFormData((prev) => {
      if (!prev.links || prev.links.length === 1) return prev;
      const newLinks = prev.links.filter((_, i) => i !== index);
      return { ...prev, links: newLinks };
    });
  };

  // Fetch current project data on load
  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
      setLoadingData(false);
      return;
    }
    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchData() {
      setLoadingData(true);
      setErrorData(null);

      try {
        const newsRes = await fetch(
          `/api/news/${newsId}`,
          {
            credentials: "include",
            signal,
          }
        );

        if (!newsRes.ok) { throw new Error("Failed to fetch news details"); }

        const newsData = await newsRes.json();

        setFormData({
          title: newsData.title || "",
          content: newsData.content || "",
          links: newsData.links || null,
          publishedPublicAt: newsData.publishedPublicAt || "",
          updatedPublicAt: newsData.updatedPublicAt || "",
        });

        setNews(newsData);

      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch data", err);
          setErrorData(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();

    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, [newsId, loadingAuth, auth?.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSubmit(null);
    setLoadingSubmit(true);

    try {
      // Convert date to ISO string if provided
      const payload = {
        ...formData,
        publishedPublicAt: new Date(formData.publishedPublicAt).toISOString(),
        updatedPublicAt: new Date(formData.updatedPublicAt).toISOString(),
      };

      const res = await fetch(`/api/news/${newsId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update news entry");
      }

      router.push(`/documentation/news`);
    } catch (err) {
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Render loading state
  if (loadingData || loadingAuth) {
    return <LoadingSpinner title={<>Loading news entry <em>{newsId}</em>...</>} message="Fetching news data. Please wait a moment." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER or EDITOR rights are required to update news entries." />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading news entry <em>{newsId}</em>.</>} error={errorData} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Update News Entry" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Update News Entry <em>{newsId}</em></h1>
        <p className="text-lg text-gray-600">Modify an existing news article of PolPaL</p>
      </div>

      {/* News Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">News Article Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Enter news article title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="publishedPublicAt">
                Publication Date
              </label>
              <input
                id="publishedPublicAt"
                name="publishedPublicAt"
                type="date"
                required
                value={formData.publishedPublicAt.slice(0, 10)} // Format ISO string to YYYY-MM-DD for date input
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            {/* Date */}
            <div className="space-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="updatedPublicAt">
                Update Date
              </label>
              <input
                id="updatedPublicAt"
                name="updatedPublicAt"
                type="date"
                required
                value={formData.updatedPublicAt.slice(0, 10)} // Format ISO string to YYYY-MM-DD for date input
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="content">
              Content
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              required
              value={formData.content}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-vertical"
              placeholder="Write your news article content here..."
            />
          </div>

          {/* Links */}
          <div className="space-y-4">
            {formData?.links?.map((link, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link {idx + 1}
                  </label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => handleLinkChange(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Enter link..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLinkField(idx)}
                  disabled={formData?.links?.length === 1}
                  className={`p-2 rounded-md transition-colors ${formData?.links?.length === 1
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700"
                    }`}
                  title="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  links: [...(prev?.links || []), ""],
                }))
              }
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ListPlus className="w-4 h-4 mr-2" />
              Add Link
            </button>
          </div>

          {/* Error Display */}
          {errorSubmit && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm font-medium">{errorSubmit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push(`/`)}
              className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 transition-all disabled:opacity-50"
              disabled={loadingSubmit}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loadingSubmit}
            >
              {loadingSubmit ? (
                <>
                  <svg aria-hidden="true" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <ListPlus className="h-4 w-4" />
                  Update News Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
