import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

/**
 * Success response wrapper
 */
export function ok<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Created response wrapper (201)
 */
export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

/**
 * No content response (204)
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Error response wrapper
 */
export function error(message: string, status = 500): NextResponse<ApiError> {
  return NextResponse.json(
    { error: errorLabel(status), message, status },
    { status },
  );
}

/**
 * Bad request (400)
 */
export function badRequest(message: string): NextResponse<ApiError> {
  return error(message, 400);
}

/**
 * Not found (404)
 */
export function notFound(message: string): NextResponse<ApiError> {
  return error(message, 404);
}

/**
 * Method not allowed (405)
 */
export function methodNotAllowed(methods: string[]): NextResponse<ApiError> {
  return NextResponse.json(
    { error: 'Method Not Allowed', message: `Allowed methods: ${methods.join(', ')}`, status: 405 },
    { status: 405, headers: { Allow: methods.join(', ') } },
  );
}

/**
 * Route handler wrapper — catches errors and returns proper JSON responses.
 */
export function handleRoute(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[API Error]', message);
    return error(message, 500);
  });
}

function errorLabel(status: number): string {
  switch (status) {
    case 400: return 'Bad Request';
    case 404: return 'Not Found';
    case 405: return 'Method Not Allowed';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    default: return 'Internal Server Error';
  }
}
