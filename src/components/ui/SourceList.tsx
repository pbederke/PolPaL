interface SourceListProps {
  sources: string[] | null | undefined;
  /** Classes applied to each source span */
  itemClassName?: string;
  /** Fallback when sources is empty/null (default: "-") */
  fallback?: React.ReactNode;
}

export default function SourceList({
  sources,
  itemClassName,
  fallback = "-",
}: SourceListProps) {
  if (!sources || sources.length === 0) return <>{fallback}</>;

  return (
    <div className="flex flex-col gap-1">
      {sources.map((src, i) => (
        <span key={i} className={itemClassName}>
          {src}
        </span>
      ))}
    </div>
  );
}
