"""
Admin URL Routing Configuration for TalentHire.
Prefix: /api/admin/
"""

from django.urls import path

from . import admin_views

urlpatterns = [
    # Overview & KPI Analytics
    path("overview/", admin_views.admin_overview_view, name="admin_overview"),

    # User Management
    path("users/", admin_views.admin_users_list_view, name="admin_users_list"),
    path("users/<int:user_id>/toggle-status/", admin_views.admin_toggle_user_status_view, name="admin_toggle_user_status"),

    # Artist Management & Verification
    path("artists/", admin_views.admin_artists_list_view, name="admin_artists_list"),
    path("artists/verifications/", admin_views.admin_verification_queue_view, name="admin_verification_queue"),
    path("artists/<int:artist_id>/verify/", admin_views.admin_artist_verify_action_view, name="admin_artist_verify_action"),

    # Booking Management
    path("bookings/", admin_views.admin_bookings_list_view, name="admin_bookings_list"),
    path("bookings/<int:booking_id>/", admin_views.admin_booking_detail_view, name="admin_booking_detail"),

    # Financial Management
    path("finance/transactions/", admin_views.admin_transactions_list_view, name="admin_transactions_list"),
    path("finance/refunds/", admin_views.admin_refunds_list_view, name="admin_refunds_list"),

    # Platform Categories
    path("categories/", admin_views.admin_categories_list_view, name="admin_categories_list"),
    path("categories/create/", admin_views.admin_category_create_view, name="admin_category_create"),
    path("categories/<int:category_id>/edit/", admin_views.admin_category_edit_view, name="admin_category_edit"),

    # Complaints & Disputes
    path("complaints/", admin_views.admin_complaints_list_view, name="admin_complaints_list"),
    path("complaints/<int:complaint_id>/resolve/", admin_views.admin_complaint_resolve_view, name="admin_complaint_resolve"),

    # Support Management (Artist Help & Support Tickets)
    path("support/tickets/", admin_views.admin_support_tickets_list_view, name="admin_support_tickets_list"),
    path("support/tickets/<int:ticket_id>/", admin_views.admin_support_ticket_detail_view, name="admin_support_ticket_detail"),
    path("support/tickets/<int:ticket_id>/reply/", admin_views.admin_support_ticket_reply_view, name="admin_support_ticket_reply"),
    path("support/tickets/<int:ticket_id>/status/", admin_views.admin_support_ticket_status_view, name="admin_support_ticket_status"),

    # Reviews & Moderation
    path("reviews/", admin_views.admin_reviews_list_view, name="admin_reviews_list"),
    path("reviews/<int:review_id>/delete/", admin_views.admin_review_delete_view, name="admin_review_delete"),

    # Notifications & Announcements
    path("notifications/history/", admin_views.admin_notifications_history_view, name="admin_notifications_history"),
    path("notifications/send/", admin_views.admin_notification_send_view, name="admin_notification_send"),

    # AI Chatbot Monitoring
    path("chatbot/", admin_views.admin_chatbot_monitoring_view, name="admin_chatbot_monitoring"),

    # Reports & Analytics
    path("reports/", admin_views.admin_reports_analytics_view, name="admin_reports_analytics"),
    path("reports/export-csv/", admin_views.admin_export_csv_view, name="admin_export_csv"),

    # System Settings & Audit Logs
    path("settings/", admin_views.admin_settings_view, name="admin_settings"),
    path("activity-logs/", admin_views.admin_activity_logs_view, name="admin_activity_logs"),
]
