from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from app import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("app.urls")),
    path("api/artists/", views.artists_list_view, name="api_artists_list"),
    path("api/artists/<int:artist_id>/", views.artist_detail_view, name="api_artist_detail"),
    path("api/bookings/", views.create_booking_view, name="api_create_booking"),
    path("api/customer/dashboard/", views.customer_dashboard_view, name="api_customer_dashboard"),
    path("api/customer/profile/", views.customer_update_profile_view, name="api_customer_update_profile"),
    path("api/customer/change-password/", views.customer_change_password_view, name="api_customer_change_password"),
    path("api/customer/deactivate/", views.customer_deactivate_account_view, name="api_customer_deactivate_account"),
    path("api/customer/favorites/<int:artist_id>/toggle/", views.customer_toggle_favorite_view, name="api_customer_toggle_favorite"),
    path("api/customer/bookings/<int:booking_id>/cancel/", views.customer_cancel_booking_view, name="api_customer_cancel_booking"),
    path("api/customer/notifications/mark-read/", views.customer_notifications_read_view, name="api_customer_notifications_read"),
    path("api/customer/support/", views.customer_support_inquiry_view, name="api_customer_support_inquiry"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
