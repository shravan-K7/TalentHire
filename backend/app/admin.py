from django.contrib import admin
from .models import (
    Category,
    ArtistProfile,
    Portfolio,
    Booking,
    Payment,
    Review,
    CustomerProfile,
    FavoriteArtist,
    Notification,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name", "description")


@admin.register(ArtistProfile)
class ArtistProfileAdmin(admin.ModelAdmin):
    list_display = (
        "stage_name",
        "category",
        "gender",
        "location",
        "starting_price",
        "years_of_experience",
        "travel_availability",
        "is_verified",
        "is_active",
        "created_at",
    )
    list_filter = ("category", "gender", "is_verified", "is_active", "travel_availability")
    search_fields = ("stage_name", "user__username", "user__email", "location", "bio")
    list_editable = ("is_verified", "is_active")


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "media_url", "uploaded_at")
    search_fields = ("title", "artist__stage_name")
    list_filter = ("uploaded_at",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "artist",
        "event_type",
        "customer_phone",
        "event_date",
        "event_location",
        "agreed_price",
        "status",
        "created_at",
    )
    list_filter = ("status", "event_date", "created_at")
    search_fields = (
        "customer__username",
        "customer__email",
        "customer_phone",
        "artist__stage_name",
        "event_location",
        "event_type",
    )
    list_editable = ("status",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("booking", "amount", "transaction_id", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("transaction_id", "booking__customer__username")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("artist", "customer", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("artist__stage_name", "customer__username", "comment")


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "location", "is_verified", "created_at")
    search_fields = ("user__username", "user__email", "phone", "location")
    list_filter = ("is_verified", "created_at")


@admin.register(FavoriteArtist)
class FavoriteArtistAdmin(admin.ModelAdmin):
    list_display = ("customer", "artist", "created_at")
    search_fields = ("customer__username", "artist__stage_name")
    list_filter = ("created_at",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("user__username", "title", "message")
    list_editable = ("is_read",)

