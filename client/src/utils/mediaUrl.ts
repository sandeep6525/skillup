/**
 * Resolves any relative media / upload path (like /uploads/avatars/...) to the full backend URL.
 * If the path is already a full URL (http:// or https://) or base64 data, it is returned as-is.
 */
export const getMediaUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl) return '';
  if (
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl;
  }

  // Determine backend base URL:
  // 1. From VITE_API_BASE_URL (stripping /api if present)
  // 2. Production fallback: https://skillups.tricubedigitalsolutions.com
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  let backendOrigin = '';

  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    backendOrigin = apiBase.replace(/\/api\/?$/, '');
  } else if (typeof window !== 'undefined' && window.location.hostname.includes('skillups.')) {
    backendOrigin = 'https://skillups.tricubedigitalsolutions.com';
  }

  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;

  // If backendOrigin is known, prefix with it
  if (backendOrigin) {
    return `${backendOrigin}${cleanPath}`;
  }

  return cleanPath;
};
