from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Countries"

    def __str__(self):
        return self.name


class State(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="states",
    )
    name = models.CharField(max_length=120, db_index=True)
    code = models.CharField(max_length=10, blank=True, default="")
    is_union_territory = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["country", "name"],
                name="unique_state_per_country",
            ),
        ]

    def __str__(self):
        return self.name


class District(models.Model):
    state = models.ForeignKey(
        State,
        on_delete=models.PROTECT,
        related_name="districts",
    )
    name = models.CharField(max_length=120, db_index=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["state", "name"],
                name="unique_district_per_state",
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class City(models.Model):
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="cities",
    )
    state = models.ForeignKey(
        State,
        on_delete=models.PROTECT,
        related_name="cities",
    )
    name = models.CharField(max_length=120, db_index=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Cities"
        constraints = [
            models.UniqueConstraint(
                fields=["district", "name"],
                name="unique_city_per_district",
            ),
        ]
        indexes = [
            models.Index(fields=["state", "name"]),
        ]

    def __str__(self):
        return f"{self.name}, {self.district.name}, {self.state.name}"


class ArtistProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artist_profile",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="artists",
    )
    stage_name = models.CharField(max_length=150)
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]
    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        default="male",
        blank=True,
    )
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=150)
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="artists",
        null=True,
        blank=True,
    )
    state = models.ForeignKey(
        State,
        on_delete=models.PROTECT,
        related_name="artists",
        null=True,
        blank=True,
    )
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="artists",
        null=True,
        blank=True,
    )
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="artists",
        null=True,
        blank=True,
    )
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(
        upload_to="artists/profiles/",
        blank=True,
        null=True,
    )
    years_of_experience = models.PositiveSmallIntegerField(default=0)
    performance_types = models.JSONField(default=list, blank=True)
    TRAVEL_AVAILABILITY_CHOICES = [
        ("CITY", "Within my city"),
        ("DISTRICT", "Within my district"),
        ("STATE", "Across my state"),
        ("INDIA", "Across India"),
        ("city", "Within my city"),
        ("state", "Across my state"),
        ("india", "Across India"),
        ("international", "International"),
    ]
    travel_availability = models.CharField(
        max_length=50,
        choices=TRAVEL_AVAILABILITY_CHOICES,
        default="city",
    )
    portfolio_url = models.URLField(blank=True)
    additional_information = models.TextField(blank=True)
    starting_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    is_verified = models.BooleanField(default=False)
    rejection_notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.stage_name


