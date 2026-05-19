/** Extract error message from axios error (including blob JSON responses). */
export async function parseApiError(err, fallback = 'Request failed') {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.error || parsed.detail || fallback;
    } catch {
      return fallback;
    }
  }
  if (typeof data === 'string') return data;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  return fallback;
}
