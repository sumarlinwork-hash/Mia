import httpx
from typing import Optional

class ProviderError(Exception):
    """Normalized structured provider error for deterministic retry and fallback decisions."""
    def __init__(self, kind: str, message: str, status_code: Optional[int] = None, retryable: bool = False):
        super().__init__(message)
        self.kind = kind          # "rate_limit" | "auth_error" | "timeout" | "server_error" | "network_error" | "bad_model_id" | "unknown"
        self.message = message
        self.status_code = status_code
        self.retryable = retryable

    def __str__(self):
        return f"ProviderError(kind={self.kind}, status_code={self.status_code}, retryable={self.retryable}): {self.message}"

def normalize_provider_error(exc: Exception) -> ProviderError:
    """Classifies any standard Exception into a unified, rich ProviderError object."""
    if isinstance(exc, ProviderError):
        return exc

    kind = "unknown"
    message = str(exc)
    status_code = None
    retryable = False

    # 1. Handle HTTPX Status Errors explicitly
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        message = f"HTTP {status_code}: {exc.response.text or exc.response.reason_phrase}"
        
        if status_code == 429:
            kind = "rate_limit"
            retryable = True
        elif status_code in (401, 403):
            kind = "auth_error"
            retryable = False
        elif status_code == 404:
            kind = "bad_model_id"
            retryable = False
        elif status_code in (500, 502, 503, 504):
            kind = "server_error"
            retryable = True
        else:
            kind = "unknown"
            retryable = False

    # 2. Handle HTTPX Timeout Exceptions
    elif isinstance(exc, httpx.TimeoutException):
        kind = "timeout"
        retryable = True
        message = f"HTTP Timeout: {str(exc)}"

    # 3. Handle HTTPX Network/Transport Exceptions
    elif isinstance(exc, httpx.NetworkError):
        kind = "network_error"
        retryable = True
        message = f"Network Connection Failure: {str(exc)}"

    # 4. Fallback: Robust substring/pattern parsing for nested exceptions or other libs
    else:
        exc_str = message.lower()
        if "429" in exc_str or "rate_limit" in exc_str or "rate limit" in exc_str:
            kind = "rate_limit"
            status_code = 429
            retryable = True
        elif "401" in exc_str or "403" in exc_str or "unauthorized" in exc_str or "invalid api key" in exc_str or "auth" in exc_str:
            kind = "auth_error"
            status_code = 401 if "401" in exc_str else 403
            retryable = False
        elif "404" in exc_str or "model not found" in exc_str:
            kind = "bad_model_id"
            status_code = 404
            retryable = False
        elif "timeout" in exc_str or "timed out" in exc_str:
            kind = "timeout"
            retryable = True
        elif "500" in exc_str or "502" in exc_str or "503" in exc_str or "504" in exc_str or "service unavailable" in exc_str:
            kind = "server_error"
            status_code = 500 if "500" in exc_str else 503
            retryable = True

    return ProviderError(kind=kind, message=message, status_code=status_code, retryable=retryable)
