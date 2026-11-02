from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf_token_view, name="csrf_token"),
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("me/", views.current_user_view, name="current_user"),
    path("logout/", views.logout_view, name="logout"),
    path("google/", views.google_login_view, name="google_login"),
    path("artist/categories/", views.artist_categories, name="artist_categories"),
    path("artist/profile/", views.artist_profile_view, name="artist_profile"),
    path("artists/", views.artists_list_view, name="artists_list"),
    path("artists/<int:artist_id>/", views.artist_detail_view, name="artist_detail"),
    path("bookings/", views.create_booking_view, name="create_booking"),
    path("customer/dashboard/", views.customer_dashboard_view, name="customer_dashboard"),
    path("customer/profile/", views.customer_update_profile_view, name="customer_update_profile"),
    path("customer/change-password/", views.customer_change_password_view, name="customer_change_password"),
    path("customer/deactivate/", views.customer_deactivate_account_view, name="customer_deactivate_account"),
    path("customer/favorites/<int:artist_id>/toggle/", views.customer_toggle_favorite_view, name="customer_toggle_favorite"),
    path("customer/bookings/<int:booking_id>/cancel/", views.customer_cancel_booking_view, name="customer_cancel_booking"),
    path("customer/notifications/mark-read/", views.customer_notifications_read_view, name="customer_notifications_read"),
    path("customer/support/", views.customer_support_inquiry_view, name="customer_support_inquiry"),
    path("check-username/",views.check_username_view,name="check_username"),
    # Performing Artist Dashboard endpoints
    path("artist/dashboard/", views.artist_dashboard_view, name="artist_dashboard"),
    path("artist/bookings/<int:booking_id>/respond/", views.artist_respond_booking_view, name="artist_respond_booking"),
    path("artist/bookings/<int:booking_id>/complete/", views.artist_complete_booking_view, name="artist_complete_booking"),
    path("artist/portfolio/", views.artist_portfolio_view, name="artist_portfolio"),
    path("artist/portfolio/<int:item_id>/delete/", views.artist_portfolio_delete_view, name="artist_portfolio_delete"),
    path("artist/availability/", views.artist_availability_view, name="artist_availability"),
    path("artist/availability/<int:avail_id>/delete/", views.artist_availability_delete_view, name="artist_availability_delete"),
]
