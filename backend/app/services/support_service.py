"""
Shared service helpers for Artist Help & Support tickets, messages,
attachment validation, serialization, and notifications.
"""

import os
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from app.models import Notification, SupportMessage, SupportTicket

User = get_user_model()
KOLKATA_TZ = ZoneInfo("Asia/Kolkata")

ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
    ".txt",
    ".doc",
    ".docx",
}

ALLOWED_ATTACHMENT_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_support_attachment(uploaded_file):
    """Validate optional support attachment extension, content type, and size."""
    if not uploaded_file:
        return True, ""

    if uploaded_file.size > MAX_ATTACHMENT_BYTES:
        return False, "Attachment file size must not exceed 5 MB."

    filename = uploaded_file.name or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
        return (
            False,
            "Unsupported file type. Allowed formats: JPG, PNG, WEBP, PDF, TXT, DOC, DOCX.",
        )

    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if content_type and content_type not in ALLOWED_ATTACHMENT_MIME_TYPES and content_type != "application/octet-stream":
        return (
            False,
            "Unsupported attachment MIME type. Allowed formats: images, PDF, TXT, or Word documents.",
        )

    return True, ""


def format_ist_datetime(dt):
    """Format a timezone-aware datetime in Asia/Kolkata."""
    if not dt:
        return ""
    local_dt = timezone.localtime(dt, timezone=KOLKATA_TZ)
    return local_dt.strftime("%d %b %Y, %I:%M %p").lstrip("0")


def serialize_support_message(msg: SupportMessage, request=None) -> dict:
    """Serialize a SupportMessage instance for artist and admin APIs."""
    sender = msg.sender
    is_admin = bool(sender.is_staff or sender.is_superuser)
    artist_profile = getattr(sender, "artist_profile", None) if not is_admin else None
    if is_admin:
        sender_name = sender.get_full_name().strip() or sender.username or "TalentHire Support"
    elif artist_profile:
        sender_name = artist_profile.stage_name
    else:
        sender_name = sender.get_full_name().strip() or sender.username

    attachment_url = ""
    attachment_name = ""
    if msg.attachment:
        attachment_name = os.path.basename(msg.attachment.name)
        try:
            attachment_url = (
                request.build_absolute_uri(msg.attachment.url)
                if request
                else msg.attachment.url
            )
        except Exception:
            attachment_url = msg.attachment.url

    return {
        "id": msg.id,
        "ticket_id": msg.ticket_id,
        "sender_id": sender.id,
        "sender_name": sender_name,
        "sender_role": "admin" if is_admin else "artist",
        "message": msg.message,
        "attachment_url": attachment_url,
        "attachment_name": attachment_name,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "created_at_display": format_ist_datetime(msg.created_at),
        "is_read": msg.is_read,
    }


def serialize_support_ticket(
    ticket: SupportTicket,
    viewer_user=None,
    include_messages: bool = False,
    request=None,
) -> dict:
    """Serialize a SupportTicket instance with unread counts and optional messages."""
    artist_user = ticket.artist
    artist_profile = getattr(artist_user, "artist_profile", None)

    messages_qs = ticket.messages.select_related("sender", "sender__artist_profile").all()
    if viewer_user is not None:
        unread_count = sum(
            1 for m in messages_qs if not m.is_read and m.sender_id != viewer_user.id
        )
    else:
        unread_count = 0

    data = {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "category": ticket.category,
        "category_label": ticket.get_category_display(),
        "subject": ticket.subject,
        "status": ticket.status,
        "status_label": ticket.get_status_display(),
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "created_at_display": format_ist_datetime(ticket.created_at),
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        "updated_at_display": format_ist_datetime(ticket.updated_at),
        "message_count": len(messages_qs),
        "unread_count": unread_count,
        "artist": {
            "id": artist_profile.id if artist_profile else None,
            "user_id": artist_user.id,
            "stage_name": artist_profile.stage_name if artist_profile else artist_user.username,
            "username": artist_user.username,
            "email": artist_user.email,
            "phone": artist_profile.phone if artist_profile else "",
            "location": artist_profile.location if artist_profile else "",
            "category_name": (
                artist_profile.category.name
                if artist_profile and artist_profile.category
                else ""
            ),
            "is_verified": artist_profile.is_verified if artist_profile else False,
        },
    }

    if include_messages:
        data["messages"] = [
            serialize_support_message(m, request=request) for m in messages_qs
        ]

    return data


def _create_unique_notification(user, title: str, message: str):
    """Create a support notification while avoiding rapid identical duplicates."""
    recent_cutoff = timezone.now() - timezone.timedelta(minutes=1)
    if Notification.objects.filter(
        user=user,
        title=title,
        message=message,
        created_at__gte=recent_cutoff,
    ).exists():
        return
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=Notification.NotificationType.GENERAL,
    )


def notify_admins_new_ticket(ticket: SupportTicket):
    """Notify active staff/admin users when an artist submits a new support ticket."""
    artist_profile = getattr(ticket.artist, "artist_profile", None)
    artist_name = artist_profile.stage_name if artist_profile else ticket.artist.username
    title = f"New Support Ticket [{ticket.ticket_number}]"
    message = (
        f"{artist_name} submitted a {ticket.get_category_display()} request: "
        f"{ticket.subject}"
    )
    admins = User.objects.filter(
        Q(is_staff=True) | Q(is_superuser=True),
        is_active=True,
    ).distinct()
    for admin_user in admins:
        _create_unique_notification(admin_user, title, message)


def notify_admins_artist_reply(ticket: SupportTicket):
    """Notify active staff/admin users when an artist replies to a support ticket."""
    artist_profile = getattr(ticket.artist, "artist_profile", None)
    artist_name = artist_profile.stage_name if artist_profile else ticket.artist.username
    title = f"Support Reply [{ticket.ticket_number}]"
    message = f"{artist_name} replied on ticket \"{ticket.subject}\"."
    admins = User.objects.filter(
        Q(is_staff=True) | Q(is_superuser=True),
        is_active=True,
    ).distinct()
    for admin_user in admins:
        _create_unique_notification(admin_user, title, message)


def notify_artist_ticket_reply(ticket: SupportTicket):
    """Notify the artist when an admin replies to their support ticket."""
    title = f"Support Reply [{ticket.ticket_number}]"
    message = f"Support team replied to your ticket \"{ticket.subject}\"."
    _create_unique_notification(ticket.artist, title, message)


def notify_artist_ticket_status(ticket: SupportTicket, old_status: str, new_status: str):
    """Notify the artist when the ticket status changes."""
    if not old_status or old_status == new_status:
        return
    title = f"Ticket Status Updated [{ticket.ticket_number}]"
    message = (
        f"Your support ticket \"{ticket.subject}\" status changed to "
        f"{ticket.get_status_display()}."
    )
    _create_unique_notification(ticket.artist, title, message)
