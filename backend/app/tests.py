import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from app.models import Category, ArtistProfile, Booking


class AuthViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="securepassword123",
        )

    def test_csrf_token_view(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("csrfToken", data)
        self.assertTrue(bool(data["csrfToken"]))

    def test_register_success(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "strongPassword123!",
                "role": "customer",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["username"], "newuser")

    def test_register_missing_role(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "noroleuser",
                "email": "norole@example.com",
                "password": "strongPassword123!",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"],
            "Please select whether you want to join as a Customer or Performing Artist.",
        )

    def test_register_invalid_email(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "invalidemailuser",
                "email": "not-a-valid-email",
                "password": "strongPassword123!",
                "role": "customer",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Enter a valid email address.")

    def test_register_duplicate_username(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "TESTUSER",
                "email": "another@example.com",
                "password": "strongPassword123!",
                "role": "customer",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "This username is already taken.")

    def test_register_duplicate_email(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "uniqueuser",
                "email": "TEST@example.com",
                "password": "strongPassword123!",
                "role": "customer",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "This email is already registered.")

    def test_register_short_password(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "shortpassuser",
                "email": "short@example.com",
                "password": "short",
                "role": "customer",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"], "Password must contain at least 8 characters."
        )

    def test_login_success_with_username(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username_or_email": "testuser",
                "password": "securepassword123",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Login successful.")
        self.assertEqual(data["user"]["username"], "testuser")

    def test_login_success_with_email(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username_or_email": "TEST@example.com",
                "password": "securepassword123",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Login successful.")
        self.assertEqual(data["user"]["username"], "testuser")

    def test_login_invalid_password(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username_or_email": "testuser",
                "password": "wrongpassword",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"], "Invalid username/email or password."
        )

    def test_login_validation_error(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username_or_email": "",
                "password": "",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.json())

    def test_current_user_unauthenticated(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_current_user_authenticated(self):
        self.client.login(username="testuser", password="securepassword123")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], "testuser")

    def test_logout(self):
        self.client.login(username="testuser", password="securepassword123")
        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Logout successful.")

    def test_artist_login_redirect_and_dashboard(self):
        artist_user = User.objects.create_user(
            username="stageartist",
            email="artist@example.com",
            password="securepassword123",
        )
        cat, _ = Category.objects.get_or_create(name="Singers & Vocalists")
        ArtistProfile.objects.create(
            user=artist_user,
            category=cat,
            stage_name="Singer Star",
            location="Mumbai",
            starting_price=10000,
        )

        # Login
        res_login = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username_or_email": "stageartist",
                "password": "securepassword123",
            }),
            content_type="application/json",
        )
        self.assertEqual(res_login.status_code, 200)
        data_login = res_login.json()
        self.assertEqual(data_login["role"], "artist")
        self.assertEqual(data_login["redirect_to"], "/profile")

        # Dashboard GET
        res_dash = self.client.get("/api/artist/dashboard/")
        self.assertEqual(res_dash.status_code, 200)
        dash_data = res_dash.json()
        self.assertIn("artist", dash_data)
        self.assertEqual(dash_data["artist"]["stage_name"], "Singer Star")
        self.assertIn("stats", dash_data)
        self.assertEqual(dash_data["stats"]["total_bookings"], 0)


class BookingViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = User.objects.create_user(
            username="bookingcustomer",
            email="cust@example.com",
            password="securepassword123",
        )
        self.artist_user = User.objects.create_user(
            username="performingartist",
            email="artist2@example.com",
            password="securepassword123",
        )
        cat, _ = Category.objects.get_or_create(name="Dancers & Troupes")
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=cat,
            stage_name="Dance Troupe Alpha",
            location="Pune",
            starting_price=25000,
        )

    def test_create_booking_unauthenticated(self):
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({"artist_id": self.artist.id}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 401)

    def test_create_booking_self_booking_prevented(self):
        self.client.login(username="performingartist", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Wedding",
                "event_date": "2027-12-01",
                "event_time": "19:00",
                "event_location": "Pune",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("cannot book your own", res.json()["error"])

    def test_create_booking_past_date_rejected(self):
        self.client.login(username="bookingcustomer", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Wedding",
                "event_date": "2020-01-01",
                "event_time": "19:00",
                "event_location": "Grand Hyatt",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("must be in the future", res.json()["error"])

    def test_create_booking_success(self):
        self.client.login(username="bookingcustomer", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Corporate Event",
                "event_date": "2028-06-15",
                "event_time": "18:30",
                "event_location": "JW Marriott, Mumbai",
                "performance_duration": "3 hours",
                "expected_audience_size": 350,
                "agreed_price": 30000,
                "message": "Need state-of-the-art stage lighting and PA system.",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["performance_duration"], "3 hours")
        self.assertEqual(data["expected_audience_size"], 350)

        # Check DB records
        booking = Booking.objects.get(id=data["booking_id"])
        self.assertEqual(booking.performance_duration, "3 hours")
        self.assertEqual(booking.expected_audience_size, 350)
        self.assertEqual(booking.status, "pending")
        self.assertTrue(hasattr(booking, "payment"))
        self.assertEqual(booking.payment.status, "pending")

        # Verify customer dashboard serializer
        cust_res = self.client.get("/api/customer/dashboard/")
        self.assertEqual(cust_res.status_code, 200)
        cust_bookings = cust_res.json()["bookings"]
        self.assertTrue(any(b["id"] == booking.id and b["performance_duration"] == "3 hours" for b in cust_bookings))


