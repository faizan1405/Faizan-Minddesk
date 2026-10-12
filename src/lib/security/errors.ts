export type AuthorizationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND_OR_FORBIDDEN"
  | "CROSS_TENANT_REFERENCE"
  | "SELF_REFERENCE"
  | "VERSION_CONFLICT"
  | "VALIDATION_ERROR";

export class AuthorizationError extends Error {
  public readonly code: AuthorizationErrorCode;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: AuthorizationErrorCode = "FORBIDDEN",
    statusCode = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
