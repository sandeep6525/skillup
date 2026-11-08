/**
 * Global API Error Normalizer
 * Transforms Axios, network, or server error objects into clean, user-friendly
 * error messages without exposing raw database exceptions, Prisma traces, or technical jargon.
 */

export interface NormalizedError {
  title: string;
  message: string;
  statusCode?: number;
}

export function extractErrorMessage(err: any, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallbackMessage;

  // 1. Check if backend returned structured error
  const responseData = err.response?.data;
  if (responseData) {
    if (typeof responseData.error === 'string') {
      return sanitizeTechnicalJargon(responseData.error);
    }
    if (responseData.error?.message && typeof responseData.error.message === 'string') {
      return sanitizeTechnicalJargon(responseData.error.message);
    }
    if (responseData.message && typeof responseData.message === 'string') {
      return sanitizeTechnicalJargon(responseData.message);
    }
    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      const first = responseData.errors[0];
      return typeof first === 'string' ? sanitizeTechnicalJargon(first) : first.message || fallbackMessage;
    }
  }

  // 2. Check network / client error message
  if (err.message && typeof err.message === 'string') {
    if (err.message.includes('Network Error') || err.message.includes('ERR_CONNECTION_REFUSED')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (err.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    return sanitizeTechnicalJargon(err.message);
  }

  return fallbackMessage;
}

function sanitizeTechnicalJargon(msg: string): string {
  // Strip Prisma, MySQL, or server stack trace hints
  if (
    msg.includes('prisma.') ||
    msg.includes('Invocation:') ||
    msg.includes('Foreign key constraint failed') ||
    msg.includes('Unique constraint failed') ||
    msg.includes('Invalid `prisma.') ||
    msg.includes('SQLSTATE')
  ) {
    if (msg.includes('Unique constraint') || msg.includes('already exists')) {
      return 'A record with these details already exists. Please review your input.';
    }
    return 'The database could not process this request. Please verify your input and try again.';
  }

  if (msg.includes('Cannot read properties of') || msg.includes('is not a function')) {
    return 'An internal application error occurred. Please refresh the page.';
  }

  return msg;
}

export function normalizeApiError(err: any, defaultTitle = 'Operation Failed'): NormalizedError {
  const statusCode = err?.response?.status;
  const rawMessage = extractErrorMessage(err);

  if (statusCode === 400) {
    return {
      title: defaultTitle || 'Invalid Request',
      message: rawMessage || 'Please verify the form details and try again.',
      statusCode,
    };
  }

  if (statusCode === 401) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired or is invalid. Please log in again.',
      statusCode,
    };
  }

  if (statusCode === 403) {
    return {
      title: 'Access Denied',
      message: rawMessage || 'You do not have permission to perform this action.',
      statusCode,
    };
  }

  if (statusCode === 404) {
    return {
      title: 'Not Found',
      message: rawMessage || 'The requested resource was not found.',
      statusCode,
    };
  }

  if (statusCode === 409) {
    return {
      title: 'Conflict Detected',
      message: rawMessage || 'A conflicting record already exists in the system.',
      statusCode,
    };
  }

  if (statusCode && statusCode >= 500) {
    return {
      title: 'Server Error',
      message: 'The server encountered an issue. Our engineering team has been logged of this incident.',
      statusCode,
    };
  }

  return {
    title: defaultTitle,
    message: rawMessage,
    statusCode,
  };
}

