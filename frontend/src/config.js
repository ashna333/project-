// This cleans the URL so it never has a double slash or missing slash
const cleanBaseUrl = (url) => url?.replace(/\/+$/, ''); 

export const API_URL = cleanBaseUrl(import.meta.env.VITE_API_URL);
export const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL;

// This is the base URL for files (usually the root of your backend)
// Since your API is at /api, the file base is likely the parent
export const FILE_BASE_URL = API_URL.replace('/api', '');

console.log("API_URL:", API_URL);
console.log("FILE_BASE_URL:", FILE_BASE_URL);