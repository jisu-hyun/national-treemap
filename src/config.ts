const ENV_API_URL = import.meta.env.VITE_CF_API_URL ?? ""
const FALLBACK_WORKER = "https://national-treemap-api.hyunjisu99.workers.dev"

export const CF_API_URL = ENV_API_URL || FALLBACK_WORKER

export const isStaticHost = () => {
  if (typeof window === "undefined") return false
  const h = window.location.hostname
  return h.endsWith(".github.io") || h.endsWith(".pages.dev")
}

export const getApiBase = () => {
  if (!isStaticHost()) return ""
  const url = (ENV_API_URL || FALLBACK_WORKER).replace(/\/$/, "")
  return url || ""
}
