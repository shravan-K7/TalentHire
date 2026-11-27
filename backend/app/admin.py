from django.contrib import admin
from .models import (
    Category,
    Country,
    State,
    District,
    City,
    ArtistProfile,
    ArtistServiceDistrict,
    Portfolio,
    Booking,
    Payment,
    Review,
    CustomerProfile,
    FavoriteArtist,
    Notification,
    ArtistAvailability,
    Refund,
    ProcessedWebhookEvent,
    BookingCancellation,
    ReschedulingRequest,
    ChatSession,
    ChatMessage,
    ChatbotErrorLog,
    SupportTicket,
    SupportMessage,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name", "description")


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "country", "is_union_territory")
    list_filter = ("country", "is_union_territory")
    search_fields = ("name", "code")


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "state")
    list_filter = ("state",)
    search_fields = ("name", "state__name")


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "district", "state")
    list_filter = ("state",)
    search_fields = ("name", "district__name", "state__name")


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


@admin.register(ArtistServiceDistrict)
class ArtistServiceDistrictAdmin(admin.ModelAdmin):
    list_display = ("artist", "district", "created_at")
    list_filter = ("district__state",)
    search_fields = ("artist__stage_name", "district__name", "district__state__name")


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


@admin.register(ArtistAvailability)
class ArtistAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("artist", "date", "is_available", "reason", "created_at")
    list_filter = ("is_available", "date")
    search_fields = ("artist__stage_name", "reason")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("id", "payment", "booking", "amount", "status", "razorpay_refund_id", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("razorpay_refund_id", "idempotency_key", "booking__customer__username")


@admin.register(ProcessedWebhookEvent)
class ProcessedWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("event_id", "event_type", "processed_at")
    list_filter = ("event_type", "processed_at")
    search_fields = ("event_id", "event_type")


@admin.register(BookingCancellation)
class BookingCancellationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "cancelled_by",
        "cancelled_by_user",
        "refund_percentage",
        "paid_amount",
        "refund_amount",
        "retained_amount",
        "platform_fee",
        "artist_payout",
        "created_at",
    )
    list_filter = ("cancelled_by", "created_at")
    search_fields = ("booking__id", "cancelled_by_user__username", "reason", "policy_applied")


@admin.register(ReschedulingRequest)
class ReschedulingRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "customer",
        "artist",
        "original_event_date",
        "new_event_date",
        "status",
        "requested_at",
        "responded_at",
    )
    list_filter = ("status", "requested_at", "responded_at")
    search_fields = ("booking__id", "customer__username", "artist__stage_name", "reason", "artist_response")


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role_context", "title", "is_active", "created_at", "updated_at")
    list_filter = ("role_context", "is_active", "created_at")
    search_fields = ("user__username", "user__email", "title")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "sender", "topic", "latency_ms", "created_at")
    list_filter = ("sender", "topic", "created_at")
    search_fields = ("session__user__username", "content", "topic")


@admin.register(ChatbotErrorLog)
class ChatbotErrorLogAdmin(admin.ModelAdmin):
    list_display = ("id", "role_context", "error_type", "latency_ms", "created_at")
    list_filter = ("role_context", "error_type", "created_at")


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("ticket_number", "subject", "artist", "category", "status", "created_at", "updated_at")
    list_filter = ("status", "category", "created_at")
    search_fields = ("ticket_number", "subject", "artist__username", "artist__email")


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "sender", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("ticket__ticket_number", "sender__username", "message")



