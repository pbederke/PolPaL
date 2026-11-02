"use client";

import Link from "next/link";

interface AccessDeniedProps {
  /** Detail text explaining what permissions are required */
  message: string;
  /** Optional back link href (default: "/") */
  backHref?: string;
  /** Optional back link label (default: "Return to Home") */
  backLabel?: string;
}

export function AccessDenied({
  message,
  backHref = "/",
  backLabel = "Return to Home",
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-6">
      <div className="text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>

      <p className="text-gray-600 max-w-lg">
        You do not have permission to view this page.
        <span className="block mt-2 text-sm text-red-500">{message}</span>
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        {backHref && (
          <Link
            href={backHref}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            {backLabel}
          </Link>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          Retry
        </button>
      </div>

      <p className="text-gray-400 text-sm mt-6">
        If you believe this is an error or you should have access, please contact the administrator.
      </p>
    </div>
  );
}
