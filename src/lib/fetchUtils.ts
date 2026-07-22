export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  
  const contentType = res.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Invalid JSON response from server (${res.status} ${res.statusText}).`);
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status} (${res.statusText}). Make sure your API is deployed and GEMINI_API_KEY environment variable is set in Netlify / Vercel Environment Variables.`);
    }
    throw new Error(`Unexpected non-JSON response from server: ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Server error (${res.status}): Failed to complete request.`);
  }

  return data as T;
}
