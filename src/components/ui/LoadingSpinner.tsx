import { type ReactNode } from "react";

export function LoadingSpinner({
  title,
  message,
}: {
  title: ReactNode;
  message?: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-label={typeof title === 'string' ? title : 'Loading'} className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-6">
      <div className="text-primary">
        <svg
          aria-hidden="true"
          className="animate-spin h-12 w-12 mx-auto mb-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      {message && <p className="text-gray-600">{message}</p>}
    </div>
  );
}
