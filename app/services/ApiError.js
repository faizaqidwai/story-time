// app/services/ApiError.js
//
// Typed error class thrown by apiClient for all non-2xx and network failures.
// Services and UI components use errorType to decide how to display the error.

export const ERROR_TYPE = {
  NETWORK:    "NETWORK",     // no internet / fetch failed
  TIMEOUT:    "TIMEOUT",     // request timed out
  AUTH:       "AUTH",        // 401 / 403
  VALIDATION: "VALIDATION",  // 400
  NOT_FOUND:  "NOT_FOUND",   // 404
  SERVER:     "SERVER",      // 5xx
  UNKNOWN:    "UNKNOWN",
};

export const DISPLAY_MODE = {
  TOAST:        "TOAST",         // auto-dismiss top banner
  BOTTOM_SHEET: "BOTTOM_SHEET",  // modal bottom sheet with retry
  INLINE:       "INLINE",        // replace screen content with error + retry
};

const ERROR_DISPLAY_MAP = {
  [ERROR_TYPE.NETWORK]:    DISPLAY_MODE.TOAST,
  [ERROR_TYPE.TIMEOUT]:    DISPLAY_MODE.TOAST,
  [ERROR_TYPE.AUTH]:       DISPLAY_MODE.BOTTOM_SHEET,
  [ERROR_TYPE.VALIDATION]: DISPLAY_MODE.TOAST,
  [ERROR_TYPE.NOT_FOUND]:  DISPLAY_MODE.INLINE,
  [ERROR_TYPE.SERVER]:     DISPLAY_MODE.BOTTOM_SHEET,
  [ERROR_TYPE.UNKNOWN]:    DISPLAY_MODE.TOAST,
};

const DEFAULT_MESSAGES = {
  [ERROR_TYPE.NETWORK]:    "No internet connection. Please check your network.",
  [ERROR_TYPE.TIMEOUT]:    "The request timed out. Please try again.",
  [ERROR_TYPE.AUTH]:       "Your session has expired. Please log in again.",
  [ERROR_TYPE.VALIDATION]: "Please check your input and try again.",
  [ERROR_TYPE.NOT_FOUND]:  "The requested resource was not found.",
  [ERROR_TYPE.SERVER]:     "Something went wrong on our end. Please try again.",
  [ERROR_TYPE.UNKNOWN]:    "An unexpected error occurred.",
};

export function errorTypeFromStatus(status) {
  if (status === 400) return ERROR_TYPE.VALIDATION;
  if (status === 401 || status === 403) return ERROR_TYPE.AUTH;
  if (status === 404) return ERROR_TYPE.NOT_FOUND;
  if (status >= 500) return ERROR_TYPE.SERVER;
  return ERROR_TYPE.UNKNOWN;
}

export class ApiError extends Error {
  constructor({ message, errorType = ERROR_TYPE.UNKNOWN, statusCode = null, endpoint = null, originalError = null }) {
    super(message ?? DEFAULT_MESSAGES[errorType]);
    this.name          = "ApiError";
    this.errorType     = errorType;
    this.statusCode    = statusCode;
    this.endpoint      = endpoint;
    this.originalError = originalError;
    this.displayMode   = ERROR_DISPLAY_MAP[errorType] ?? DISPLAY_MODE.TOAST;
  }

  get isRetryable() {
    return [ERROR_TYPE.NETWORK, ERROR_TYPE.TIMEOUT, ERROR_TYPE.SERVER].includes(this.errorType);
  }

  get requiresReauth() {
    return this.errorType === ERROR_TYPE.AUTH;
  }
}
