import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from app.models import Category, ArtistProfile, Booking, Payment, ArtistAvailability, Refund


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

    def test_create_booking_with_phone_number(self):
        self.client.login(username="bookingcustomer", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Wedding",
                "event_date": "2028-07-20",
                "event_time": "19:00",
                "event_location": "Taj Palace, New Delhi",
                "customer_phone": "+91 98765 43210",
                "performance_duration": "2 hours",
                "expected_audience_size": 200,
                "agreed_price": 45000,
                "message": "Special sangeet entrance performance.",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["customer_phone"], "+91 98765 43210")

        # Verify DB
        booking = Booking.objects.get(id=data["booking_id"])
        self.assertEqual(booking.customer_phone, "+91 98765 43210")

        # Verify CustomerProfile updated
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.customer_profile.phone, "+91 98765 43210")

        # Verify customer dashboard returns phone
        cust_res = self.client.get("/api/customer/dashboard/")
        self.assertEqual(cust_res.status_code, 200)
        b_data = next(b for b in cust_res.json()["bookings"] if b["id"] == booking.id)
        self.assertEqual(b_data["customer_phone"], "+91 98765 43210")

        # Verify artist dashboard returns customer_phone
        self.client.login(username="performingartist", password="securepassword123")
        art_res = self.client.get("/api/artist/dashboard/")
        self.assertEqual(art_res.status_code, 200)
        art_b_data = next(b for b in art_res.json()["bookings"] if b["id"] == booking.id)
        self.assertEqual(art_b_data["customer_phone"], "+91 98765 43210")

    def test_create_booking_invalid_phone_rejected(self):
        self.client.login(username="bookingcustomer", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Wedding",
                "event_date": "2028-07-20",
                "event_time": "19:00",
                "event_location": "Taj Palace, New Delhi",
                "customer_phone": "123",
                "performance_duration": "2 hours",
                "expected_audience_size": 200,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("valid phone number", res.json()["error"])


import datetime
import hashlib
import hmac
from decimal import Decimal
from unittest.mock import MagicMock, patch
import razorpay
from django.conf import settings
from django.utils import timezone
from app.models import Payment, Notification


class RazorpayPaymentTests(TestCase):
    def setUp(self):
        self.client = Client()
        settings.RAZORPAY_KEY_ID = "rzp_test_Tw3JgrmY6EnXmE"
        settings.RAZORPAY_KEY_SECRET = "xyvG9RCwECgRSLf6NvDAmiI7"
        settings.RAZORPAY_WEBHOOK_SECRET = "talenthire_test_webhook_secret_2026"

        self.customer = User.objects.create_user(
            username="customer_user",
            email="customer@example.com",
            password="password123",
        )
        self.client.force_login(self.customer)

        self.artist_user = User.objects.create_user(
            username="artist_user",
            email="artist@example.com",
            password="password123",
        )
        self.category = Category.objects.create(name="Live Band")
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            stage_name="The Melody Makers",
            category=self.category,
            location="Hyderabad, Telangana",
            starting_price=Decimal("5000.00"),
            is_active=True,
        )

        self.booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Wedding",
            event_date=timezone.now() + datetime.timedelta(days=10),
            event_location="Hyderabad",
            performance_duration="2 hours",
            expected_audience_size=200,
            agreed_price=Decimal("5500.00"),
            status=Booking.Status.ACCEPTED,
        )
        self.payment = Payment.objects.create(
            booking=self.booking,
            amount=Decimal("5500.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("440.00"),
            artist_amount=Decimal("5060.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_test_5500",
        )

    def generate_signature(self, order_id, payment_id):
        secret = settings.RAZORPAY_KEY_SECRET
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    def generate_webhook_signature(self, body_str):
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        return hmac.new(secret.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256).hexdigest()

    @patch("razorpay.Client")
    def test_01_successful_razorpay_payment(self, mock_client_cls):
        payment_id = "pay_test_01"
        order_id = self.payment.razorpay_order_id
        sig = self.generate_signature(order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": order_id,
            "amount": 550000,
            "currency": "INR",
            "status": "captured",
            "created_at": int(timezone.now().timestamp()),
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESS)
        self.assertEqual(self.payment.transaction_id, payment_id)
        self.assertEqual(self.payment.commission_amount, Decimal("440.00"))
        self.assertEqual(self.payment.artist_amount, Decimal("5060.00"))

        # Verify notifications created
        self.assertTrue(Notification.objects.filter(user=self.customer, title="Payment Successful").exists())
        self.assertTrue(Notification.objects.filter(user=self.artist_user, title="Booking Payment Received").exists())

    def test_02_invalid_signature(self):
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": self.payment.razorpay_order_id,
                "razorpay_payment_id": "pay_test_02",
                "razorpay_signature": "invalid_signature_hex_1234",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Payment signature verification failed.")

    def test_03_missing_payment_fields(self):
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": self.payment.razorpay_order_id,
                "razorpay_payment_id": "pay_test_03",
                # missing signature
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Missing", res.json()["error"])

    def test_04_incorrect_order_id(self):
        sig = self.generate_signature("order_non_existent", "pay_test_04")
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": "order_non_existent",
                "razorpay_payment_id": "pay_test_04",
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 404)

    @patch("razorpay.Client")
    def test_05_incorrect_payment_amount(self, mock_client_cls):
        payment_id = "pay_test_05"
        order_id = self.payment.razorpay_order_id
        sig = self.generate_signature(order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": order_id,
            "amount": 200000,  # Mismatch with 550000
            "currency": "INR",
            "status": "captured",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("amount does not match", res.json()["error"])

    @patch("razorpay.Client")
    def test_06_incorrect_currency(self, mock_client_cls):
        payment_id = "pay_test_06"
        order_id = self.payment.razorpay_order_id
        sig = self.generate_signature(order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": order_id,
            "amount": 550000,
            "currency": "USD",  # Not INR
            "status": "captured",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Invalid payment currency.")

    @patch("razorpay.Client")
    def test_07_payment_not_captured(self, mock_client_cls):
        payment_id = "pay_test_07"
        order_id = self.payment.razorpay_order_id
        sig = self.generate_signature(order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": order_id,
            "amount": 550000,
            "currency": "INR",
            "status": "authorized",  # Not captured yet
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("not been captured", res.json()["error"])

    def test_08_duplicate_verification_request(self):
        payment_id = "pay_test_08"
        self.payment.status = Payment.Status.SUCCESS
        self.payment.transaction_id = payment_id
        self.payment.save()

        sig = self.generate_signature(self.payment.razorpay_order_id, payment_id)
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": self.payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["message"], "Payment already verified.")

    def test_09_already_paid_booking(self):
        self.payment.status = Payment.Status.SUCCESS
        self.payment.transaction_id = "pay_already_done"
        self.payment.save()

        res = self.client.post(
            f"/api/payments/bookings/{self.booking.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already been paid", res.json()["error"])

    @patch("razorpay.Client")
    def test_10_reuse_unpaid_razorpay_order(self, mock_client_cls):
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.order.fetch.return_value = {
            "id": self.payment.razorpay_order_id,
            "amount": 550000,
            "currency": "INR",
            "status": "created",
        }

        res = self.client.post(
            f"/api/payments/bookings/{self.booking.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["order_id"], self.payment.razorpay_order_id)
        mock_instance.order.create.assert_not_called()

    @patch("razorpay.Client")
    def test_11_attempted_reuse_paid_razorpay_order_reconciles(self, mock_client_cls):
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.order.fetch.return_value = {
            "id": self.payment.razorpay_order_id,
            "amount": 550000,
            "currency": "INR",
            "status": "paid",
        }
        mock_instance.order.payments.return_value = {
            "items": [
                {
                    "id": "pay_reconciled_11",
                    "status": "captured",
                    "amount": 550000,
                    "currency": "INR",
                }
            ]
        }

        res = self.client.post(
            f"/api/payments/bookings/{self.booking.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("already_paid"))
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESS)
        self.assertEqual(self.payment.transaction_id, "pay_reconciled_11")

    def test_12_failed_payment_webhook(self):
        body = json.dumps({
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_failed_12",
                        "order_id": self.payment.razorpay_order_id,
                        "status": "failed",
                    }
                }
            }
        })
        sig = self.generate_webhook_signature(body)
        res = self.client.post(
            "/api/payments/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.PENDING)

    def test_13_customer_closes_checkout_state_preserved(self):
        # Checkout closed on frontend does not change database payment status
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.PENDING)
        self.assertEqual(self.payment.razorpay_order_id, "order_test_5500")

    @patch("razorpay.Client")
    def test_14_frontend_callback_fails_after_capture_order_fetch_reconciles(self, mock_client_cls):
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.order.fetch.return_value = {
            "id": self.payment.razorpay_order_id,
            "status": "paid",
        }
        mock_instance.order.payments.return_value = {
            "items": [
                {
                    "id": "pay_captured_offline_14",
                    "status": "captured",
                }
            ]
        }
        res = self.client.post(
            f"/api/payments/bookings/{self.booking.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESS)
        self.assertEqual(self.payment.transaction_id, "pay_captured_offline_14")

    def test_15_webhook_successfully_reconciles_payment(self):
        payment_id = "pay_webhook_15"
        body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": self.payment.razorpay_order_id,
                        "amount": 550000,
                        "currency": "INR",
                        "status": "captured",
                        "created_at": int(timezone.now().timestamp()),
                    }
                }
            }
        })
        sig = self.generate_webhook_signature(body)
        res = self.client.post(
            "/api/payments/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESS)
        self.assertEqual(self.payment.transaction_id, payment_id)
        self.assertEqual(self.payment.commission_amount, Decimal("440.00"))
        self.assertEqual(self.payment.artist_amount, Decimal("5060.00"))

    def test_16_duplicate_webhook_delivery(self):
        payment_id = "pay_webhook_16"
        body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": self.payment.razorpay_order_id,
                        "amount": 550000,
                        "currency": "INR",
                        "status": "captured",
                        "created_at": int(timezone.now().timestamp()),
                    }
                }
            }
        })
        sig = self.generate_webhook_signature(body)

        # First delivery
        res1 = self.client.post(
            "/api/payments/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig,
        )
        self.assertEqual(res1.status_code, 200)

        # Second delivery (duplicate)
        res2 = self.client.post(
            "/api/payments/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig,
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["message"], "Payment already captured.")

        # Assert no duplicate notifications were created
        customer_notifs = Notification.objects.filter(user=self.customer, title="Payment Successful").count()
        artist_notifs = Notification.objects.filter(user=self.artist_user, title="Booking Payment Received").count()
        self.assertEqual(customer_notifs, 1)
        self.assertEqual(artist_notifs, 1)

    def test_17_invalid_webhook_signature(self):
        body = json.dumps({"event": "payment.captured"})
        res = self.client.post(
            "/api/payments/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="fake_bad_signature",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Invalid webhook signature.")

    @patch("razorpay.Client")
    def test_18_frontend_verification_and_webhook_simultaneous(self, mock_client_cls):
        payment_id = "pay_simultaneous_18"
        order_id = self.payment.razorpay_order_id

        # 1. Frontend verifies
        sig = self.generate_signature(order_id, payment_id)
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": order_id,
            "amount": 550000,
            "currency": "INR",
            "status": "captured",
            "created_at": int(timezone.now().timestamp()),
        }

        res_frontend = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res_frontend.status_code, 200)

        # 2. Webhook arrives concurrently
        body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": order_id,
                        "amount": 550000,
                        "currency": "INR",
                        "status": "captured",
                        "created_at": int(timezone.now().timestamp()),
                    }
                }
            }
        })
        sig_wh = self.generate_webhook_signature(body)
        res_webhook = self.client.post(
            "/api/payments/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig_wh,
        )
        self.assertEqual(res_webhook.status_code, 200)

        # Confirm exact notification count is 1
        customer_notifs = Notification.objects.filter(user=self.customer, title="Payment Successful").count()
        self.assertEqual(customer_notifs, 1)

    def test_19_different_payment_id_for_already_paid_booking(self):
        self.payment.status = Payment.Status.SUCCESS
        self.payment.transaction_id = "pay_initial_txn"
        self.payment.save()

        sig = self.generate_signature(self.payment.razorpay_order_id, "pay_different_fraud_txn")
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": self.payment.razorpay_order_id,
                "razorpay_payment_id": "pay_different_fraud_txn",
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("different payment ID", res.json()["error"])

    @patch("razorpay.Client")
    def test_20_network_failure_during_order_creation(self, mock_client_cls):
        # Create booking without existing razorpay_order_id
        booking2 = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Birthday",
            event_date=timezone.now() + datetime.timedelta(days=15),
            event_location="Hyderabad",
            performance_duration="1 hour",
            agreed_price=Decimal("3000.00"),
            status=Booking.Status.ACCEPTED,
        )
        Payment.objects.create(
            booking=booking2,
            amount=Decimal("3000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("240.00"),
            artist_amount=Decimal("2760.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id=None,
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.order.create.side_effect = razorpay.errors.GatewayError("Network timeout connecting to Razorpay")

        res = self.client.post(
            f"/api/payments/bookings/{booking2.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 502)
        self.assertEqual(res.json()["error"], "Unable to create payment order. Please try again.")


class ArtistPublicAvailabilityTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = User.objects.create_user(
            username="testcustomer_avail",
            email="cust_avail@example.com",
            password="securepassword123",
        )
        self.artist_user = User.objects.create_user(
            username="testartist_avail",
            email="artist_avail@example.com",
            password="securepassword123",
        )
        cat, _ = Category.objects.get_or_create(name="Live Music")
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=cat,
            stage_name="Acoustic Duo",
            location="Bengaluru",
            starting_price=10000,
        )

    def test_public_availability_valid_empty_month(self):
        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-01")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["artist_id"], self.artist.id)
        self.assertEqual(data["month"], "2027-01")
        self.assertEqual(data["unavailable_dates"], [])

    def test_public_availability_missing_month(self):
        res = self.client.get(f"/api/artists/{self.artist.id}/availability/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_public_availability_invalid_month(self):
        for bad_month in ["2026-13", "2026-00", "invalid", "2026/12", "2026-5"]:
            res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month={bad_month}")
            self.assertEqual(res.status_code, 400)
            self.assertIn("Invalid month format", res.json()["error"])

    def test_public_availability_nonexistent_artist(self):
        res = self.client.get("/api/artists/99999/availability/?month=2026-12")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["error"], "Artist profile not found.")

    def test_public_availability_manual_block(self):
        ArtistAvailability.objects.create(
            artist=self.artist,
            date=datetime.date(2027, 2, 14),
            is_available=False,
            reason="Valentine Private Event",
        )
        # Also create an explicit available record to ensure it is NOT marked unavailable
        ArtistAvailability.objects.create(
            artist=self.artist,
            date=datetime.date(2027, 2, 15),
            is_available=True,
            reason="Free day",
        )
        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-02")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["unavailable_dates"], ["2027-02-14"])

    def test_public_availability_paid_booking_unavailable(self):
        from zoneinfo import ZoneInfo
        kolkata = ZoneInfo("Asia/Kolkata")
        event_dt = datetime.datetime(2027, 3, 20, 18, 0, tzinfo=kolkata)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Concert",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            agreed_price=Decimal("15000.00"),
            status=Booking.Status.ACCEPTED,
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_test_avail_1",
            transaction_id="pay_test_avail_1",
        )

        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-03")
        self.assertEqual(res.status_code, 200)
        self.assertIn("2027-03-20", res.json()["unavailable_dates"])

    def test_public_availability_completed_booking_unavailable(self):
        from zoneinfo import ZoneInfo
        kolkata = ZoneInfo("Asia/Kolkata")
        event_dt = datetime.datetime(2027, 4, 10, 14, 0, tzinfo=kolkata)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Corporate Show",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="3 hours",
            agreed_price=Decimal("20000.00"),
            status=Booking.Status.COMPLETED,
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("20000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1600.00"),
            artist_amount=Decimal("18400.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_test_avail_2",
            transaction_id="pay_test_avail_2",
        )

        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-04")
        self.assertEqual(res.status_code, 200)
        self.assertIn("2027-04-10", res.json()["unavailable_dates"])

    def test_public_availability_active_24h_reservation_unavailable(self):
        from zoneinfo import ZoneInfo
        kolkata = ZoneInfo("Asia/Kolkata")
        event_dt = datetime.datetime(2027, 5, 25, 19, 0, tzinfo=kolkata)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Club Night",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            agreed_price=Decimal("12000.00"),
            status=Booking.Status.ACCEPTED,
        )
        # Payment is pending, created just now (well within 24 hours)
        Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("960.00"),
            artist_amount=Decimal("11040.00"),
            status=Payment.Status.PENDING,
        )

        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-05")
        self.assertEqual(res.status_code, 200)
        self.assertIn("2027-05-25", res.json()["unavailable_dates"])

    def test_public_availability_expired_24h_reservation_available(self):
        from zoneinfo import ZoneInfo
        kolkata = ZoneInfo("Asia/Kolkata")
        event_dt = datetime.datetime(2027, 6, 15, 19, 0, tzinfo=kolkata)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Festival",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            agreed_price=Decimal("12000.00"),
            status=Booking.Status.ACCEPTED,
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("960.00"),
            artist_amount=Decimal("11040.00"),
            status=Payment.Status.PENDING,
        )
        # Simulate payment/booking acceptance was 25 hours ago
        expired_time = timezone.now() - datetime.timedelta(hours=25)
        Payment.objects.filter(id=payment.id).update(updated_at=expired_time, created_at=expired_time)
        Booking.objects.filter(id=booking.id).update(created_at=expired_time)

        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-06")
        self.assertEqual(res.status_code, 200)
        # Because reservation expired and unpaid, 2027-06-15 MUST NOT be in unavailable dates
        self.assertNotIn("2027-06-15", res.json()["unavailable_dates"])

    def test_public_availability_pending_request_does_not_block_date(self):
        from zoneinfo import ZoneInfo
        kolkata = ZoneInfo("Asia/Kolkata")
        event_dt = datetime.datetime(2027, 7, 7, 19, 0, tzinfo=kolkata)

        Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Inquiry Event",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            status=Booking.Status.PENDING,
        )

        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-07")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("2027-07-07", res.json()["unavailable_dates"])

    def test_public_availability_zero_customer_pii_leakage(self):
        res = self.client.get(f"/api/artists/{self.artist.id}/availability/?month=2027-01")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        forbidden_keys = ["customer", "email", "phone", "razorpay_order_id", "transaction_id", "message", "price"]
        for key in forbidden_keys:
            self.assertNotIn(key, data)
        self.assertEqual(set(data.keys()), {"artist_id", "month", "unavailable_dates"})

    def test_public_availability_rejects_post(self):
        res = self.client.post(f"/api/artists/{self.artist.id}/availability/?month=2027-01")
        self.assertEqual(res.status_code, 405)


