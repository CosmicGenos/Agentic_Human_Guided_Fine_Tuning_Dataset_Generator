from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from web_api.services.JWTService import JWTService
from web_api.services.AuthService import AuthPayload
from web_api.data_models.enums import AppRole


_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _get_jwt_service(request: Request) -> JWTService:
    return request.app.state.jwt_service


def _get_current_user(
    token: str = Depends(_oauth2_scheme),
    jwt_service: JWTService = Depends(_get_jwt_service),
) -> AuthPayload:
    """Authentication only: verify the token, return the caller's identity."""
    try:
        payload_dict = jwt_service.verify_token(token)
        return AuthPayload(**payload_dict)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _require_role(*allowed_roles: AppRole):
    """Factory: build a dependency that allows only the given app role(s)."""

    def dependency(
        current_user: AuthPayload = Depends(_get_current_user),
    ) -> AuthPayload:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: "
                f"{[r.value for r in allowed_roles]}",
            )
        return current_user

    return dependency



AdminUser = Depends(_require_role(AppRole.ADMIN))
RegularUser = Depends(_require_role(AppRole.USER))
AnyUser = Depends(_get_current_user) 
