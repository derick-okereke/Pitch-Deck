export function requestId() {
  return crypto.randomUUID();
}

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ data, request_id: requestId() }, { status });
}

export function apiError(code: string, message: string, status: number, retryable = false, fieldErrors?: Record<string, string>) {
  return Response.json({ error: { code, message, retryable, ...(fieldErrors ? { field_errors: fieldErrors } : {}) }, request_id: requestId() }, { status });
}
