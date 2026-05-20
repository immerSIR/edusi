from typing import Annotated, Any

from fastapi import Header, HTTPException, status

from app.db.supabase import get_supabase


def _user_id_from_response(response: Any) -> str | None:
    user = getattr(response, "user", None)
    if user is None:
        user = getattr(response, "data", None)
    if isinstance(user, dict):
        return user.get("id") or user.get("user", {}).get("id")
    return getattr(user, "id", None)


async def require_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        response = get_supabase().auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    user_id = _user_id_from_response(response)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    return user_id


def require_direct_user_id(current_user_id: str | None) -> str:
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return current_user_id
