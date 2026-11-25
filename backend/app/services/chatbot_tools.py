"""
Read-only public TalentHire tools for Gemini function calling (Phase 2).

Security & Scope Rules:
- All tools return ONLY public platform data (no customer PII, no artist phones/emails,
  no private booking details, no Razorpay IDs).
- Reuses existing Django ORM models, cancellation_policy.py, and is_artist_date_occupied().
- Never modifies database records.
"""

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import inspect
import logging
import re
from typing import Any
from zoneinfo import ZoneInfo

from django.db.models import Avg, Count, Q
from django.utils import timezone

from app.cancellation_policy import PLATFORM_COMMISSION_PERCENT, calculate_cancellation_refund
from app.models import (
    ArtistAvailability,
    ArtistProfile,
    Booking,
    Category,
    FavoriteArtist,
    Notification,
    Payment,
    ReschedulingRequest,
)

logger = logging.getLogger(__name__)
KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


def _parse_decimal(value: Any, field_name: str) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        dec = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"Invalid {field_name}: must be a valid number.") from exc
    if dec < Decimal("0"):
        raise ValueError(f"Invalid {field_name}: cannot be negative.")
    return dec


def _resolve_active_artist(artist_id: Any = None, stage_name: str = "") -> tuple[ArtistProfile | None, list[ArtistProfile]]:
    """
    Resolve an active ArtistProfile by ID or stage_name.
    Returns (matched_artist, candidate_matches).
    """
    base_qs = ArtistProfile.objects.filter(
        is_active=True,
        user__is_active=True,
    ).select_related("category")

    if artist_id is not None and str(artist_id).strip() != "":
        try:
            aid = int(artist_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("Invalid artist_id: must be an integer.") from exc
        if aid <= 0:
            raise ValueError("Invalid artist_id: must be a positive integer.")
        artist = base_qs.filter(id=aid).first()
        return artist, ([artist] if artist else [])

    cleaned_name = (stage_name or "").strip()
    if not cleaned_name:
        raise ValueError("Please provide either artist_id or stage_name.")

    exact = base_qs.filter(stage_name__iexact=cleaned_name).first()
    if exact:
        return exact, [exact]

    matches = list(base_qs.filter(stage_name__icontains=cleaned_name).order_by("-is_verified", "stage_name")[:5])
    if len(matches) == 1:
        return matches[0], matches
    return None, matches


def search_artists(
    query: str = "",
    category: str = "",
    location: str = "",
    min_price: float | None = None,
    max_price: float | None = None,
    verified_only: bool = False,
    limit: int = 5,
) -> dict[str, Any]:
    """
    Search public active performing artists on TalentHire by keyword, category,
    location, price range, or verification status.
    """
    qs = ArtistProfile.objects.filter(is_active=True, user__is_active=True).select_related("category")

    q_str = (query or "").strip()
    if q_str:
        qs = qs.filter(
            Q(stage_name__icontains=q_str)
            | Q(bio__icontains=q_str)
            | Q(location__icontains=q_str)
            | Q(category__name__icontains=q_str)
            | Q(additional_information__icontains=q_str)
            | Q(performance_types__icontains=q_str)
        )

    cat_str = (category or "").strip()
    if cat_str and cat_str.lower() != "all":
        if cat_str.isdigit():
            qs = qs.filter(category_id=int(cat_str))
        else:
            qs = qs.filter(
                Q(category__name__iexact=cat_str) | Q(category__name__icontains=cat_str)
            )

    loc_str = (location or "").strip()
    if loc_str and loc_str.lower() not in ("all", "anywhere"):
        qs = qs.filter(location__icontains=loc_str)

    min_dec = _parse_decimal(min_price, "min_price")
    if min_dec is not None:
        qs = qs.filter(starting_price__gte=min_dec)

    max_dec = _parse_decimal(max_price, "max_price")
    if max_dec is not None:
        qs = qs.filter(starting_price__lte=max_dec)

    if verified_only:
        qs = qs.filter(is_verified=True)

    try:
        safe_limit = max(1, min(10, int(limit or 5)))
    except (TypeError, ValueError):
        safe_limit = 5

    total_matches = qs.count()
    artists = qs.order_by("-is_verified", "-years_of_experience", "starting_price")[:safe_limit]

    results = [
        {
            "artist_id": a.id,
            "stage_name": a.stage_name,
            "category": a.category.name if a.category else "",
            "location": a.location,
            "starting_price_inr": str(a.starting_price),
            "years_of_experience": a.years_of_experience,
            "is_verified": a.is_verified,
            "travel_availability": a.get_travel_availability_display(),
        }
        for a in artists
    ]

    return {
        "total_matches": total_matches,
        "returned_count": len(results),
        "artists": results,
    }


def get_artist_details(
    artist_id: int | None = None,
    stage_name: str = "",
) -> dict[str, Any]:
    """
    Retrieve public profile details for a specific active TalentHire artist
    by artist_id or stage_name. Never returns private contact or account details.
    """
    artist, candidates = _resolve_active_artist(artist_id=artist_id, stage_name=stage_name)

    if not artist and len(candidates) > 1:
        return {
            "found": False,
            "ambiguous": True,
            "message": "Multiple artists matched that name. Please clarify which artist you mean.",
            "candidates": [
                {
                    "artist_id": c.id,
                    "stage_name": c.stage_name,
                    "category": c.category.name if c.category else "",
                    "location": c.location,
                }
                for c in candidates
            ],
        }

    if not artist:
        return {
            "found": False,
            "message": "No active artist profile matched your request.",
        }

    review_agg = artist.reviews.aggregate(avg_rating=Avg("rating"), review_count=Count("id"))
    avg_rating = (
        round(float(review_agg["avg_rating"]), 1)
        if review_agg["avg_rating"] is not None
        else None
    )

    return {
        "found": True,
        "artist": {
            "artist_id": artist.id,
            "stage_name": artist.stage_name,
            "category": artist.category.name if artist.category else "",
            "bio": artist.bio,
            "years_of_experience": artist.years_of_experience,
            "location": artist.location,
            "starting_price_inr": str(artist.starting_price),
            "travel_availability": artist.get_travel_availability_display(),
            "performance_types": artist.performance_types if isinstance(artist.performance_types, list) else [],
            "is_verified": artist.is_verified,
            "avg_rating": avg_rating,
            "review_count": review_agg["review_count"] or 0,
            "portfolio_url": artist.portfolio_url,
        },
    }


def check_artist_availability(
    date_str: str,
    artist_id: int | None = None,
    stage_name: str = "",
) -> dict[str, Any]:
    """
    Check whether a specific active artist is available on a given YYYY-MM-DD date.
    Reuses is_artist_date_occupied() without modifying any booking or availability records.
    """
    cleaned_date = (date_str or "").strip()
    if not cleaned_date:
        raise ValueError("Please provide a date in YYYY-MM-DD format.")

    try:
        target_date = date.fromisoformat(cleaned_date)
    except ValueError as exc:
        raise ValueError("Invalid date format. Expected YYYY-MM-DD (e.g. 2026-12-25).") from exc

    artist, candidates = _resolve_active_artist(artist_id=artist_id, stage_name=stage_name)

    if not artist and len(candidates) > 1:
        return {
            "found": False,
            "ambiguous": True,
            "message": "Multiple artists matched that name. Please clarify which artist to check.",
            "candidates": [
                {
                    "artist_id": c.id,
                    "stage_name": c.stage_name,
                    "category": c.category.name if c.category else "",
                    "location": c.location,
                }
                for c in candidates
            ],
        }

    if not artist:
        return {
            "found": False,
            "message": "No active artist profile matched your request.",
        }

    # Import lazily to avoid circular imports with views.py
    from app.views import is_artist_date_occupied

    is_occupied, _reason, _conflict = is_artist_date_occupied(artist, target_date)

    return {
        "found": True,
        "artist_id": artist.id,
        "stage_name": artist.stage_name,
        "date": target_date.isoformat(),
        "timezone": "Asia/Kolkata",
        "is_available": not is_occupied,
        "status": "unavailable" if is_occupied else "available",
        "summary": (
            f"{artist.stage_name} is unavailable on {target_date.isoformat()}."
            if is_occupied
            else f"{artist.stage_name} appears available on {target_date.isoformat()}."
        ),
    }


def get_categories() -> dict[str, Any]:
    """
    Retrieve all available TalentHire artist categories with active artist counts.
    """
    categories = (
        Category.objects.annotate(
            active_artists_count=Count(
                "artists",
                filter=Q(artists__is_active=True, artists__user__is_active=True),
            )
        )
        .order_by("name")
    )

    return {
        "total_categories": categories.count(),
        "categories": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "active_artists_count": c.active_artists_count,
            }
            for c in categories
        ],
    }


