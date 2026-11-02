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
    # Artist Dashboard & Management API Endpoints
    path("api/artist/dashboard/", views.artist_dashboard_view, name="api_artist_dashboard"),
    path("api/artist/bookings/<int:booking_id>/respond/", views.artist_respond_booking_view, name="api_artist_respond_booking"),
    path("api/artist/bookings/<int:booking_id>/complete/", views.artist_complete_booking_view, name="api_artist_complete_booking"),
    path("api/artist/portfolio/", views.artist_portfolio_view, name="api_artist_portfolio"),
    path("api/artist/portfolio/<int:item_id>/delete/", views.artist_portfolio_delete_view, name="api_artist_portfolio_delete"),
    path("api/artist/availability/", views.artist_availability_view, name="api_artist_availability"),
    path("api/artist/availability/<int:avail_id>/delete/", views.artist_availability_delete_view, name="api_artist_availability_delete"),
    path("api/artist/profile/", views.artist_profile_view, name="api_artist_profile"),
    path("api/artist/categories/", views.artist_categories, name="api_artist_categories"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
