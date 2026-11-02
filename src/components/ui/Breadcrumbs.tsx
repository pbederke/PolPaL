import Link from "next/link";
import { Fragment } from "react";

export type BreadcrumbItem = {
  label: React.ReactNode;
  href?: string;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4${className ? ` ${className}` : ""}`}
    >
      <div className="flex flex-wrap items-center text-sm text-gray-600 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <span className="mx-2">/</span>}
              {isLast ? (
                <span aria-current="page" className="text-gray-400">{item.label}</span>
              ) : item.href ? (
                <Link href={item.href} className="text-primary hover:underline">
                  {item.label}
                </Link>
              ) : (
                <>{item.label}</>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
