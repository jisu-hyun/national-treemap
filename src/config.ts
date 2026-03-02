export const CF_API_URL = import.meta.env.VITE_CF_API_URL ?? ""

export const getApiBase = () =>
  typeof window !== "undefined" && window.location.hostname.endsWith(".github.io") && CF_API_URL
    ? CF_API_URL.replace(/\/$/, "")
    : ""