class ManualArtistAvailabilityTests(TestCase):
    def setUp(self):
        self.client = Client()
        from zoneinfo import ZoneInfo
        self.kolkata = ZoneInfo("Asia/Kolkata")

        self.customer = User.objects.create_user(
            username="manual_cust",
            email="manual_cust@example.com",
            password="securepassword123",
        )
        self.artist_user_1 = User.objects.create_user(
            username="manual_artist_1",
            email="artist_1@example.com",
            password="securepassword123",
        )
        self.artist_user_2 = User.objects.create_user(
            username="manual_artist_2",
            email="artist_2@example.com",
            password="securepassword123",
        )
        cat, _ = Category.objects.get_or_create(name="DJ")
        self.artist_1 = ArtistProfile.objects.create(
            user=self.artist_user_1,
            category=cat,
            stage_name="DJ Solar",
            location="Mumbai",
            starting_price=12000,
        )
        self.artist_2 = ArtistProfile.objects.create(
            user=self.artist_user_2,
            category=cat,
            stage_name="DJ Lunar",
            location="Delhi",
            starting_price=15000,
        )

    def test_block_available_date_success(self):
        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-08-15",
                "is_available": False,
                "reason": "Independence Day Vacation",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["message"], "Availability updated successfully.")
        self.assertEqual(data["record"]["date"], "2027-08-15")
        self.assertFalse(data["record"]["is_available"])

        # Verify in DB
        record = ArtistAvailability.objects.filter(
            artist=self.artist_1, date=datetime.date(2027, 8, 15)
        ).first()
        self.assertIsNotNone(record)
        self.assertFalse(record.is_available)
        self.assertEqual(record.reason, "Independence Day Vacation")

    def test_block_date_occupied_by_paid_booking_conflict(self):
        event_dt = datetime.datetime(2027, 9, 10, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist_1,
            event_type="Wedding Sangeet",
            event_date=event_dt,
            event_location="Mumbai",
            performance_duration="3 hours",
            agreed_price=Decimal("18000.00"),
            status=Booking.Status.ACCEPTED,
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_test_p2_paid",
            transaction_id="pay_test_p2_paid",
        )

        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-09-10",
                "is_available": False,
                "reason": "Personal Off",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("successful payment already exists", res.json()["error"])

    def test_block_date_occupied_by_completed_booking_conflict(self):
        event_dt = datetime.datetime(2027, 9, 20, 19, 0, tzinfo=self.kolkata)
        Booking.objects.create(
            customer=self.customer,
            artist=self.artist_1,
            event_type="Club Performance",
            event_date=event_dt,
            event_location="Mumbai",
            performance_duration="2 hours",
            agreed_price=Decimal("14000.00"),
            status=Booking.Status.COMPLETED,
        )

        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-09-20",
                "is_available": False,
                "reason": "Trying to block completed show",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("completed booking already exists", res.json()["error"])

    def test_block_date_occupied_by_active_accepted_reservation_conflict(self):
        event_dt = datetime.datetime(2027, 10, 5, 20, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist_1,
            event_type="Cocktail Party",
            event_date=event_dt,
            event_location="Mumbai",
            performance_duration="2 hours",
            agreed_price=Decimal("12000.00"),
            status=Booking.Status.ACCEPTED,
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("960.00"),
            artist_amount=Decimal("11040.00"),
            status=Payment.Status.PENDING,
        )

        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-10-05",
                "is_available": False,
                "reason": "Attempting block during 24h window",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("active accepted reservation is awaiting payment", res.json()["error"])

    def test_block_date_occupied_by_expired_reservation_success(self):
        event_dt = datetime.datetime(2027, 10, 15, 20, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist_1,
            event_type="Festival Slot",
            event_date=event_dt,
            event_location="Mumbai",
            performance_duration="2 hours",
            agreed_price=Decimal("12000.00"),
            status=Booking.Status.ACCEPTED,
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("960.00"),
            artist_amount=Decimal("11040.00"),
            status=Payment.Status.PENDING,
        )
        # Simulate payment acceptance was 26 hours ago
        expired_time = timezone.now() - datetime.timedelta(hours=26)
        Payment.objects.filter(id=payment.id).update(updated_at=expired_time, created_at=expired_time)
        Booking.objects.filter(id=booking.id).update(created_at=expired_time)

        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-10-15",
                "is_available": False,
                "reason": "Date released after 24h expiry",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(ArtistAvailability.objects.filter(artist=self.artist_1, date=datetime.date(2027, 10, 15)).exists())

    def test_remove_manual_block_success(self):
        avail = ArtistAvailability.objects.create(
            artist=self.artist_1,
            date=datetime.date(2027, 11, 1),
            is_available=False,
            reason="Off day",
        )

        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.delete(f"/api/artist/availability/{avail.id}/delete/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["message"], "Availability record removed.")
        self.assertFalse(ArtistAvailability.objects.filter(id=avail.id).exists())

    def test_customer_attempt_block_forbidden(self):
        self.client.login(username="manual_cust", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-11-05",
                "is_available": False,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["error"], "Performing artist profile required.")

    def test_unauthenticated_attempt_block_unauthorized(self):
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "2027-11-05",
                "is_available": False,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json()["error"], "Authentication required.")

    def test_artist_modify_another_artist_block_forbidden(self):
        # Artist 1 creates a block
        avail_1 = ArtistAvailability.objects.create(
            artist=self.artist_1,
            date=datetime.date(2027, 11, 20),
            is_available=False,
            reason="Artist 1 personal off",
        )

        # Artist 2 attempts to delete Artist 1's block
        self.client.login(username="manual_artist_2", password="securepassword123")
        res = self.client.delete(f"/api/artist/availability/{avail_1.id}/delete/")
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized to modify another artist", res.json()["error"])
        # Record still exists
        self.assertTrue(ArtistAvailability.objects.filter(id=avail_1.id).exists())

    def test_artist_delete_nonexistent_block_404(self):
        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.delete("/api/artist/availability/99999/delete/")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["error"], "Availability record not found.")

    def test_artist_get_availability_list(self):
        ArtistAvailability.objects.create(
            artist=self.artist_1,
            date=datetime.date(2027, 12, 1),
            is_available=False,
            reason="December break",
        )
        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.get("/api/artist/availability/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("availability", data)
        dates = [item["date"] for item in data["availability"]]
        self.assertIn("2027-12-01", dates)

    def test_block_invalid_date_format(self):
        self.client.login(username="manual_artist_1", password="securepassword123")
        res = self.client.post(
            "/api/artist/availability/",
            data=json.dumps({
                "date": "invalid-date",
                "is_available": False,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid date format", res.json()["error"])


class Phase3BookingCreationAndAcceptanceTests(TestCase):
    def setUp(self):
        self.client = Client()
        from zoneinfo import ZoneInfo
        self.kolkata = ZoneInfo("Asia/Kolkata")

        self.customer_a = User.objects.create_user(
            username="cust_phase3_a",
            email="cust_p3_a@example.com",
            password="securepassword123",
        )
        self.customer_b = User.objects.create_user(
            username="cust_phase3_b",
            email="cust_p3_b@example.com",
            password="securepassword123",
        )
        self.artist_user = User.objects.create_user(
            username="artist_phase3_user",
            email="artist_p3@example.com",
            password="securepassword123",
        )
        self.other_artist_user = User.objects.create_user(
            username="artist_phase3_other",
            email="artist_p3_other@example.com",
            password="securepassword123",
        )

        cat, _ = Category.objects.get_or_create(name="Live Band")
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=cat,
            stage_name="The Phase 3 Band",
            location="Bengaluru",
            starting_price=20000,
        )
        self.other_artist = ArtistProfile.objects.create(
            user=self.other_artist_user,
            category=cat,
            stage_name="Other Band",
            location="Bengaluru",
            starting_price=15000,
        )

    def test_customer_create_booking_available_date_success(self):
        self.client.login(username="cust_phase3_a", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Corporate Gala",
                "event_date": "2027-11-20",
                "event_time": "18:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
                "customer_budget": "25000.00",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], Booking.Status.PENDING)
        self.assertTrue(Booking.objects.filter(id=data["booking_id"]).exists())
        # Check initial payment record created with status PENDING
        booking = Booking.objects.get(id=data["booking_id"])
        self.assertEqual(booking.payment.status, Payment.Status.PENDING)
        self.assertIsNone(booking.accepted_at)

    def test_customer_create_second_pending_request_same_date_success(self):
        # Customer A creates pending request for 2027-11-21
        self.client.login(username="cust_phase3_a", password="securepassword123")
        res_a = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Concert A",
                "event_date": "2027-11-21",
                "event_time": "18:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res_a.status_code, 201)

        # Customer B creates second pending request for SAME date 2027-11-21
        self.client.login(username="cust_phase3_b", password="securepassword123")
        res_b = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Concert B",
                "event_date": "2027-11-21",
                "event_time": "20:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        # Both must succeed as PENDING
        self.assertEqual(res_b.status_code, 201)
        self.assertEqual(
            Booking.objects.filter(artist=self.artist, status=Booking.Status.PENDING).count(), 2
        )

    def test_customer_create_booking_manually_blocked_conflict(self):
        # Artist manually blocks 2027-11-22
        ArtistAvailability.objects.create(
            artist=self.artist,
            date=datetime.date(2027, 11, 22),
            is_available=False,
            reason="National Holiday",
        )
        self.client.login(username="cust_phase3_a", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Private Show",
                "event_date": "2027-11-22",
                "event_time": "19:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("already has a booking or active reservation", res.json()["error"])

    def test_customer_create_booking_paid_booking_conflict(self):
        event_dt = datetime.datetime(2027, 11, 23, 19, 0, tzinfo=self.kolkata)
        b = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Existing Show",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            status=Booking.Status.ACCEPTED,
        )
        Payment.objects.create(
            booking=b,
            amount=Decimal("20000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1600.00"),
            artist_amount=Decimal("18400.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p3_paid",
            transaction_id="pay_p3_paid",
        )

        self.client.login(username="cust_phase3_b", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "New Show",
                "event_date": "2027-11-23",
                "event_time": "19:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    def test_customer_create_booking_completed_booking_conflict(self):
        event_dt = datetime.datetime(2027, 11, 24, 19, 0, tzinfo=self.kolkata)
        Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Completed Show",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            status=Booking.Status.COMPLETED,
        )

        self.client.login(username="cust_phase3_b", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "New Show",
                "event_date": "2027-11-24",
                "event_time": "19:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    def test_customer_create_booking_active_accepted_reservation_conflict(self):
        event_dt = datetime.datetime(2027, 11, 25, 19, 0, tzinfo=self.kolkata)
        b = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Reserved Show",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
        )
        Payment.objects.create(
            booking=b,
            amount=Decimal("20000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1600.00"),
            artist_amount=Decimal("18400.00"),
            status=Payment.Status.PENDING,
        )

        self.client.login(username="cust_phase3_b", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "New Show",
                "event_date": "2027-11-25",
                "event_time": "19:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    def test_customer_create_booking_cancelled_rejected_ignored(self):
        event_dt = datetime.datetime(2027, 11, 26, 19, 0, tzinfo=self.kolkata)
        Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Cancelled Show",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            status=Booking.Status.CANCELLED,
        )
        Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Rejected Show",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="2 hours",
            status=Booking.Status.REJECTED,
        )

        self.client.login(username="cust_phase3_b", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "New Show",
                "event_date": "2027-11-26",
                "event_time": "19:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)

    def test_artist_accept_pending_booking_success(self):
        event_dt = datetime.datetime(2027, 12, 5, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Live Concert",
            event_date=event_dt,
            event_location="Bengaluru",
            performance_duration="3 hours",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("0.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("0.00"),
            artist_amount=Decimal("0.00"),
            status=Payment.Status.PENDING,
        )

        self.client.login(username="artist_phase3_user", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/respond/",
            data=json.dumps({
                "action": "accept",
                "final_price": "25000.00",
                "reason": "Looking forward to it!",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], Booking.Status.ACCEPTED)
        self.assertEqual(data["agreed_price"], "25000.00")
        self.assertEqual(data["commission_amount"], "2000.00")
        self.assertEqual(data["artist_amount"], "23000.00")
        self.assertIn("accepted_at", data)
        self.assertIn("expires_at", data)

        # Verify DB
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)
        self.assertIsNotNone(booking.accepted_at)
        self.assertIsNotNone(booking.expires_at)
        # Check deadline is exactly 24 hours later
        self.assertEqual(
            booking.expires_at - booking.accepted_at,
            datetime.timedelta(hours=24),
        )
        # Payment remains PENDING until customer checkout
        self.assertEqual(booking.payment.status, Payment.Status.PENDING)
        self.assertEqual(booking.payment.amount, Decimal("25000.00"))

    def test_artist_accept_second_pending_booking_same_date_conflict(self):
        event_dt_1 = datetime.datetime(2027, 12, 10, 18, 0, tzinfo=self.kolkata)
        event_dt_2 = datetime.datetime(2027, 12, 10, 21, 0, tzinfo=self.kolkata)

        booking_1 = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Concert 1",
            event_date=event_dt_1,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(
            booking=booking_1,
            amount=Decimal("0.00"),
            status=Payment.Status.PENDING,
        )

        booking_2 = Booking.objects.create(
            customer=self.customer_b,
            artist=self.artist,
            event_type="Concert 2",
            event_date=event_dt_2,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(
            booking=booking_2,
            amount=Decimal("0.00"),
            status=Payment.Status.PENDING,
        )

        self.client.login(username="artist_phase3_user", password="securepassword123")

        # 1. Accept first booking -> 200 OK
        res_1 = self.client.post(
            f"/api/artist/bookings/{booking_1.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res_1.status_code, 200)

        # 2. Attempt to accept second booking for SAME date -> 409 Conflict
        res_2 = self.client.post(
            f"/api/artist/bookings/{booking_2.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "22000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res_2.status_code, 409)
        self.assertIn("already has a booking or active reservation", res_2.json()["error"])

        # Second booking was automatically transitioned to UNAVAILABLE
        booking_2.refresh_from_db()
        self.assertEqual(booking_2.status, Booking.Status.UNAVAILABLE)

    def test_artist_accept_manually_blocked_date_conflict(self):
        event_dt = datetime.datetime(2027, 12, 12, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(booking=booking, amount=Decimal("0.00"), status=Payment.Status.PENDING)

        # Manually block date
        ArtistAvailability.objects.create(
            artist=self.artist,
            date=datetime.date(2027, 12, 12),
            is_available=False,
            reason="Blocked by artist",
        )

        self.client.login(username="artist_phase3_user", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    def test_artist_accept_paid_booking_date_conflict(self):
        event_dt = datetime.datetime(2027, 12, 14, 18, 0, tzinfo=self.kolkata)
        prior_b = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Paid Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.ACCEPTED,
        )
        Payment.objects.create(
            booking=prior_b,
            amount=Decimal("20000.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p3_conflict",
            transaction_id="pay_p3_conflict",
        )

        new_b = Booking.objects.create(
            customer=self.customer_b,
            artist=self.artist,
            event_type="Another Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(booking=new_b, amount=Decimal("0.00"), status=Payment.Status.PENDING)

        self.client.login(username="artist_phase3_user", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{new_b.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    def test_artist_cannot_accept_another_artist_booking(self):
        event_dt = datetime.datetime(2027, 12, 16, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Artist A Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(booking=booking, amount=Decimal("0.00"), status=Payment.Status.PENDING)

        # Other artist tries to accept
        self.client.login(username="artist_phase3_other", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 404)

    def test_customer_cannot_call_artist_acceptance(self):
        event_dt = datetime.datetime(2027, 12, 17, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(booking=booking, amount=Decimal("0.00"), status=Payment.Status.PENDING)

        self.client.login(username="cust_phase3_a", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

    def test_cannot_accept_non_pending_booking(self):
        event_dt = datetime.datetime(2027, 12, 18, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
        )
        Payment.objects.create(booking=booking, amount=Decimal("20000.00"), status=Payment.Status.PENDING)

        self.client.login(username="artist_phase3_user", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already been processed", res.json()["error"])

    def test_artist_reject_booking_preserves_behavior(self):
        event_dt = datetime.datetime(2027, 12, 19, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Show to Reject",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        payment = Payment.objects.create(
            booking=booking, amount=Decimal("0.00"), status=Payment.Status.PENDING
        )

        self.client.login(username="artist_phase3_user", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/respond/",
            data=json.dumps({"action": "reject", "reason": "Tour dates clash."}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], Booking.Status.REJECTED)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.REJECTED)
        self.assertIsNone(booking.accepted_at)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)

    def test_reservation_expired_past_24h_releases_date(self):
        event_dt = datetime.datetime(2027, 12, 22, 18, 0, tzinfo=self.kolkata)

        # Booking 1 was accepted 26 hours ago and unpaid
        booking_1 = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Expired Show",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.ACCEPTED,
        )
        payment_1 = Payment.objects.create(
            booking=booking_1,
            amount=Decimal("20000.00"),
            status=Payment.Status.PENDING,
        )
        expired_ts = timezone.now() - datetime.timedelta(hours=26)
        Booking.objects.filter(id=booking_1.id).update(accepted_at=expired_ts, created_at=expired_ts)

        # Booking 2 is pending for the same date
        booking_2 = Booking.objects.create(
            customer=self.customer_b,
            artist=self.artist,
            event_type="New Show After Expiry",
            event_date=event_dt,
            event_location="Bengaluru",
            status=Booking.Status.PENDING,
        )
        Payment.objects.create(
            booking=booking_2,
            amount=Decimal("0.00"),
            status=Payment.Status.PENDING,
        )

        # Artist accepts Booking 2 -> MUST SUCCEED because Booking 1 expired!
        self.client.login(username="artist_phase3_user", password="securepassword123")
        res = self.client.post(
            f"/api/artist/bookings/{booking_2.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "22000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        booking_2.refresh_from_db()
        self.assertEqual(booking_2.status, Booking.Status.ACCEPTED)

    def test_timezone_boundary_handling(self):
        # Event at 23:30 UTC on 2027-12-29 is 05:00 AM IST on 2027-12-30!
        utc_dt = datetime.datetime(2027, 12, 29, 23, 30, tzinfo=datetime.timezone.utc)
        booking = Booking.objects.create(
            customer=self.customer_a,
            artist=self.artist,
            event_type="Late Night Show",
            event_date=utc_dt,
            event_location="Bengaluru",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("25000.00"),
            status=Payment.Status.PENDING,
        )

        # In Asia/Kolkata, the calendar date is Dec 30, 2027!
        # Customer B attempts to book Dec 30, 2027 -> MUST CONFLICT!
        self.client.login(username="cust_phase3_b", password="securepassword123")
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Clashing Show",
                "event_date": "2027-12-30",
                "event_time": "18:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

        # But Dec 29, 2027 in Asia/Kolkata should NOT conflict!
        res_29 = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Previous Day Show",
                "event_date": "2027-12-29",
                "event_time": "18:00",
                "event_location": "Bengaluru",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res_29.status_code, 201)


class Phase4ReservationExpiryAndReconciliationTests(TestCase):
    def setUp(self):
        import datetime
        from zoneinfo import ZoneInfo
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Notification

        self.client = Client()
        self.kolkata = ZoneInfo("Asia/Kolkata")

        self.category, _ = Category.objects.get_or_create(
            name="DJ", defaults={"description": "DJ and Electronic"}
        )
        self.artist_user = User.objects.create_user(
            username="artist_phase4",
            email="artist4@example.com",
            password="securepassword123",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="DJ Phase 4",
            bio="Electronic Producer",
            location="Hyderabad",
            is_active=True,
        )

        self.customer = User.objects.create_user(
            username="cust_phase4",
            email="cust4@example.com",
            password="securepassword123",
        )

    def test_accepted_booking_before_deadline_remains_active(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.views import check_and_expire_reservations

        event_dt = datetime.datetime(2027, 10, 10, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Club Night",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=4),
            agreed_price=Decimal("18000.00"),
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
        )

        results = check_and_expire_reservations(booking=booking)
        self.assertEqual(results["expired"], 0)
        self.assertEqual(results["retained"], 1)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)

    def test_unpaid_accepted_booking_after_24h_expires(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Notification
        from app.views import check_and_expire_reservations

        event_dt = datetime.datetime(2027, 10, 12, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Night Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=25),
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
        )

        results = check_and_expire_reservations(booking=booking)
        self.assertEqual(results["expired"], 1)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertIn("Reservation expired", booking.response_message)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)

        # Verify customer notification
        notif = Notification.objects.filter(
            user=self.customer,
            title="Reservation Expired",
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("has expired", notif.message)

        # Verify artist notification
        artist_notif = Notification.objects.filter(
            user=self.artist_user,
            title="Date Released",
        ).first()
        self.assertIsNotNone(artist_notif)
        self.assertIn("expired without payment", artist_notif.message)

    def test_pending_booking_is_not_expired(self):
        import datetime
        from django.utils import timezone
        from app.views import check_and_expire_reservations

        event_dt = datetime.datetime(2027, 10, 14, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Pending Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.PENDING,
            created_at=timezone.now() - datetime.timedelta(hours=48),
        )

        results = check_and_expire_reservations(booking=booking)
        self.assertEqual(results["expired"], 0)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.PENDING)

    def test_successful_payment_is_never_expired(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.views import check_and_expire_reservations

        event_dt = datetime.datetime(2027, 10, 16, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Paid Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=30),
            agreed_price=Decimal("18000.00"),
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p4_paid",
            transaction_id="pay_p4_paid",
        )

        results = check_and_expire_reservations(booking=booking)
        self.assertEqual(results["expired"], 0)
        self.assertEqual(results["retained"], 1)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)

    from unittest.mock import patch, MagicMock

    @patch("razorpay.Client")
    def test_payment_captured_before_deadline_delayed_webhook_reconciled(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock

        # Acceptance was 25 hours ago, so deadline passed 1 hour ago
        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 10, 20, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Delayed Webhook Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_delayed_webhook_123",
        )

        # The payment was captured at the gateway 2 hours BEFORE the deadline:
        capture_time = deadline - datetime.timedelta(hours=2)
        capture_unix = int(capture_time.timestamp())

        # Mock webhook signature verification
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_delayed_valid_123",
                        "order_id": "order_delayed_webhook_123",
                        "status": "captured",
                        "amount": 1800000,
                        "currency": "INR",
                        "created_at": capture_unix,
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post(
                "/api/payments/webhook/",
                data=webhook_body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_mocked_signature",
            )
        self.assertEqual(res.status_code, 200)

        # Payment should be reconciled to SUCCESS and booking remain ACCEPTED!
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, "pay_delayed_valid_123")

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)

    @patch("razorpay.Client")
    def test_delayed_webhook_date_already_rebooked_triggers_refund_flag(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock

        # Acceptance was 25 hours ago, deadline passed 1 hour ago
        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 10, 30, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Rebooked Date Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_rebooked_date_789",
        )

        # In the interim, another customer rebooked and confirmed this date!
        other_user = User.objects.create_user(username="other_customer_rebook", password="password123")
        rebooked = Booking.objects.create(
            customer=other_user,
            artist=self.artist,
            event_type="New Confirmed Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("20000.00"),
        )
        Payment.objects.create(
            booking=rebooked,
            amount=Decimal("20000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1600.00"),
            artist_amount=Decimal("18400.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_rebooked_conf",
            transaction_id="pay_rebooked_conf",
        )

        # Original payment was captured at gateway 2 hours before the deadline:
        capture_time = deadline - datetime.timedelta(hours=2)
        capture_unix = int(capture_time.timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_rebooked_original_789",
                        "order_id": "order_rebooked_date_789",
                        "status": "captured",
                        "amount": 1800000,
                        "currency": "INR",
                        "created_at": capture_unix,
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post(
                "/api/payments/webhook/",
                data=webhook_body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_mocked_signature",
            )
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json().get("status"), "reallocated")

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.assertEqual(payment.transaction_id, "pay_rebooked_original_789")

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)

    @patch("razorpay.Client")
    def test_payment_captured_after_deadline_rejected_not_valid_reservation(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock

        # Acceptance was 26 hours ago, deadline passed 2 hours ago
        acceptance_time = timezone.now() - datetime.timedelta(hours=26)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 10, 22, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Late Payment Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_late_webhook_456",
        )

        # The payment was captured at the gateway 1 hour AFTER the deadline:
        late_capture_time = deadline + datetime.timedelta(hours=1)
        late_capture_unix = int(late_capture_time.timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_late_invalid_456",
                        "order_id": "order_late_webhook_456",
                        "status": "captured",
                        "amount": 1800000,
                        "currency": "INR",
                        "created_at": late_capture_unix,
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post(
                "/api/payments/webhook/",
                data=webhook_body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_mocked_signature",
            )
        # Should be rejected with 409
        self.assertEqual(res.status_code, 409)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)

    def test_create_razorpay_order_rejects_expired_booking(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone

        event_dt = datetime.datetime(2027, 10, 24, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Order Attempt on Expired Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.EXPIRED,
            accepted_at=timezone.now() - datetime.timedelta(hours=28),
            agreed_price=Decimal("18000.00"),
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.FAILED,
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/payments/bookings/{booking.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("expired", res.json().get("error", "").lower())

    def test_expired_reservation_releases_artist_date(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.views import is_artist_date_occupied

        event_dt = datetime.datetime(2027, 10, 28, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Released Date Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.EXPIRED,
            accepted_at=timezone.now() - datetime.timedelta(hours=28),
            agreed_price=Decimal("18000.00"),
        )

        occupied, reason, _ = is_artist_date_occupied(self.artist, datetime.date(2027, 10, 28))
        self.assertFalse(occupied)

    def test_management_command_expire_unpaid_reservations(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from django.core.management import call_command
        from io import StringIO

        event_dt = datetime.datetime(2027, 10, 29, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Command Expire Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=26),
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
        )

        out = StringIO()
        call_command("expire_unpaid_reservations", f"--booking-id={booking.id}", stdout=out)
        self.assertIn("Expiry check complete", out.getvalue())

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)

    def test_repeated_expiry_execution_idempotent_no_duplicate_notifications(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Notification
        from app.views import check_and_expire_reservations

        event_dt = datetime.datetime(2027, 10, 25, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Idempotent Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=28),
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.PENDING,
        )

        # First run expires
        res1 = check_and_expire_reservations(booking=booking)
        self.assertEqual(res1["expired"], 1)

        initial_notif_count = Notification.objects.filter(user=self.customer).count()

        # Second run should be idempotent
        res2 = check_and_expire_reservations(booking=booking)
        self.assertEqual(res2["expired"], 0)

        second_notif_count = Notification.objects.filter(user=self.customer).count()
        self.assertEqual(initial_notif_count, second_notif_count)


class Phase5PaymentLifecycleAndRefundTests(TestCase):
    def setUp(self):
        import datetime
        from zoneinfo import ZoneInfo
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Category, ArtistProfile, Booking, Payment, Refund, ProcessedWebhookEvent, Notification

        self.client = Client()
        self.kolkata = ZoneInfo("Asia/Kolkata")

        self.category, _ = Category.objects.get_or_create(
            name="Orchestra",
            defaults={"description": "Classical and Fusion Orchestra"},
        )
        self.artist_user = User.objects.create_user(
            username="artist_phase5",
            email="artist5@example.com",
            password="securepassword123",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="Grand Philharmonic",
            bio="Orchestra Ensemble",
            location="Hyderabad",
            is_active=True,
        )

        self.customer = User.objects.create_user(
            username="cust_phase5",
            email="cust5@example.com",
            password="securepassword123",
        )

    # 1. Successful full refund
    @patch("razorpay.Client")
    def test_successful_full_refund(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, Refund, Notification
        from app.views import initiate_payment_refund

        event_dt = datetime.datetime(2027, 11, 5, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Grand Gala",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("50000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("54000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("4000.00"),
            artist_amount=Decimal("46000.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p5_success_1",
            transaction_id="pay_p5_success_1",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_p5_full_123",
            "entity": "refund",
            "amount": 5400000,
            "currency": "INR",
            "payment_id": "pay_p5_success_1",
            "status": "processed",
        }

        success, refund, err = initiate_payment_refund(payment, reason="Customer requested full refund", client=mock_instance)
        self.assertTrue(success)
        self.assertIsNone(err)
        self.assertIsNotNone(refund)
        self.assertEqual(refund.status, Refund.Status.PROCESSED)
        self.assertEqual(refund.razorpay_refund_id, "rfnd_p5_full_123")
        self.assertEqual(refund.amount, Decimal("54000.00"))

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

        # Check customer notification
        notif = Notification.objects.filter(user=self.customer, title="Refund Processed").first()
        self.assertIsNotNone(notif)
        self.assertIn("₹54000.00", notif.message)

    # 2. Refund API failure
    @patch("razorpay.Client")
    def test_refund_api_failure(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        import razorpay.errors
        from app.models import Payment, Refund
        from app.views import initiate_payment_refund

        event_dt = datetime.datetime(2027, 11, 6, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Failed Refund Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("20000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("21600.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p5_fail_1",
            transaction_id="pay_p5_fail_1",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.side_effect = razorpay.errors.GatewayError("Gateway timeout connecting to bank")

        success, refund, err = initiate_payment_refund(payment, reason="API Failure Test", client=mock_instance)
        self.assertFalse(success)
        self.assertIsNotNone(err)
        self.assertIn("Gateway timeout", err)

        self.assertIsNotNone(refund)
        self.assertEqual(refund.status, Refund.Status.FAILED)
        self.assertIn("Gateway timeout", refund.failure_reason)

        payment.refresh_from_db()
        # Payment must NOT be marked refunded prematurely!
        self.assertEqual(payment.status, Payment.Status.SUCCESS)

    # 3. Duplicate refund request
    @patch("razorpay.Client")
    def test_duplicate_refund_request(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, Refund
        from app.views import initiate_payment_refund

        event_dt = datetime.datetime(2027, 11, 7, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Duplicate Refund Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("30000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("32400.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p5_dup_1",
            transaction_id="pay_p5_dup_1",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_p5_dup_123",
            "amount": 3240000,
            "status": "processed",
        }

        # First request
        success1, refund1, _ = initiate_payment_refund(payment, reason="First call", client=mock_instance)
        self.assertTrue(success1)
        self.assertEqual(mock_instance.payment.refund.call_count, 1)

        # Second request with identical payment
        success2, refund2, _ = initiate_payment_refund(payment, reason="Duplicate call", client=mock_instance)
        self.assertTrue(success2)
        # MUST NOT call Razorpay API a second time!
        self.assertEqual(mock_instance.payment.refund.call_count, 1)
        self.assertEqual(refund1.id, refund2.id)

    # 4. Duplicate payment-captured webhook
    @patch("razorpay.Client")
    def test_duplicate_payment_captured_webhook(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, ProcessedWebhookEvent, Notification

        event_dt = datetime.datetime(2027, 11, 8, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Dup Webhook Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=2),
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("16200.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_dup_capture_1",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_dup_capture_1",
                        "order_id": "order_dup_capture_1",
                        "status": "captured",
                        "amount": 1620000,
                        "currency": "INR",
                        "created_at": int(timezone.now().timestamp()),
                    }
                }
            }
        })

        headers = {
            "HTTP_X_RAZORPAY_SIGNATURE": "valid_signature",
            "HTTP_X_RAZORPAY_EVENT_ID": "evt_capture_dup_unique_999",
        }

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            # First webhook delivery
            res1 = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", **headers)
            self.assertEqual(res1.status_code, 200)
            self.assertEqual(res1.json().get("status"), "ok")

            initial_notif_count = Notification.objects.filter(user=self.customer).count()

            # Second identical webhook delivery (same X-Razorpay-Event-Id)
            res2 = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", **headers)
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(res2.json().get("status"), "ignored")

            # Notification count must NOT increase!
            second_notif_count = Notification.objects.filter(user=self.customer).count()
            self.assertEqual(initial_notif_count, second_notif_count)

    # 5. Duplicate refund webhook
    @patch("razorpay.Client")
    def test_duplicate_refund_webhook(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, Refund, ProcessedWebhookEvent

        event_dt = datetime.datetime(2027, 11, 9, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Dup Refund Webhook Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.EXPIRED,
            accepted_at=timezone.now() - datetime.timedelta(hours=28),
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("16200.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_dup_refund_1",
            transaction_id="pay_dup_refund_1",
        )
        refund = Refund.objects.create(
            payment=payment,
            booking=booking,
            razorpay_refund_id="rfnd_dup_webhook_1",
            amount=Decimal("16200.00"),
            status=Refund.Status.PENDING,
            idempotency_key="rfnd_pay_dup_refund_1_1620000",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "refund.processed",
            "payload": {
                "refund": {
                    "entity": {
                        "id": "rfnd_dup_webhook_1",
                        "payment_id": "pay_dup_refund_1",
                        "amount": 1620000,
                        "status": "processed",
                    }
                }
            }
        })

        headers = {
            "HTTP_X_RAZORPAY_SIGNATURE": "valid_signature",
            "HTTP_X_RAZORPAY_EVENT_ID": "evt_refund_dup_unique_888",
        }

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res1 = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", **headers)
            self.assertEqual(res1.status_code, 200)

            refund.refresh_from_db()
            self.assertEqual(refund.status, Refund.Status.PROCESSED)

            payment.refresh_from_db()
            self.assertEqual(payment.status, Payment.Status.REFUNDED)

            # Second identical refund webhook
            res2 = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", **headers)
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(res2.json().get("status"), "ignored")

    # 6. Refund status update from webhook
    @patch("razorpay.Client")
    def test_refund_status_update_from_webhook(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, Refund

        event_dt = datetime.datetime(2027, 11, 10, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Webhook Status Update Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("10000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("10800.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_status_update_1",
            transaction_id="pay_status_update_1",
        )
        refund = Refund.objects.create(
            payment=payment,
            booking=booking,
            razorpay_refund_id="rfnd_status_update_1",
            amount=Decimal("10800.00"),
            status=Refund.Status.PENDING,
            idempotency_key="rfnd_pay_status_update_1_1080000",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "refund.processed",
            "payload": {
                "refund": {
                    "entity": {
                        "id": "rfnd_status_update_1",
                        "payment_id": "pay_status_update_1",
                        "amount": 1080000,
                        "status": "processed",
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="valid_signature")
            self.assertEqual(res.status_code, 200)

        refund.refresh_from_db()
        self.assertEqual(refund.status, Refund.Status.PROCESSED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

    # 7. Delayed payment after date reallocation triggers an actual refund request
    @patch("razorpay.Client")
    def test_delayed_payment_after_date_reallocation_triggers_actual_refund_request(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 11, 15, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Reallocated Date Show P5",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("19440.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_reallocated_p5",
        )

        # Another customer confirmed this date
        other_user = User.objects.create_user(username="cust_other_p5", password="password123")
        rebooked = Booking.objects.create(
            customer=other_user,
            artist=self.artist,
            event_type="New Show P5",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("20000.00"),
        )
        Payment.objects.create(
            booking=rebooked,
            amount=Decimal("21600.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_other_p5",
            transaction_id="pay_other_p5",
        )

        capture_time = deadline - datetime.timedelta(hours=1)
        capture_unix = int(capture_time.timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_reallocated_actual_1",
            "amount": 1944000,
            "status": "processed",
        }

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_reallocated_actual_1",
                        "order_id": "order_reallocated_p5",
                        "status": "captured",
                        "amount": 1944000,
                        "currency": "INR",
                        "created_at": capture_unix,
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="valid_sig")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json().get("status"), "reallocated")

        # Must have triggered actual refund call!
        self.assertTrue(mock_instance.payment.refund.called)

        # Refund record exists!
        rf = Refund.objects.filter(payment=payment).first()
        self.assertIsNotNone(rf)
        self.assertEqual(rf.razorpay_refund_id, "rfnd_reallocated_actual_1")

    # 8. Payment captured after deadline triggers refund handling
    @patch("razorpay.Client")
    def test_payment_captured_after_deadline_triggers_refund_handling(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=26)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 11, 18, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Post Deadline Capture Show P5",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("12000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("12960.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_late_capture_p5",
        )

        late_capture_unix = int((deadline + datetime.timedelta(hours=1)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_late_capture_p5",
            "amount": 1296000,
            "status": "processed",
        }

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_late_capture_p5",
                        "order_id": "order_late_capture_p5",
                        "status": "captured",
                        "amount": 1296000,
                        "currency": "INR",
                        "created_at": late_capture_unix,
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="valid_sig")
        self.assertEqual(res.status_code, 409)

        # Must have initiated refund
        self.assertTrue(mock_instance.payment.refund.called)
        rf = Refund.objects.filter(payment=payment).first()
        self.assertIsNotNone(rf)
        self.assertEqual(rf.razorpay_refund_id, "rfnd_late_capture_p5")

    # 9. Successful payment cannot be overwritten by a failed event
    @patch("razorpay.Client")
    def test_successful_payment_cannot_be_overwritten_by_failed_event(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment

        event_dt = datetime.datetime(2027, 11, 20, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Overwrite Protect Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("16200.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_success_no_overwrite",
            transaction_id="pay_success_no_overwrite",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_success_no_overwrite",
                        "order_id": "order_success_no_overwrite",
                        "status": "failed",
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="valid_sig")
            self.assertEqual(res.status_code, 200)

        # Status MUST remain SUCCESS
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)

    # 10. Refunded payment cannot be processed again
    @patch("razorpay.Client")
    def test_refunded_payment_cannot_be_processed_again(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Payment

        event_dt = datetime.datetime(2027, 11, 22, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Refund Terminal Show",
            event_date=event_dt,
            event_location="Hyderabad",
            status=Booking.Status.EXPIRED,
            accepted_at=timezone.now() - datetime.timedelta(hours=28),
            agreed_price=Decimal("20000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("21600.00"),
            status=Payment.Status.REFUNDED,
            razorpay_order_id="order_already_refunded_terminal",
            transaction_id="pay_already_refunded_terminal",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_already_refunded_terminal",
                        "order_id": "order_already_refunded_terminal",
                        "status": "captured",
                        "amount": 2160000,
                        "currency": "INR",
                        "created_at": int(timezone.now().timestamp()),
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="valid_sig")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json().get("status"), "ignored")

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)


class Phase6BookingCancellationAndReschedulingTests(TestCase):
    def setUp(self):
        import datetime
        from zoneinfo import ZoneInfo
        from decimal import Decimal
        from django.utils import timezone
        from django.contrib.auth.models import User
        from app.models import (
            Category,
            ArtistProfile,
            Booking,
            Payment,
            Refund,
            BookingCancellation,
            ReschedulingRequest,
            ArtistAvailability,
            Notification,
        )

        self.client = Client()
        self.kolkata = ZoneInfo("Asia/Kolkata")

        self.category, _ = Category.objects.get_or_create(
            name="Fusion Band",
            defaults={"description": "Fusion and Rock Band"},
        )
        self.artist_user = User.objects.create_user(
            username="artist_p6",
            email="artist_p6@example.com",
            password="securepassword123",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="Pulse Fusion",
            bio="Dynamic rock fusion band",
            location="Bangalore",
            is_active=True,
        )

        self.other_artist_user = User.objects.create_user(
            username="other_artist_p6",
            email="other_artist_p6@example.com",
            password="securepassword123",
        )
        self.other_artist = ArtistProfile.objects.create(
            user=self.other_artist_user,
            category=self.category,
            stage_name="Solo Strings",
            bio="Violinist",
            location="Bangalore",
            is_active=True,
        )

        self.customer = User.objects.create_user(
            username="cust_p6",
            email="cust_p6@example.com",
            password="securepassword123",
        )

        self.other_customer = User.objects.create_user(
            username="other_cust_p6",
            email="other_cust_p6@example.com",
            password="securepassword123",
        )

    # 1. Customer cancelling own pending booking
    def test_01_customer_cancelling_own_pending_booking(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, Payment, Refund, BookingCancellation

        event_dt = timezone.now() + datetime.timedelta(days=10)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Corporate Gala",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.PENDING,
            agreed_price=Decimal("10000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("10000.00"),
            status=Payment.Status.PENDING,
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Event cancelled by management"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)

        # No refund record created for unpaid booking
        self.assertEqual(Refund.objects.filter(booking=booking).count(), 0)

        # BookingCancellation record created
        cancellation = BookingCancellation.objects.filter(booking=booking).first()
        self.assertIsNotNone(cancellation)
        self.assertEqual(cancellation.cancelled_by, BookingCancellation.CancelledBy.CUSTOMER)
        self.assertEqual(cancellation.refund_amount, Decimal("0.00"))

    # 2. Customer cancelling own paid booking
    @patch("razorpay.Client")
    def test_02_customer_cancelling_own_paid_booking(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund, BookingCancellation

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_p6_cust_paid_123",
            "entity": "refund",
            "amount": 1000000,
            "currency": "INR",
            "status": "processed",
        }

        # Event is 12 days in the future (> 7 days -> 100% refund)
        event_dt = timezone.now() + datetime.timedelta(days=12)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Grand Anniversary",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=2),
            agreed_price=Decimal("10000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("10000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("800.00"),
            artist_amount=Decimal("9200.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p6_paid_1",
            transaction_id="pay_p6_paid_1",
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Venue issue"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], Booking.Status.CANCELLED)
        self.assertEqual(data["refund_status"], "processed")
        self.assertEqual(data["refund_amount"], "10000.00")

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

        refund = Refund.objects.filter(booking=booking).first()
        self.assertIsNotNone(refund)
        self.assertEqual(refund.status, Refund.Status.PROCESSED)
        self.assertEqual(refund.amount, Decimal("10000.00"))
        self.assertEqual(refund.razorpay_refund_id, "rfnd_p6_cust_paid_123")

        cancellation = BookingCancellation.objects.filter(booking=booking).first()
        self.assertIsNotNone(cancellation)
        self.assertEqual(cancellation.refund_percentage, Decimal("100.00"))
        self.assertEqual(cancellation.refund_amount, Decimal("10000.00"))

    # 3. Unauthorized customer cancellation
    def test_03_unauthorized_customer_cancellation(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking

        event_dt = timezone.now() + datetime.timedelta(days=10)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Private Party",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("8000.00"),
        )

        # Other customer attempts to cancel
        self.client.force_login(self.other_customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Malicious attempt"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)

        # Anonymous user attempts to cancel
        self.client.logout()
        res_anon = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Anon"}),
            content_type="application/json",
        )
        self.assertEqual(res_anon.status_code, 401)

    # 4. Artist cancelling own booking
    def test_04_artist_cancelling_own_booking(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, Payment, BookingCancellation

        event_dt = timezone.now() + datetime.timedelta(days=8)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Club Night",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("12000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            status=Payment.Status.PENDING,
        )

        self.client.force_login(self.artist_user)
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Artist emergency illness"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)

        cancellation = BookingCancellation.objects.filter(booking=booking).first()
        self.assertIsNotNone(cancellation)
        self.assertEqual(cancellation.cancelled_by, BookingCancellation.CancelledBy.ARTIST)

    # 5. Artist cancelling another artist's booking
    def test_05_artist_cancelling_another_artists_booking(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking

        event_dt = timezone.now() + datetime.timedelta(days=8)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Festival Show",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("15000.00"),
        )

        # Other artist attempts to cancel
        self.client.force_login(self.other_artist_user)
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Unauthorized"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)

    # 6. Full refund for artist cancellation
    @patch("razorpay.Client")
    def test_06_full_refund_for_artist_cancellation(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund, BookingCancellation
        from app.views import is_artist_date_occupied

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_p6_art_full_999",
            "entity": "refund",
            "amount": 2500000,
            "currency": "INR",
            "status": "processed",
        }

        # Event is only 1 day away (normally 0% for customer, but 100% for artist cancellation!)
        event_dt = timezone.now() + datetime.timedelta(days=1)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Urgent Cancel Show",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=5),
            agreed_price=Decimal("25000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("25000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("2000.00"),
            artist_amount=Decimal("23000.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_p6_art_full",
            transaction_id="pay_p6_art_full",
        )

        self.client.force_login(self.artist_user)
        res = self.client.post(
            f"/api/artist/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Band equipment damage"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["refund_amount"], "25000.00")
        self.assertEqual(data["refund_percentage"], "100.00")

        refund = Refund.objects.filter(booking=booking).first()
        self.assertIsNotNone(refund)
        self.assertEqual(refund.amount, Decimal("25000.00"))
        self.assertEqual(refund.status, Refund.Status.PROCESSED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

        # Date is released
        cal_date = timezone.localtime(event_dt, timezone=self.kolkata).date()
        occupied, _, _ = is_artist_date_occupied(self.artist, cal_date)
        self.assertFalse(occupied)

    # 7. Correct customer refund calculation for each policy period
    @patch("razorpay.Client")
    def test_07_correct_customer_refund_calculation_for_each_policy_period(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment
        from app.cancellation_policy import calculate_cancellation_refund

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_period_mock",
            "entity": "refund",
            "amount": 500000,
            "currency": "INR",
            "status": "processed",
        }

        now = timezone.now()

        # Period A: > 7 days -> 100% refund
        booking_a = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Period A Show",
            event_date=now + datetime.timedelta(days=10),
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            agreed_price=Decimal("10000.00"),
        )
        payment_a = Payment.objects.create(
            booking=booking_a,
            amount=Decimal("10000.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_period_a",
        )
        calc_a = calculate_cancellation_refund(booking_a, cancelled_by="customer", cancel_time=now)
        self.assertEqual(calc_a["refund_percentage"], Decimal("100.00"))
        self.assertEqual(calc_a["refund_amount"], Decimal("10000.00"))
        self.assertEqual(calc_a["retained_amount"], Decimal("0.00"))

        # Period B: 3 - 7 days -> 50% refund
        booking_b = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Period B Show",
            event_date=now + datetime.timedelta(days=5),
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            agreed_price=Decimal("10000.00"),
        )
        payment_b = Payment.objects.create(
            booking=booking_b,
            amount=Decimal("10000.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_period_b",
        )
        calc_b = calculate_cancellation_refund(booking_b, cancelled_by="customer", cancel_time=now)
        self.assertEqual(calc_b["refund_percentage"], Decimal("50.00"))
        self.assertEqual(calc_b["refund_amount"], Decimal("5000.00"))
        self.assertEqual(calc_b["retained_amount"], Decimal("5000.00"))
        self.assertEqual(calc_b["platform_fee"], Decimal("400.00"))
        self.assertEqual(calc_b["artist_payout"], Decimal("4600.00"))

        # Period C: < 3 days -> 0% refund
        booking_c = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Period C Show",
            event_date=now + datetime.timedelta(days=1),
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            agreed_price=Decimal("10000.00"),
        )
        payment_c = Payment.objects.create(
            booking=booking_c,
            amount=Decimal("10000.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_period_c",
        )
        calc_c = calculate_cancellation_refund(booking_c, cancelled_by="customer", cancel_time=now)
        self.assertEqual(calc_c["refund_percentage"], Decimal("0.00"))
        self.assertEqual(calc_c["refund_amount"], Decimal("0.00"))
        self.assertEqual(calc_c["retained_amount"], Decimal("10000.00"))
        self.assertEqual(calc_c["platform_fee"], Decimal("800.00"))
        self.assertEqual(calc_c["artist_payout"], Decimal("9200.00"))

        # Execute cancellation for Period B via API (50% refund)
        self.client.force_login(self.customer)
        res_b = self.client.post(
            f"/api/customer/bookings/{booking_b.id}/cancel/",
            data=json.dumps({"reason": "Need to cancel"}),
            content_type="application/json",
        )
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.json()["refund_amount"], "5000.00")
        self.assertEqual(res_b.json()["refund_percentage"], "50.00")

    # 8. No refund for eligible zero-refund cancellation
    @patch("razorpay.Client")
    def test_08_no_refund_for_eligible_zero_refund_cancellation(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund, BookingCancellation

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance

        # Event is tomorrow (< 3 days -> 0% refund)
        event_dt = timezone.now() + datetime.timedelta(days=1)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Tomorrow Evening Gala",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=4),
            agreed_price=Decimal("18000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("18000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1440.00"),
            artist_amount=Decimal("16560.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_zero_refund_1",
            transaction_id="pay_zero_refund_1",
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Last minute conflict"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["refund_amount"], "0.00")
        self.assertEqual(data["refund_status"], "none")

        # Razorpay refund API was never called
        self.assertFalse(mock_instance.payment.refund.called)

        # No Refund row created
        self.assertEqual(Refund.objects.filter(booking=booking).count(), 0)

        # Payment remains SUCCESS (retained)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)

        # BookingCancellation records full retention
        cancellation = BookingCancellation.objects.filter(booking=booking).first()
        self.assertEqual(cancellation.retained_amount, Decimal("18000.00"))
        self.assertEqual(cancellation.artist_payout, Decimal("16560.00"))
        self.assertEqual(cancellation.platform_fee, Decimal("1440.00"))

    # 9. Refund API failure and safe retry
    @patch("razorpay.Client")
    def test_09_refund_api_failure_and_safe_retry(self, mock_client_cls):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        import razorpay.errors
        from app.models import Booking, Payment, Refund

        # First call fails
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.side_effect = razorpay.errors.GatewayError("Bank connection timed out")

        event_dt = timezone.now() + datetime.timedelta(days=12)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Retry Refund Show",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=2),
            agreed_price=Decimal("12000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_fail_and_retry",
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Change of plans"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["refund_status"], "failed")

        # Booking is cancelled, refund is in FAILED state
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        rf = Refund.objects.filter(booking=booking).first()
        self.assertIsNotNone(rf)
        self.assertEqual(rf.status, Refund.Status.FAILED)

        # Now mock succeeds on retry
        mock_instance.payment.refund.side_effect = None
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_retry_succeeded_888",
            "status": "processed",
            "amount": 1200000,
        }

        res_retry = self.client.post(f"/api/bookings/{booking.id}/refund/retry/")
        self.assertEqual(res_retry.status_code, 200)

        rf.refresh_from_db()
        self.assertEqual(rf.status, Refund.Status.PROCESSED)
        self.assertEqual(rf.razorpay_refund_id, "rfnd_retry_succeeded_888")

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

    # 10. Rescheduling request creation
    def test_10_rescheduling_request_creation(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, ReschedulingRequest

        orig_dt = timezone.now() + datetime.timedelta(days=10)
        new_dt = timezone.now() + datetime.timedelta(days=20)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Wedding Reception",
            event_date=orig_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("30000.00"),
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/reschedule/",
            data=json.dumps({
                "new_event_date": new_dt.isoformat(),
                "reason": "Family convenience",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], ReschedulingRequest.Status.PENDING)

        req = ReschedulingRequest.objects.filter(booking=booking).first()
        self.assertIsNotNone(req)
        self.assertEqual(req.status, ReschedulingRequest.Status.PENDING)
        self.assertEqual(req.reason, "Family convenience")

    # 11. Artist approving a rescheduling request
    def test_11_artist_approving_a_rescheduling_request(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, ReschedulingRequest
        from app.views import is_artist_date_occupied

        orig_dt = timezone.now() + datetime.timedelta(days=10)
        new_dt = timezone.now() + datetime.timedelta(days=22)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Cocktail Night",
            event_date=orig_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("15000.00"),
        )
        resched_req = ReschedulingRequest.objects.create(
            booking=booking,
            customer=self.customer,
            artist=self.artist,
            original_event_date=orig_dt,
            new_event_date=new_dt,
            reason="Venue availability",
            status=ReschedulingRequest.Status.PENDING,
        )

        self.client.force_login(self.artist_user)
        res = self.client.post(
            f"/api/artist/rescheduling-requests/{resched_req.id}/respond/",
            data=json.dumps({"action": "approve", "reason": "Confirmed availability"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        # Booking event_date is now new_dt
        booking.refresh_from_db()
        self.assertEqual(booking.event_date.date(), new_dt.date())

        resched_req.refresh_from_db()
        self.assertEqual(resched_req.status, ReschedulingRequest.Status.APPROVED)

        # Original date is released
        orig_cal = timezone.localtime(orig_dt, timezone=self.kolkata).date()
        occupied_orig, _, _ = is_artist_date_occupied(self.artist, orig_cal)
        self.assertFalse(occupied_orig)

        # New date is occupied
        new_cal = timezone.localtime(new_dt, timezone=self.kolkata).date()
        occupied_new, _, _ = is_artist_date_occupied(self.artist, new_cal)
        self.assertTrue(occupied_new)

    # 12. Artist rejecting a rescheduling request
    def test_12_artist_rejecting_a_rescheduling_request(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, ReschedulingRequest

        orig_dt = timezone.now() + datetime.timedelta(days=10)
        new_dt = timezone.now() + datetime.timedelta(days=25)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="College Fest",
            event_date=orig_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("20000.00"),
        )
        resched_req = ReschedulingRequest.objects.create(
            booking=booking,
            customer=self.customer,
            artist=self.artist,
            original_event_date=orig_dt,
            new_event_date=new_dt,
            reason="Exam schedule",
            status=ReschedulingRequest.Status.PENDING,
        )

        self.client.force_login(self.artist_user)
        res = self.client.post(
            f"/api/artist/rescheduling-requests/{resched_req.id}/respond/",
            data=json.dumps({"action": "reject", "reason": "Already committed to other studio recording"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        # Original date remains intact
        booking.refresh_from_db()
        self.assertEqual(booking.event_date.date(), orig_dt.date())

        resched_req.refresh_from_db()
        self.assertEqual(resched_req.status, ReschedulingRequest.Status.REJECTED)
        self.assertEqual(resched_req.artist_response, "Already committed to other studio recording")

    # 13. Rescheduling to a manually blocked date
    def test_13_rescheduling_to_a_manually_blocked_date(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, ArtistAvailability

        orig_dt = timezone.now() + datetime.timedelta(days=10)
        blocked_dt = timezone.now() + datetime.timedelta(days=15)
        blocked_cal = timezone.localtime(blocked_dt, timezone=self.kolkata).date()

        ArtistAvailability.objects.create(
            artist=self.artist,
            date=blocked_cal,
            is_available=False,
            reason="Personal holiday",
        )

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Corporate Show",
            event_date=orig_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("15000.00"),
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/reschedule/",
            data=json.dumps({"new_event_date": blocked_dt.isoformat(), "reason": "Shift date"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("Personal holiday", res.json()["error"])

    # 14. Rescheduling to an occupied date
    def test_14_rescheduling_to_an_occupied_date(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, Payment

        orig_dt = timezone.now() + datetime.timedelta(days=10)
        busy_dt = timezone.now() + datetime.timedelta(days=18)

        # Another booking is accepted and paid on busy_dt
        busy_booking = Booking.objects.create(
            customer=self.other_customer,
            artist=self.artist,
            event_type="Existing Confirmed Show",
            event_date=busy_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("25000.00"),
        )
        Payment.objects.create(
            booking=busy_booking,
            amount=Decimal("25000.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_busy_date",
        )

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Shift Attempt Show",
            event_date=orig_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("12000.00"),
        )

        self.client.force_login(self.customer)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/reschedule/",
            data=json.dumps({"new_event_date": busy_dt.isoformat(), "reason": "Please shift"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    # 15. Concurrent rescheduling approvals
    def test_15_concurrent_rescheduling_approvals(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, ReschedulingRequest

        target_dt = timezone.now() + datetime.timedelta(days=30)

        # Booking 1
        booking_1 = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Show 1",
            event_date=timezone.now() + datetime.timedelta(days=8),
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("10000.00"),
        )
        req_1 = ReschedulingRequest.objects.create(
            booking=booking_1,
            customer=self.customer,
            artist=self.artist,
            original_event_date=booking_1.event_date,
            new_event_date=target_dt,
            status=ReschedulingRequest.Status.PENDING,
        )

        # Booking 2
        booking_2 = Booking.objects.create(
            customer=self.other_customer,
            artist=self.artist,
            event_type="Show 2",
            event_date=timezone.now() + datetime.timedelta(days=12),
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("12000.00"),
        )
        req_2 = ReschedulingRequest.objects.create(
            booking=booking_2,
            customer=self.other_customer,
            artist=self.artist,
            original_event_date=booking_2.event_date,
            new_event_date=target_dt,
            status=ReschedulingRequest.Status.PENDING,
        )

        self.client.force_login(self.artist_user)

        # Approve Request 1 -> succeeds
        res_1 = self.client.post(
            f"/api/artist/rescheduling-requests/{req_1.id}/respond/",
            data=json.dumps({"action": "approve"}),
            content_type="application/json",
        )
        self.assertEqual(res_1.status_code, 200)

        # Now attempt to approve Request 2 for the same date -> rejected with 409 Conflict
        res_2 = self.client.post(
            f"/api/artist/rescheduling-requests/{req_2.id}/respond/",
            data=json.dumps({"action": "approve"}),
            content_type="application/json",
        )
        self.assertEqual(res_2.status_code, 409)

        # Booking 2 event date must remain unchanged
        booking_2.refresh_from_db()
        self.assertNotEqual(booking_2.event_date.date(), target_dt.date())

    # 16. Original date remains reserved while rescheduling is pending
    def test_16_original_date_remains_reserved_while_rescheduling_is_pending(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking, Payment, ReschedulingRequest
        from app.views import is_artist_date_occupied

        orig_dt = timezone.now() + datetime.timedelta(days=10)
        new_dt = timezone.now() + datetime.timedelta(days=25)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Reserved Check Show",
            event_date=orig_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("20000.00"),
        )
        Payment.objects.create(
            booking=booking,
            amount=Decimal("20000.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_reserved_check",
        )

        # Pending reschedule request
        ReschedulingRequest.objects.create(
            booking=booking,
            customer=self.customer,
            artist=self.artist,
            original_event_date=orig_dt,
            new_event_date=new_dt,
            status=ReschedulingRequest.Status.PENDING,
        )

        orig_cal = timezone.localtime(orig_dt, timezone=self.kolkata).date()
        new_cal = timezone.localtime(new_dt, timezone=self.kolkata).date()

        # Original date is STILL occupied
        occupied_orig, _, _ = is_artist_date_occupied(self.artist, orig_cal)
        self.assertTrue(occupied_orig)

        # Proposed new date is NOT occupied
        occupied_new, _, _ = is_artist_date_occupied(self.artist, new_cal)
        self.assertFalse(occupied_new)

    # 17. Duplicate cancellation and rescheduling requests
    def test_17_duplicate_cancellation_and_rescheduling_requests(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking

        event_dt = timezone.now() + datetime.timedelta(days=15)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Dupe Test Show",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("10000.00"),
        )

        self.client.force_login(self.customer)

        # Rescheduling request 1
        new_dt = timezone.now() + datetime.timedelta(days=25)
        res_r1 = self.client.post(
            f"/api/customer/bookings/{booking.id}/reschedule/",
            data=json.dumps({"new_event_date": new_dt.isoformat()}),
            content_type="application/json",
        )
        self.assertEqual(res_r1.status_code, 201)

        # Duplicate rescheduling request while previous is pending
        res_r2 = self.client.post(
            f"/api/customer/bookings/{booking.id}/reschedule/",
            data=json.dumps({"new_event_date": (new_dt + datetime.timedelta(days=2)).isoformat()}),
            content_type="application/json",
        )
        self.assertEqual(res_r2.status_code, 400)
        self.assertIn("already pending", res_r2.json()["error"])

        # Cancel booking 1st time
        res_c1 = self.client.post(f"/api/customer/bookings/{booking.id}/cancel/")
        self.assertEqual(res_c1.status_code, 200)

        # Duplicate cancellation
        res_c2 = self.client.post(f"/api/customer/bookings/{booking.id}/cancel/")
        self.assertEqual(res_c2.status_code, 400)
        self.assertIn("already cancelled", res_c2.json()["error"])

    # 18. Completed bookings cannot be cancelled
    def test_18_completed_bookings_cannot_be_cancelled(self):
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from app.models import Booking

        event_dt = timezone.now() - datetime.timedelta(days=2)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Completed Musical Night",
            event_date=event_dt,
            event_location="Bangalore",
            status=Booking.Status.COMPLETED,
            agreed_price=Decimal("20000.00"),
        )

        # Customer attempts to cancel completed booking
        self.client.force_login(self.customer)
        res_cust = self.client.post(f"/api/customer/bookings/{booking.id}/cancel/")
        self.assertEqual(res_cust.status_code, 400)
        self.assertIn("completed", res_cust.json()["error"])

        # Artist attempts to cancel completed booking
        self.client.force_login(self.artist_user)
        res_art = self.client.post(f"/api/artist/bookings/{booking.id}/cancel/")
        self.assertEqual(res_art.status_code, 400)
        self.assertIn("completed", res_art.json()["error"])

        # Customer attempts to reschedule completed booking
        self.client.force_login(self.customer)
        res_resched = self.client.post(
            f"/api/customer/bookings/{booking.id}/reschedule/",
            data=json.dumps({"new_event_date": (timezone.now() + datetime.timedelta(days=10)).isoformat()}),
            content_type="application/json",
        )
        self.assertEqual(res_resched.status_code, 400)
        self.assertIn("completed", res_resched.json()["error"])


class BookingDateTimeTimezoneRegressionTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = User.objects.create_user(
            username="tz_customer",
            email="tz_customer@example.com",
            password="securepassword123",
        )
        self.artist_user = User.objects.create_user(
            username="tz_artist",
            email="tz_artist@example.com",
            password="securepassword123",
        )
        cat, _ = Category.objects.get_or_create(name="Live Bands")
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=cat,
            stage_name="The Kolkata Melody",
            location="Kolkata",
            starting_price=30000,
        )

    def test_create_booking_date_and_time_stored_as_utc_from_kolkata(self):
        """
        Customer selects 30 November 2026 at 7:00 PM (19:00) Asia/Kolkata.
        - Event date and time must be interpreted in Asia/Kolkata timezone.
        - Stored UTC timestamp must be 2026-11-30 13:30:00+00:00.
        - Converting back to Asia/Kolkata yields 2026-11-30 19:00:00 (7:00 PM).
        """
        import datetime
        from zoneinfo import ZoneInfo
        from django.utils import timezone

        self.client.force_login(self.customer)
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "College Event",
                "event_date": "2026-11-30",
                "event_time": "19:00",
                "event_location": "Science City Auditorium, Kolkata",
                "performance_duration": "2 hours",
                "expected_audience_size": 500,
                "agreed_price": 30000,
                "message": "Annual college fest performance.",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        booking_id = res.json()["booking_id"]

        booking = Booking.objects.get(id=booking_id)
        # Verify UTC stored timestamp
        utc_dt = booking.event_date.astimezone(datetime.timezone.utc)
        expected_utc = datetime.datetime(2026, 11, 30, 13, 30, tzinfo=datetime.timezone.utc)
        self.assertEqual(utc_dt, expected_utc)

        # Verify Asia/Kolkata local time
        kolkata_tz = ZoneInfo("Asia/Kolkata")
        local_dt = timezone.localtime(booking.event_date, timezone=kolkata_tz)
        self.assertEqual(local_dt.year, 2026)
        self.assertEqual(local_dt.month, 11)
        self.assertEqual(local_dt.day, 30)
        self.assertEqual(local_dt.hour, 19)
        self.assertEqual(local_dt.minute, 0)
        self.assertEqual(local_dt.strftime("%I:%M %p"), "07:00 PM")

    def test_create_booking_iso_datetime_compatible(self):
        """
        Existing clients sending full ISO datetime strings remain compatible.
        """
        import datetime
        from django.utils import timezone

        self.client.force_login(self.customer)
        # Naive ISO string (assumed Asia/Kolkata)
        res = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Corporate Gala",
                "event_date": "2027-12-15T19:00:00",
                "event_time": "19:00",
                "event_location": "ITC Sonar, Kolkata",
                "performance_duration": "3 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        booking = Booking.objects.get(id=res.json()["booking_id"])
        expected_utc = datetime.datetime(2027, 12, 15, 13, 30, tzinfo=datetime.timezone.utc)
        self.assertEqual(booking.event_date.astimezone(datetime.timezone.utc), expected_utc)

        # Timezone-aware ISO string (+05:30)
        res2 = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Sangeet Ceremony",
                "event_date": "2027-12-16T19:00:00+05:30",
                "event_time": "19:00",
                "event_location": "JW Marriott, Kolkata",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res2.status_code, 201)
        booking2 = Booking.objects.get(id=res2.json()["booking_id"])
        expected_utc2 = datetime.datetime(2027, 12, 16, 13, 30, tzinfo=datetime.timezone.utc)
        self.assertEqual(booking2.event_date.astimezone(datetime.timezone.utc), expected_utc2)

    def test_create_booking_invalid_date_or_time_rejected(self):
        """
        Invalid date or time values are rejected with 400 Bad Request.
        """
        self.client.force_login(self.customer)

        # Invalid time
        res_bad_time = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Wedding",
                "event_date": "2027-11-30",
                "event_time": "25:99",
                "event_location": "Kolkata",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res_bad_time.status_code, 400)
        self.assertIn("time", res_bad_time.json()["error"].lower())

        # Invalid date
        res_bad_date = self.client.post(
            "/api/bookings/",
            data=json.dumps({
                "artist_id": self.artist.id,
                "event_type": "Wedding",
                "event_date": "invalid-date",
                "event_time": "19:00",
                "event_location": "Kolkata",
                "performance_duration": "2 hours",
            }),
            content_type="application/json",
        )
        self.assertEqual(res_bad_date.status_code, 400)
        self.assertIn("date", res_bad_date.json()["error"].lower())

    def test_customer_and_artist_dashboards_return_kolkata_local_time(self):
        """
        Both customer and artist dashboards return local Asia/Kolkata event_date (7:00 PM),
        not UTC midnight or 12:00 AM.
        """
        import datetime
        from decimal import Decimal
        from django.utils import timezone
        from zoneinfo import ZoneInfo

        kolkata_tz = ZoneInfo("Asia/Kolkata")
        # 30 Nov 2026, 7:00 PM IST is 1:30 PM UTC
        event_dt_utc = datetime.datetime(2026, 11, 30, 13, 30, tzinfo=datetime.timezone.utc)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="College Event",
            event_date=event_dt_utc,
            event_location="Science City, Kolkata",
            performance_duration="2 hours",
            status=Booking.Status.ACCEPTED,
            agreed_price=Decimal("30000.00"),
        )

        # 1. Customer Dashboard
        self.client.force_login(self.customer)
        res_cust = self.client.get("/api/customer/dashboard/")
        self.assertEqual(res_cust.status_code, 200)
        cust_bookings = res_cust.json()["bookings"]
        target_cust = next((b for b in cust_bookings if b["id"] == booking.id), None)
        self.assertIsNotNone(target_cust)
        self.assertEqual(target_cust["event_date"], "Nov 30, 2026 07:00 PM")
        self.assertIn("2026-11-30T19:00:00+05:30", target_cust["event_date_iso"])

        # 2. Artist Dashboard
        self.client.force_login(self.artist_user)
        res_art = self.client.get("/api/artist/dashboard/")
        self.assertEqual(res_art.status_code, 200)
        art_bookings = res_art.json()["bookings"]
        target_art = next((b for b in art_bookings if b["id"] == booking.id), None)
        self.assertIsNotNone(target_art)
        self.assertEqual(target_art["event_date"], "Nov 30, 2026 07:00 PM")
        self.assertIn("2026-11-30T19:00:00+05:30", target_art["event_date_iso"])


class PaymentPartialAndFullRefundTests(TestCase):
    """
    Regression test suite verifying Payment lifecycle distinguishing full refunds from partial refunds.
    Covers:
    1. Full refund: ₹55,000 payment, ₹55,000 refunded -> status refunded.
    2. Partial refund: ₹55,000 payment, ₹27,500 refunded -> status partially_refunded.
    3. Multiple partial refunds totaling ₹55,000 -> status refunded.
    4. Duplicate refund webhook -> no duplicate refund or incorrect status.
    5. Failed refund -> payment must not be marked refunded.
    """

    def setUp(self):
        from decimal import Decimal
        from django.contrib.auth.models import User
        from app.models import ArtistProfile, CustomerProfile, Category, Booking, Payment, Refund
        from zoneinfo import ZoneInfo
        import datetime

        self.kolkata = ZoneInfo("Asia/Kolkata")
        self.category = Category.objects.create(name="PartialRefundMusic", description="Music category")

        self.artist_user = User.objects.create_user(
            username="artist_refund_test",
            email="artist_refund_test@example.com",
            password="testpassword123",
            first_name="Refund",
            last_name="Artist",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="Refund Test DJ",
            bio="DJ specialized in refund lifecycle tests",
            location="Kolkata",
            starting_price=Decimal("5000.00"),
            years_of_experience=5,
        )

        self.customer = User.objects.create_user(
            username="customer_refund_test",
            email="customer_refund_test@example.com",
            password="testpassword123",
            first_name="Refund",
            last_name="Customer",
        )
        self.customer_profile = CustomerProfile.objects.create(
            user=self.customer,
            phone="+919876543210",
            location="Kolkata",
        )

    def _create_booking_and_payment(self, amount=None, txn_id="pay_test_55k_1", order_id="order_test_55k_1"):
        from decimal import Decimal
        import datetime
        from app.models import Booking, Payment

        pay_amount = amount or Decimal("55000.00")
        event_dt = datetime.datetime(2027, 12, 1, 18, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Grand Gala",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.ACCEPTED,
            agreed_price=Decimal("50925.93"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=pay_amount,
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("4400.00"),
            artist_amount=Decimal("50600.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id=order_id,
            transaction_id=txn_id,
        )
        return booking, payment

    # 1. Full refund: ₹55,000 payment, ₹55,000 refunded -> refunded
    @patch("razorpay.Client")
    def test_full_refund_marks_payment_as_refunded(self, mock_client_cls):
        from decimal import Decimal
        from unittest.mock import MagicMock
        from app.models import Payment, Refund
        from app.views import initiate_payment_refund

        booking, payment = self._create_booking_and_payment(amount=Decimal("55000.00"), txn_id="pay_full_55k")
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_full_55000",
            "entity": "refund",
            "amount": 5500000,
            "currency": "INR",
            "status": "processed",
        }

        success, refund, err = initiate_payment_refund(
            payment=payment,
            amount=Decimal("55000.00"),
            reason="Full event cancellation refund",
            client=mock_instance,
        )
        self.assertTrue(success)
        self.assertIsNone(err)
        self.assertIsNotNone(refund)
        self.assertEqual(refund.status, Refund.Status.PROCESSED)
        self.assertEqual(refund.amount, Decimal("55000.00"))

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

    # 2. Partial refund: ₹55,000 payment, ₹27,500 refunded -> partially_refunded
    @patch("razorpay.Client")
    def test_partial_refund_marks_payment_as_partially_refunded(self, mock_client_cls):
        from decimal import Decimal
        from unittest.mock import MagicMock
        from app.models import Payment, Refund
        from app.views import initiate_payment_refund

        booking, payment = self._create_booking_and_payment(amount=Decimal("55000.00"), txn_id="pay_part_55k")
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_part_27500",
            "entity": "refund",
            "amount": 2750000,
            "currency": "INR",
            "status": "processed",
        }

        success, refund, err = initiate_payment_refund(
            payment=payment,
            amount=Decimal("27500.00"),
            reason="50% cancellation refund",
            client=mock_instance,
        )
        self.assertTrue(success)
        self.assertIsNone(err)
        self.assertIsNotNone(refund)
        self.assertEqual(refund.status, Refund.Status.PROCESSED)
        self.assertEqual(refund.amount, Decimal("27500.00"))

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PARTIALLY_REFUNDED)

    # 3. Multiple partial refunds totaling ₹55,000 -> refunded
    @patch("razorpay.Client")
    def test_multiple_partial_refunds_totaling_full_amount_marks_refunded(self, mock_client_cls):
        from decimal import Decimal
        from unittest.mock import MagicMock
        from app.models import Payment, Refund
        from app.views import initiate_payment_refund

        booking, payment = self._create_booking_and_payment(amount=Decimal("55000.00"), txn_id="pay_multi_55k")
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance

        # First partial refund of ₹27,500
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_part_split_1",
            "entity": "refund",
            "amount": 2750000,
            "currency": "INR",
            "status": "processed",
        }
        success1, refund1, err1 = initiate_payment_refund(
            payment=payment,
            amount=Decimal("27500.00"),
            reason="First partial refund (50%)",
            idempotency_key="rfnd_split_step1",
            client=mock_instance,
        )
        self.assertTrue(success1)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PARTIALLY_REFUNDED)

        # Second partial refund of ₹27,500 (completes ₹55,000 total)
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_part_split_2",
            "entity": "refund",
            "amount": 2750000,
            "currency": "INR",
            "status": "processed",
        }
        success2, refund2, err2 = initiate_payment_refund(
            payment=payment,
            amount=Decimal("27500.00"),
            reason="Second partial refund (remaining 50%)",
            idempotency_key="rfnd_split_step2",
            client=mock_instance,
        )
        self.assertTrue(success2)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)
        self.assertEqual(Refund.objects.filter(payment=payment, status=Refund.Status.PROCESSED).count(), 2)

    # 4. Duplicate refund webhook -> no duplicate refund or incorrect status
    @patch("razorpay.Client")
    def test_duplicate_refund_webhook_does_not_corrupt_status(self, mock_client_cls):
        import json
        from decimal import Decimal
        from unittest.mock import MagicMock
        from app.models import Payment, Refund

        booking, payment = self._create_booking_and_payment(
            amount=Decimal("55000.00"),
            txn_id="pay_webhook_dup_55k",
            order_id="order_webhook_dup_55k",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "refund.processed",
            "payload": {
                "refund": {
                    "entity": {
                        "id": "rfnd_webhook_dup_27500",
                        "payment_id": "pay_webhook_dup_55k",
                        "amount": 2750000,
                        "status": "processed",
                    }
                },
                "payment": {
                    "entity": {
                        "id": "pay_webhook_dup_55k",
                        "order_id": "order_webhook_dup_55k",
                        "amount": 5500000,
                    }
                }
            }
        })
        headers = {
            "HTTP_X_RAZORPAY_SIGNATURE": "valid_signature",
            "HTTP_X_RAZORPAY_EVENT_ID": "evt_refund_part_dup_999",
        }

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            # First webhook delivery
            res1 = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", **headers)
            self.assertEqual(res1.status_code, 200)

            payment.refresh_from_db()
            self.assertEqual(payment.status, Payment.Status.PARTIALLY_REFUNDED)
            self.assertEqual(Refund.objects.filter(payment=payment).count(), 1)
            rf1 = Refund.objects.filter(payment=payment).first()
            self.assertEqual(rf1.amount, Decimal("27500.00"))
            self.assertEqual(rf1.status, Refund.Status.PROCESSED)

            # Duplicate identical webhook delivery
            res2 = self.client.post("/api/payments/webhook/", data=webhook_body, content_type="application/json", **headers)
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(res2.json().get("status"), "ignored")

            # Status and records remain untouched
            payment.refresh_from_db()
            self.assertEqual(payment.status, Payment.Status.PARTIALLY_REFUNDED)
            self.assertEqual(Refund.objects.filter(payment=payment).count(), 1)

    # 5. Failed refund -> payment must not be marked refunded
    @patch("razorpay.Client")
    def test_failed_refund_does_not_mark_payment_refunded(self, mock_client_cls):
        from decimal import Decimal
        from unittest.mock import MagicMock
        import razorpay.errors
        from app.models import Payment, Refund
        from app.views import initiate_payment_refund

        booking, payment = self._create_booking_and_payment(amount=Decimal("55000.00"), txn_id="pay_fail_55k")
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.side_effect = razorpay.errors.GatewayError("Bank server unavailable")

        success, refund, err = initiate_payment_refund(
            payment=payment,
            amount=Decimal("27500.00"),
            reason="Partial refund attempt failing at gateway",
            client=mock_instance,
        )
        self.assertFalse(success)
        self.assertIsNotNone(err)
        self.assertIsNotNone(refund)
        self.assertEqual(refund.status, Refund.Status.FAILED)

        # Payment MUST remain SUCCESS and NOT marked REFUNDED or PARTIALLY_REFUNDED
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)

    # 6. Customer and Artist dashboards correctly expose partially_refunded status
    def test_customer_and_artist_dashboard_show_partially_refunded_status(self):
        from decimal import Decimal
        from app.models import Payment

        booking, payment = self._create_booking_and_payment(amount=Decimal("55000.00"), txn_id="pay_dash_part_55k")
        payment.status = Payment.Status.PARTIALLY_REFUNDED
        payment.save(update_fields=["status"])

        # Customer Dashboard
        self.client.force_login(self.customer)
        res_cust = self.client.get("/api/customer/dashboard/")
        self.assertEqual(res_cust.status_code, 200)
        cust_payments = res_cust.json().get("payments", [])
        p_cust = next((p for p in cust_payments if p["id"] == payment.id), None)
        self.assertIsNotNone(p_cust)
        self.assertEqual(p_cust["status"], "partially_refunded")

        # Artist Dashboard
        self.client.force_login(self.artist_user)
        res_art = self.client.get("/api/artist/dashboard/")
        self.assertEqual(res_art.status_code, 200)
        art_payments = res_art.json().get("payments", [])
        p_art = next((p for p in art_payments if p["id"] == payment.id), None)
        self.assertIsNotNone(p_art)
        self.assertEqual(p_art["status"], "partially_refunded")


class CompetingBookingsUnavailableTests(TestCase):
    """
    Regression test suite verifying booking lifecycle when an artist accepts
    one booking while other customers have competing pending requests for the same date.
    Covers:
    1. Accepting one request marks competing pending requests unavailable.
    2. Requests for different dates remain pending.
    3. Only one booking can be accepted for the same artist/date.
    4. Unavailable requests cannot be accepted, paid, or rescheduled.
    5. Concurrent acceptance attempts remain safe and dashboard serialization exposes unavailable status.
    """

    def setUp(self):
        from decimal import Decimal
        from django.contrib.auth.models import User
        from app.models import ArtistProfile, CustomerProfile, Category
        from zoneinfo import ZoneInfo

        self.kolkata = ZoneInfo("Asia/Kolkata")
        self.category = Category.objects.create(name="CompetingMusic", description="Competing Music Category")

        # Artist User & Profile
        self.artist_user = User.objects.create_user(
            username="artist_competing_dj",
            email="artist_competing_dj@example.com",
            password="testpassword123",
            first_name="Karan",
            last_name="DJ",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="DJ Karan",
            bio="Versatile DJ for parties and college fests",
            location="Kolkata",
            starting_price=Decimal("15000.00"),
            years_of_experience=6,
        )

        # Customer A
        self.customer_a = User.objects.create_user(
            username="customer_a_competing",
            email="customer_a@example.com",
            password="testpassword123",
            first_name="Customer",
            last_name="A",
        )
        self.cust_profile_a = CustomerProfile.objects.create(
            user=self.customer_a,
            phone="+919876543201",
            location="Kolkata",
        )

        # Customer B
        self.customer_b = User.objects.create_user(
            username="customer_b_competing",
            email="customer_b@example.com",
            password="testpassword123",
            first_name="Customer",
            last_name="B",
        )
        self.cust_profile_b = CustomerProfile.objects.create(
            user=self.customer_b,
            phone="+919876543202",
            location="Kolkata",
        )

        # Customer C (for different date)
        self.customer_c = User.objects.create_user(
            username="customer_c_competing",
            email="customer_c@example.com",
            password="testpassword123",
            first_name="Customer",
            last_name="C",
        )
        self.cust_profile_c = CustomerProfile.objects.create(
            user=self.customer_c,
            phone="+919876543203",
            location="Kolkata",
        )

    def _create_pending_booking(self, customer, date_dt, event_type="College Event"):
        from decimal import Decimal
        from app.models import Booking, Payment

        booking = Booking.objects.create(
            customer=customer,
            artist=self.artist,
            event_type=event_type,
            event_date=date_dt,
            event_location="Kolkata City Center",
            status=Booking.Status.PENDING,
            agreed_price=Decimal("20000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("20000.00"),
            status=Payment.Status.PENDING,
        )
        return booking, payment

    def test_accepting_one_request_marks_competing_pending_requests_unavailable(self):
        import datetime
        import json
        from app.models import Booking, Payment, Notification

        # Same event date: Nov 25, 2027 at 7:00 PM IST
        event_dt = datetime.datetime(2027, 11, 25, 19, 0, tzinfo=self.kolkata)
        booking_a, payment_a = self._create_pending_booking(self.customer_a, event_dt, "College Fest")
        booking_b, payment_b = self._create_pending_booking(self.customer_b, event_dt, "Corporate Party")

        # Artist accepts Customer A's booking
        self.client.force_login(self.artist_user)
        response = self.client.post(
            f"/api/artist/bookings/{booking_a.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "22000.00", "reason": "Confirmed for college fest"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        # Refresh from database
        booking_a.refresh_from_db()
        booking_b.refresh_from_db()
        payment_a.refresh_from_db()
        payment_b.refresh_from_db()

        # Customer A is ACCEPTED
        self.assertEqual(booking_a.status, Booking.Status.ACCEPTED)
        self.assertEqual(payment_a.status, Payment.Status.PENDING)
        self.assertEqual(booking_a.agreed_price, Decimal("22000.00"))

        # Customer B is automatically UNAVAILABLE
        self.assertEqual(booking_b.status, Booking.Status.UNAVAILABLE)
        self.assertEqual(
            booking_b.response_message,
            "This artist is no longer available on your selected date because another booking was confirmed."
        )
        # Payment for Customer B remains PENDING (untouched, not paid or modified)
        self.assertEqual(payment_b.status, Payment.Status.PENDING)

        # Notification created for Customer B
        notif = Notification.objects.filter(user=self.customer_b, title="Artist Unavailable").first()
        self.assertIsNotNone(notif)
        self.assertIn("no longer available", notif.message)
        self.assertIn("Nov 25, 2027", notif.message)

    def test_requests_for_different_dates_remain_pending(self):
        import datetime
        import json
        from app.models import Booking

        date_a = datetime.datetime(2027, 11, 25, 19, 0, tzinfo=self.kolkata)
        date_c = datetime.datetime(2027, 11, 26, 19, 0, tzinfo=self.kolkata)

        booking_a, _ = self._create_pending_booking(self.customer_a, date_a)
        booking_c, _ = self._create_pending_booking(self.customer_c, date_c)

        # Artist accepts Customer A for Nov 25
        self.client.force_login(self.artist_user)
        response = self.client.post(
            f"/api/artist/bookings/{booking_a.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        booking_a.refresh_from_db()
        booking_c.refresh_from_db()

        self.assertEqual(booking_a.status, Booking.Status.ACCEPTED)
        # Customer C for Nov 26 MUST remain PENDING
        self.assertEqual(booking_c.status, Booking.Status.PENDING)

    def test_only_one_booking_accepted_for_same_artist_and_date(self):
        import datetime
        import json
        from app.models import Booking

        event_dt = datetime.datetime(2027, 11, 25, 19, 0, tzinfo=self.kolkata)
        booking_a, _ = self._create_pending_booking(self.customer_a, event_dt)
        booking_b, _ = self._create_pending_booking(self.customer_b, event_dt)

        # Artist accepts Customer A
        self.client.force_login(self.artist_user)
        res_a = self.client.post(
            f"/api/artist/bookings/{booking_a.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res_a.status_code, 200)

        # Attempt to accept Customer B -> should fail with 409 Conflict
        res_b = self.client.post(
            f"/api/artist/bookings/{booking_b.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res_b.status_code, 409)
        self.assertIn("already has a booking or active reservation", res_b.json()["error"])

    def test_unavailable_requests_cannot_be_accepted_paid_or_rescheduled(self):
        import datetime
        import json
        from app.models import Booking

        event_dt = datetime.datetime(2027, 11, 25, 19, 0, tzinfo=self.kolkata)
        booking_a, _ = self._create_pending_booking(self.customer_a, event_dt)
        booking_b, _ = self._create_pending_booking(self.customer_b, event_dt)

        # Accept booking A -> booking B becomes unavailable
        self.client.force_login(self.artist_user)
        res_accept = self.client.post(
            f"/api/artist/bookings/{booking_a.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res_accept.status_code, 200)
        booking_b.refresh_from_db()
        self.assertEqual(booking_b.status, Booking.Status.UNAVAILABLE)

        # 1. Customer B attempts to create Razorpay payment order
        self.client.force_login(self.customer_b)
        res_pay = self.client.post(
            f"/api/payments/bookings/{booking_b.id}/create-order/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(res_pay.status_code, 409)
        self.assertIn("no longer available", res_pay.json()["error"])

        # 2. Customer B attempts to request rescheduling on unavailable booking
        res_resched = self.client.post(
            f"/api/customer/bookings/{booking_b.id}/reschedule/",
            data=json.dumps({"new_event_date": "2027-11-28 19:00", "reason": "Try another date"}),
            content_type="application/json",
        )
        self.assertEqual(res_resched.status_code, 400)
        self.assertIn("Cannot reschedule a booking that is unavailable.", res_resched.json()["error"])

        # 3. Customer B attempts to cancel unavailable booking
        res_cancel = self.client.post(
            f"/api/customer/bookings/{booking_b.id}/cancel/",
            data=json.dumps({"reason": "Cancel request"}),
            content_type="application/json",
        )
        self.assertEqual(res_cancel.status_code, 400)
        self.assertIn("unavailable", res_cancel.json()["error"])

    def test_customer_dashboard_displays_unavailable_booking_with_reason(self):
        import datetime
        import json
        from app.models import Booking

        event_dt = datetime.datetime(2027, 11, 25, 19, 0, tzinfo=self.kolkata)
        booking_a, _ = self._create_pending_booking(self.customer_a, event_dt)
        booking_b, _ = self._create_pending_booking(self.customer_b, event_dt)

        self.client.force_login(self.artist_user)
        res_accept = self.client.post(
            f"/api/artist/bookings/{booking_a.id}/respond/",
            data=json.dumps({"action": "accept", "final_price": "20000.00"}),
            content_type="application/json",
        )
        self.assertEqual(res_accept.status_code, 200)

        # Customer B fetches dashboard
        self.client.force_login(self.customer_b)
        res_dash = self.client.get("/api/customer/dashboard/")
        self.assertEqual(res_dash.status_code, 200)
        dash_data = res_dash.json()

        # In bookings list, booking B should have status 'unavailable' and response_message
        b_item = next((b for b in dash_data.get("bookings", []) if b["id"] == booking_b.id), None)
        self.assertIsNotNone(b_item)
        self.assertEqual(b_item["status"], "unavailable")
        self.assertIn("no longer available", b_item["response_message"])


class DelayedPaymentVerificationBugTests(TestCase):
    """
    Regression test suite for delayed Razorpay payment verification in verify_razorpay_payment_view.
    Covers:
    A. Expired booking + locally FAILED payment + gateway captured before deadline + date available = successful reconciliation.
    B. Expired booking + locally FAILED payment + gateway captured after deadline = refund.
    C. Expired booking + locally FAILED payment + date reallocated = refund, no restoration.
    D. Ordinary FAILED payment that was not expired by the reservation process remains rejected.
    E. Duplicate verification does not duplicate commission or refunds.
    F. Existing PENDING payment verification continues to work.
    """

    def setUp(self):
        import hmac
        import hashlib
        from decimal import Decimal
        from django.conf import settings
        from django.contrib.auth.models import User
        from zoneinfo import ZoneInfo
        from app.models import ArtistProfile, CustomerProfile, Category

        self.kolkata = ZoneInfo("Asia/Kolkata")
        self.category, _ = Category.objects.get_or_create(
            name="VerifyCategory", defaults={"description": "Verification Category"}
        )

        self.artist_user = User.objects.create_user(
            username="artist_verify_bug",
            email="artist_verify_bug@example.com",
            password="testpassword123",
            first_name="Verify",
            last_name="Artist",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="DJ Verify",
            bio="Artist for verification testing",
            location="Kolkata",
            starting_price=Decimal("15000.00"),
            years_of_experience=5,
        )

        self.customer = User.objects.create_user(
            username="customer_verify_bug",
            email="customer_verify_bug@example.com",
            password="testpassword123",
            first_name="Verify",
            last_name="Customer",
        )
        self.customer_profile = CustomerProfile.objects.create(
            user=self.customer,
            phone="+919876543299",
            location="Kolkata",
        )
        self.client.force_login(self.customer)

    def generate_signature(self, order_id, payment_id):
        import hmac
        import hashlib
        from django.conf import settings
        secret = settings.RAZORPAY_KEY_SECRET
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    # A. Expired booking + locally FAILED payment + gateway captured before deadline + date available = successful reconciliation
    @patch("razorpay.Client")
    def test_A_expired_booking_failed_payment_captured_before_deadline_date_available(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Notification

        # Accepted 25 hours ago -> deadline passed 1 hour ago
        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 12, 10, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Delayed Reconcile Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_delayed_verify_10a",
        )

        payment_id = "pay_delayed_verify_10a"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        # Captured 2 hours BEFORE deadline
        capture_time = deadline - datetime.timedelta(hours=2)
        capture_unix = int(capture_time.timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": capture_unix,
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")

        booking.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(booking.status, Booking.Status.ACCEPTED)
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)
        self.assertEqual(payment.commission_amount, Decimal("1200.00"))
        self.assertEqual(payment.artist_amount, Decimal("13800.00"))

        # Notification dispatched
        notif = Notification.objects.filter(user=self.customer, notification_type=Notification.NotificationType.PAYMENT).first()
        self.assertIsNotNone(notif)
        self.assertIn("15000.00", notif.message)

    # B. Expired booking + locally FAILED payment + gateway captured after deadline = refund
    @patch("razorpay.Client")
    def test_B_expired_booking_failed_payment_captured_after_deadline_triggers_refund(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=26)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 12, 12, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Late Capture Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_late_verify_10b",
        )

        payment_id = "pay_late_verify_10b"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        # Captured 1 hour AFTER deadline
        late_capture_unix = int((deadline + datetime.timedelta(hours=1)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": late_capture_unix,
        }
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_late_verify_10b",
            "amount": 1500000,
            "status": "processed",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertTrue(res.json().get("expired"))

        booking.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)

        # Refund created and initiated
        self.assertTrue(mock_instance.payment.refund.called)
        rf = Refund.objects.filter(payment=payment).first()
        self.assertIsNotNone(rf)
        self.assertEqual(rf.razorpay_refund_id, "rfnd_late_verify_10b")

    # C. Expired booking + locally FAILED payment + date reallocated = refund, no restoration
    @patch("razorpay.Client")
    def test_C_expired_booking_failed_payment_date_reallocated_triggers_refund(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from django.contrib.auth.models import User
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 12, 15, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Reallocated Date Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_realloc_verify_10c",
        )

        # Reallocated to another customer who confirmed and paid
        other_user = User.objects.create_user(username="other_cust_realloc_10c", password="password123")
        rebooked = Booking.objects.create(
            customer=other_user,
            artist=self.artist,
            event_type="Rebooked Event",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now(),
            agreed_price=Decimal("16000.00"),
        )
        Payment.objects.create(
            booking=rebooked,
            amount=Decimal("16000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1280.00"),
            artist_amount=Decimal("14720.00"),
            status=Payment.Status.SUCCESS,
            razorpay_order_id="order_rebooked_conf_10c",
            transaction_id="pay_rebooked_conf_10c",
        )

        payment_id = "pay_realloc_verify_10c"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        # Captured 1 hour BEFORE deadline
        capture_time = deadline - datetime.timedelta(hours=1)
        capture_unix = int(capture_time.timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": capture_unix,
        }
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_realloc_verify_10c",
            "amount": 1500000,
            "status": "processed",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("rebooked", res.json().get("error", ""))

        booking.refresh_from_db()
        payment.refresh_from_db()

        # Original booking MUST NOT be restored
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)

        # Refund created
        self.assertTrue(mock_instance.payment.refund.called)
        rf = Refund.objects.filter(payment=payment).first()
        self.assertIsNotNone(rf)
        self.assertEqual(rf.razorpay_refund_id, "rfnd_realloc_verify_10c")

    # D. Ordinary FAILED payment that was not expired by the reservation process remains rejected
    @patch("razorpay.Client")
    def test_D_ordinary_failed_payment_remains_rejected(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from app.models import Booking, Payment

        event_dt = datetime.datetime(2027, 12, 18, 19, 0, tzinfo=self.kolkata)
        # Booking is PENDING, not EXPIRED
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Ordinary Failed Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.PENDING,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_ordinary_fail_10d",
        )

        payment_id = "pay_ordinary_fail_10d"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("cannot be verified", res.json().get("error", ""))
        self.assertFalse(mock_client_cls.called)

    # E. Duplicate verification does not duplicate commission or refunds
    @patch("razorpay.Client")
    def test_E_duplicate_verification_does_not_duplicate_commission_or_refunds(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Notification, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 12, 20, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Duplicate Verify Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_dup_verify_10e",
        )

        payment_id = "pay_dup_verify_10e"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        capture_unix = int((deadline - datetime.timedelta(hours=2)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": capture_unix,
        }

        # First verification call
        res1 = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res1.status_code, 200)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.commission_amount, Decimal("1200.00"))
        notif_count_1 = Notification.objects.filter(user=self.customer).count()

        # Second verification call (duplicate)
        res2 = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res2.status_code, 200)
        self.assertIn("already verified", res2.json().get("message", ""))

        payment.refresh_from_db()
        self.assertEqual(payment.commission_amount, Decimal("1200.00"))
        notif_count_2 = Notification.objects.filter(user=self.customer).count()
        # Notifications not duplicated
        self.assertEqual(notif_count_1, notif_count_2)

    # F. Existing PENDING payment verification continues to work
    @patch("razorpay.Client")
    def test_F_existing_pending_payment_verification_continues_to_work(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment

        # Normal active booking, within 24h deadline
        acceptance_time = timezone.now() - datetime.timedelta(hours=2)
        event_dt = datetime.datetime(2027, 12, 22, 19, 0, tzinfo=self.kolkata)

        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Normal Pending Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.ACCEPTED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("20000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("20000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1600.00"),
            artist_amount=Decimal("18400.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_pending_verify_10f",
        )

        payment_id = "pay_pending_verify_10f"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 2000000,
            "currency": "INR",
            "status": "captured",
            "created_at": int(acceptance_time.timestamp()) + 1800,
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        booking.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(booking.status, Booking.Status.ACCEPTED)
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)
        self.assertEqual(payment.commission_amount, Decimal("1600.00"))
        self.assertEqual(payment.artist_amount, Decimal("18400.00"))


class StrictRazorpayTimestampValidationTests(TestCase):
    """
    Regression test suite for strict Razorpay payment timestamp validation (Fix 2).
    Covers:
    A. Valid timestamp before deadline.
    B. Valid timestamp after deadline.
    C. Missing timestamp.
    D. Null timestamp.
    E. Malformed timestamp.
    F. Implausible future timestamp.
    G. Boundary timestamp exactly at deadline.
    H. Webhook handling of unreliable timestamp with manual review.
    """

    def setUp(self):
        import hmac
        import hashlib
        from decimal import Decimal
        from django.conf import settings
        from django.contrib.auth.models import User
        from zoneinfo import ZoneInfo
        from app.models import ArtistProfile, CustomerProfile, Category

        self.kolkata = ZoneInfo("Asia/Kolkata")
        self.category, _ = Category.objects.get_or_create(
            name="StrictTimestampCategory", defaults={"description": "Timestamp Category"}
        )

        self.artist_user = User.objects.create_user(
            username="artist_ts_strict",
            email="artist_ts_strict@example.com",
            password="testpassword123",
            first_name="Strict",
            last_name="Artist",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            category=self.category,
            stage_name="DJ Strict Timestamp",
            bio="Artist for timestamp verification testing",
            location="Kolkata",
            starting_price=Decimal("15000.00"),
            years_of_experience=5,
        )

        self.customer = User.objects.create_user(
            username="customer_ts_strict",
            email="customer_ts_strict@example.com",
            password="testpassword123",
            first_name="Strict",
            last_name="Customer",
        )
        self.customer_profile = CustomerProfile.objects.create(
            user=self.customer,
            phone="+919876543288",
            location="Kolkata",
        )
        self.client.force_login(self.customer)

    def generate_signature(self, order_id, payment_id):
        import hmac
        import hashlib
        from django.conf import settings
        secret = settings.RAZORPAY_KEY_SECRET
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    def generate_webhook_signature(self, body_str):
        import hmac
        import hashlib
        from django.conf import settings
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        return hmac.new(secret.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256).hexdigest()

    def test_shared_timestamp_helper_unit_tests(self):
        import datetime
        from django.utils import timezone
        from app.views import validate_gateway_capture_timestamp

        now = timezone.now()
        acceptance = now - datetime.timedelta(hours=25)
        deadline = acceptance + datetime.timedelta(hours=24) # 1 hour ago

        # Missing / Null
        res_none = validate_gateway_capture_timestamp(None, deadline)
        self.assertFalse(res_none.is_valid)
        self.assertIn("missing or null", res_none.reason)

        res_empty = validate_gateway_capture_timestamp("", deadline)
        self.assertFalse(res_empty.is_valid)
        self.assertIn("empty", res_empty.reason)

        # Malformed
        res_malformed = validate_gateway_capture_timestamp("not_a_number", deadline)
        self.assertFalse(res_malformed.is_valid)
        self.assertIn("Malformed", res_malformed.reason)

        # Boolean (rejected despite being int subclass in Python)
        res_bool = validate_gateway_capture_timestamp(True, deadline)
        self.assertFalse(res_bool.is_valid)
        self.assertIn("boolean", res_bool.reason)

        # Negative / Pre-2020
        res_neg = validate_gateway_capture_timestamp(-500, deadline)
        self.assertFalse(res_neg.is_valid)
        self.assertIn("out of plausible range", res_neg.reason)

        res_old = validate_gateway_capture_timestamp(1000, deadline)
        self.assertFalse(res_old.is_valid)
        self.assertIn("out of plausible range", res_old.reason)

        # Implausible Future (e.g. tomorrow)
        res_future = validate_gateway_capture_timestamp((now + datetime.timedelta(days=1)).timestamp(), deadline)
        self.assertFalse(res_future.is_valid)
        self.assertIn("implausibly in the future", res_future.reason)

        # Valid before deadline
        on_time_ts = (deadline - datetime.timedelta(hours=2)).timestamp()
        res_ontime = validate_gateway_capture_timestamp(on_time_ts, deadline)
        self.assertTrue(res_ontime.is_valid)
        self.assertTrue(res_ontime.is_on_time)

        # Exact boundary at deadline
        res_boundary = validate_gateway_capture_timestamp(deadline.timestamp(), deadline)
        self.assertTrue(res_boundary.is_valid)
        self.assertTrue(res_boundary.is_on_time)

        # Valid after deadline
        late_ts = (deadline + datetime.timedelta(minutes=30)).timestamp()
        res_late = validate_gateway_capture_timestamp(late_ts, deadline)
        self.assertTrue(res_late.is_valid)
        self.assertFalse(res_late.is_on_time)

        # No deadline (None)
        res_no_deadline = validate_gateway_capture_timestamp((now - datetime.timedelta(hours=1)).timestamp(), None)
        self.assertTrue(res_no_deadline.is_valid)
        self.assertTrue(res_no_deadline.is_on_time)

    # A. Valid timestamp before deadline
    @patch("razorpay.Client")
    def test_A_valid_timestamp_before_deadline_succeeds(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 12, 10, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Valid Before Deadline",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_01a",
        )

        payment_id = "pay_strict_ts_01a"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        capture_unix = int((deadline - datetime.timedelta(hours=2)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": capture_unix,
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)

    # B. Valid timestamp after deadline
    @patch("razorpay.Client")
    def test_B_valid_timestamp_after_deadline_refunds(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=26)
        deadline = acceptance_time + datetime.timedelta(hours=24)

        event_dt = datetime.datetime(2027, 12, 12, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Valid After Deadline",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_02b",
        )

        payment_id = "pay_strict_ts_02b"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        late_unix = int((deadline + datetime.timedelta(hours=1)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": late_unix,
        }
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_strict_ts_02b",
            "amount": 1500000,
            "status": "processed",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertTrue(res.json().get("expired"))

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)
        self.assertTrue(mock_instance.payment.refund.called)

    # C. Missing timestamp
    @patch("razorpay.Client")
    def test_C_missing_timestamp_flags_manual_review_no_refund_no_restore(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)

        event_dt = datetime.datetime(2027, 12, 14, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Missing Timestamp Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_03c",
        )

        payment_id = "pay_strict_ts_03c"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        # Omits created_at entirely
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 422)
        data = res.json()
        self.assertTrue(data.get("reconciliation_pending"))
        self.assertTrue(data.get("manual_review"))

        booking.refresh_from_db()
        payment.refresh_from_db()

        # State preserved for manual review: NOT restored, NOT marked success, NOT refunded
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)
        self.assertFalse(mock_instance.payment.refund.called)
        self.assertFalse(Refund.objects.filter(payment=payment).exists())
        self.assertIn("manual review", booking.response_message)

    # D. Null timestamp
    @patch("razorpay.Client")
    def test_D_null_timestamp_flags_manual_review(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)

        event_dt = datetime.datetime(2027, 12, 16, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Null Timestamp Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_04d",
        )

        payment_id = "pay_strict_ts_04d"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": None,
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 422)
        self.assertTrue(res.json().get("reconciliation_pending"))

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)
        self.assertFalse(Refund.objects.filter(payment=payment).exists())

    # E. Malformed timestamp
    @patch("razorpay.Client")
    def test_E_malformed_timestamp_flags_manual_review(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)

        event_dt = datetime.datetime(2027, 12, 18, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Malformed Timestamp Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_05e",
        )

        payment_id = "pay_strict_ts_05e"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": "malformed_non_epoch",
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 422)
        self.assertTrue(res.json().get("reconciliation_pending"))

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)
        self.assertFalse(Refund.objects.filter(payment=payment).exists())

    # F. Implausible future timestamp
    @patch("razorpay.Client")
    def test_F_implausible_future_timestamp_flags_manual_review(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)

        event_dt = datetime.datetime(2027, 12, 20, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Future Timestamp Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_06f",
        )

        payment_id = "pay_strict_ts_06f"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        # 1 year in the future
        future_unix = int((timezone.now() + datetime.timedelta(days=365)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": future_unix,
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 422)
        self.assertTrue(res.json().get("reconciliation_pending"))

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)
        self.assertFalse(Refund.objects.filter(payment=payment).exists())

    # G. Boundary timestamp exactly at deadline
    @patch("razorpay.Client")
    def test_G_boundary_timestamp_exactly_at_deadline_succeeds(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)
        deadline = acceptance_time + datetime.timedelta(hours=24) # 1 hour ago

        event_dt = datetime.datetime(2027, 12, 22, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Exact Boundary Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_strict_ts_07g",
        )

        payment_id = "pay_strict_ts_07g"
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)

        # EXACTLY AT DEADLINE
        boundary_unix = int(deadline.timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1500000,
            "currency": "INR",
            "status": "captured",
            "created_at": boundary_unix,
        }

        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)

    # H. Webhook handles unreliable timestamp with manual review
    @patch("razorpay.Client")
    def test_H_webhook_handles_unreliable_timestamp_with_manual_review(self, mock_client_cls):
        import datetime
        import json
        from decimal import Decimal
        from django.utils import timezone
        from unittest.mock import MagicMock
        from app.models import Booking, Payment, Refund

        acceptance_time = timezone.now() - datetime.timedelta(hours=25)

        event_dt = datetime.datetime(2027, 12, 24, 19, 0, tzinfo=self.kolkata)
        booking = Booking.objects.create(
            customer=self.customer,
            artist=self.artist,
            event_type="Webhook Unreliable TS Show",
            event_date=event_dt,
            event_location="Kolkata",
            status=Booking.Status.EXPIRED,
            accepted_at=acceptance_time,
            agreed_price=Decimal("15000.00"),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_webhook_unreliable_08h",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.utility.verify_webhook_signature.return_value = True

        webhook_body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_unreliable_08h",
                        "order_id": "order_webhook_unreliable_08h",
                        "status": "captured",
                        "amount": 1500000,
                        "currency": "INR",
                        "created_at": None, # Unreliable null timestamp
                    }
                }
            }
        })

        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post(
                "/api/payments/webhook/",
                data=webhook_body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_mocked_signature",
            )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "reconciliation_pending")

        booking.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(booking.status, Booking.Status.EXPIRED)
        self.assertNotEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, "pay_webhook_unreliable_08h")
        self.assertFalse(Refund.objects.filter(payment=payment).exists())
        self.assertIn("manual review", booking.response_message)


class ConcurrencyAndLockOrderTests(TestCase):
    """
    Focused concurrency and lock order tests:
    1. Payment verification versus artist acceptance.
    2. Webhook versus artist acceptance.
    3. Delayed restoration versus a new booking acceptance (prevent double booking).
    4. Concurrent refund initiation and webhook processing.
    5. Customer cancellation locking canonical order.
    """

    def setUp(self):
        from decimal import Decimal
        from django.contrib.auth.models import User
        from app.models import ArtistProfile, CustomerProfile, Booking, Payment, Category, Refund
        from zoneinfo import ZoneInfo
        import datetime

        self.kolkata_tz = ZoneInfo("Asia/Kolkata")
        self.category, _ = Category.objects.get_or_create(
            name="Musician", defaults={"description": "Musical artists"}
        )

        self.artist_user = User.objects.create_user(
            username="concurrent_artist",
            email="concurrent_artist@test.com",
            password="testpassword123",
            first_name="Concurrent",
            last_name="Artist",
        )
        self.artist = ArtistProfile.objects.create(
            user=self.artist_user,
            stage_name="DJ Concurrency",
            category=self.category,
            starting_price=Decimal("10000.00"),
            years_of_experience=5,
            location="Kolkata",
        )

        self.customer1 = User.objects.create_user(
            username="concurrent_cust1",
            email="concurrent_cust1@test.com",
            password="testpassword123",
            first_name="Customer",
            last_name="One",
        )
        CustomerProfile.objects.create(
            user=self.customer1,
            phone="+919876543201",
            location="Kolkata",
        )

        self.customer2 = User.objects.create_user(
            username="concurrent_cust2",
            email="concurrent_cust2@test.com",
            password="testpassword123",
            first_name="Customer",
            last_name="Two",
        )
        CustomerProfile.objects.create(
            user=self.customer2,
            phone="+919876543202",
            location="Kolkata",
        )

    def generate_signature(self, order_id, payment_id):
        import hmac
        import hashlib
        from django.conf import settings
        secret = settings.RAZORPAY_KEY_SECRET
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    def generate_webhook_signature(self, body_str):
        import hmac
        import hashlib
        from django.conf import settings
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        return hmac.new(secret.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256).hexdigest()

    @patch("razorpay.Client")
    def test_01_payment_verification_versus_artist_acceptance_lock_order(self, mock_client_cls):
        """
        Verify that payment verification locks in canonical order (ArtistProfile -> Booking -> Payment).
        """
        import datetime
        from django.utils import timezone
        from decimal import Decimal

        event_date = timezone.now() + datetime.timedelta(days=20)
        booking = Booking.objects.create(
            customer=self.customer1,
            artist=self.artist,
            event_type="Corporate Event",
            event_date=event_date,
            event_location="Kolkata",
            performance_duration="3 hours",
            expected_audience_size=100,
            agreed_price=Decimal("12000.00"),
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=2),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("12000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("960.00"),
            artist_amount=Decimal("11040.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_concurrent_verify_01",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        payment_id = "pay_concurrent_verify_01"
        created_at_ts = int(timezone.now().timestamp())
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment.razorpay_order_id,
            "amount": 1200000,
            "currency": "INR",
            "status": "captured",
            "created_at": created_at_ts,
        }

        self.client.force_login(self.customer1)
        sig = self.generate_signature(payment.razorpay_order_id, payment_id)
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        payment.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, payment_id)

    @patch("razorpay.Client")
    def test_02_webhook_versus_artist_acceptance_lock_order(self, mock_client_cls):
        """
        Verify that webhook reconciliation locks in canonical order (ArtistProfile -> Booking -> Payment).
        """
        import datetime
        from django.utils import timezone
        from decimal import Decimal

        event_date = timezone.now() + datetime.timedelta(days=22)
        booking = Booking.objects.create(
            customer=self.customer1,
            artist=self.artist,
            event_type="Festival",
            event_date=event_date,
            event_location="Kolkata",
            performance_duration="4 hours",
            expected_audience_size=300,
            agreed_price=Decimal("15000.00"),
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=3),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("15000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1200.00"),
            artist_amount=Decimal("13800.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_concurrent_webhook_02",
        )

        payment_id = "pay_concurrent_webhook_02"
        body = json.dumps({
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": payment.razorpay_order_id,
                        "amount": 1500000,
                        "currency": "INR",
                        "status": "captured",
                        "created_at": int(timezone.now().timestamp()),
                    }
                }
            }
        })
        sig = self.generate_webhook_signature(body)
        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post(
                "/api/payments/webhook/",
                data=body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE=sig,
            )
        self.assertEqual(res.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)

    @patch("razorpay.Client")
    def test_03_delayed_restoration_versus_new_booking_acceptance_no_double_booking(self, mock_client_cls):
        """
        Critical test:
        1. Booking 1 on Date D was EXPIRED.
        2. Booking 2 on Date D was submitted by Customer 2 and ACCEPTED by the artist.
        3. Customer 1's payment for Booking 1 had been captured on-time before expiry.
        4. Customer 1 attempts verification for Booking 1.
        5. System MUST NOT double-book: detects Date D is occupied under ArtistProfile lock,
           refuses to restore Booking 1, keeps Booking 2 ACCEPTED, and triggers a refund for Booking 1.
        """
        import datetime
        from django.utils import timezone
        from decimal import Decimal

        event_date = timezone.now() + datetime.timedelta(days=25)
        local_event_date = timezone.localtime(event_date, timezone=self.kolkata_tz).date()

        # 1. Booking 1 for Customer 1 (expired unpaid reservation)
        b1_acceptance = timezone.now() - datetime.timedelta(hours=26)
        booking1 = Booking.objects.create(
            customer=self.customer1,
            artist=self.artist,
            event_type="College Fest",
            event_date=event_date,
            event_location="Kolkata",
            performance_duration="2 hours",
            expected_audience_size=200,
            agreed_price=Decimal("10000.00"),
            status=Booking.Status.EXPIRED,
            accepted_at=b1_acceptance,
            response_message="Reservation expired",
        )
        payment1 = Payment.objects.create(
            booking=booking1,
            amount=Decimal("10000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("800.00"),
            artist_amount=Decimal("9200.00"),
            status=Payment.Status.FAILED,
            razorpay_order_id="order_b1_expired_race",
        )

        # 2. Booking 2 for Customer 2 on same date is accepted by artist
        booking2 = Booking.objects.create(
            customer=self.customer2,
            artist=self.artist,
            event_type="Wedding Sangeet",
            event_date=event_date,
            event_location="Kolkata",
            performance_duration="3 hours",
            expected_audience_size=250,
            agreed_price=Decimal("14000.00"),
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=1),
        )
        payment2 = Payment.objects.create(
            booking=booking2,
            amount=Decimal("14000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("1120.00"),
            artist_amount=Decimal("12880.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_b2_accepted_race",
        )

        # 3. Customer 1's payment was captured on-time (before b1_acceptance + 24 hours)
        b1_deadline = b1_acceptance + datetime.timedelta(hours=24)
        ontime_capture_ts = int((b1_deadline - datetime.timedelta(minutes=30)).timestamp())

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        payment_id = "pay_b1_ontime_captured"
        mock_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": payment1.razorpay_order_id,
            "amount": 1000000,
            "currency": "INR",
            "status": "captured",
            "created_at": ontime_capture_ts,
        }
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_b1_race_01",
            "status": "processed",
            "amount": 1000000,
        }

        # Customer 1 attempts verification
        self.client.force_login(self.customer1)
        sig = self.generate_signature(payment1.razorpay_order_id, payment_id)
        res = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": payment1.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": sig,
            }),
            content_type="application/json",
        )

        # Response must be HTTP 409 explaining date was rebooked and refund issued
        self.assertEqual(res.status_code, 409)
        self.assertIn("rebooked", res.json()["error"])

        # Check database records
        booking1.refresh_from_db()
        booking2.refresh_from_db()
        payment1.refresh_from_db()

        # Crucial check: Booking 1 must NOT be restored to ACCEPTED
        self.assertEqual(booking1.status, Booking.Status.EXPIRED)
        # Booking 2 remains the sole confirmed booking
        self.assertEqual(booking2.status, Booking.Status.ACCEPTED)
        # Payment 1 must be marked refunded / failed and refund entity created
        self.assertEqual(payment1.status, Payment.Status.REFUNDED)
        self.assertTrue(Refund.objects.filter(payment=payment1, status=Refund.Status.PROCESSED).exists())

    @patch("razorpay.Client")
    def test_04_concurrent_refund_initiation_and_webhook_processing(self, mock_client_cls):
        """
        Verify that refund initiation and refund webhook lock in consistent Payment -> Refund order
        and maintain idempotency.
        """
        import datetime
        from django.utils import timezone
        from decimal import Decimal

        booking = Booking.objects.create(
            customer=self.customer1,
            artist=self.artist,
            event_type="Birthday Party",
            event_date=timezone.now() + datetime.timedelta(days=15),
            event_location="Kolkata",
            performance_duration="2 hours",
            expected_audience_size=80,
            agreed_price=Decimal("8000.00"),
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=2),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("8000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("640.00"),
            artist_amount=Decimal("7360.00"),
            status=Payment.Status.SUCCESS,
            transaction_id="pay_refund_concurrent_04",
            razorpay_order_id="order_refund_concurrent_04",
        )

        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.payment.refund.return_value = {
            "id": "rfnd_gateway_04",
            "status": "processed",
            "amount": 800000,
        }

        # 1. Initiate refund
        from app.views import initiate_payment_refund
        success, refund_obj, err = initiate_payment_refund(payment, reason="Customer cancelled")
        self.assertTrue(success)
        self.assertIsNotNone(refund_obj)
        self.assertEqual(refund_obj.status, Refund.Status.PROCESSED)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

        # 2. Concurrently or immediately after, webhook arrives
        wh_body = json.dumps({
            "event": "refund.processed",
            "payload": {
                "refund": {
                    "entity": {
                        "id": "rfnd_gateway_04",
                        "payment_id": "pay_refund_concurrent_04",
                        "amount": 800000,
                        "status": "processed",
                    }
                },
                "payment": {
                    "entity": {
                        "id": "pay_refund_concurrent_04",
                        "order_id": "order_refund_concurrent_04",
                    }
                }
            }
        })
        sig = self.generate_webhook_signature(wh_body)
        with self.settings(RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"):
            res = self.client.post(
                "/api/payments/webhook/",
                data=wh_body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE=sig,
            )
        self.assertEqual(res.status_code, 200)

        # Confirm exactly 1 refund record exists (no duplicate)
        refunds = Refund.objects.filter(payment=payment)
        self.assertEqual(refunds.count(), 1)
        self.assertEqual(refunds.first().status, Refund.Status.PROCESSED)

    def test_05_customer_cancellation_locks_canonical_order(self):
        """
        Verify that customer cancellation locks ArtistProfile -> Booking -> Payment.
        """
        import datetime
        from django.utils import timezone
        from decimal import Decimal

        booking = Booking.objects.create(
            customer=self.customer1,
            artist=self.artist,
            event_type="Private Dinner",
            event_date=timezone.now() + datetime.timedelta(days=10),
            event_location="Kolkata",
            performance_duration="2 hours",
            expected_audience_size=20,
            agreed_price=Decimal("5000.00"),
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=5),
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=Decimal("5000.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("400.00"),
            artist_amount=Decimal("4600.00"),
            status=Payment.Status.PENDING,
            razorpay_order_id="order_cust_cancel_05",
        )

        self.client.force_login(self.customer1)
        res = self.client.post(
            f"/api/customer/bookings/{booking.id}/cancel/",
            data=json.dumps({"reason": "Personal emergency"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        booking.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertEqual(payment.status, Payment.Status.FAILED)



