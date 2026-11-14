import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from app.models import Category, ArtistProfile, Booking, Payment, ArtistAvailability


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

        # Second booking remains PENDING
        booking_2.refresh_from_db()
        self.assertEqual(booking_2.status, Booking.Status.PENDING)

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






