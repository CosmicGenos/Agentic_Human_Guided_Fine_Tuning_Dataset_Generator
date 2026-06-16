from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base for every expected error in the app."""
    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str | None = None):
        self.message = message or (self.__doc__ or "").strip() or "Unexpected error"
        super().__init__(self.message)


class BadRequestError(AppError):
    """The request was malformed."""
    status_code = 400
    code = "bad_request"


class ValidationError(AppError):
    """The input failed a business validation rule."""
    status_code = 422
    code = "validation_error"


class AuthenticationError(AppError):
    """The caller could not be authenticated."""
    status_code = 401
    code = "authentication_error"


class AuthorizationError(AppError):
    """The caller is authenticated but not allowed."""
    status_code = 403
    code = "forbidden"


class NotFoundError(AppError):
    """The requested resource does not exist."""
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    """The request conflicts with current state."""
    status_code = 409
    code = "conflict"


class InternalError(AppError):
    """Something failed on our side."""
    status_code = 500
    code = "internal_error"



class InvalidCredentials(AuthenticationError):
    """Invalid email or password."""
    code = "invalid_credentials"


class InvalidOrExpiredToken(AuthenticationError):
    """Token is invalid or has expired."""
    code = "invalid_token"


class AccountNotActive(AuthorizationError):
    """This account is not active."""
    code = "account_not_active"


class UserAlreadyExists(ConflictError):
    """A user with this email already exists."""
    code = "user_already_exists"


class UserNotFound(NotFoundError):
    """User not found."""
    code = "user_not_found"


class ProjectNotFound(NotFoundError):
    """Project not found."""
    code = "project_not_found"


class DocumentNotFound(NotFoundError):
    """Document not found."""
    code = "document_not_found"


# Input
class InvalidObjectId(BadRequestError):
    """The provided ID is not a valid identifier."""
    code = "invalid_object_id"


class UnsupportedFileType(BadRequestError):
    """This file type is not supported."""
    code = "unsupported_file_type"


def register_error_handlers(app) -> None:
    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": "Internal server error"}},
        )