def get_platform_policies(topic: str = "all") -> dict[str, Any]:
    """
    Retrieve authoritative TalentHire booking, payment, commission, cancellation,
    refund, and rescheduling policies.
    """
    commission_pct = str(PLATFORM_COMMISSION_PERCENT)
    artist_share_pct = str(Decimal("100.00") - PLATFORM_COMMISSION_PERCENT)

    policies = {
        "booking": {
            "workflow": (
                "Customers browse active artist profiles, check availability on the artist's calendar, "
                "and submit a booking request. Pending requests do not lock an artist's date."
            ),
            "reservation_window_hours": 24,
            "reservation_rule": (
                "Once an artist accepts a booking request, a 24-hour payment reservation window begins "
                "and locks that date. Unpaid reservations expire automatically after 24 hours."
            ),
            "timezone": "Asia/Kolkata",
        },
        "payment_and_commission": {
            "payment_gateway": "Razorpay",
            "currency": "INR",
            "platform_commission_percentage": commission_pct,
            "artist_payout_percentage": artist_share_pct,
            "summary": (
                f"Payments are processed securely via Razorpay. TalentHire charges a {commission_pct}% "
                f"platform commission, and {artist_share_pct}% goes to the performing artist."
            ),
        },
        "cancellation_and_refund": {
            "customer_gt_7_days": "100% refund if cancelled more than 7 days before the event.",
            "customer_3_to_7_days": "50% refund if cancelled 3 to 7 days before the event.",
            "customer_lt_3_days": "0% refund if cancelled less than 3 days before the event.",
            "artist_or_admin_cancel": "100% refund if cancelled by the artist or platform admin.",
            "partial_refund_split": (
                f"For partial refunds, retained funds are split between TalentHire ({commission_pct}%) "
                f"and the artist ({artist_share_pct}%)."
            ),
        },
        "rescheduling": {
            "rule": (
                "Customers can submit a rescheduling request for an eligible booking from their dashboard. "
                "The artist can approve or reject the requested new date from their Artist Dashboard."
            ),
        },
    }

    normalized_topic = (topic or "all").strip().lower()
    topic_map = {
        "booking": {"booking": policies["booking"]},
        "payment": {"payment_and_commission": policies["payment_and_commission"]},
        "commission": {"payment_and_commission": policies["payment_and_commission"]},
        "cancellation": {"cancellation_and_refund": policies["cancellation_and_refund"]},
        "refund": {"cancellation_and_refund": policies["cancellation_and_refund"]},
        "rescheduling": {"rescheduling": policies["rescheduling"]},
    }

    if normalized_topic in topic_map:
        return {"topic": normalized_topic, "policies": topic_map[normalized_topic]}

    return {"topic": "all", "policies": policies}


