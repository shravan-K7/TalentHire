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



