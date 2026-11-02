"use client";

interface PaginationControlsProps {
  currentPage: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  /** "simple" = compact text style; "enhanced" = highlighted page badge (default) */
  variant?: "simple" | "enhanced";
  /** Extra classes for the wrapper div (e.g. "border-t border-gray-100") */
  className?: string;
}

export default function PaginationControls({
  currentPage,
  pageCount,
  onPrev,
  onNext,
  variant = "enhanced",
  className = "",
}: PaginationControlsProps) {
  if (variant === "simple") {
    return (
      <div className={`flex justify-center items-center gap-2 py-4 text-xs ${className}`}>
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {pageCount}
        </span>
        <button
          onClick={onNext}
          disabled={currentPage === pageCount}
          className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center gap-3 py-4 ${className}`}>
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
      >
        Previous
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Page</span>
        <span className="px-2 py-1 bg-primary text-white rounded-lg text-xs font-medium">
          {currentPage}
        </span>
        <span className="text-xs text-gray-600">of {pageCount}</span>
      </div>

      <button
        onClick={onNext}
        disabled={currentPage === pageCount}
        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
      >
        Next
      </button>
    </div>
  );
}
