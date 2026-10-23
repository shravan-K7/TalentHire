import json
import re

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests
from google.oauth2 import id_token

from .forms import LoginForm


@ensure_csrf_cookie
@require_GET
def csrf_token_view(request):
    return JsonResponse({
        "csrfToken": get_token(request)
    })


@csrf_protect
@require_POST
def register_view(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400,
        )

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return JsonResponse(
            {"error": "All fields are required."},
            status=400,
        )

    # Validate username format
    username_validator = UnicodeUsernameValidator()
    try:
        username_validator(username)
    except ValidationError:
        return JsonResponse(
            {"error": "Enter a valid username. Letters, digits and @/./+/-/_ only."},
            status=400,
        )

    # Validate email
    try:
        validate_email(email)
    except (ValidationError, ValueError):
        return JsonResponse(
            {"error": "Enter a valid email address."},
            status=400,
        )

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse(
            {"error": "This username is already taken."},
            status=400,
        )

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse(
            {"error": "This email is already registered."},
            status=400,
        )

    if len(password) < 8:
        return JsonResponse(
            {"error": "Password must contain at least 8 characters."},
            status=400,
        )

    try:
        validate_password(password)
    except ValidationError as error:
        return JsonResponse(
            {"error": " ".join(error.messages)},
            status=400,
        )

    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
    except IntegrityError:
        return JsonResponse(
            {"error": "Unable to create this account. Try another username."},
            status=400,
        )

    # Automatically log the user in after registration
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return JsonResponse(
        {
            "message": "Registration successful. You can log in.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
            },
        },
        status=201,
    )


@csrf_protect
@require_POST
def login_view(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"error": "Invalid JSON format."},
            status=400,
        )

    form = LoginForm(data)
    if not form.is_valid():
        return JsonResponse(
            {"errors": form.errors.get_json_data()},
            status=400,
        )

    identifier = form.cleaned_data["username_or_email"]
    password = form.cleaned_data["password"]

    username = identifier

    # If identifier looks like an email or matches an existing email, resolve username
    if "@" in identifier:
        user_obj = User.objects.filter(email__iexact=identifier).first()
        if user_obj is not None:
            username = user_obj.username

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    # If not found yet and identifier doesn't have '@', check if an email matches
    if user is None and "@" not in identifier:
        user_obj = User.objects.filter(email__iexact=identifier).first()
        if user_obj is not None:
            user = authenticate(request, username=user_obj.username, password=password)

    if user is None:
        return JsonResponse(
            {"error": "Invalid username/email or password."},
            status=400,
        )

    if not user.is_active:
        return JsonResponse(
            {"error": "This account is inactive."},
            status=403,
        )

    login(request, user)

    return JsonResponse({
        "message": "Login successful.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
        },
    })


@require_GET
def current_user_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Not authenticated."},
            status=401,
        )

    user = request.user

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
    })


@csrf_protect
@require_POST
def logout_view(request):
    logout(request)

    return JsonResponse({
        "message": "Logout successful."
    })


@csrf_protect
@require_POST
def google_login_view(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400,
        )

    token = data.get("credential")
    if not token:
        return JsonResponse(
            {"error": "Google credential is required."},
            status=400,
        )

    google_client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not google_client_id:
        return JsonResponse(
            {"error": "Google Sign-In is not configured on the server."},
            status=500,
        )

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            google_client_id,
        )
    except (ValueError, GoogleAuthError) as error:
        print("Google verification error:", repr(error))
        return JsonResponse(
            {"error": "Invalid or expired Google credential."},
            status=400,
        )

    # Accept only verified Google email addresses
    if not idinfo.get("email_verified"):
        return JsonResponse(
            {"error": "Google email is not verified."},
            status=400,
        )

    email = idinfo.get("email", "").strip().lower()
    if not email:
        return JsonResponse(
            {"error": "Google account has no email."},
            status=400,
        )

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()

    if user is None:
        # Create a unique sanitized username for a new Google user
        email_prefix = email.split("@")[0]
        base_username = re.sub(r"[^a-zA-Z0-9_]", "_", email_prefix) or "user"
        username = base_username
        counter = 1

        while User.objects.filter(username__iexact=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=None,
        )

    if not user.is_active:
        return JsonResponse(
            {"error": "This account is inactive."},
            status=403,
        )

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return JsonResponse({
        "message": "Google login successful.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
        },
    })