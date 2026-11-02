"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-6">
      <div className="text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="text-4xl font-bold text-gray-900">Something went wrong</h1>

      <p className="text-gray-500 max-w-md">
        An unexpected error occurred. You can try again or return to the home page.
        {error?.digest && (
          <span className="block mt-2 text-xs text-gray-400 font-mono">
            Error ID: {error.digest}
          </span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <button
          onClick={reset}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
