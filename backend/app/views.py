import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from .forms import LoginForm

# Create your views here.
@ensure_csrf_cookie
@require_GET
def csrf_token_view(request):
    return JsonResponse({
        "csrfToken": get_token(request)
    })

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

    # Allow login using either username or email
    username = identifier

    if "@" in identifier:
        user_obj = User.objects.filter(
            email__iexact=identifier
        ).first()

        if user_obj is None:
            return JsonResponse(
                {"error": "Invalid username/email or password."},
                status=400,
            )

        username = user_obj.username

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None:
        return JsonResponse(
            {"error": "Invalid username/email or password."},
            status=400,
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

@require_POST
def logout_view(request):
    logout(request)

    return JsonResponse({
        "message": "Logout successful."
    })
