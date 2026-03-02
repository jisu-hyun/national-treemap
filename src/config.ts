export const CF_API_URL = import.meta.env.VITE_CF_API_URL ?? ""

export const isStaticHost = () => {
  if (typeof window === "undefined") return false
  const h = window.location.hostname
  return h.endsWith(".github.io") || h.endsWith(".pages.dev")
}

export const getApiBase = () =>
  isStaticHost() && CF_API_URL ? CF_API_URL.replace(/\/$/, "") : ""
