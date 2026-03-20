import { API_BASE_URL, DISABLE_AUTH } from './config';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: DISABLE_AUTH ? "omit" : "include",
    headers,
  });

  if (!DISABLE_AUTH) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }

    // Check if the response is HTML (e.g., a redirect to a login page)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("Received HTML response instead of JSON. Redirecting to login.");
    }
  }

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response;
}
