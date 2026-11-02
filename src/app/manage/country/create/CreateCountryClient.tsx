"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  RegionEnum,
  RegionEnumType,
  RegionIntermediateEnumType,
  RegionSubEnumType,
  RoleEnum
} from "@/lib/shared/enums";
import {
  REGION_CODES,
  REGION_MAP,
  REGIONINTERMEDIATE_CODES,
  REGIONSUB_CODES,
  REGIONSUB_MAP,
} from "@/lib/shared/mapping";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { useAuth } from "@/context/AuthContext";

interface CountryFormData {
  countrycodePolpal: string;
  isCountry: boolean;
  iso2c: string;
  iso3c: string;
  iso3n: string;
  countryname: string;
  region: RegionEnumType | "";
  regionCode: string;
  regionSub: RegionSubEnumType | "";
  regionSubCode: string;
  regionIntermediate: RegionIntermediateEnumType | "";
  regionIntermediateCode: string;
}

export default function CreateCountryClient() {

  // Initialize router for navigation
  const router = useRouter();

  // Authentication check
  const { auth, loadingAuth } = useAuth();

  // State for loading and error handling 
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // State for form data
  const [formData, setFormData] = useState<CountryFormData>({
    countrycodePolpal: "",
    isCountry: true,
    iso2c: "",
    iso3c: "",
    iso3n: "",
    countryname: "",
    region: "",
    regionCode: "",
    regionSub: "",
    regionSubCode: "",
    regionIntermediate: "",
    regionIntermediateCode: "",
  });

  // Handle form submission
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorSubmit(null);
    setLoadingSubmit(true);

    try {
      const createData = {
        countrycodePolpal: formData.countrycodePolpal.trim(),
        isCountry: formData.isCountry,
        countryname: formData.countryname.trim(),
        iso2c: formData.iso2c?.trim() === "" ? null : formData.iso2c,
        iso3c: formData.iso3c?.trim() === "" ? null : formData.iso3c,
        iso3n: formData.iso3n ? parseInt(formData.iso3n, 10) : null,
        region: formData.region as RegionEnumType,
        regionCode: formData.regionCode
          ? parseInt(formData.regionCode, 10)
          : null,
        regionSub: formData.regionSub as RegionSubEnumType,
        regionSubCode: formData.regionSubCode
          ? parseInt(formData.regionSubCode, 10)
          : null,
        regionIntermediate: formData.regionIntermediate
          ? (formData.regionIntermediate as RegionIntermediateEnumType)
          : null,
        regionIntermediateCode:
          formData.regionIntermediateCode &&
            formData.regionIntermediateCode !== ""
            ? parseInt(formData.regionIntermediateCode, 10)
            : null,
      };

      const createdRes = await fetch(`/api/countries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      });

      if (!createdRes.ok) {
        const errorText = await createdRes.text();

        if (createdRes.status === 401) {
          throw new Error("Unauthorized - Please log in as an admin");
        } else if (createdRes.status === 403) {
          throw new Error("Forbidden - Admin access required");
        } else {
          throw new Error(`Failed to create country: ${errorText}`);
        }
      }

      const countrycodePolpal = formData.countrycodePolpal.trim();

      setFormData({
        countrycodePolpal: "",
        isCountry: true,
        iso2c: "",
        iso3c: "",
        iso3n: "",
        countryname: "",
        region: "",
        regionCode: "",
        regionSub: "",
        regionSubCode: "",
        regionIntermediate: "",
        regionIntermediateCode: "",
      });

      router.push(`/data/countries/${countrycodePolpal}`);
    } catch (err: unknown) {
      setErrorSubmit(err instanceof Error ? err.message : "Failed to create country");
    } finally {
      setLoadingSubmit(false);
    }
  }

  // Handle form field changes
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    if (name === "region") {
      const regionCode = REGION_CODES[value] ?? "";
      setFormData((prev) => ({
        ...prev,
        region: value as RegionEnumType,
        regionCode: regionCode.toString(),
        regionSub: "",
        regionSubCode: "",
        regionIntermediate: "",
        regionIntermediateCode: "",
      }));
    } else if (name === "regionSub") {
      const subCode = REGIONSUB_CODES[value] ?? "";
      setFormData((prev) => ({
        ...prev,
        regionSub: value as RegionSubEnumType,
        regionSubCode: subCode.toString(),
        regionIntermediate: "",
        regionIntermediateCode: "",
      }));
    } else if (name === "regionIntermediate") {
      const intermediateCode = REGIONINTERMEDIATE_CODES[value] ?? "";
      setFormData((prev) => ({
        ...prev,
        regionIntermediate: value as RegionIntermediateEnumType,
        regionIntermediateCode: intermediateCode.toString(),
      }));
    } else if (name === "isCountry") {
      setFormData((prev) => ({
        ...prev,
        isCountry: value === "true", // converts "true"/"false" string to boolean
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  // Render loading state
  if (loadingAuth) {
    return <LoadingSpinner title="Loading countries..." message="Fetching country data. Please wait a moment." />;
  }

  // Render access denied state
  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER or EDITOR rights are required to create PolPaL countries." />;
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: "create" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Create Country
            </h1>
            <p className="text-lg text-gray-600">Add a new country or territory to the PolPaL database.</p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-8">
          {/* Error Display */}
          {errorSubmit && (
            <div role="alert" className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg aria-hidden="true" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errorSubmit}</p>
                </div>
              </div>
            </div>
          )}

          {/* General Information Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">
              General Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Country Code */}
              <div className="space-y-2">
                <label
                  htmlFor="countrycodePolpal"
                  className="block text-sm font-medium text-gray-700"
                >
                  Country Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="countrycodePolpal"
                  name="countrycodePolpal"
                  value={formData.countrycodePolpal}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., USA"
                />
                <p className="text-xs text-gray-500">
                  Three letter country code (based on ISO 3166-1 alpha-3).
                </p>
              </div>

              {/* Country Name */}
              <div className="space-y-2">
                <label
                  htmlFor="countryname"
                  className="block text-sm font-medium text-gray-700"
                >
                  Country Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="countryname"
                  name="countryname"
                  value={formData.countryname}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., United States"
                />
                <p className="text-xs text-gray-500">
                  The common name of the country.
                </p>
              </div>

              {/* Is Country */}
              <div className="space-y-2">
                <label
                  htmlFor="isCountry"
                  className="block text-sm font-medium text-gray-700"
                >
                  Is Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="isCountry"
                  name="isCountry"
                  value={formData?.isCountry ? "true" : "false"}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <p className="text-xs text-gray-500">
                  Indicates whether the entity is a country (e.g., Germany [Yes] vs. European Union [No]).
                </p>
              </div>
            </div>
          </div>

          {/* ISO Codes Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">
              ISO Codes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* ISO 3166-1 alpha-2 */}
              <div className="space-y-2">
                <label
                  htmlFor="iso2c"
                  className="block text-sm font-medium text-gray-700"
                >
                  ISO 3166-1 alpha-2
                </label>
                <input
                  type="text"
                  id="iso2c"
                  name="iso2c"
                  value={formData?.iso2c || ""}
                  onChange={handleChange}
                  minLength={2}
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., US"
                />
                <p className="text-xs text-gray-500">
                  The ISO 3166-1 alpha-2 code for the country (if available).
                </p>
              </div>

              {/* ISO 3166-1 alpha-3 */}
              <div className="space-y-2">
                <label
                  htmlFor="iso3c"
                  className="block text-sm font-medium text-gray-700"
                >
                  ISO 3166-1 alpha-3
                </label>
                <input
                  type="text"
                  id="iso3c"
                  name="iso3c"
                  value={formData?.iso3c || ""}
                  onChange={handleChange}
                  minLength={3}
                  maxLength={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., USA"
                />
                <p className="text-xs text-gray-500">
                  The ISO 3166-1 alpha-3 code for the country (if available).
                </p>
              </div>

              {/* ISO 3166-1 numeric */}
              <div className="space-y-2">
                <label
                  htmlFor="iso3n"
                  className="block text-sm font-medium text-gray-700"
                >
                  ISO 3166-1 numeric
                </label>
                <input
                  type="number"
                  id="iso3n"
                  name="iso3n"
                  value={formData?.iso3n || ""}
                  onChange={handleChange}
                  min={1}
                  max={999}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., 840"
                />
                <p className="text-xs text-gray-500">
                  The ISO 3166-1 numeric code for the country (if available).
                </p>
              </div>
            </div>
          </div>

          {/* United Nations geoscheme Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">
              United Nations geoscheme
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Region */}
              <div className="space-y-2">
                <label
                  htmlFor="region"
                  className="block text-sm font-medium text-gray-700"
                >
                  Region
                </label>
                <select
                  id="region"
                  name="region"
                  value={formData?.region ?? ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select a region</option>
                  {RegionEnum.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  The United Nations geoscheme region for the country.
                </p>
              </div>

              {/* Region Code */}
              <div className="space-y-2">
                <label
                  htmlFor="regionCode"
                  className="block text-sm font-medium text-gray-700"
                >
                  Region Code
                </label>
                <input
                  id="regionCode"
                  name="regionCode"
                  value={formData?.regionCode ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Selected region&apos;s corresponding code (auto-filled based on region selection).
                </p>
              </div>

              {/* Sub-Region */}
              <div className="space-y-2">
                <label
                  htmlFor="regionSub"
                  className="block text-sm font-medium text-gray-700"
                >
                  Region Sub
                </label>
                <select
                  id="regionSub"
                  name="regionSub"
                  value={formData?.regionSub ?? ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={!formData?.region}
                >
                  <option value="">
                    {!formData?.region
                      ? "Select a region first"
                      : REGION_MAP[formData.region as keyof typeof REGION_MAP]
                        ? "Select a subregion"
                        : "No subregions"}
                  </option>
                  {formData?.region &&
                    REGION_MAP[formData.region as keyof typeof REGION_MAP]?.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500">
                  The United Nations geoscheme subregion for the country (if applicable).
                </p>
              </div>

              {/* Region Sub Code */}
              <div className="space-y-2">
                <label
                  htmlFor="regionSubCode"
                  className="block text-sm font-medium text-gray-700"
                >
                  Region Sub Code
                </label>
                <input
                  id="regionSubCode"
                  name="regionSubCode"
                  value={formData?.regionSubCode ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Selected subregion&apos;s corresponding code (auto-filled based on subregion selection).
                </p>
              </div>

              {/* Intermediate Region */}
              <div className="space-y-2">
                <label
                  htmlFor="regionIntermediate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Region Intermediate
                </label>
                <select
                  id="regionIntermediate"
                  name="regionIntermediate"
                  value={formData?.regionIntermediate ?? ""}
                  onChange={handleChange}
                  disabled={
                    !formData?.regionSub ||
                    !REGIONSUB_MAP[formData.regionSub as keyof typeof REGIONSUB_MAP]
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">
                    {!formData?.regionSub
                      ? "Select a subregion first"
                      : REGIONSUB_MAP[formData.regionSub as keyof typeof REGIONSUB_MAP]
                        ? "Select an intermediate region"
                        : "No intermediate regions"}
                  </option>
                  {formData?.regionSub &&
                    REGIONSUB_MAP[formData.regionSub as keyof typeof REGIONSUB_MAP]?.map(
                      (intermediate) => (
                        <option key={intermediate} value={intermediate}>
                          {intermediate}
                        </option>
                      )
                    )}
                </select>
                <p className="text-xs text-gray-500">
                  The United Nations geoscheme intermediate region for the country (if applicable).
                </p>
              </div>

              {/* Region Intermediate Code */}
              <div className="space-y-2">
                <label
                  htmlFor="regionIntermediateCode"
                  className="block text-sm font-medium text-gray-700"
                >
                  Region Intermediate Code
                </label>
                <input
                  id="regionIntermediateCode"
                  name="regionIntermediateCode"
                  readOnly
                  value={formData?.regionIntermediateCode ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Selected intermediate region&apos;s corresponding code (auto-filled based on intermediate region selection).
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-6 border-t border-gray-200 gap-4">
            <button
              type="button"
              onClick={() => router.push("/data/countries/" + formData?.countrycodePolpal)}
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              disabled={loadingSubmit}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSubmit ? (
                <>
                  <svg aria-hidden="true" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Create Country"
              )}
            </button>
          </div>
        </form>
      </div>
    </div >
  );
}
