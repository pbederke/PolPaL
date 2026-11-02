import { ExternalLink } from "lucide-react";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  const hasUrl = parts.length > 1;

  if (!hasUrl) {
    return <span>{text}</span>;
  }

  return (
    <span className="break-all">
      {parts.map((part, i) => {
        if (part.startsWith("http://") || part.startsWith("https://")) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part}
              <ExternalLink className="inline-block w-3 h-3 ml-0.5" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