class ArtistServiceDistrict(models.Model):
    """
    Normalized booking coverage: maps an ArtistProfile to each Indian District
    where they accept bookings. Supports multi-state, multi-district coverage
    and future Smart Collaboration Discovery / team intersection queries.
    """

    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="service_districts",
    )
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="serviced_by_artists",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["district__state__name", "district__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["artist", "district"],
                name="unique_artist_service_district",
            ),
        ]
        indexes = [
            models.Index(fields=["district", "artist"]),
        ]

    def clean(self):
        super().clean()
        if self.district_id:
            country = getattr(getattr(self.district, "state", None), "country", None)
            if not country or country.code.upper() != "IN":
                raise ValidationError(
                    {"district": "Service districts must belong to an Indian state or union territory."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.artist.stage_name} -> {self.district}"


class Portfolio(models.Model):
    class ItemType(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"
        YOUTUBE = "youtube", "YouTube Link"

    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="portfolio_items",
    )
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        default=ItemType.PHOTO,
    )
    media_url = models.URLField(blank=True, max_length=500)
    media_file = models.FileField(
        upload_to="artists/portfolio/",
        blank=True,
        null=True,
    )
    thumbnail = models.ImageField(
        upload_to="artists/portfolio/thumbnails/",
        blank=True,
        null=True,
    )
    thumbnail_url = models.CharField(max_length=500, blank=True)
    youtube_url = models.URLField(blank=True, max_length=500)
    duration = models.CharField(max_length=30, blank=True)
    dimensions = models.CharField(max_length=50, blank=True)
    file_size = models.CharField(max_length=50, blank=True)
    format_ext = models.CharField(max_length=20, blank=True)
    is_featured = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "-uploaded_at"]

    def __str__(self):
        return f"{self.artist.stage_name} - {self.title} ({self.item_type})"


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        EXPIRED = "expired", "Expired"
        UNAVAILABLE = "unavailable", "Unavailable"

    class LocationSource(models.TextChoices):
        AUTOCOMPLETE = "autocomplete", "Autocomplete"
        MAPS_LINK = "maps_link", "Google Maps Link"
        MAP_PIN = "map_pin", "Map Pin"
        MANUAL = "manual", "Manual"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    event_type = models.CharField(max_length=100)
    event_date = models.DateTimeField()
    event_day = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Calendar date of the event in Asia/Kolkata timezone for date-level uniqueness.",
    )
    event_location = models.CharField(max_length=200)

    # Detailed Location Fields
    event_area = models.CharField(max_length=255, blank=True, default="")
    event_area_place_id = models.CharField(max_length=255, blank=True, default="")
    event_address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="India")
    venue_name = models.CharField(max_length=255, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    area_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    area_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    google_maps_url = models.URLField(max_length=1000, blank=True, default="")
    location_source = models.CharField(
        max_length=30,
        choices=LocationSource.choices,
        default=LocationSource.MANUAL,
    )
    location_instructions = models.TextField(blank=True, default="")
    customer_phone = models.CharField(max_length=20, blank=True, default="")
    message = models.TextField(blank=True)
    response_message = models.TextField(blank=True, default="")
    performance_duration = models.CharField(max_length=50, blank=True, default="")
    expected_audience_size = models.PositiveIntegerField(null=True, blank=True)
    customer_budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Indicative budget submitted by the customer",
    )
    agreed_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the artist accepted the booking request (starts 24-hour payment reservation)",
    )
    payment_deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="24-hour payment deadline timestamp after acceptance",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def expires_at(self):
        """Returns the 24-hour payment reservation deadline after acceptance."""
        if self.payment_deadline:
            return self.payment_deadline
        if self.accepted_at:
            from datetime import timedelta
            return self.accepted_at + timedelta(hours=24)
        return None

    def save(self, *args, **kwargs):
        if self.event_date:
            from zoneinfo import ZoneInfo
            from django.utils import timezone
            kolkata_tz = ZoneInfo("Asia/Kolkata")
            local_dt = timezone.localtime(self.event_date, timezone=kolkata_tz)
            self.event_day = local_dt.date()
            if kwargs.get("update_fields") is not None:
                fields = set(kwargs["update_fields"])
                fields.add("event_day")
                kwargs["update_fields"] = list(fields)

        if self.accepted_at and not self.payment_deadline:
            from datetime import timedelta
            self.payment_deadline = self.accepted_at + timedelta(hours=24)
            if kwargs.get("update_fields") is not None:
                fields = set(kwargs["update_fields"])
                fields.add("payment_deadline")
                kwargs["update_fields"] = list(fields)

        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "artist", "event_day"],
                condition=models.Q(status__in=["pending", "accepted"]),
                name="unique_active_customer_artist_booking_per_day",
            ),
            models.UniqueConstraint(
                fields=["artist", "event_day"],
                condition=models.Q(status__in=["accepted", "completed"]),
                name="unique_accepted_artist_booking_per_day",
            ),
        ]

    def __str__(self):
        return f"{self.customer} - {self.artist} ({self.status})"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        PARTIALLY_REFUNDED = "partially_refunded", "Partially Refunded"

    booking = models.OneToOneField(
        Booking,
        on_delete=models.PROTECT,
        related_name="payment",
    )

    # Full amount charged to the customer
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    # TalentHire commission (8%)
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=8.00,
    )

    commission_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    # Artist's share (92%)
    artist_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    # Razorpay order ID
    razorpay_order_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    # Actual Razorpay payment ID
    transaction_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment #{self.id} - {self.status}"


class Review(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artists_reviews",
    )
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1, rating__lte=5),
                name="review_rating_1_to_5",
            )
        ]

    def __str__(self):
        return f"{self.artist} - {self.rating}/5"


class CustomerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=150, blank=True)
    profile_image = models.ImageField(
        upload_to="customers/profiles/",
        blank=True,
        null=True,
    )
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CustomerProfile({self.user.username})"


class FavoriteArtist(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_artists",
    )
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("customer", "artist")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.customer.username} -> {self.artist.stage_name}"


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        BOOKING_UPDATE = "booking_update", "Booking Update"
        PAYMENT = "payment", "Payment"
        SECURITY = "security", "Security"
        GENERAL = "general", "General"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification({self.user.username}: {self.title})"


