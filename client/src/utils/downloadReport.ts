import { api } from '../api/client';

export interface DownloadFileOptions {
  fallbackFilename?: string;
  errorMessage?: string;
}

/**
 * Downloads a protected file/report using the authenticated Axios client (Bearer token in header).
 * Never exposes the JWT token in URL query parameters.
 */
export async function downloadProtectedFile(
  url: string,
  params: Record<string, any> = {},
  options: DownloadFileOptions = {}
): Promise<void> {
  const token = localStorage.getItem('skillup_token');
  if (!token) {
    throw new Error('Authentication required. Please sign in to download reports.');
  }

  // Filter out undefined, null or empty string parameters
  const cleanParams: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  });

  const response = await api.get(url, {
    params: cleanParams,
    responseType: 'blob',
  });

  // Extract filename from Content-Disposition header if available
  let filename = options.fallbackFilename || `report_${Date.now()}`;
  const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
  if (disposition && typeof disposition === 'string') {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }

  // Determine MIME type
  const rawContentType = response.headers['content-type'] || 'application/octet-stream';
  const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';
  const blob = new Blob([response.data], { type: contentType });

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
