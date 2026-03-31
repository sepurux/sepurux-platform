from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import NewsletterUnsubscribeRequest, NewsletterUnsubscribeResponse
from app.services.internal_newsletter_service import unsubscribe_from_marketing_email

public_router = APIRouter(prefix="/email", tags=["email"])
DbSession = Annotated[Session, Depends(get_db)]


@public_router.post("/unsubscribe", response_model=NewsletterUnsubscribeResponse)
def post_unsubscribe_newsletter(
    payload: NewsletterUnsubscribeRequest,
    db: DbSession,
) -> NewsletterUnsubscribeResponse:
    email = unsubscribe_from_marketing_email(db, token=payload.token)
    return NewsletterUnsubscribeResponse(
        message="You have been unsubscribed from Sepurux newsletter updates.",
        email=email,
        unsubscribed=True,
    )
