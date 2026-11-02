import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "w-full sm:w-64",
  size = "md",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${size === "sm" ? "h-3 w-3" : "h-4 w-4"} text-gray-400`} />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className ? className : ""} w-full border border-gray-300 rounded-lg pl-10 pr-4 ${size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm"} focus:ring-2 focus:ring-primary focus:border-transparent`}
        />
      </div>
    </div>
  );
}
