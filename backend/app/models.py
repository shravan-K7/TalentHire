from django.conf import settings
from django.db import models, transaction


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


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
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(
        upload_to="artists/profiles/",
        blank=True,
        null=True,
    )
    years_of_experience = models.PositiveSmallIntegerField(default=0)
    performance_types = models.JSONField(default=list, blank=True)
    travel_availability = models.CharField(
        max_length=50,
        choices=[
            ("city", "Within my city"),
            ("state", "Across my state"),
            ("india", "Across India"),
            ("international", "International"),
        ],
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
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.stage_name


class Portfolio(models.Model):
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="portfolio_items",
    )
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    media_url = models.URLField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

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
    event_location = models.CharField(max_length=200)
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
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def expires_at(self):
        """Returns the 24-hour payment reservation deadline after acceptance."""
        if self.accepted_at:
            from datetime import timedelta
            return self.accepted_at + timedelta(hours=24)
        return None

    def __str__(self):
        return f"{self.customer} - {self.artist} ({self.status})"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

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
