import json

from django.contrib.auth.models import User
from django.test import Client, TestCase


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
        self.assertEqual(response.json()["error"], "Invalid username/email or password.")

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