class ArtistAvailability(models.Model):
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="availabilities",
    )
    date = models.DateField()
    is_available = models.BooleanField(default=True)
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("artist", "date")
        ordering = ["date"]

    def __str__(self):
        status_text = "Available" if self.is_available else "Unavailable"
        return f"{self.artist.stage_name} - {self.date} ({status_text})"


class Refund(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name="refunds",
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.PROTECT,
        related_name="refunds",
    )
    razorpay_refund_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        help_text="Authoritative Razorpay refund ID (e.g. rfnd_...)",
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Refund amount in INR",
    )
    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reason = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Reason for refund (e.g. date reallocated, late capture, cancellation)",
    )
    failure_reason = models.TextField(
        blank=True,
        default="",
        help_text="Error message or exception details if refund API call failed",
    )
    idempotency_key = models.CharField(
        max_length=150,
        unique=True,
        help_text="Unique key ensuring a payment is never refunded twice accidentally.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Refund #{self.id} for Payment #{self.payment_id} ({self.status})"


class ProcessedWebhookEvent(models.Model):
    event_id = models.CharField(
        max_length=120,
        unique=True,
        help_text="Authoritative Razorpay event ID from webhook payload or header",
    )
    event_type = models.CharField(max_length=100)
    payload_hash = models.CharField(max_length=64, blank=True, default="")
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-processed_at"]

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"


class BookingCancellation(models.Model):
    class CancelledBy(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ARTIST = "artist", "Artist"
        ADMIN = "admin", "Admin / Platform"

    booking = models.OneToOneField(
        Booking,
        on_delete=models.PROTECT,
        related_name="cancellation",
    )
    cancelled_by = models.CharField(
        max_length=20,
        choices=CancelledBy.choices,
    )
    cancelled_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cancellations_made",
    )
    reason = models.TextField(blank=True, default="")
    policy_applied = models.CharField(max_length=255)
    refund_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    retained_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    platform_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    artist_payout = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    refund = models.ForeignKey(
        "Refund",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancellations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Cancellation for Booking #{self.booking_id} by {self.cancelled_by}"


class ReschedulingRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="rescheduling_requests",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="customer_rescheduling_requests",
    )
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.PROTECT,
        related_name="artist_rescheduling_requests",
    )
    original_event_date = models.DateTimeField()
    new_event_date = models.DateTimeField()
    reason = models.TextField(blank=True, default="")
    artist_response = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]

    def __str__(self):
        return f"Reschedule #{self.id} for Booking #{self.booking_id} ({self.status})"


class ChatSession(models.Model):
    class RoleContext(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ARTIST = "artist", "Artist"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_sessions",
    )
    role_context = models.CharField(
        max_length=20,
        choices=RoleContext.choices,
        default=RoleContext.CUSTOMER,
    )
    title = models.CharField(max_length=150, blank=True, default="New Conversation")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"ChatSession #{self.id} ({self.user.username} - {self.role_context})"


class ChatMessage(models.Model):
    class Sender(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.CharField(
        max_length=20,
        choices=Sender.choices,
    )
    content = models.TextField()
    topic = models.CharField(max_length=60, blank=True, default="", db_index=True)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"ChatMessage #{self.id} ({self.sender} in Session #{self.session_id})"


class ChatbotErrorLog(models.Model):
    role_context = models.CharField(max_length=20, default="customer")
    error_type = models.CharField(max_length=60)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ChatbotErrorLog #{self.id} ({self.error_type} - {self.role_context})"


class SupportTicket(models.Model):
    class Category(models.TextChoices):
        GENERAL_QUERY = "general_query", "General Query"
        SUGGESTION = "suggestion", "Suggestion & Feedback"
        TECHNICAL_ISSUE = "technical_issue", "Technical Issue"
        PAYMENT_ISSUE = "payment_issue", "Payment Issue"
        BOOKING_ISSUE = "booking_issue", "Booking Issue"
        PROFILE_ISSUE = "profile_issue", "Profile Issue"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        AWAITING_RESPONSE = "awaiting_response", "Awaiting Response"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    ticket_number = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        editable=False,
    )
    artist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
        db_index=True,
    )
    category = models.CharField(
        max_length=40,
        choices=Category.choices,
        default=Category.GENERAL_QUERY,
        db_index=True,
    )
    subject = models.CharField(max_length=200)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        indexes = [
            models.Index(fields=["artist", "status"]),
            models.Index(fields=["status", "category"]),
        ]

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            import secrets
            from django.utils import timezone
            date_part = timezone.localtime(timezone.now()).strftime("%y%m%d")
            while True:
                candidate = f"SUP-{date_part}-{secrets.token_hex(2).upper()}"
                if not SupportTicket.objects.filter(ticket_number=candidate).exists():
                    self.ticket_number = candidate
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number} - {self.subject} ({self.status})"


