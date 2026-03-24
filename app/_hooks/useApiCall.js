// app/hooks/useApiCall.js

import { useState, useCallback, useRef } from "react";
import { ApiError, ERROR_TYPE } from "../services/ApiError";
import { useNotify } from "../_contexts/NotificationContext";

// ── Options reference ──────────────────────────────────────────────────────
//
// errorDisplay:    "auto"|"toast"|"sheet"|"none"  (default "auto")
// errorRetry:      true|false                     (default true)
// errorMessage:    string — overrides the backend/ApiError message shown
//                  as the bold title on the error sheet or toast.
//                  If not set, the backend message is used directly.
// errorSubMessage: string — smaller grey text shown below the title on
//                  the error sheet (optional). Useful to show the raw
//                  backend message when you set a custom errorMessage.
//
// successDisplay:      "none"|"toast"|"sheet"  (default "none")
// successMessage:      string
// successSubMessage:   string (optional)
// successIcon:         emoji string (optional)
// successAutoDismissMs: number (default 2800)
// successOnDismiss:    () => void — fires after sheet dismissed

export function useApiCall() {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lastCallRef = useRef(null);
  const lastOptionsRef = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  const execute = useCallback(
    async (
      apiCallFn,
      {
        onSuccess,
        onError,

        errorDisplay = "auto",
        errorRetry = true,
        errorMessage = null, // custom title shown on error sheet/toast
        errorSubMessage = null, // optional body text on error sheet

        successDisplay = "none",
        successMessage = "Done!",
        successSubMessage = null,
        successIcon = null,
        successAutoDismissMs = 2800,
        successOnDismiss = null,
      } = {},
    ) => {
      setLoading(true);
      setError(null);

      lastCallRef.current = apiCallFn;
      lastOptionsRef.current = arguments[1];

      try {
        const result = await apiCallFn();

        // onSuccess runs FIRST — lets caller close any open Modal
        // before success sheet renders (prevents Android Modal conflict)
        await onSuccess?.(result);

        // Success notification fires after onSuccess completes
        if (successDisplay === "toast") {
          notify.toast.success(successMessage);
          successOnDismiss?.();
        } else if (successDisplay === "sheet") {
          setTimeout(() => {
            notify.sheet.success({
              message: successMessage,
              subMessage: successSubMessage,
              icon: successIcon,
              autoDismissMs: successAutoDismissMs,
              onDismiss: successOnDismiss ?? undefined,
            });
          }, 350);
        }

        return result;
      } catch (err) {
        const apiErr =
          err instanceof ApiError
            ? err
            : new ApiError({
                message: err?.message,
                errorType: ERROR_TYPE.UNKNOWN,
                originalError: err,
              });

        const display =
          errorDisplay === "auto"
            ? apiErr.displayMode === "BOTTOM_SHEET"
              ? "sheet"
              : "toast"
            : errorDisplay;

        // Resolve what to show:
        // - errorMessage (custom) takes priority as the bold title
        // - if no custom message, use the backend/ApiError message directly
        // - errorSubMessage adds optional body text below the title
        const resolvedTitle = errorMessage ?? apiErr.message;
        const resolvedSubMessage = errorSubMessage ?? null;

        if (display === "toast") {
          notify.toast.error(resolvedTitle);
        } else if (display === "sheet") {
          notify.sheet.error({
            message: resolvedTitle,
            subMessage: resolvedSubMessage,
            errorType: apiErr.errorType,
            onRetry: errorRetry
              ? async () => {
                  if (lastCallRef.current) {
                    await execute(
                      lastCallRef.current,
                      lastOptionsRef.current ?? {},
                    );
                  }
                }
              : undefined,
          });
        } else if (display === "none") {
          setError(apiErr);
        }

        onError?.(apiErr);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  return { execute, loading, error, clearError };
}
