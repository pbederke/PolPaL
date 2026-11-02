import React, { useState } from "react";
import Image from "next/image";
import * as Flags from "country-flag-icons/react/3x2";

interface CountryFlagProps {
  iso2c?: string | null;
  countrycodePolpal?: string | null;
  countryname: string;
  size?: number;
}

const CountryFlag: React.FC<CountryFlagProps> = ({
  iso2c,
  countrycodePolpal,
  countryname,
  size = 40,
}) => {
  const [localError, setLocalError] = useState(false);

  const height = Math.round(size * 0.67);

  // Use country-flag-icons React component when iso2c is available
  if (iso2c) {
    const upperIso = iso2c.toUpperCase() as keyof typeof Flags;
    const FlagComponent = Flags[upperIso];
    if (FlagComponent) {
      return (
        <FlagComponent
          title={`Flag of ${countryname}`}
          width={size}
          height={height}
          className="inline-block rounded shadow"
        />
      );
    }
  }

  // Fallback: local countrycodePolpal flag, then world flag
  const localSrc = countrycodePolpal
    ? `/images/flags/${countrycodePolpal.toLowerCase()}.svg`
    : null;
  const worldFallback = "/images/flags/World_Flag_(2004).svg";

  return (
    <Image
      src={!localError && localSrc ? localSrc : worldFallback}
      alt={`Flag of ${countryname}`}
      width={size}
      height={height}
      className="inline-block rounded shadow"
      unoptimized
      onError={() => setLocalError(true)}
    />
  );
};

export default React.memo(CountryFlag);