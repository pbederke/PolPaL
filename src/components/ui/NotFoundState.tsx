"use client";

import { type ReactNode } from "react";
import Link from "next/link";

interface NotFoundStateProps {
  title: string;
  message: ReactNode;
  backHref?: string;
  backLabel?: string;
  showRetry?: boolean;
}

export default function NotFoundState({
  title,
  message,
  backHref = "/",
  backLabel = "Back to Homepage",
  showRetry = false,
}: NotFoundStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-6">
      <div className="text-yellow-600">
        <svg
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      <p className="text-gray-600 max-w-md">{message}</p>
      <Link
        href={backHref}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
      >
        {backLabel}
      </Link>
      {showRetry && (
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}