def _require_customer_user(user: Any) -> Any:
    if not user or not getattr(user, "is_authenticated", False):
        raise ValueError("Authentication required to access customer account data.")
    if getattr(user, "artist_profile", None) is not None:
        raise ValueError("Customer account tools are only available to customer accounts.")
    return user


def _parse_positive_int(value: Any, field_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid {field_name}: must be an integer.") from exc
    if parsed <= 0:
        raise ValueError(f"Invalid {field_name}: must be a positive integer.")
    return parsed


def _format_kolkata_dt(dt: Any) -> str:
    if not dt:
        return ""
    return timezone.localtime(dt, timezone=KOLKATA_TZ).strftime("%b %d, %Y %I:%M %p IST")


def get_my_bookings(
    user: Any,
    status_filter: str = "all",
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve the authenticated customer's bookings with optional status filtering.
    """
    customer = _require_customer_user(user)
    qs = (
        Booking.objects.filter(customer=customer)
        .select_related("artist", "artist__category", "payment")
    )

    normalized = (status_filter or "all").strip().lower()
    if normalized == "upcoming":
        qs = qs.filter(
            status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
            event_date__gte=timezone.now(),
        ).order_by("event_date")
    elif normalized in (
        Booking.Status.PENDING,
        Booking.Status.ACCEPTED,
        Booking.Status.REJECTED,
        Booking.Status.CANCELLED,
        Booking.Status.COMPLETED,
        Booking.Status.EXPIRED,
        Booking.Status.UNAVAILABLE,
    ):
        qs = qs.filter(status=normalized).order_by("-created_at")
    elif normalized in ("all", ""):
        qs = qs.order_by("-created_at")
    else:
        raise ValueError(
            "Invalid status_filter. Use all, upcoming, pending, accepted, completed, cancelled, rejected, or expired."
        )

    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    total_count = qs.count()
    bookings = []
    for b in qs[:safe_limit]:
        payment = getattr(b, "payment", None)
        bookings.append(
            {
                "booking_id": b.id,
                "artist_name": b.artist.stage_name,
                "category": b.artist.category.name if b.artist.category else "",
                "event_type": b.event_type,
                "event_date": _format_kolkata_dt(b.event_date),
                "event_location": b.event_location,
                "status": b.status,
                "agreed_price_inr": str(b.agreed_price) if b.agreed_price is not None else None,
                "payment_status": payment.status if payment else "unpaid",
                "payment_deadline": (
                    _format_kolkata_dt(b.expires_at)
                    if b.status == Booking.Status.ACCEPTED and (not payment or payment.status != Payment.Status.SUCCESS) and b.expires_at
                    else None
                ),
            }
        )

    return {
        "status_filter": normalized or "all",
        "total_count": total_count,
        "returned_count": len(bookings),
        "bookings": bookings,
    }


def get_booking_details(
    user: Any,
    booking_id: int,
) -> dict[str, Any]:
    """
    Retrieve details of a specific booking owned by the authenticated customer.
    """
    customer = _require_customer_user(user)
    bid = _parse_positive_int(booking_id, "booking_id")

    booking = (
        Booking.objects.filter(id=bid, customer=customer)
        .select_related("artist", "artist__category", "payment", "cancellation")
        .first()
    )
    if not booking:
        return {
            "found": False,
            "message": "Booking not found for your account.",
        }

    payment = getattr(booking, "payment", None)
    cancellation = getattr(booking, "cancellation", None)

    details: dict[str, Any] = {
        "booking_id": booking.id,
        "artist_id": booking.artist_id,
        "artist_name": booking.artist.stage_name,
        "category": booking.artist.category.name if booking.artist.category else "",
        "event_type": booking.event_type,
        "event_date": _format_kolkata_dt(booking.event_date),
        "event_location": booking.event_location,
        "venue_name": booking.venue_name,
        "city": booking.city,
        "status": booking.status,
        "customer_budget_inr": str(booking.customer_budget) if booking.customer_budget is not None else None,
        "agreed_price_inr": str(booking.agreed_price) if booking.agreed_price is not None else None,
        "payment_status": payment.status if payment else "unpaid",
        "paid_amount_inr": str(payment.amount) if (payment and payment.status == Payment.Status.SUCCESS) else None,
        "payment_deadline": (
            _format_kolkata_dt(booking.expires_at)
            if booking.status == Booking.Status.ACCEPTED and (not payment or payment.status != Payment.Status.SUCCESS) and booking.expires_at
            else None
        ),
    }

    if cancellation:
        details["cancellation"] = {
            "cancelled_by": cancellation.cancelled_by,
            "policy_applied": cancellation.policy_applied,
            "refund_percentage": str(cancellation.refund_percentage),
            "refund_amount_inr": str(cancellation.refund_amount),
        }

    return {
        "found": True,
        "booking": details,
    }


def get_my_payment_status(
    user: Any,
    booking_id: int | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve payment status and amounts for the authenticated customer's bookings.
    Never exposes Razorpay order IDs, transaction IDs, or gateway secrets.
    """
    customer = _require_customer_user(user)
    qs = (
        Payment.objects.filter(booking__customer=customer)
        .select_related("booking", "booking__artist")
        .prefetch_related("refunds")
        .order_by("-created_at")
    )

    if booking_id is not None and str(booking_id).strip() != "":
        bid = _parse_positive_int(booking_id, "booking_id")
        qs = qs.filter(booking_id=bid)

    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    total_count = qs.count()
    payments = []
    for p in qs[:safe_limit]:
        refunds = [
            {
                "amount_inr": str(r.amount),
                "status": r.status,
                "reason": r.reason,
            }
            for r in p.refunds.all()
        ]
        payments.append(
            {
                "booking_id": p.booking_id,
                "artist_name": p.booking.artist.stage_name,
                "event_type": p.booking.event_type,
                "booking_status": p.booking.status,
                "payment_status": p.status,
                "amount_inr": str(p.amount),
                "commission_percentage": str(p.commission_percentage),
                "created_at": _format_kolkata_dt(p.created_at),
                "refunds": refunds,
            }
        )

    return {
        "total_count": total_count,
        "returned_count": len(payments),
        "payments": payments,
    }


def get_cancellation_refund_details(
    user: Any,
    booking_id: int | None = None,
) -> dict[str, Any]:
    """
    Calculate read-only cancellation eligibility and estimated refund for a specific
    customer booking, or return general cancellation policy rules if no booking_id is given.
    Never cancels or modifies any booking.
    """
    customer = _require_customer_user(user)

    if booking_id is None or str(booking_id).strip() == "":
        return get_platform_policies(topic="cancellation")

    bid = _parse_positive_int(booking_id, "booking_id")
    booking = (
        Booking.objects.filter(id=bid, customer=customer)
        .select_related("artist", "payment")
        .first()
    )
    if not booking:
        return {
            "found": False,
            "message": "Booking not found for your account.",
        }

    if booking.status == Booking.Status.COMPLETED:
        return {
            "found": True,
            "booking_id": booking.id,
            "eligible_to_cancel": False,
            "message": "This booking is already completed and cannot be cancelled.",
        }

    if booking.status == Booking.Status.CANCELLED:
        return {
            "found": True,
            "booking_id": booking.id,
            "eligible_to_cancel": False,
            "message": "This booking is already cancelled.",
        }

    calc = calculate_cancellation_refund(booking, cancelled_by="customer")
    return {
        "found": True,
        "booking_id": booking.id,
        "artist_name": booking.artist.stage_name,
        "event_type": booking.event_type,
        "event_date": _format_kolkata_dt(booking.event_date),
        "status": booking.status,
        "eligible_to_cancel": True,
        "policy_applied": calc["policy_applied"],
        "days_until_event": calc["days_until_event"],
        "refund_percentage": str(calc["refund_percentage"]),
        "paid_amount_inr": str(calc["paid_amount"]),
        "estimated_refund_amount_inr": str(calc["refund_amount"]),
        "retained_amount_inr": str(calc["retained_amount"]),
        "is_eligible_for_refund": calc["is_eligible_for_refund"],
        "note": "Read-only estimate. To cancel this booking, please use your Customer Dashboard.",
    }


def get_my_favorites(
    user: Any,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve the authenticated customer's favorite active artists.
    """
    customer = _require_customer_user(user)
    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    qs = (
        FavoriteArtist.objects.filter(
            customer=customer,
            artist__is_active=True,
            artist__user__is_active=True,
        )
        .select_related("artist", "artist__category")
        .order_by("-created_at")
    )

    total_count = qs.count()
    favorites = [
        {
            "artist_id": fav.artist.id,
            "stage_name": fav.artist.stage_name,
            "category": fav.artist.category.name if fav.artist.category else "",
            "location": fav.artist.location,
            "starting_price_inr": str(fav.artist.starting_price),
            "is_verified": fav.artist.is_verified,
        }
        for fav in qs[:safe_limit]
    ]

    return {
        "total_count": total_count,
        "returned_count": len(favorites),
        "favorites": favorites,
    }


def get_my_notifications(
    user: Any,
    unread_only: bool = False,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve notifications belonging to the authenticated customer.
    """
    customer = _require_customer_user(user)
    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    base_qs = Notification.objects.filter(user=customer).order_by("-created_at")
    unread_count = base_qs.filter(is_read=False).count()

    qs = base_qs.filter(is_read=False) if unread_only else base_qs
    notifications = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "created_at": _format_kolkata_dt(n.created_at),
        }
        for n in qs[:safe_limit]
    ]

    return {
        "unread_count": unread_count,
        "returned_count": len(notifications),
        "notifications": notifications,
    }


def _require_artist_profile(user: Any) -> ArtistProfile:
    if not user or not getattr(user, "is_authenticated", False):
        raise ValueError("Authentication required to access artist account data.")
    artist = getattr(user, "artist_profile", None)
    if not artist:
        raise ValueError("Artist account tools are only available to performing artists.")
    return artist


def get_my_artist_profile(user: Any) -> dict[str, Any]:
    """
    Retrieve the authenticated artist's own profile including verification status,
    category, experience, location, and starting price.
    """
    artist = _require_artist_profile(user)
    review_agg = artist.reviews.aggregate(avg_rating=Avg("rating"), review_count=Count("id"))
    avg_rating = (
        round(float(review_agg["avg_rating"]), 1)
        if review_agg["avg_rating"] is not None
        else None
    )

    profile: dict[str, Any] = {
        "artist_id": artist.id,
        "stage_name": artist.stage_name,
        "category": artist.category.name if artist.category else "",
        "is_verified": artist.is_verified,
        "is_active": artist.is_active,
        "years_of_experience": artist.years_of_experience,
        "location": artist.location,
        "starting_price_inr": str(artist.starting_price),
        "travel_availability": artist.get_travel_availability_display(),
        "performance_types": artist.performance_types if isinstance(artist.performance_types, list) else [],
        "bio": artist.bio,
        "portfolio_count": artist.portfolio_items.count(),
        "avg_rating": avg_rating,
        "review_count": review_agg["review_count"] or 0,
    }
    if not artist.is_verified and artist.rejection_notes:
        profile["verification_notes"] = artist.rejection_notes

    return {"found": True, "profile": profile}


def get_my_incoming_bookings(
    user: Any,
    status_filter: str = "all",
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve booking requests belonging to the authenticated artist.
    Never exposes customer phone numbers, emails, or payment gateway IDs.
    """
    artist = _require_artist_profile(user)
    qs = Booking.objects.filter(artist=artist).select_related("customer", "payment")

    normalized = (status_filter or "all").strip().lower()
    if normalized == "upcoming":
        qs = qs.filter(
            status=Booking.Status.ACCEPTED,
            event_date__gte=timezone.now(),
        ).order_by("event_date")
    elif normalized in (
        Booking.Status.PENDING,
        Booking.Status.ACCEPTED,
        Booking.Status.REJECTED,
        Booking.Status.COMPLETED,
        Booking.Status.CANCELLED,
        Booking.Status.EXPIRED,
        Booking.Status.UNAVAILABLE,
    ):
        qs = qs.filter(status=normalized).order_by("-created_at")
    elif normalized in ("all", ""):
        qs = qs.order_by("-created_at")
    else:
        raise ValueError(
            "Invalid status_filter. Use all, upcoming, pending, accepted, rejected, completed, cancelled, or expired."
        )

    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    total_count = qs.count()
    bookings = []
    for b in qs[:safe_limit]:
        payment = getattr(b, "payment", None)
        customer_name = (b.customer.get_full_name() or b.customer.username) if b.customer else "Customer"
        bookings.append(
            {
                "booking_id": b.id,
                "customer_name": customer_name,
                "event_type": b.event_type,
                "event_date": _format_kolkata_dt(b.event_date),
                "event_location": b.event_location,
                "status": b.status,
                "customer_budget_inr": str(b.customer_budget) if b.customer_budget is not None else None,
                "agreed_price_inr": str(b.agreed_price) if b.agreed_price is not None else None,
                "payment_status": payment.status if payment else "unpaid",
                "payment_deadline": (
                    _format_kolkata_dt(b.expires_at)
                    if b.status == Booking.Status.ACCEPTED and (not payment or payment.status != Payment.Status.SUCCESS) and b.expires_at
                    else None
                ),
            }
        )

    return {
        "status_filter": normalized or "all",
        "total_count": total_count,
        "returned_count": len(bookings),
        "bookings": bookings,
    }


def get_my_artist_booking_details(
    user: Any,
    booking_id: int,
) -> dict[str, Any]:
    """
    Retrieve details of a specific booking belonging to the authenticated artist.
    Never exposes customer phone numbers, emails, or payment gateway identifiers.
    """
    artist = _require_artist_profile(user)
    bid = _parse_positive_int(booking_id, "booking_id")

    booking = (
        Booking.objects.filter(id=bid, artist=artist)
        .select_related("customer", "payment", "cancellation")
        .first()
    )
    if not booking:
        return {
            "found": False,
            "message": "Booking not found for your artist account.",
        }

    payment = getattr(booking, "payment", None)
    cancellation = getattr(booking, "cancellation", None)
    customer_name = (booking.customer.get_full_name() or booking.customer.username) if booking.customer else "Customer"

    artist_share = None
    commission_amount = None
    if payment and payment.artist_amount and payment.artist_amount > Decimal("0.00"):
        artist_share = str(payment.artist_amount)
        commission_amount = str(payment.commission_amount)
    elif booking.agreed_price is not None:
        price = Decimal(str(booking.agreed_price))
        share = (price * Decimal("0.92")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        artist_share = str(share)
        commission_amount = str(price - share)

    details: dict[str, Any] = {
        "booking_id": booking.id,
        "customer_name": customer_name,
        "event_type": booking.event_type,
        "event_date": _format_kolkata_dt(booking.event_date),
        "event_location": booking.event_location,
        "venue_name": booking.venue_name,
        "city": booking.city,
        "performance_duration": booking.performance_duration,
        "expected_audience_size": booking.expected_audience_size,
        "status": booking.status,
        "customer_budget_inr": str(booking.customer_budget) if booking.customer_budget is not None else None,
        "agreed_price_inr": str(booking.agreed_price) if booking.agreed_price is not None else None,
        "artist_share_inr": artist_share,
        "commission_amount_inr": commission_amount,
        "payment_status": payment.status if payment else "unpaid",
        "payment_deadline": (
            _format_kolkata_dt(booking.expires_at)
            if booking.status == Booking.Status.ACCEPTED and (not payment or payment.status != Payment.Status.SUCCESS) and booking.expires_at
            else None
        ),
    }

    if cancellation:
        details["cancellation"] = {
            "cancelled_by": cancellation.cancelled_by,
            "policy_applied": cancellation.policy_applied,
            "artist_payout_inr": str(cancellation.artist_payout),
        }

    return {"found": True, "booking": details}


def get_my_earnings(
    user: Any,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve the authenticated artist's earnings summary (completed vs pending)
    and recent payment breakdowns (92% artist share, 8% platform commission).
    """
    artist = _require_artist_profile(user)
    bookings_qs = (
        Booking.objects.filter(artist=artist)
        .select_related("payment")
        .order_by("-created_at")
    )

    completed_earnings = Decimal("0.00")
    pending_earnings = Decimal("0.00")
    total_commission = Decimal("0.00")
    payment_items = []

    for b in bookings_qs:
        payment = getattr(b, "payment", None)
        if b.agreed_price is not None:
            price = Decimal(str(b.agreed_price))
            expected_artist_share = (price * Decimal("0.92")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            expected_commission = price - expected_artist_share
        else:
            price = Decimal("0.00")
            expected_artist_share = Decimal("0.00")
            expected_commission = Decimal("0.00")

        artist_share = (
            payment.artist_amount
            if payment and payment.artist_amount and payment.artist_amount > Decimal("0.00")
            else expected_artist_share
        )
        comm_amt = (
            payment.commission_amount
            if payment and payment.commission_amount and payment.commission_amount > Decimal("0.00")
            else expected_commission
        )

        if b.status == Booking.Status.COMPLETED:
            if payment and payment.status == Payment.Status.SUCCESS:
                completed_earnings += artist_share
                total_commission += comm_amt
            else:
                pending_earnings += artist_share
        elif b.status == Booking.Status.ACCEPTED:
            pending_earnings += artist_share
            if payment and payment.status == Payment.Status.SUCCESS:
                total_commission += comm_amt

        if payment:
            payment_items.append(
                {
                    "booking_id": b.id,
                    "event_type": b.event_type,
                    "booking_status": b.status,
                    "payment_status": payment.status,
                    "gross_amount_inr": str(payment.amount),
                    "commission_percentage": str(payment.commission_percentage),
                    "commission_amount_inr": str(comm_amt),
                    "artist_share_inr": str(artist_share),
                    "date": _format_kolkata_dt(payment.created_at),
                }
            )

    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    return {
        "currency": "INR",
        "commission_percentage": str(PLATFORM_COMMISSION_PERCENT),
        "artist_share_percentage": str(Decimal("100.00") - PLATFORM_COMMISSION_PERCENT),
        "completed_earnings_inr": str(completed_earnings),
        "pending_earnings_inr": str(pending_earnings),
        "total_projected_earnings_inr": str(completed_earnings + pending_earnings),
        "total_commission_inr": str(total_commission),
        "payment_records_count": len(payment_items),
        "recent_payments": payment_items[:safe_limit],
    }


def get_my_availability(
    user: Any,
    month: str = "",
) -> dict[str, Any]:
    """
    Retrieve the authenticated artist's manually blocked dates, booked dates,
    and active 24-hour reservation dates.
    """
    artist = _require_artist_profile(user)
    month_str = (month or "").strip()

    year_filter = None
    month_filter = None
    if month_str:
        match = re.match(r"^(\d{4})-(0[1-9]|1[0-2])$", month_str)
        if not match:
            raise ValueError("Invalid month format. Expected YYYY-MM (e.g. 2026-12).")
        year_filter = int(match.group(1))
        month_filter = int(match.group(2))

    manual_qs = ArtistAvailability.objects.filter(artist=artist, is_available=False).order_by("date")
    if year_filter and month_filter:
        manual_qs = manual_qs.filter(date__year=year_filter, date__month=month_filter)

    manually_blocked = [
        {
            "date": av.date.isoformat(),
            "reason": av.reason or "Marked unavailable",
        }
        for av in manual_qs[:30]
    ]

    now_tz = timezone.now()
    bookings_qs = (
        Booking.objects.filter(
            artist=artist,
            status__in=[Booking.Status.ACCEPTED, Booking.Status.COMPLETED],
        )
        .select_related("payment")
        .order_by("event_date")
    )

    booked_dates = []
    active_reservations = []

    for b in bookings_qs:
        local_dt = timezone.localtime(b.event_date, timezone=KOLKATA_TZ)
        local_date = local_dt.date()
        if year_filter and month_filter:
            if local_date.year != year_filter or local_date.month != month_filter:
                continue

        payment = getattr(b, "payment", None)
        is_paid = bool(payment and payment.status == Payment.Status.SUCCESS)

        if b.status == Booking.Status.COMPLETED:
            booked_dates.append(
                {
                    "booking_id": b.id,
                    "date": local_date.isoformat(),
                    "event_type": b.event_type,
                    "status": "completed",
                }
            )
        elif b.status == Booking.Status.ACCEPTED and is_paid:
            booked_dates.append(
                {
                    "booking_id": b.id,
                    "date": local_date.isoformat(),
                    "event_type": b.event_type,
                    "status": "confirmed_paid",
                }
            )
        elif b.status == Booking.Status.ACCEPTED:
            deadline = b.expires_at
            is_active_res = bool(deadline and deadline > now_tz) or (b.accepted_at is None)
            if is_active_res:
                active_reservations.append(
                    {
                        "booking_id": b.id,
                        "date": local_date.isoformat(),
                        "event_type": b.event_type,
                        "status": "awaiting_payment_24h",
                        "payment_deadline": _format_kolkata_dt(deadline) if deadline else None,
                    }
                )

    return {
        "timezone": "Asia/Kolkata",
        "month_filter": month_str or "all",
        "manually_blocked_dates": manually_blocked,
        "booked_dates": booked_dates,
        "active_reservations": active_reservations,
    }


def get_my_rescheduling_requests(
    user: Any,
    status_filter: str = "all",
    limit: int = 10,
) -> dict[str, Any]:
    """
    Retrieve rescheduling requests associated with the authenticated artist.
    Never exposes customer email addresses or phone numbers.
    """
    artist = _require_artist_profile(user)
    qs = (
        ReschedulingRequest.objects.filter(artist=artist)
        .select_related("booking", "customer")
        .order_by("-requested_at")
    )

    normalized = (status_filter or "all").strip().lower()
    if normalized in (
        ReschedulingRequest.Status.PENDING,
        ReschedulingRequest.Status.APPROVED,
        ReschedulingRequest.Status.REJECTED,
        ReschedulingRequest.Status.CANCELLED,
    ):
        qs = qs.filter(status=normalized)
    elif normalized not in ("all", ""):
        raise ValueError("Invalid status_filter. Use all, pending, approved, rejected, or cancelled.")

    try:
        safe_limit = max(1, min(20, int(limit or 10)))
    except (TypeError, ValueError):
        safe_limit = 10

    total_count = qs.count()
    requests_list = []
    for r in qs[:safe_limit]:
        customer_name = (r.customer.get_full_name() or r.customer.username) if r.customer else "Customer"
        requests_list.append(
            {
                "request_id": r.id,
                "booking_id": r.booking_id,
                "customer_name": customer_name,
                "event_type": r.booking.event_type,
                "original_event_date": _format_kolkata_dt(r.original_event_date),
                "new_event_date": _format_kolkata_dt(r.new_event_date),
                "reason": r.reason,
                "artist_response": r.artist_response,
                "status": r.status,
                "requested_at": _format_kolkata_dt(r.requested_at),
            }
        )

    return {
        "status_filter": normalized or "all",
        "total_count": total_count,
        "returned_count": len(requests_list),
        "rescheduling_requests": requests_list,
    }


PUBLIC_TOOL_REGISTRY = {
    "search_artists": search_artists,
    "get_artist_details": get_artist_details,
    "check_artist_availability": check_artist_availability,
    "get_categories": get_categories,
    "get_platform_policies": get_platform_policies,
}

CUSTOMER_TOOL_REGISTRY = {
    "get_my_bookings": get_my_bookings,
    "get_booking_details": get_booking_details,
    "get_my_payment_status": get_my_payment_status,
    "get_cancellation_refund_details": get_cancellation_refund_details,
    "get_my_favorites": get_my_favorites,
    "get_my_notifications": get_my_notifications,
}

ARTIST_TOOL_REGISTRY = {
    "get_my_artist_profile": get_my_artist_profile,
    "get_my_incoming_bookings": get_my_incoming_bookings,
    "get_my_artist_booking_details": get_my_artist_booking_details,
    "get_my_earnings": get_my_earnings,
    "get_my_availability": get_my_availability,
    "get_my_rescheduling_requests": get_my_rescheduling_requests,
}

TOOL_REGISTRY = {
    **PUBLIC_TOOL_REGISTRY,
    **CUSTOMER_TOOL_REGISTRY,
    **ARTIST_TOOL_REGISTRY,
}


def _filter_allowed_kwargs(func: Any, raw_kwargs: dict[str, Any]) -> dict[str, Any]:
    """Whitelist only parameters explicitly declared on `func` (excluding `user`)."""
    sig = inspect.signature(func)
    allowed = {name for name in sig.parameters if name != "user"}
    return {k: v for k, v in raw_kwargs.items() if k in allowed}


def execute_tool(
    tool_name: str,
    arguments: dict[str, Any] | None = None,
    user: Any = None,
    role: str = "customer",
) -> dict[str, Any]:
    """
    Safely validate and execute a registered chatbot tool in Django.
    Customer-private tools require an authenticated customer; artist-private tools
    require an authenticated artist. `user` is always injected server-side.
    """
    kwargs = dict(arguments) if isinstance(arguments, dict) else {}
    # Never trust user/customer/artist IDs supplied by the model
    for forbidden_key in ("user", "user_id", "customer", "customer_id", "artist", "artist_id"):
        if tool_name not in PUBLIC_TOOL_REGISTRY:
            kwargs.pop(forbidden_key, None)

    if tool_name in PUBLIC_TOOL_REGISTRY:
        func = PUBLIC_TOOL_REGISTRY[tool_name]
        try:
            return func(**_filter_allowed_kwargs(func, kwargs))
        except (ValueError, TypeError) as exc:
            return {"error": str(exc)}
        except Exception:
            logger.exception("Unexpected error executing public chatbot tool %s", tool_name)
            return {"error": "Unable to complete that lookup right now."}

    if tool_name in CUSTOMER_TOOL_REGISTRY:
        if role != "customer" or not user or not getattr(user, "is_authenticated", False):
            return {"error": "This tool is only available to authenticated customers."}
        func = CUSTOMER_TOOL_REGISTRY[tool_name]
        try:
            return func(user=user, **_filter_allowed_kwargs(func, kwargs))
        except (ValueError, TypeError) as exc:
            return {"error": str(exc)}
        except Exception:
            logger.exception("Unexpected error executing customer chatbot tool %s", tool_name)
            return {"error": "Unable to complete that customer lookup right now."}

    if tool_name in ARTIST_TOOL_REGISTRY:
        if role != "artist" or not user or not getattr(user, "is_authenticated", False):
            return {"error": "This tool is only available to authenticated performing artists."}
        func = ARTIST_TOOL_REGISTRY[tool_name]
        try:
            return func(user=user, **_filter_allowed_kwargs(func, kwargs))
        except (ValueError, TypeError) as exc:
            return {"error": str(exc)}
        except Exception:
            logger.exception("Unexpected error executing artist chatbot tool %s", tool_name)
            return {"error": "Unable to complete that artist lookup right now."}

    return {"error": f"Unknown or unsupported tool: {tool_name}"}
