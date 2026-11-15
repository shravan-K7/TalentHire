"""
Centralized cancellation and refund policy logic for TalentHire.

Business Rules:
- Customer cancels > 7 days before event: 100% refund.
- Customer cancels 3–7 days before event: 50% refund.
- Customer cancels < 3 days before event: 0% refund.
- Artist cancels: 100% refund.
- Platform/Admin cancels: 100% refund.

Financial Principles:
- Refunds are calculated on actual customer-paid amount (Payment.amount).
- Platform commission is 8% and artist share is 92%.
- For partial refunds, retained funds are divided between platform (8%) and artist (92%).
- Uses Decimal arithmetic with standard ROUND_HALF_UP.
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from django.utils import timezone
from zoneinfo import ZoneInfo

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
PLATFORM_COMMISSION_PERCENT = Decimal("8.00")


def calculate_cancellation_refund(booking, cancelled_by="customer", cancel_time=None):
    """
    Calculates the refund and financial breakdown for a booking cancellation.

    Parameters:
        booking (Booking): The booking being cancelled.
        cancelled_by (str): "customer", "artist", or "admin".
        cancel_time (datetime or None): Optional timestamp of cancellation (defaults to now).

    Returns:
        dict:
            refund_percentage: Decimal (0.00, 50.00, 100.00)
            paid_amount: Decimal
            refund_amount: Decimal
            retained_amount: Decimal
            platform_fee: Decimal
            artist_payout: Decimal
            policy_applied: str
            days_until_event: float
            is_eligible_for_refund: bool
    """
    now_dt = cancel_time or timezone.now()
    event_dt = booking.event_date

    time_until_event = event_dt - now_dt
    hours_until_event = time_until_event.total_seconds() / 3600.0
    days_until_event = hours_until_event / 24.0

    cancelled_by_norm = str(cancelled_by).strip().lower()

    if cancelled_by_norm in ("artist", "admin"):
        refund_percentage = Decimal("100.00")
        policy_applied = f"{cancelled_by_norm.capitalize()} cancellation (100% refund)"
    else:
        # Customer cancellation rules based on event lead time
        if days_until_event > 7.0:
            refund_percentage = Decimal("100.00")
            policy_applied = "Customer cancellation > 7 days before event (100% refund)"
        elif days_until_event >= 3.0:
            refund_percentage = Decimal("50.00")
            policy_applied = "Customer cancellation 3–7 days before event (50% refund)"
        else:
            refund_percentage = Decimal("0.00")
            policy_applied = "Customer cancellation < 3 days before event (0% refund)"

    # Determine customer-paid amount
    from app.models import Payment
    payment = getattr(booking, "payment", None)
    if not payment:
        payment = Payment.objects.filter(booking=booking).first()

    if payment and payment.status == Payment.Status.SUCCESS:
        paid_amount = payment.amount
    else:
        paid_amount = Decimal("0.00")

    # Financial breakdown
    refund_amount = (paid_amount * refund_percentage / Decimal("100.00")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    # Ensure refund never exceeds paid amount
    if refund_amount > paid_amount:
        refund_amount = paid_amount

    retained_amount = (paid_amount - refund_amount).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )

    if retained_amount > Decimal("0.00"):
        platform_fee = (retained_amount * PLATFORM_COMMISSION_PERCENT / Decimal("100.00")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        artist_payout = (retained_amount - platform_fee).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
    else:
        platform_fee = Decimal("0.00")
        artist_payout = Decimal("0.00")

    is_eligible = paid_amount > Decimal("0.00") and refund_amount > Decimal("0.00")

    return {
        "refund_percentage": refund_percentage,
        "paid_amount": paid_amount,
        "refund_amount": refund_amount,
        "retained_amount": retained_amount,
        "platform_fee": platform_fee,
        "artist_payout": artist_payout,
        "policy_applied": policy_applied,
        "days_until_event": round(days_until_event, 2),
        "is_eligible_for_refund": is_eligible,
    }
