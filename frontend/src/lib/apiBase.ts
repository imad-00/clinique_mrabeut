export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${getApiBaseUrl()}${path}`
}
