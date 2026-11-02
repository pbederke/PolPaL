import { EntityTypesEnum } from "@/lib/shared/enums";

interface EntityTypeBadgeProps {
  entityType: EntityTypesEnum | string | undefined;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function EntityTypeBadge({ entityType, className = "", size = "md" }: EntityTypeBadgeProps) {
  const type = entityType?.toUpperCase();
  
  const getSizeClasses = () => {
    switch (size) {
      case "xs":
        return "px-1 py-0.5 text-xs";
      case "sm":
        return "px-1.5 py-0.5 text-xs";
      case "lg":
        return "px-3 py-1.5 text-sm";
      case "md":
      default:
        return "px-2 py-1 text-xs";
    }
  };
  
  const getBaseClasses = () => `${getSizeClasses()} font-medium rounded-full`;
  
  const getTypeClasses = () => {
    switch (type) {
      case "PARTY":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "GROUPING":
        return "bg-green-100 text-green-800 border border-green-200";
      case "INDEPENDENT":
        return "bg-white-100 text-gray-800 border border-gray-200";
      case "OTHERS":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "RESIDUAL":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "UNKNOWN":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "UNASSIGNED":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-500 border border-gray-200";
    }
  };

  const displayText = type || "—";
  const combinedClasses = `${getBaseClasses()} ${getTypeClasses()} ${className}`.trim();

  return (
    <span className={combinedClasses}>
      {displayText}
    </span>
  );
}