class SupportMessage(models.Model):
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="messages",
        db_index=True,
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_messages",
    )
    message = models.TextField()
    attachment = models.FileField(
        upload_to="support/attachments/",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"SupportMessage #{self.id} on {self.ticket.ticket_number}"


class CollaborationTeam(models.Model):
    """
    Collaboration team created and owned by an artist.
    Shared booking coverage is calculated dynamically as the strict
    intersection of all active members' ArtistServiceDistrict records.
    """
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    owner = models.ForeignKey(
        ArtistProfile,
        on_delete=models.PROTECT,
        related_name="owned_collaboration_teams",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collaboration_teams",
    )
    profile_image = models.ImageField(
        upload_to="teams/logos/",
        null=True,
        blank=True,
    )
    cover_image = models.ImageField(
        upload_to="teams/covers/",
        null=True,
        blank=True,
    )
    is_publicly_visible = models.BooleanField(default=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"CollaborationTeam #{self.id}: {self.name} (Owner: {self.owner.stage_name})"

    def get_active_members(self):
        return self.memberships.filter(
            status=CollaborationTeamMember.Status.ACTIVE
        ).select_related("artist", "artist__category", "artist__user", "artist__state", "artist__district")

    def check_eligibility(self):
        """
        Determines if the team is eligible for public discovery.
        Rule: Every active member (including owner) must be eligible
        (is_active=True, is_verified=True, user.is_active=True).
        If any active member fails, returns (False, reason).
        """
        if not self.is_active:
            return False, "This collaboration team is closed or inactive."

        # Check owner eligibility
        from .collaboration_service import is_artist_eligible_for_collaboration
        if not is_artist_eligible_for_collaboration(self.owner):
            return False, f"Team owner '{self.owner.stage_name}' is currently inactive or pending verification."

        # Check all active members
        active_memberships = self.get_active_members()
        for m in active_memberships:
            if not is_artist_eligible_for_collaboration(m.artist):
                return False, f"Active member '{m.artist.stage_name}' is currently inactive or pending verification."

        return True, "Eligible"


class CollaborationTeamMember(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending"
        DECLINED = "declined", "Declined"
        REMOVED = "removed", "Removed"
        LEFT = "left", "Left"

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MEMBER = "member", "Member"

    team = models.ForeignKey(
        CollaborationTeam,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    invited_by = models.ForeignKey(
        ArtistProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_team_invitations",
    )
    message = models.TextField(blank=True, default="")
    joined_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["team", "artist"],
                name="unique_team_artist_membership",
            ),
        ]
        indexes = [
            models.Index(fields=["team", "status"]),
            models.Index(fields=["artist", "status"]),
        ]

    def __str__(self):
        return f"{self.artist.stage_name} ({self.role}) in {self.team.name} [{self.status}]"


class CollaborationTeamPortfolio(models.Model):
    class ItemType(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"
        YOUTUBE = "youtube", "YouTube Link"

    team = models.ForeignKey(
        CollaborationTeam,
        on_delete=models.CASCADE,
        related_name="portfolio_items",
    )
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        default=ItemType.PHOTO,
    )
    media_file = models.FileField(
        upload_to="teams/portfolio/",
        blank=True,
        null=True,
    )
    media_url = models.URLField(blank=True, max_length=500, default="")
    thumbnail = models.ImageField(
        upload_to="teams/portfolio/thumbnails/",
        blank=True,
        null=True,
    )
    thumbnail_url = models.CharField(max_length=500, blank=True, default="")
    youtube_url = models.URLField(blank=True, max_length=500, default="")
    duration = models.CharField(max_length=30, blank=True, default="")
    dimensions = models.CharField(max_length=50, blank=True, default="")
    file_size = models.CharField(max_length=50, blank=True, default="")
    format_ext = models.CharField(max_length=20, blank=True, default="")
    is_featured = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-uploaded_at"]
        indexes = [
            models.Index(fields=["team", "is_public", "display_order"]),
        ]

    def __str__(self):
        return f"Team #{self.team_id} ({self.team.name}) - {self.title} ({self.item_type})"




