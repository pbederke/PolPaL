"use client";

import { type ReactNode } from "react";
import Link from "next/link";

interface ErrorStateProps {
  message: ReactNode;
  error?: string | null;
  backHref?: string;
  backLabel?: string;
}

export function ErrorState({
  message,
  error,
  backHref,
  backLabel = "Back to Homepage",
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-6">
      <div className="text-red-600">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-800">
        Oops! Something went wrong.
      </h2>

      <p className="text-gray-600 max-w-md">
        {message}
        {error && (
          <span className="block mt-2 text-sm text-red-500 font-mono">
            Error details: {error}
          </span>
        )}
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
        If the problem persists, please contact the admin.
      </p>
    </div>
  );
}
