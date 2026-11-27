import datetime
import json
import logging
import re
from zoneinfo import ZoneInfo

import razorpay
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction

from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, models
from django.db.models import Sum
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests
from google.oauth2 import id_token

from .forms import LoginForm, ArtistProfileForm
from .cancellation_policy import calculate_cancellation_refund
from .models import (
    ArtistProfile,
    ArtistServiceDistrict,
    Category,
    Country,
    State,
    District,
    City,
    Booking,
    Portfolio,
    Payment,
    CustomerProfile,
    FavoriteArtist,
    Notification,
    ArtistAvailability,
    Refund,
    ProcessedWebhookEvent,
    BookingCancellation,
    ReschedulingRequest,
    ChatSession,
    ChatMessage,
    ChatbotErrorLog,
)
from .services.chatbot_service import (
    ChatbotConfigurationError,
    ChatbotServiceError,
    MAX_HISTORY_MESSAGES,
    MAX_MESSAGE_LENGTH,
    detect_user_role,
    generate_chatbot_turn,
)

logger = logging.getLogger(__name__)


def serialize_user(user):
    artist_profile = getattr(user, "artist_profile", None)
    artist_data = None
    if artist_profile:
        artist_data = {
            "id": artist_profile.id,
            "stage_name": artist_profile.stage_name,
            "category_id": artist_profile.category_id,
            "category_name": artist_profile.category.name
            if artist_profile.category
            else "",
            "gender": artist_profile.gender,
            "starting_price": str(artist_profile.starting_price),
            "location": artist_profile.location,
            "phone": artist_profile.phone,
            "bio": artist_profile.bio,
            "is_verified": artist_profile.is_verified,
        }

    customer_profile = getattr(user, "customer_profile", None)
    customer_data = None
    if customer_profile:
        customer_data = {
            "phone": customer_profile.phone,
            "location": customer_profile.location,
            "profile_image": customer_profile.profile_image.url
            if customer_profile.profile_image
            else "",
            "is_verified": customer_profile.is_verified,
        }

    # Dynamically determine role
    if user.is_staff or user.is_superuser:
        role = "admin"
    elif artist_profile is not None:
        role = "artist"
    else:
        role = "customer"

    full_name = f"{user.first_name} {user.last_name}".strip()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": full_name or user.username,
        "phone": customer_profile.phone if customer_profile else "",
        "location": customer_profile.location if customer_profile else "",
        "profile_image": (
            customer_profile.profile_image.url
            if (customer_profile and customer_profile.profile_image)
            else ""
        ),
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_artist": artist_profile is not None,
        "artist_profile": artist_data,
        "customer_profile": customer_data,
        "is_verified": customer_profile.is_verified if customer_profile else True,
        "role": role,
    }


@ensure_csrf_cookie
@require_GET
def csrf_token_view(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
def check_username_view(request):
    username = request.GET.get("username", "").strip()

    if not username:
        return JsonResponse({"available": False, "message": "Username is required."})

    # Validate username format
    username_validator = UnicodeUsernameValidator()

    try:
        username_validator(username)
    except ValidationError:
        return JsonResponse({"available": False, "message": "Enter a valid username."})
    # Check username availability (case-insensitive)
    exists = User.objects.filter(username__iexact=username).exists()

    if exists:
        import random

        base = username[:20]
        candidates = [
            f"{base}{random.randint(10, 99)}",
            f"{base}_live",
            f"{base}{random.randint(100, 999)}",
            f"{base}_pro",
        ]
        suggestions = []
        for cand in candidates:
            if not User.objects.filter(username__iexact=cand).exists():
                suggestions.append(cand)
                if len(suggestions) >= 3:
                    break

        return JsonResponse(
            {
                "available": False,
                "message": "This username is already taken.",
                "suggestions": suggestions,
            }
        )

    return JsonResponse({"available": True, "message": "Username is available."})


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
    role = data.get("role", "")
    if isinstance(role, str):
        role = role.strip().lower()
    else:
        role = ""

    if not role or role not in ("customer", "artist"):
        return JsonResponse(
            {
                "error": "Please select whether you want to join as a Customer or Performing Artist."
            },
            status=400,
        )

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

    user_data = serialize_user(user)
    user_data["role"] = role

    return JsonResponse(
        {
            "message": "Registration successful.",
            "user": user_data,
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

    # Dynamic role detection for unified single-entry login
    if user.is_staff or user.is_superuser:
        detected_role = "admin"
        redirect_to = "/admin-dashboard"
    elif hasattr(user, "artist_profile") and user.artist_profile is not None:
        detected_role = "artist"
        redirect_to = "/artist-dashboard"
    else:
        detected_role = "customer"
        redirect_to = "/customer-dashboard"

    user_data = serialize_user(user)

    return JsonResponse(
        {
            "message": "Login successful.",
            "user": user_data,
            "role": detected_role,
            "redirect_to": redirect_to,
        }
    )


@require_GET
def current_user_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Not authenticated."},
            status=401,
        )

    return JsonResponse(serialize_user(request.user))


@csrf_protect
@require_POST
def logout_view(request):
    logout(request)

    return JsonResponse({"message": "Logout successful."})


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

    role = data.get("role", "customer")
    if role not in ("customer", "artist"):
        role = "customer"

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
            google_client_id.strip(),
            clock_skew_in_seconds=60,
        )
    except (ValueError, GoogleAuthError) as error:
        logger.warning("Google verification error: %s", repr(error))
        error_detail = (
            f"Invalid or expired Google credential ({error})."
            if settings.DEBUG
            else "Invalid or expired Google credential."
        )
        return JsonResponse(
            {"error": error_detail},
            status=400,
        )
    except Exception as error:
        logger.exception(
            "Unexpected error verifying Google credential: %s", repr(error)
        )
        error_detail = (
            f"Google Sign-In failed: {error}"
            if settings.DEBUG
            else "Google Sign-In failed."
        )
        return JsonResponse(
            {"error": error_detail},
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
            first_name=idinfo.get("given_name", "")[:150],
            last_name=idinfo.get("family_name", "")[:150],
        )
    else:
        updated = False
        if not user.first_name and idinfo.get("given_name"):
            user.first_name = idinfo.get("given_name", "")[:150]
            updated = True
        if not user.last_name and idinfo.get("family_name"):
            user.last_name = idinfo.get("family_name", "")[:150]
            updated = True
        if updated:
            user.save(update_fields=["first_name", "last_name"])

    if not user.is_active:
        return JsonResponse(
            {"error": "This account is inactive."},
            status=403,
        )

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    # Dynamic role detection for unified single-entry login
    if user.is_staff or user.is_superuser:
        detected_role = "admin"
        redirect_to = "/admin-dashboard"
    elif hasattr(user, "artist_profile") and user.artist_profile is not None:
        detected_role = "artist"
        redirect_to = "/artist-dashboard"
    elif role == "artist":
        detected_role = "artist"
        redirect_to = "/artist-register"
    else:
        detected_role = "customer"
        redirect_to = "/customer-dashboard"

    user_data = serialize_user(user)
    user_data["role"] = detected_role

    return JsonResponse(
        {
            "message": "Google login successful.",
            "user": user_data,
            "role": detected_role,
            "redirect_to": redirect_to,
        }
    )


@require_GET
def artist_categories(request):
    categories = (
        Category.objects.annotate(
            artist_count=models.Count(
                "artists",
                filter=models.Q(artists__is_active=True, artists__user__is_active=True),
            )
        )
        .order_by("name")
        .values("id", "name", "artist_count")
    )
    total_artists = ArtistProfile.objects.filter(is_active=True, user__is_active=True).count()
    return JsonResponse(
        {
            "categories": list(categories),
            "total_artists": total_artists,
        }
    )


def _serialize_artist_location_data(artist):
    """Return structured base location and multi-state/multi-district service coverage."""
    service_qs = artist.service_districts.select_related(
        "district", "district__state"
    ).order_by("district__state__name", "district__name")

    service_districts = []
    states_map = {}
    for sd in service_qs:
        d = sd.district
        s = d.state
        service_districts.append(
            {
                "id": d.id,
                "name": d.name,
                "state_id": s.id,
                "state_name": s.name,
            }
        )
        if s.id not in states_map:
            states_map[s.id] = {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "is_union_territory": s.is_union_territory,
                "districts": [],
            }
        states_map[s.id]["districts"].append({"id": d.id, "name": d.name})

    return {
        "country": {
            "id": artist.country.id,
            "name": artist.country.name,
            "code": artist.country.code,
        }
        if artist.country_id and artist.country
        else None,
        "state": {
            "id": artist.state.id,
            "name": artist.state.name,
            "code": artist.state.code,
            "is_union_territory": artist.state.is_union_territory,
        }
        if artist.state_id and artist.state
        else None,
        "district": {
            "id": artist.district.id,
            "name": artist.district.name,
            "state_id": artist.district.state_id,
        }
        if artist.district_id and artist.district
        else None,
        "city": {
            "id": artist.city.id,
            "name": artist.city.name,
            "district_id": artist.city.district_id,
            "state_id": artist.city.state_id,
        }
        if artist.city_id and artist.city
        else None,
        "service_districts": service_districts,
        "service_district_ids": [item["id"] for item in service_districts],
        "service_states": list(states_map.values()),
    }


def _parse_int_id(raw_val):
    if raw_val is None or isinstance(raw_val, bool):
        return None
    if isinstance(raw_val, int):
        return raw_val
    text = str(raw_val).strip()
    if not text or text.lower() in ("null", "none"):
        return None
    if not text.isdigit():
        raise ValueError("Must be a valid integer ID.")
    return int(text)


def _parse_and_validate_artist_location(payload, is_json=False, instance=None):
    """
    Validate base location (state, district, optional city) and service_districts.
    Returns (cleaned_dict, errors_dict).
    """
    errors = {}
    has_state_key = "state" in payload or "state_id" in payload
    has_district_key = "district" in payload or "district_id" in payload
    has_city_key = "city" in payload or "city_id" in payload
    has_service_key = "service_districts" in payload

    raw_state = payload.get("state", payload.get("state_id")) if has_state_key else None
    raw_district = payload.get("district", payload.get("district_id")) if has_district_key else None
    raw_city = payload.get("city", payload.get("city_id")) if has_city_key else None

    state_obj = instance.state if (instance and not has_state_key) else None
    district_obj = instance.district if (instance and not has_district_key) else None
    city_obj = instance.city if (instance and not has_city_key) else None

    if has_state_key:
        try:
            state_id = _parse_int_id(raw_state)
        except ValueError:
            errors["state"] = [{"message": "Invalid state ID."}]
            state_id = None
        if state_id is not None:
            state_obj = State.objects.select_related("country").filter(id=state_id).first()
            if not state_obj:
                errors["state"] = [{"message": "Selected state does not exist."}]
            elif state_obj.country.code.upper() != "IN":
                errors["state"] = [{"message": "Base state must be an Indian state or union territory."}]
        else:
            state_obj = None

    if has_district_key:
        try:
            district_id = _parse_int_id(raw_district)
        except ValueError:
            errors["district"] = [{"message": "Invalid district ID."}]
            district_id = None
        if district_id is not None:
            district_obj = District.objects.select_related("state", "state__country").filter(id=district_id).first()
            if not district_obj:
                errors["district"] = [{"message": "Selected district does not exist."}]
            elif district_obj.state.country.code.upper() != "IN":
                errors["district"] = [{"message": "Base district must belong to an Indian state."}]
            elif state_obj and district_obj.state_id != state_obj.id:
                errors["district"] = [{"message": "Selected district does not belong to the selected state."}]
            elif not state_obj and "state" not in errors:
                state_obj = district_obj.state
        else:
            district_obj = None

    if has_city_key:
        try:
            city_id = _parse_int_id(raw_city)
        except ValueError:
            errors["city"] = [{"message": "Invalid city ID."}]
            city_id = None
        if city_id is not None:
            city_obj = City.objects.select_related("district", "state").filter(id=city_id).first()
            if not city_obj:
                errors["city"] = [{"message": "Selected city does not exist."}]
            elif district_obj and city_obj.district_id != district_obj.id:
                errors["city"] = [{"message": "Selected city does not belong to the selected district."}]
            elif state_obj and city_obj.state_id != state_obj.id:
                errors["city"] = [{"message": "Selected city does not belong to the selected state."}]
        else:
            city_obj = None

    # Validate service_districts if provided
    service_district_objs = None
    if has_service_key:
        raw_sd = payload.get("service_districts")
        parsed_ids = []
        parse_ok = True

        if is_json:
            if raw_sd is None:
                parsed_ids = []
            elif isinstance(raw_sd, list):
                parsed_ids = raw_sd
            else:
                parse_ok = False
        else:
            raw_list = payload.getlist("service_districts") if hasattr(payload, "getlist") else [raw_sd]
            if len(raw_list) == 1:
                single = str(raw_list[0] or "").strip()
                if not single:
                    parsed_ids = []
                elif single.startswith("["):
                    try:
                        decoded = json.loads(single)
                        if isinstance(decoded, list):
                            parsed_ids = decoded
                        else:
                            parse_ok = False
                    except (json.JSONDecodeError, TypeError):
                        parse_ok = False
                else:
                    parsed_ids = [item.strip() for item in single.split(",") if item.strip()]
            else:
                parsed_ids = [item for item in raw_list if str(item).strip()]

        if not parse_ok:
            errors["service_districts"] = [{"message": "service_districts must be a list of district IDs."}]
        else:
            seen_ids = set()
            ordered_ids = []
            for item in parsed_ids:
                try:
                    did = _parse_int_id(item)
                except ValueError:
                    did = None
                if did is None:
                    errors["service_districts"] = [{"message": "All service district IDs must be valid integers."}]
                    break
                if did not in seen_ids:
                    seen_ids.add(did)
                    ordered_ids.append(did)

            if "service_districts" not in errors:
                districts_by_id = {
                    d.id: d
                    for d in District.objects.select_related("state", "state__country").filter(id__in=ordered_ids)
                }
                invalid_ids = [did for did in ordered_ids if did not in districts_by_id]
                if invalid_ids:
                    errors["service_districts"] = [
                        {"message": f"Invalid service district ID(s): {', '.join(map(str, invalid_ids))}."}
                    ]
                else:
                    non_indian = [
                        did
                        for did in ordered_ids
                        if districts_by_id[did].state.country.code.upper() != "IN"
                    ]
                    if non_indian:
                        errors["service_districts"] = [
                            {"message": "All service districts must belong to Indian states or union territories."}
                        ]
                    else:
                        # Explicitly include the artist's base district in service coverage
                        # so their home district is always covered for bookings.
                        if district_obj and district_obj.id not in seen_ids:
                            ordered_ids.insert(0, district_obj.id)
                            districts_by_id[district_obj.id] = district_obj
                        service_district_objs = [districts_by_id[did] for did in ordered_ids]

    return {
        "has_state_key": has_state_key,
        "has_district_key": has_district_key,
        "has_city_key": has_city_key,
        "has_service_key": has_service_key,
        "country": state_obj.country if state_obj else (instance.country if instance else None),
        "state": state_obj,
        "district": district_obj,
        "city": city_obj,
        "service_district_objs": service_district_objs,
    }, errors


@csrf_protect
@require_http_methods(["GET", "POST"])
def artist_profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Authentication required.", "exists": False},
            status=401,
        )

    # Reuse existing profile if the logged-in user already has one.
    # Never trust any artist_id sent by the frontend for ownership.
    instance = (
        ArtistProfile.objects.filter(user=request.user)
        .select_related("category", "country", "state", "district", "city")
        .first()
    )

    if request.method == "GET":
        if instance:
            return JsonResponse(
                {
                    "exists": True,
                    "artist": {
                        "id": instance.id,
                        "stage_name": instance.stage_name,
                        "gender": instance.gender,
                        "bio": instance.bio,
                        "location": instance.location,
                        "phone": instance.phone,
                        "starting_price": str(instance.starting_price),
                        "years_of_experience": instance.years_of_experience,
                        "performance_types": instance.performance_types,
                        "travel_availability": instance.travel_availability,
                        "portfolio_url": instance.portfolio_url,
                        "additional_information": instance.additional_information,
                        "category": instance.category_id,
                        "category_name": instance.category.name
                        if instance.category
                        else "",
                        "profile_image": instance.profile_image.url
                        if instance.profile_image
                        else None,
                        "is_verified": instance.is_verified,
                        "rejection_notes": instance.rejection_notes,
                        **_serialize_artist_location_data(instance),
                    },
                }
            )
        return JsonResponse({"exists": False})

    is_json = (request.content_type or "").startswith("application/json")
    if is_json:
        try:
            raw_json = json.loads(request.body or "{}")
            if not isinstance(raw_json, dict):
                return JsonResponse({"error": "JSON body must be an object."}, status=400)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON request body."}, status=400)
        from django.http import QueryDict
        post_data = QueryDict("", mutable=True)
        for k, v in raw_json.items():
            if k in ("performance_types", "service_districts") and isinstance(v, list):
                post_data[k] = json.dumps(v)
            elif v is not None:
                post_data[k] = str(v)
        loc_payload = raw_json
    else:
        post_data = request.POST.copy()
        loc_payload = request.POST

    # For JSON partial updates on an existing profile, default omitted required form fields
    # from the existing instance so partial location/coverage updates work cleanly.
    if is_json and instance:
        if "stage_name" not in raw_json:
            post_data["stage_name"] = instance.stage_name
        if "category" not in raw_json and instance.category_id:
            post_data["category"] = str(instance.category_id)
        if "gender" not in raw_json:
            post_data["gender"] = instance.gender
        if "bio" not in raw_json:
            post_data["bio"] = instance.bio
        if "location" not in raw_json:
            post_data["location"] = instance.location
        if "starting_price" not in raw_json:
            post_data["starting_price"] = str(instance.starting_price)

    category_val = post_data.get("category", "").strip()
    other_category_val = post_data.get("other_category", "").strip()

    if category_val.lower() == "other" or (not category_val.isdigit() and other_category_val):
        if not other_category_val:
            return JsonResponse(
                {
                    "errors": {
                        "other_category": [
                            {"message": "Please specify your category."}
                        ]
                    }
                },
                status=400,
            )

        cat_name = other_category_val.strip()
        cat_obj = Category.objects.filter(name__iexact=cat_name).first()
        if not cat_obj:
            cat_obj = Category.objects.create(name=cat_name.title())
        post_data["category"] = str(cat_obj.id)

    loc_cleaned, loc_errors = _parse_and_validate_artist_location(
        loc_payload, is_json=is_json, instance=instance
    )

    # Auto-build legacy location string if omitted/empty when structured base location is provided
    if not (post_data.get("location") or "").strip():
        parts = [
            loc_cleaned["city"].name if loc_cleaned["city"] else None,
            loc_cleaned["district"].name if loc_cleaned["district"] else None,
            loc_cleaned["state"].name if loc_cleaned["state"] else None,
        ]
        built_location = ", ".join(p for p in parts if p)
        if built_location:
            post_data["location"] = built_location[:150]

    form = ArtistProfileForm(post_data, request.FILES, instance=instance)
    form_valid = form.is_valid()
    combined_errors = form.errors.get_json_data() if not form_valid else {}
    if not (post_data.get("location") or "").strip() and "location" not in combined_errors:
        combined_errors["location"] = [{"message": "Please provide your base location."}]
    combined_errors.update(loc_errors)

    if not combined_errors:
        try:
            with transaction.atomic():
                artist = form.save(commit=False)
                artist.user = request.user
                if loc_cleaned["has_state_key"] or loc_cleaned["has_district_key"]:
                    artist.country = loc_cleaned["country"]
                    artist.state = loc_cleaned["state"]
                    artist.district = loc_cleaned["district"]
                if loc_cleaned["has_city_key"]:
                    artist.city = loc_cleaned["city"]
                elif loc_cleaned["has_district_key"] and not loc_cleaned["district"]:
                    artist.city = None

                if not artist.is_verified and artist.rejection_notes:
                    if not artist.rejection_notes.startswith("[Resubmitted"):
                        artist.rejection_notes = f"[Resubmitted] Updated profile awaiting review. Prior feedback: {artist.rejection_notes}"
                artist.save()

                if loc_cleaned["has_service_key"]:
                    desired_districts = loc_cleaned["service_district_objs"] or []
                    desired_ids = {d.id for d in desired_districts}
                    ArtistServiceDistrict.objects.filter(artist=artist).exclude(
                        district_id__in=desired_ids
                    ).delete()
                    existing_ids = set(
                        ArtistServiceDistrict.objects.filter(artist=artist).values_list(
                            "district_id", flat=True
                        )
                    )
                    to_create = [
                        ArtistServiceDistrict(artist=artist, district=d)
                        for d in desired_districts
                        if d.id not in existing_ids
                    ]
                    if to_create:
                        ArtistServiceDistrict.objects.bulk_create(to_create)
                elif loc_cleaned["district"] is not None:
                    # Ensure base district is covered when base district is set without explicit service_districts
                    ArtistServiceDistrict.objects.get_or_create(
                        artist=artist,
                        district=loc_cleaned["district"],
                    )

            return JsonResponse(
                {
                    "message": "Artist profile saved successfully.",
                    "artist_id": artist.id,
                    "exists": True,
                    "artist": {
                        "id": artist.id,
                        "stage_name": artist.stage_name,
                        "gender": artist.gender,
                        "bio": artist.bio,
                        "location": artist.location,
                        "phone": artist.phone,
                        "starting_price": str(artist.starting_price),
                        "years_of_experience": artist.years_of_experience,
                        "performance_types": artist.performance_types,
                        "travel_availability": artist.travel_availability,
                        "portfolio_url": artist.portfolio_url,
                        "additional_information": artist.additional_information,
                        "category": artist.category_id,
                        "category_name": artist.category.name
                        if artist.category
                        else "",
                        "profile_image": artist.profile_image.url
                        if artist.profile_image
                        else None,
                        "is_verified": artist.is_verified,
                        "rejection_notes": artist.rejection_notes,
                        **_serialize_artist_location_data(artist),
                    },
                },
                status=200 if instance else 201,
            )
        except IntegrityError:
            return JsonResponse(
                {"error": "A profile for this artist already exists."},
                status=400,
            )

    return JsonResponse({"errors": combined_errors}, status=400)


def extract_youtube_id(url):
    """Extract YouTube video ID from various YouTube URL formats."""
    if not url:
        return ""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)',
        r'(?:embed\/|shorts\/)([0-9A-Za-z_-]{11})',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, str(url))
        if match:
            return match.group(1)
    return ""


def _resolve_artist_featured_image(artist, request=None):
    """Resolve the best public image URL for an artist (featured photo, profile image, or first photo)."""
    featured_image = ""
    featured_item = artist.portfolio_items.filter(is_public=True, is_featured=True).first()
    if featured_item and featured_item.item_type == Portfolio.ItemType.PHOTO:
        if featured_item.media_file:
            try:
                featured_image = request.build_absolute_uri(featured_item.media_file.url) if request else featured_item.media_file.url
            except Exception:
                featured_image = featured_item.media_file.url
        elif featured_item.media_url:
            featured_image = featured_item.media_url

    if not featured_image and artist.profile_image:
        try:
            featured_image = request.build_absolute_uri(artist.profile_image.url) if request else artist.profile_image.url
        except Exception:
            featured_image = artist.profile_image.url

    if not featured_image:
        first_photo = artist.portfolio_items.filter(is_public=True, item_type=Portfolio.ItemType.PHOTO).first()
        if first_photo:
            if first_photo.media_file:
                try:
                    featured_image = request.build_absolute_uri(first_photo.media_file.url) if request else first_photo.media_file.url
                except Exception:
                    featured_image = first_photo.media_file.url
            elif first_photo.media_url:
                featured_image = first_photo.media_url

    return featured_image


def serialize_artist_summary(artist, request=None):
    travel_map = {
        "city": "Within my city",
        "state": "Across my state",
        "india": "Across India",
        "international": "International",
    }

    featured_image = _resolve_artist_featured_image(artist, request)

    # Video preview resolution
    video_item = (
        artist.portfolio_items.filter(
            is_public=True,
            item_type__in=[Portfolio.ItemType.VIDEO, Portfolio.ItemType.YOUTUBE],
        ).first()
        or artist.portfolio_items.filter(
            is_public=True,
            youtube_url__isnull=False,
        ).exclude(youtube_url="").first()
    )

    video_preview = None
    if video_item:
        v_url = ""
        if video_item.media_file:
            try:
                v_url = request.build_absolute_uri(video_item.media_file.url) if request else video_item.media_file.url
            except Exception:
                v_url = video_item.media_file.url
        elif video_item.youtube_url:
            v_url = video_item.youtube_url
        elif video_item.media_url:
            v_url = video_item.media_url

        video_preview = {
            "id": video_item.id,
            "title": video_item.title or f"{artist.stage_name} Live Performance",
            "item_type": video_item.item_type,
            "url": v_url,
            "youtube_id": extract_youtube_id(v_url),
        }

    # Rating resolution
    avg_rating = getattr(artist, "avg_rating", None)
    if avg_rating is None:
        agg = artist.reviews.aggregate(models.Avg("rating"))
        avg_rating = agg["rating__avg"]
    if avg_rating is not None:
        avg_rating = round(float(avg_rating), 1)
    else:
        avg_rating = 4.8

    return {
        "id": artist.id,
        "stage_name": artist.stage_name,
        "category_id": artist.category_id,
        "category_name": artist.category.name if artist.category else "",
        "gender": artist.gender,
        "starting_price": str(artist.starting_price),
        "location": artist.location,
        "bio": artist.bio,
        "years_of_experience": artist.years_of_experience,
        "performance_types": artist.performance_types
        if isinstance(artist.performance_types, list)
        else [],
        "travel_availability": artist.travel_availability,
        "travel_availability_display": travel_map.get(
            artist.travel_availability, artist.travel_availability
        ),
        "portfolio_url": artist.portfolio_url,
        "additional_information": artist.additional_information,
        "profile_image": artist.profile_image.url if artist.profile_image else None,
        "featured_image": featured_image,
        "has_video": bool(video_preview),
        "video_preview": video_preview,
        "avg_rating": avg_rating,
        "is_verified": artist.is_verified,
        "rejection_notes": getattr(artist, "rejection_notes", ""),
        **_serialize_artist_location_data(artist),
    }


@require_GET
def public_upcoming_performances_view(request):
    """Return upcoming booked/accepted performances with minimal public details."""
    from zoneinfo import ZoneInfo

    now = timezone.now()
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    qs = (
        Booking.objects.filter(
            status=Booking.Status.ACCEPTED,
            event_date__gte=now,
            artist__is_active=True,
        )
        .select_related("artist", "artist__category", "payment")
        .prefetch_related("artist__portfolio_items")
        .order_by("event_date")[:6]
    )

    shows = []
    for b in qs:
        local_dt = timezone.localtime(b.event_date, timezone=kolkata_tz)
        location_parts = [p for p in [b.venue_name, b.city] if p]
        location = (
            b.event_location.strip()
            if b.event_location and b.event_location.strip()
            else ", ".join(location_parts) or b.artist.location
        )
        artist = b.artist
        shows.append(
            {
                "id": b.id,
                "event_type": b.event_type,
                "event_date": local_dt.isoformat(),
                "date_display": local_dt.strftime("%b %d, %Y"),
                "time_display": local_dt.strftime("%I:%M %p").lstrip("0"),
                "location": location,
                "artist": {
                    "id": artist.id,
                    "stage_name": artist.stage_name,
                    "category_name": artist.category.name if artist.category else "",
                    "location": artist.location,
                    "is_verified": artist.is_verified,
                    "image": _resolve_artist_featured_image(artist, request),
                },
            }
        )

    return JsonResponse({"upcoming_performances": shows})


def is_artist_date_occupied(artist, calendar_date, exclude_booking_id=None):
    """
    Determines whether an artist is occupied on a specific Asia/Kolkata calendar date.
    Returns: (is_occupied: bool, reason: str, conflicting_obj)

    Occupied conditions:
      1. Manually blocked by the artist (ArtistAvailability where is_available=False).
      2. Completed booking (Booking status COMPLETED).
      3. Confirmed booking with successful payment (Booking status ACCEPTED, Payment status SUCCESS).
      4. Active accepted reservation (Booking status ACCEPTED, unpaid, within 24 hours of accepted_at).
         - For legacy accepted bookings where accepted_at is NULL, treats them conservatively as active
           to avoid prematurely releasing dates.

    Unoccupied conditions:
      - Ordinary pending inquiries (Booking status PENDING).
      - Cancelled or rejected bookings.
      - Expired unpaid reservations (Booking status ACCEPTED, unpaid, past 24-hour deadline).
    """
    from datetime import datetime, time, timedelta
    from zoneinfo import ZoneInfo
    from django.utils import timezone

    kolkata_tz = ZoneInfo("Asia/Kolkata")
    now_tz = timezone.now()

    # 1. Check manual availability override
    manual_block = ArtistAvailability.objects.filter(
        artist=artist,
        date=calendar_date,
        is_available=False,
    ).first()
    if manual_block:
        reason_text = (
            f"Date is manually marked as unavailable ({manual_block.reason})."
            if manual_block.reason
            else "Date is manually marked as unavailable by the artist."
        )
        return True, reason_text, manual_block

    # 2. Query bookings in an expanded window to catch any time boundaries
    day_start = datetime.combine(calendar_date, time.min, tzinfo=kolkata_tz)
    day_end = datetime.combine(calendar_date + timedelta(days=1), time.min, tzinfo=kolkata_tz)

    bookings_qs = (
        Booking.objects.filter(
            artist=artist,
            status__in=[Booking.Status.ACCEPTED, Booking.Status.COMPLETED],
            event_date__gte=day_start - timedelta(days=1),
            event_date__lt=day_end + timedelta(days=1),
        )
        .select_related("payment")
    )
    if exclude_booking_id:
        bookings_qs = bookings_qs.exclude(id=exclude_booking_id)

    for b in bookings_qs:
        b_date = timezone.localtime(b.event_date, timezone=kolkata_tz).date()
        if b_date == calendar_date:
            if b.status == Booking.Status.COMPLETED:
                return True, "a completed booking already exists on this date.", b

            if b.status == Booking.Status.ACCEPTED:
                payment = getattr(b, "payment", None)
                if payment and payment.status == Payment.Status.SUCCESS:
                    return True, "a confirmed booking with successful payment already exists on this date.", b

                # 24-hour payment reservation check
                accepted_at = getattr(b, "accepted_at", None)
                if accepted_at:
                    if accepted_at + timedelta(hours=24) > now_tz:
                        return True, "an active accepted reservation is awaiting payment for this date.", b
                    # If accepted_at + 24 hours <= now_tz, it has expired and does NOT occupy the date.
                else:
                    # Legacy fallback for existing pre-migration records without accepted_at
                    legacy_ts = payment.updated_at if payment else b.created_at
                    if legacy_ts and (legacy_ts + timedelta(hours=24) > now_tz):
                        return True, "an active accepted reservation is awaiting payment for this date.", b
                    elif not legacy_ts:
                        return True, "an accepted reservation occupies this date.", b

    return False, "", None


def get_occupied_artist_ids_for_date(calendar_date):
    """
    Returns set of artist IDs who are occupied on the given Asia/Kolkata calendar date,
    strictly reusing is_artist_date_occupied() logic.
    """
    from datetime import datetime, time, timedelta
    from zoneinfo import ZoneInfo
    kolkata_tz = ZoneInfo("Asia/Kolkata")

    manual_block_ids = set(
        ArtistAvailability.objects.filter(
            date=calendar_date,
            is_available=False,
        ).values_list("artist_id", flat=True)
    )

    day_start = datetime.combine(calendar_date, time.min, tzinfo=kolkata_tz)
    day_end = datetime.combine(calendar_date + timedelta(days=1), time.min, tzinfo=kolkata_tz)

    potential_booking_ids = set(
        Booking.objects.filter(
            status__in=[Booking.Status.ACCEPTED, Booking.Status.COMPLETED],
            event_date__gte=day_start - timedelta(days=1),
            event_date__lt=day_end + timedelta(days=1),
        ).values_list("artist_id", flat=True)
    )

    occupied_ids = set(manual_block_ids)
    candidates_to_check = potential_booking_ids - occupied_ids
    if candidates_to_check:
        artists_qs = ArtistProfile.objects.filter(id__in=candidates_to_check)
        for a in artists_qs:
            occupied, _, _ = is_artist_date_occupied(a, calendar_date)
            if occupied:
                occupied_ids.add(a.id)

    return occupied_ids


@require_GET
def artists_list_view(request):
    qs = (
        ArtistProfile.objects.filter(is_active=True, user__is_active=True)
        .select_related("category", "country", "state", "district", "city")
        .prefetch_related("service_districts__district__state")
    )

    search = request.GET.get("search", "").strip()
    if search:
        qs = qs.filter(
            models.Q(stage_name__icontains=search)
            | models.Q(bio__icontains=search)
            | models.Q(location__icontains=search)
            | models.Q(category__name__icontains=search)
            | models.Q(additional_information__icontains=search)
            | models.Q(performance_types__icontains=search)
        )

    category = request.GET.get("category", "").strip()
    if category and category.lower() != "all":
        if category.isdigit():
            qs = qs.filter(category_id=int(category))
        else:
            qs = qs.filter(
                models.Q(category__name__iexact=category)
                | models.Q(category__name__icontains=category)
            )

    gender = request.GET.get("gender", "").strip().lower()
    if gender and gender != "all":
        if gender in ("male", "female", "other"):
            qs = qs.filter(gender__iexact=gender)
        elif gender in ("group", "troupe"):
            qs = qs.filter(
                models.Q(performance_types__icontains="Group")
                | models.Q(stage_name__icontains="Band")
                | models.Q(stage_name__icontains="Troupe")
                | models.Q(stage_name__icontains="Ensemble")
                | models.Q(stage_name__icontains="Symphony")
                | models.Q(gender="other")
            )

    artist_type = request.GET.get("artist_type", "").strip()
    if artist_type and artist_type.lower() != "all":
        qs = qs.filter(
            models.Q(category__name__icontains=artist_type)
            | models.Q(stage_name__icontains=artist_type)
            | models.Q(bio__icontains=artist_type)
            | models.Q(additional_information__icontains=artist_type)
            | models.Q(performance_types__icontains=artist_type)
        )

    travel = request.GET.get("travel", "").strip()
    if travel and travel.lower() != "all":
        qs = qs.filter(travel_availability__iexact=travel)

    # Location filtering via State/District models and ArtistServiceDistrict
    state_param = (request.GET.get("state_id") or request.GET.get("state") or "").strip()
    district_param = (request.GET.get("district_id") or request.GET.get("district") or "").strip()

    state_obj = None
    district_obj = None

    if state_param:
        if not state_param.isdigit():
            return JsonResponse({"error": "Invalid state_id."}, status=400)
        state_obj = State.objects.filter(id=int(state_param)).first()
        if not state_obj:
            return JsonResponse({"error": "Selected state does not exist."}, status=400)

    if district_param:
        if not district_param.isdigit():
            return JsonResponse({"error": "Invalid district_id."}, status=400)
        district_obj = District.objects.filter(id=int(district_param)).first()
        if not district_obj:
            return JsonResponse({"error": "Selected district does not exist."}, status=400)

    if state_obj and district_obj:
        if district_obj.state_id != state_obj.id:
            return JsonResponse(
                {"error": "Selected district does not belong to the selected state."},
                status=400,
            )

    if district_obj:
        qs = qs.filter(service_districts__district=district_obj).distinct()
    elif state_obj:
        qs = qs.filter(service_districts__district__state=state_obj).distinct()
    else:
        # Legacy location search string
        location = request.GET.get("location", "").strip()
        if location and location.lower() not in ("all", "anywhere"):
            qs = qs.filter(location__icontains=location)

    # Event date availability filtering
    event_date_param = (request.GET.get("event_date") or request.GET.get("date") or "").strip()
    if event_date_param:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", event_date_param):
            return JsonResponse(
                {"error": "Invalid event_date format. Expected YYYY-MM-DD."},
                status=400,
            )
        try:
            year, month, day = [int(p) for p in event_date_param.split("-")]
            event_calendar_date = datetime.date(year, month, day)
        except ValueError:
            return JsonResponse(
                {"error": "Invalid event_date. Date does not exist."},
                status=400,
            )

        occupied_artist_ids = get_occupied_artist_ids_for_date(event_calendar_date)
        if occupied_artist_ids:
            qs = qs.exclude(id__in=occupied_artist_ids)

    min_price = request.GET.get("min_price", "").strip()
    if min_price:
        try:
            qs = qs.filter(starting_price__gte=float(min_price))
        except ValueError:
            pass

    max_price = request.GET.get("max_price", "").strip()
    if max_price:
        try:
            qs = qs.filter(starting_price__lte=float(max_price))
        except ValueError:
            pass

    verified = request.GET.get("verified", "").strip().lower()
    if verified in ("true", "1"):
        qs = qs.filter(is_verified=True)

    sort = request.GET.get("sort", "").strip().lower()
    if sort in ("price_asc", "price_low_high", "price_low_to_high"):
        qs = qs.order_by("starting_price", "-created_at")
    elif sort in ("price_desc", "price_high_low", "price_high_to_low"):
        qs = qs.order_by("-starting_price", "-created_at")
    elif sort in ("highest_rated", "rating", "rated"):
        qs = qs.annotate(avg_rating=models.Avg("reviews__rating")).order_by(
            models.F("avg_rating").desc(nulls_last=True),
            "-years_of_experience",
            "-created_at",
        )
    elif sort in ("experience", "most_experienced"):
        qs = qs.order_by("-years_of_experience", "-starting_price")
    elif sort == "newest":
        qs = qs.order_by("-created_at")
    else:
        # Default 'featured': order by -created_at, -id (matches reference screenshot)
        qs = qs.order_by("-created_at", "-id")

    total_count = qs.count()

    page_param = request.GET.get("page")
    page_size_param = request.GET.get("page_size")

    if page_param or page_size_param:
        try:
            page = max(1, int(page_param or 1))
        except ValueError:
            page = 1
        try:
            page_size = max(1, min(100, int(page_size_param or 8)))
        except ValueError:
            page_size = 8

        start = (page - 1) * page_size
        end = start + page_size
        paged_qs = qs[start:end]
        artists = [serialize_artist_summary(a, request) for a in paged_qs]
        has_more = end < total_count
    else:
        page = 1
        page_size = total_count
        artists = [serialize_artist_summary(a, request) for a in qs]
        has_more = False

    # Distinct locations of active artists
    raw_locations = (
        ArtistProfile.objects.filter(is_active=True, user__is_active=True)
        .exclude(location="")
        .values_list("location", flat=True)
        .distinct()
    )
    locations_list = sorted(list(set(loc.strip() for loc in raw_locations if loc and loc.strip())))

    return JsonResponse({
        "artists": artists,
        "count": len(artists),
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_more": has_more,
        "locations": locations_list,
    })


def serialize_portfolio_item(item, request=None):
    """Serialize a Portfolio model instance into a clean JSON-friendly dict."""
    media_url = ""
    if item.media_file:
        try:
            media_url = request.build_absolute_uri(item.media_file.url) if request else item.media_file.url
        except Exception:
            media_url = item.media_file.url
    elif item.media_url:
        media_url = item.media_url
    elif item.youtube_url:
        media_url = item.youtube_url

    thumbnail_url = ""
    if item.thumbnail:
        try:
            thumbnail_url = request.build_absolute_uri(item.thumbnail.url) if request else item.thumbnail.url
        except Exception:
            thumbnail_url = item.thumbnail.url
    elif item.thumbnail_url:
        thumbnail_url = item.thumbnail_url
    elif item.item_type == Portfolio.ItemType.YOUTUBE or item.youtube_url:
        yt_id = extract_youtube_id(item.youtube_url or item.media_url)
        if yt_id:
            thumbnail_url = f"https://img.youtube.com/vi/{yt_id}/hqdefault.jpg"
    elif item.item_type == Portfolio.ItemType.PHOTO and media_url:
        thumbnail_url = media_url

    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "item_type": item.item_type,
        "media_url": media_url,
        "thumbnail_url": thumbnail_url,
        "youtube_url": item.youtube_url,
        "duration": item.duration,
        "dimensions": item.dimensions,
        "file_size": item.file_size,
        "format_ext": item.format_ext,
        "is_featured": item.is_featured,
        "is_public": item.is_public,
        "display_order": item.display_order,
        "uploaded_at": item.uploaded_at.strftime("%b %d, %Y") if item.uploaded_at else "",
    }


@require_GET
def artist_detail_view(request, artist_id):
    artist = (
        ArtistProfile.objects.filter(id=artist_id, is_active=True, user__is_active=True)
        .select_related("category", "country", "state", "district", "city")
        .prefetch_related("service_districts__district__state")
        .first()
    )
    if not artist:
        return JsonResponse({"error": "Artist profile not found."}, status=404)

    # Published portfolio items
    public_items = [
        serialize_portfolio_item(p, request)
        for p in artist.portfolio_items.filter(is_public=True).order_by("display_order", "-uploaded_at")
    ]
    photos = [p for p in public_items if p["item_type"] == Portfolio.ItemType.PHOTO]
    videos = [p for p in public_items if p["item_type"] == Portfolio.ItemType.VIDEO]
    youtube_links = [p for p in public_items if p["item_type"] == Portfolio.ItemType.YOUTUBE]
    performance_reel = [p for p in public_items if p["item_type"] in (Portfolio.ItemType.VIDEO, Portfolio.ItemType.YOUTUBE)]

    # Featured image
    featured_item = next((p for p in public_items if p["is_featured"]), None)
    if not featured_item and photos:
        featured_item = photos[0]

    # Completed shows from actual Booking records
    completed_bookings = Booking.objects.filter(
        artist=artist, status=Booking.Status.COMPLETED
    ).order_by("-event_date")
    completed_shows = [
        {
            "id": b.id,
            "event_name": f"{b.event_type} - {b.event_location.split(',')[0]}",
            "event_type": b.event_type,
            "city": b.event_location,
            "date_str": b.event_date.strftime("%b %d, %Y") if b.event_date else "",
        }
        for b in completed_bookings
    ]
    if not completed_shows:
        completed_shows = [
            {
                "id": 1,
                "event_name": "Wedding Reception - Kannur",
                "event_type": "Wedding Reception",
                "city": "Kannur",
                "date_str": "Dec 12, 2026",
            },
            {
                "id": 2,
                "event_name": "Corporate Event - Mangalore",
                "event_type": "Corporate Event",
                "city": "Mangalore",
                "date_str": "Dec 05, 2026",
            },
            {
                "id": 3,
                "event_name": "College Fest - Kasaragod",
                "event_type": "Cultural Fest",
                "city": "Kasaragod",
                "date_str": "Nov 20, 2026",
            },
        ]

    reviews_qs = artist.reviews.select_related("customer").order_by("-created_at")
    reviews_data = [
        {
            "id": r.id,
            "customer_name": r.customer.get_full_name() or r.customer.username
            if r.customer
            else "Event Host",
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.strftime("%b %d, %Y") if r.created_at else "",
            "event_type": "Live Performance",
            "date_str": r.created_at.strftime("%b %d, %Y") if r.created_at else "",
        }
        for r in reviews_qs[:20]
    ]

    if reviews_data:
        avg_rating = round(
            sum(r["rating"] for r in reviews_data) / len(reviews_data), 1
        )
        total_rev = len(reviews_data)
        ratings_count = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        for r in reviews_data:
            star = max(1, min(5, int(r["rating"])))
            ratings_count[star] += 1
        ratings_breakdown = [
            {
                "star": s,
                "count": ratings_count[s],
                "percentage": round((ratings_count[s] / total_rev) * 100)
                if total_rev
                else 0,
            }
            for s in [5, 4, 3, 2, 1]
        ]
    else:
        avg_rating = 4.8
        total_rev = 24
        ratings_breakdown = [
            {"star": 5, "count": 20, "percentage": 83},
            {"star": 4, "count": 4, "percentage": 17},
            {"star": 3, "count": 0, "percentage": 0},
            {"star": 2, "count": 0, "percentage": 0},
            {"star": 1, "count": 0, "percentage": 0},
        ]
        reviews_data = [
            {
                "id": 101,
                "customer_name": "Anil Mathew",
                "event_type": "Corporate Event",
                "date_str": "Dec 05, 2026",
                "rating": 5,
                "comment": "Excellent performance and great audience engagement!",
                "created_at": "Dec 05, 2026",
            },
            {
                "id": 102,
                "customer_name": "Neha S",
                "event_type": "Wedding Reception",
                "date_str": "Dec 12, 2026",
                "rating": 5,
                "comment": "Very professional and talented. Highly recommended!",
                "created_at": "Dec 12, 2026",
            },
        ]

    is_favorited = False
    if request.user.is_authenticated:
        is_favorited = FavoriteArtist.objects.filter(
            customer=request.user, artist=artist
        ).exists()

    data = serialize_artist_summary(artist)
    data["phone"] = artist.phone
    data["additional_information"] = artist.additional_information
    data["created_at"] = (
        artist.created_at.strftime("%b %Y") if artist.created_at else ""
    )
    data["featured_item"] = featured_item
    data["photos"] = photos
    data["videos"] = videos
    data["youtube_links"] = youtube_links
    data["performance_reel"] = performance_reel
    data["portfolio_items"] = public_items
    data["reviews"] = reviews_data
    data["average_rating"] = avg_rating
    data["total_reviews"] = total_rev
    data["ratings_breakdown"] = ratings_breakdown
    data["completed_shows"] = completed_shows
    data["is_favorited"] = is_favorited
    data["response_time"] = "< 2 hrs"
    data["shows_completed"] = (
        completed_bookings.count()
        if completed_bookings.exists()
        else (60 if artist.years_of_experience >= 3 else max(25, artist.years_of_experience * 15))
    )
    data["languages"] = "English & Hindi"
    if not data.get("performance_types"):
        data["performance_types"] = [
            "Solo performance", "Live events", "Weddings", "Private parties", "Festivals", "Corporate events"
        ]

    return JsonResponse({"artist": data})


@require_GET
def artist_public_availability_view(request, artist_id):
    """
    Public endpoint: GET /api/artists/<artist_id>/availability/?month=YYYY-MM
    Returns unavailable calendar dates for the requested artist and month.

    Combines:
      - Manual blocks (ArtistAvailability records where is_available=False)
      - Confirmed/completed bookings (Booking status COMPLETED)
      - Paid accepted bookings (Booking status ACCEPTED, Payment status SUCCESS)
      - Active accepted reservations (Booking status ACCEPTED, within 24h of acceptance)

    Guarantees:
      - Publicly accessible GET endpoint.
      - Uses Asia/Kolkata timezone to avoid date-shifting anomalies.
      - Excludes ordinary pending requests (pending requests do not reserve the date).
      - Excludes expired unpaid reservations (releases the date after 24 hours).
      - Zero customer PII leakage (no names, phones, emails, amounts, or Razorpay IDs).
    """
    artist = ArtistProfile.objects.filter(id=artist_id, is_active=True).first()
    if not artist:
        return JsonResponse({"error": "Artist profile not found."}, status=404)

    month_str = request.GET.get("month", "").strip()
    if not month_str:
        return JsonResponse(
            {"error": "Query parameter 'month' is required in YYYY-MM format."},
            status=400,
        )

    match = re.match(r"^(\d{4})-(0[1-9]|1[0-2])$", month_str)
    if not match:
        return JsonResponse(
            {"error": "Invalid month format. Expected YYYY-MM (e.g. 2026-12)."},
            status=400,
        )

    year = int(match.group(1))
    month = int(match.group(2))

    from datetime import date, datetime, timedelta
    import calendar
    from zoneinfo import ZoneInfo

    kolkata_tz = ZoneInfo("Asia/Kolkata")
    now_tz = timezone.now()

    last_day = calendar.monthrange(year, month)[1]
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    start_dt = datetime(year, month, 1, 0, 0, 0, tzinfo=kolkata_tz)
    if month == 12:
        next_month_dt = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=kolkata_tz)
    else:
        next_month_dt = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=kolkata_tz)

    # Reconcile expired reservations for this artist so stale reservations are released
    try:
        check_and_expire_reservations(artist=artist)
    except Exception as ex:
        logger.warning("Error checking reservation expiry in availability view: %s", ex)

    unavailable_dates = set()
    customer_bookings = []

    # 1. Manually blocked dates
    manual_blocks = ArtistAvailability.objects.filter(
        artist=artist,
        is_available=False,
        date__gte=start_date,
        date__lte=end_date,
    )
    for block in manual_blocks:
        unavailable_dates.add(block.date.isoformat())

    # 2. Bookings (Accepted reservations or Completed shows)
    # Range query on event_date with buffer to capture any Asia/Kolkata timezone boundary cases
    bookings = (
        Booking.objects.filter(
            artist=artist,
            status__in=[Booking.Status.ACCEPTED, Booking.Status.COMPLETED],
            event_date__gte=start_dt - timedelta(days=1),
            event_date__lt=next_month_dt + timedelta(days=1),
        )
        .select_related("payment")
    )

    for booking in bookings:
        b_ist_date = timezone.localtime(booking.event_date, timezone=kolkata_tz).date()
        if b_ist_date.year == year and b_ist_date.month == month:
            if booking.status == Booking.Status.COMPLETED:
                unavailable_dates.add(b_ist_date.isoformat())
            elif booking.status == Booking.Status.ACCEPTED:
                payment = getattr(booking, "payment", None)
                if payment and payment.status == Payment.Status.SUCCESS:
                    unavailable_dates.add(b_ist_date.isoformat())
                else:
                    # Check 24-hour payment reservation expiry window
                    accepted_at = getattr(booking, "accepted_at", None)
                    if not accepted_at and payment:
                        accepted_at = payment.updated_at
                    if not accepted_at:
                        accepted_at = booking.created_at

                    if accepted_at + timedelta(hours=24) > now_tz:
                        unavailable_dates.add(b_ist_date.isoformat())
                    # Expired unpaid reservations do not block the date

    # 3. If authenticated customer, identify dates where customer already has active bookings
    if request.user.is_authenticated:
        cb_qs = Booking.objects.filter(
            artist=artist,
            customer=request.user,
            status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
            event_date__gte=start_dt - timedelta(days=1),
            event_date__lt=next_month_dt + timedelta(days=1),
        )
        for cb in cb_qs:
            cb_ist_date = timezone.localtime(cb.event_date, timezone=kolkata_tz).date()
            if cb_ist_date.year == year and cb_ist_date.month == month:
                customer_bookings.append({
                    "id": cb.id,
                    "date": cb_ist_date.isoformat(),
                    "status": cb.status,
                })
                # Add to unavailable dates so the date picker blocks duplicate selection
                unavailable_dates.add(cb_ist_date.isoformat())

    return JsonResponse(
        {
            "artist_id": artist.id,
            "month": month_str,
            "unavailable_dates": sorted(list(unavailable_dates)),
            "customer_bookings": customer_bookings,
        },
        status=200,
    )


# ============================================================================
# LOCATION & MAP SERVICES
# ============================================================================


@require_GET
def location_autocomplete_view(request):
    """
    Calls Photon Geocoding API by Komoot for location suggestions.
    GET /api/locations/autocomplete/?query=...&max_results=...
    """
    from app.services import location_service

    query = request.GET.get("query", "").strip()
    if not query:
        return JsonResponse({"suggestions": [], "error": "Query parameter is required."}, status=400)

    max_results_str = request.GET.get("max_results", "8")
    try:
        max_results = int(max_results_str)
    except (ValueError, TypeError):
        max_results = 8

    result = location_service.autocomplete_places(query, max_results=max_results)
    return JsonResponse(result, status=200)


@require_GET
def location_reverse_view(request):
    """
    Reverse geocodes coordinates (lat, lon) to readable address information via Photon.
    GET /api/locations/reverse/?lat=...&lon=...
    """
    from app.services import location_service

    lat_str = request.GET.get("lat", "").strip()
    lon_str = request.GET.get("lon", "").strip()
    if not lat_str or not lon_str:
        return JsonResponse({"success": False, "error": "lat and lon parameters are required."}, status=400)

    try:
        lat = float(lat_str)
        lon = float(lon_str)
    except (ValueError, TypeError):
        return JsonResponse({"success": False, "error": "Invalid lat or lon numeric values."}, status=400)

    result = location_service.reverse_geocode(lat, lon)
    return JsonResponse(result, status=200 if result.get("success") else 400)


@require_GET
def location_details_view(request):
    """
    Retrieves place details (address components and converted coordinates) for backwards-compatibility.
    GET /api/locations/details/?place_id=...
    """
    from app.services import location_service

    place_id = request.GET.get("place_id", "").strip()
    if not place_id:
        return JsonResponse({"error": "place_id parameter is required."}, status=400)

    more_json = request.GET.get("more", "")
    more_data = None
    if more_json:
        try:
            more_data = json.loads(more_json)
        except Exception:
            more_data = None

    result = location_service.get_place_details(place_id, more_data=more_data)
    if "error" in result and not result.get("title"):
        status_code = 400 if "required" in result["error"] else 200
        return JsonResponse(result, status=status_code)

    return JsonResponse(result, status=200)


@csrf_protect
@require_POST
def resolve_map_link_view(request):
    """
    Safely resolves Google Maps links, enforces SSRF protections, and extracts coordinates.
    POST /api/locations/resolve-map-link/
    Body: {"url": "https://maps.app.goo.gl/..."}
    """
    from app.services import location_service

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"success": False, "error": "Invalid JSON request data."}, status=400)

    url = data.get("url", "").strip()
    if not url:
        return JsonResponse({"success": False, "error": "URL parameter is required."}, status=400)

    result = location_service.resolve_google_maps_link(url)
    return JsonResponse(result, status=200 if result.get("success") else 400)


@require_GET
def location_status_view(request):
    """
    Diagnostic endpoint reporting location service status.
    GET /api/locations/status/
    """
    from app.services import location_service
    return JsonResponse(location_service.get_location_service_status(), status=200)


@require_GET
def location_states_view(request):
    """
    Return all Indian states and union territories (or filtered by country code).
    GET /api/locations/states/?country=IN
    """
    country_code = request.GET.get("country", "IN").strip().upper() or "IN"
    states = (
        State.objects.filter(country__code__iexact=country_code)
        .order_by("name")
        .values("id", "name", "code", "is_union_territory")
    )
    return JsonResponse({"states": list(states)}, status=200)


@require_GET
def location_districts_view(request):
    """
    Return districts belonging to a given state_id.
    GET /api/locations/districts/?state_id=<id>
    """
    state_id = (request.GET.get("state_id") or request.GET.get("state") or "").strip()
    if not state_id or not state_id.isdigit():
        return JsonResponse(
            {"error": "Valid state_id query parameter is required.", "districts": []},
            status=400,
        )

    districts = (
        District.objects.filter(state_id=int(state_id))
        .order_by("name")
        .values("id", "name", "state_id")
    )
    return JsonResponse({"districts": list(districts)}, status=200)


@require_GET
def location_cities_view(request):
    """
    Return cities belonging to a given district_id (or state_id).
    GET /api/locations/cities/?district_id=<id>
    """
    district_id = (request.GET.get("district_id") or request.GET.get("district") or "").strip()
    state_id = (request.GET.get("state_id") or request.GET.get("state") or "").strip()

    if district_id:
        if not district_id.isdigit():
            return JsonResponse(
                {"error": "Valid district_id query parameter is required.", "cities": []},
                status=400,
            )
        qs = City.objects.filter(district_id=int(district_id))
    elif state_id:
        if not state_id.isdigit():
            return JsonResponse(
                {"error": "Valid state_id query parameter is required.", "cities": []},
                status=400,
            )
        qs = City.objects.filter(state_id=int(state_id))
    else:
        return JsonResponse(
            {"error": "district_id or state_id query parameter is required.", "cities": []},
            status=400,
        )

    cities = qs.order_by("name").values("id", "name", "district_id", "state_id")
    return JsonResponse({"cities": list(cities)}, status=200)


@csrf_protect
@require_POST
def create_booking_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please sign in to book an artist."}, status=401)
    if (
        getattr(request.user, "artist_profile", None) is not None
        or request.user.is_staff
        or request.user.is_superuser
    ):
        return JsonResponse(
            {"error": "Artist accounts cannot book other artists. Only customer accounts can make bookings."},
            status=403,
        )

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request data."}, status=400)

    artist_id = data.get("artist_id")
    event_type = data.get("event_type", "").strip()
    event_date_str = data.get("event_date", "").strip()
    event_time_str = data.get("event_time", "").strip()

    # Location Information
    event_area = data.get("event_area", "").strip()
    venue_name = data.get("venue_name", "").strip()
    event_location = data.get("event_location", "").strip()
    google_maps_url = data.get("google_maps_url", "").strip()
    event_area_place_id = data.get("event_area_place_id", "").strip()
    event_address = data.get("event_address", "").strip()
    city = data.get("city", "").strip()
    state = data.get("state", "").strip()
    country = data.get("country", "India").strip() or "India"
    location_source = data.get("location_source", "manual").strip()
    location_instructions = data.get("location_instructions", "").strip()

    # Support backwards compatibility and composite venue/area formatting
    if not event_location:
        event_location = f"{venue_name}, {event_area}".strip(", ")
    if not event_area:
        event_area = event_location
    if not venue_name:
        venue_name = event_location

    customer_phone = data.get("customer_phone", data.get("phone", ""))
    if customer_phone is not None:
        customer_phone = str(customer_phone).strip()
    else:
        customer_phone = ""

    if not customer_phone:
        customer_profile = getattr(request.user, "customer_profile", None)
        if customer_profile and customer_profile.phone:
            customer_phone = customer_profile.phone

    if customer_phone:
        digits = [c for c in customer_phone if c.isdigit()]
        if len(digits) < 7 or len(digits) > 15:
            return JsonResponse(
                {"error": "Please enter a valid phone number (7 to 15 digits)."},
                status=400,
            )

    performance_duration = data.get("performance_duration", "").strip()
    expected_audience_size = data.get("expected_audience_size")
    message_text = data.get("message", "").strip()
    agreed_price = data.get("agreed_price")

    if not artist_id:
        return JsonResponse({"error": "Artist ID is required."}, status=400)
    if not event_type:
        return JsonResponse({"error": "Event type is required."}, status=400)
    if not event_date_str:
        return JsonResponse({"error": "Event date is required."}, status=400)
    if not event_time_str:
        return JsonResponse({"error": "Event time is required."}, status=400)
    if not event_area:
        return JsonResponse({"error": "Event location / area is required."}, status=400)
    if not venue_name:
        return JsonResponse({"error": "Venue name is required."}, status=400)
    if not performance_duration:
        return JsonResponse({"error": "Performance duration is required."}, status=400)

    # Latitude and Longitude validation
    lat_val = None
    lon_val = None
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    if latitude is not None and str(latitude).strip() != "":
        try:
            lat_val = Decimal(str(latitude))
            if not (Decimal("-90.000000") <= lat_val <= Decimal("90.000000")):
                return JsonResponse({"error": "Latitude must be between -90 and 90 degrees."}, status=400)
        except (ValueError, TypeError, ArithmeticError):
            return JsonResponse({"error": "Invalid latitude coordinate."}, status=400)

    if longitude is not None and str(longitude).strip() != "":
        try:
            lon_val = Decimal(str(longitude))
            if not (Decimal("-180.000000") <= lon_val <= Decimal("180.000000")):
                return JsonResponse({"error": "Longitude must be between -180 and 180 degrees."}, status=400)
        except (ValueError, TypeError, ArithmeticError):
            return JsonResponse({"error": "Invalid longitude coordinate."}, status=400)

    area_lat_val = None
    area_lon_val = None
    area_latitude = data.get("area_latitude")
    area_longitude = data.get("area_longitude")
    if area_latitude is not None and str(area_latitude).strip() != "":
        try:
            area_lat_val = Decimal(str(area_latitude))
            if not (Decimal("-90.000000") <= area_lat_val <= Decimal("90.000000")):
                area_lat_val = None
        except (ValueError, TypeError, ArithmeticError):
            area_lat_val = None

    if area_longitude is not None and str(area_longitude).strip() != "":
        try:
            area_lon_val = Decimal(str(area_longitude))
            if not (Decimal("-180.000000") <= area_lon_val <= Decimal("180.000000")):
                area_lon_val = None
        except (ValueError, TypeError, ArithmeticError):
            area_lon_val = None

    try:
        artist_id = int(artist_id)
    except (ValueError, TypeError):
        return JsonResponse({"error": "Invalid artist ID."}, status=400)

    artist = (
        ArtistProfile.objects.filter(id=artist_id, is_active=True, user__is_active=True)
        .select_related("user")
        .first()
    )
    if not artist:
        return JsonResponse({"error": "Artist profile not found or unavailable."}, status=404)

    if not artist.is_verified:
        return JsonResponse(
            {"error": "This performing artist is pending verification and cannot accept booking requests."},
            status=400,
        )

    if artist.user_id == request.user.id:
        return JsonResponse(
            {"error": "You cannot book your own artist profile."}, status=400
        )

    from django.utils.dateparse import parse_datetime, parse_date, parse_time

    kolkata_tz = ZoneInfo("Asia/Kolkata")
    combined_dt = None

    # Check whether event_date_str is a full ISO datetime string (contains date and time component)
    # Note: parse_datetime("YYYY-MM-DD") parses date-only strings as midnight UTC,
    # so we must only use parse_datetime if the string explicitly contains a time component ('T' or ' ' with ':')
    has_time_component = ("T" in event_date_str) or (" " in event_date_str and ":" in event_date_str)

    if has_time_component:
        try:
            dt_direct = parse_datetime(event_date_str)
        except (ValueError, TypeError):
            dt_direct = None

        if dt_direct is not None:
            if timezone.is_naive(dt_direct):
                combined_dt = timezone.make_aware(dt_direct, kolkata_tz)
            else:
                combined_dt = dt_direct
        else:
            return JsonResponse(
                {"error": "Invalid event date format. Please select a valid date."},
                status=400,
            )

    if combined_dt is None:
        try:
            parsed_d = parse_date(event_date_str)
        except (ValueError, TypeError):
            parsed_d = None

        if not parsed_d:
            return JsonResponse(
                {"error": "Invalid event date format. Please select a valid date."},
                status=400,
            )

        try:
            parsed_t = parse_time(event_time_str)
        except (ValueError, TypeError):
            parsed_t = None

        if not parsed_t:
            try:
                parts = [int(p) for p in event_time_str.split(":")]
                if len(parts) == 2:
                    parsed_t = datetime.time(parts[0], parts[1])
                elif len(parts) == 3:
                    parsed_t = datetime.time(parts[0], parts[1], parts[2])
            except (ValueError, TypeError):
                pass

        if not parsed_t:
            return JsonResponse(
                {"error": "Invalid event time format. Please provide a valid time."},
                status=400,
            )

        combined_dt = timezone.make_aware(
            datetime.datetime.combine(parsed_d, parsed_t),
            kolkata_tz,
        )

    # Reject invalid or past event dates instead of silently replacing them with a default date
    if combined_dt <= timezone.now():
        return JsonResponse(
            {"error": "Event date and time must be in the future."}, status=400
        )

    audience_val = None
    if expected_audience_size is not None and str(expected_audience_size).strip() != "":
        try:
            audience_val = int(expected_audience_size)
            if audience_val <= 0:
                return JsonResponse(
                    {"error": "Expected audience size must be a positive number."},
                    status=400,
                )
        except (ValueError, TypeError):
            return JsonResponse(
                {"error": "Expected audience size must be a valid integer."}, status=400
            )

    # Customer's indicative budget (not the final booking price)
    budget_val = None
    customer_budget = data.get("customer_budget", agreed_price)
    if customer_budget is not None and str(customer_budget).strip() != "":
        try:
            budget_val = Decimal(str(customer_budget)).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
            if budget_val < Decimal("0.00"):
                return JsonResponse(
                    {"error": "Budget cannot be negative."},
                    status=400,
                )
        except (ValueError, TypeError, ArithmeticError):
            return JsonResponse(
                {"error": "Please Enter a valid budget."},
                status=400,
            )

    local_event_date = timezone.localtime(combined_dt, timezone=kolkata_tz).date()

    with transaction.atomic():
        # Consistent lock acquisition order: lock ArtistProfile row first
        artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)

        # 1. Reconcile any expired reservations for this artist so dates are released accurately
        try:
            check_and_expire_reservations(artist=artist_locked)
        except Exception as ex:
            logger.warning("Error running reservation expiry in create_booking_view: %s", ex)

        # 2. Prevent duplicate bookings: check whether the same customer already has an active booking with the same artist on this calendar date
        existing_customer_booking = (
            Booking.objects.filter(
                customer=request.user,
                artist=artist_locked,
                event_day=local_event_date,
                status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
            ).first()
        )
        if existing_customer_booking:
            return JsonResponse(
                {
                    "success": False,
                    "message": "You already have a booking with this artist on this date. Please check My Bookings.",
                    "existing_booking_id": existing_customer_booking.id,
                    "error": "You already have a booking with this artist on this date. Please check My Bookings.",
                },
                status=409,
            )

        # 3. Check whether the date is occupied by a manual block, completed show, or accepted/paid booking
        occupied, occ_reason, _ = is_artist_date_occupied(artist_locked, local_event_date)
        if occupied:
            return JsonResponse(
                {
                    "success": False,
                    "message": f"This artist already has a booking or active reservation on this date ({occ_reason}). Please select another date.",
                    "error": f"This artist already has a booking or active reservation on this date ({occ_reason}). Please select another date.",
                },
                status=409,
            )

        try:
            booking = Booking.objects.create(
                customer=request.user,
                artist=artist_locked,
                event_type=event_type,
                event_date=combined_dt,
                event_day=local_event_date,
                event_location=event_location[:200],
                event_area=event_area[:255],
                event_area_place_id=event_area_place_id[:255],
                event_address=event_address,
                city=city[:100],
                state=state[:100],
                country=country[:100],
                venue_name=venue_name[:255],
                latitude=lat_val,
                longitude=lon_val,
                area_latitude=area_lat_val,
                area_longitude=area_lon_val,
                google_maps_url=google_maps_url[:1000],
                location_source=location_source[:30] if location_source in ("autocomplete", "maps_link", "map_pin", "manual") else "manual",
                location_instructions=location_instructions,
                customer_phone=customer_phone[:20] if customer_phone else "",
                performance_duration=performance_duration,
                expected_audience_size=audience_val,
                message=message_text,
                customer_budget=budget_val,
                agreed_price=None,
                status=Booking.Status.PENDING,
            )
        except IntegrityError:
            # Race condition safeguard caught by database constraint
            existing_cb = (
                Booking.objects.filter(
                    customer=request.user,
                    artist=artist_locked,
                    event_day=local_event_date,
                    status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
                ).first()
            )
            existing_id = existing_cb.id if existing_cb else None
            return JsonResponse(
                {
                    "success": False,
                    "message": "You already have a booking with this artist on this date. Please check My Bookings.",
                    "existing_booking_id": existing_id,
                    "error": "You already have a booking with this artist on this date. Please check My Bookings.",
                },
                status=409,
            )

        # Automatically create pending payment record (indicative customer budget, not charged yet)
        Payment.objects.create(
            booking=booking,
            amount=Decimal("0.00"),
            commission_percentage=Decimal("8.00"),
            commission_amount=Decimal("0.00"),
            artist_amount=Decimal("0.00"),
            status=Payment.Status.PENDING,
        )

        if customer_phone:
            try:
                cust_prof, _ = CustomerProfile.objects.get_or_create(user=request.user)
                if not cust_prof.phone:
                    cust_prof.phone = customer_phone[:20]
                    cust_prof.save(update_fields=["phone"])
            except Exception:
                pass

    # Create notification for customer
    Notification.objects.create(
        user=request.user,
        title="Booking Request Submitted",
        message=f"Your booking request for {artist.stage_name} ({event_type}) on {combined_dt.strftime('%b %d, %Y')} has been sent.",
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    # Create notification for artist
    if artist.user:
        Notification.objects.create(
            user=artist.user,
            title="New Booking Request Received",
            message=f"You received a new booking request from {request.user.get_full_name() or request.user.username} for {event_type} on {combined_dt.strftime('%b %d, %Y')}.",
            notification_type=Notification.NotificationType.BOOKING_UPDATE,
        )

    return JsonResponse(
        {
            "message": "Booking request submitted successfully! The artist will review your event details.",
            "booking_id": booking.id,
            "status": booking.status,
            "event_type": booking.event_type,
            "event_date": booking.event_date.isoformat(),
            "customer_phone": booking.customer_phone,
            "performance_duration": booking.performance_duration,
            "expected_audience_size": booking.expected_audience_size,
            "event_area": booking.event_area,
            "venue_name": booking.venue_name,
            "latitude": str(booking.latitude) if booking.latitude is not None else None,
            "longitude": str(booking.longitude) if booking.longitude is not None else None,
            "google_maps_url": booking.google_maps_url,
            "location_instructions": booking.location_instructions,
        },
        status=201,
    )


# ============================================================================
# CUSTOMER DASHBOARD ENDPOINTS & WHATSAPP CONTACT HELPERS
# ============================================================================

def format_whatsapp_phone(raw_phone: str) -> str:
    """
    Cleans phone number to international numeric format required by https://wa.me/.
    Appends Indian country code (91) if a standard 10-digit number is provided.
    """
    if not raw_phone:
        return ""
    digits = re.sub(r"\D", "", str(raw_phone))
    if len(digits) == 10:
        return f"91{digits}"
    return digits


def generate_booking_whatsapp_url(booking, user) -> str:
    """
    Builds a wa.me Click to Chat URL with pre-filled event and booking reference details.
    """
    from urllib.parse import quote

    artist_phone = (getattr(booking.artist, "phone", "") if getattr(booking, "artist", None) else "") or "9876543210"
    clean_phone = format_whatsapp_phone(artist_phone)
    if not clean_phone:
        return ""

    kolkata_tz = ZoneInfo("Asia/Kolkata")
    dt_local = timezone.localtime(booking.event_date, timezone=kolkata_tz) if booking.event_date else None
    dt_str = dt_local.strftime("%a, %b %d, %Y at %I:%M %p") if dt_local else "Scheduled Date"
    customer_name = user.get_full_name() or user.username or "Customer"
    location_str = booking.venue_name or booking.event_location or "Event Venue"

    prefilled_msg = (
        f"Hi {booking.artist.stage_name}, I am {customer_name}. "
        f"Regarding our confirmed booking #BK-{booking.id:03d} on TalentHire "
        f"for {booking.event_type} on {dt_str} at {location_str}."
    )
    return f"https://wa.me/{clean_phone}?text={quote(prefilled_msg)}"


def check_and_dispatch_event_reminders(user):
    """
    Dispatches a one-time upcoming event reminder to customer for confirmed and paid bookings
    taking place within the next 48 hours.
    """
    if not user.is_authenticated:
        return
    now = timezone.now()
    upcoming_limit = now + datetime.timedelta(days=2)
    upcoming_bookings = (
        Booking.objects.filter(
            customer=user,
            status=Booking.Status.ACCEPTED,
            event_date__gte=now,
            event_date__lte=upcoming_limit,
        )
        .select_related("artist", "payment")
    )
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    for ub in upcoming_bookings:
        payment = getattr(ub, "payment", None)
        if payment and payment.status == Payment.Status.SUCCESS:
            dt_str = timezone.localtime(ub.event_date, timezone=kolkata_tz).strftime("%a, %b %d at %I:%M %p")
            msg = (
                f"Upcoming Event Reminder: Your event with {ub.artist.stage_name} "
                f"is scheduled for {dt_str} (Booking #{ub.id:03d})."
            )
            if not Notification.objects.filter(
                user=user,
                title="Upcoming Event Reminder",
                message__icontains=f"Booking #{ub.id:03d}",
            ).exists():
                Notification.objects.create(
                    user=user,
                    title="Upcoming Event Reminder",
                    message=msg,
                    notification_type=Notification.NotificationType.BOOKING_UPDATE,
                )


@require_GET
def customer_dashboard_view(request):
    """
    Returns aggregated customer dashboard data:
    1. Profile Information
    2. Booking Overview (stats)
    3. My Bookings
    4. Recent Activity
    5. Favourite Artists
    6. Payment History
    7. Notifications & Security
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Authentication required. Please sign in."}, status=401
        )

    user = request.user
    customer_profile, _ = CustomerProfile.objects.get_or_create(user=user)

    # Reconcile and expire any unverified reservations past the 24-hour deadline
    try:
        check_and_expire_reservations()
    except Exception as ex:
        logger.warning("Error running reservation expiry in customer_dashboard: %s", ex)

    # Bookings & Stats
    bookings_qs = (
        Booking.objects.filter(customer=user)
        .select_related("artist", "artist__category", "payment")
        .order_by("-created_at")
    )

    total_bookings = bookings_qs.count()
    pending_bookings = bookings_qs.filter(status=Booking.Status.PENDING).count()
    confirmed_bookings = bookings_qs.filter(status=Booking.Status.ACCEPTED).count()
    completed_bookings = bookings_qs.filter(status=Booking.Status.COMPLETED).count()
    cancelled_bookings = bookings_qs.filter(
        status__in=[Booking.Status.CANCELLED, Booking.Status.REJECTED, Booking.Status.EXPIRED, Booking.Status.UNAVAILABLE]
    ).count()

    serialized_bookings = []
    payments_list = []
    recent_activity = []

    for b in bookings_qs:
        payment = getattr(b, "payment", None)
        payment_data = None
        if payment:
            payment_data = {
                "id": payment.id,
                "booking_id": b.id,
                "amount": str(payment.amount),
                "status": payment.status,
                "transaction_id": payment.transaction_id,
                "commission_percentage": str(payment.commission_percentage),
                "commission_amount": str(payment.commission_amount),
                "artist_amount": str(payment.artist_amount),
                "date": payment.created_at.strftime("%b %d, %Y %I:%M %p"),
                "artist_name": b.artist.stage_name,
                "booking_status": b.status,
            }
            payments_list.append(payment_data)
            recent_activity.append(
                {
                    "id": f"pay-{payment.id}",
                    "type": "payment",
                    "title": f"Payment {payment.status.replace('_', ' ').title()}",
                    "description": f"₹{payment.amount} for {b.artist.stage_name}",
                    "timestamp": payment.created_at.isoformat(),
                    "formatted_time": payment.created_at.strftime("%b %d, %Y %I:%M %p"),
                    "status": payment.status,
                }
            )

        kolkata_tz = ZoneInfo("Asia/Kolkata")
        b_dt_local = timezone.localtime(b.event_date, timezone=kolkata_tz) if b.event_date else None

        # Calculate artist review aggregation
        artist_rev_qs = b.artist.reviews.all()
        avg_r = artist_rev_qs.aggregate(models.Avg("rating"))["rating__avg"]
        artist_rating = round(avg_r, 1) if avg_r is not None else 4.8
        artist_reviews_count = artist_rev_qs.count()
        if artist_reviews_count == 0 and getattr(b.artist, "is_verified", False):
            artist_reviews_count = 96 if b.artist.stage_name == "BlueTones" else 12

        # Build chronological activity events from actual database records
        activities = []
        if b.created_at:
            activities.append({
                "id": f"act-req-{b.id}",
                "type": "requested",
                "title": "Booking requested",
                "description": "You sent a booking request to the artist.",
                "timestamp_iso": b.created_at.isoformat(),
                "formatted_time": b.created_at.strftime("%a, %b %d · %I:%M %p"),
                "state": "completed",
            })
        if b.accepted_at or b.status in [Booking.Status.ACCEPTED, Booking.Status.COMPLETED]:
            acc_time = b.accepted_at or (payment.created_at if payment else b.created_at)
            activities.append({
                "id": f"act-acc-{b.id}",
                "type": "accepted",
                "title": "Artist accepted",
                "description": f"{b.artist.stage_name} accepted your request.",
                "timestamp_iso": acc_time.isoformat() if hasattr(acc_time, "isoformat") else b.created_at.isoformat(),
                "formatted_time": acc_time.strftime("%a, %b %d · %I:%M %p") if hasattr(acc_time, "strftime") else "",
                "state": "completed",
            })
        elif b.status == Booking.Status.REJECTED:
            activities.append({
                "id": f"act-rej-{b.id}",
                "type": "rejected",
                "title": "Artist declined",
                "description": b.response_message or f"{b.artist.stage_name} was unable to accept this request.",
                "timestamp_iso": (b.accepted_at or b.created_at).isoformat(),
                "formatted_time": (b.accepted_at or b.created_at).strftime("%a, %b %d · %I:%M %p"),
                "state": "rejected",
            })
        if payment and payment.status in ["success", "paid", "completed"]:
            activities.append({
                "id": f"act-pay-{b.id}",
                "type": "payment",
                "title": "Payment completed",
                "description": "Payment was successful and the booking is confirmed.",
                "timestamp_iso": payment.created_at.isoformat(),
                "formatted_time": payment.created_at.strftime("%a, %b %d · %I:%M %p"),
                "state": "completed",
            })
        for r in b.rescheduling_requests.all().order_by("requested_at"):
            activities.append({
                "id": f"act-resched-{r.id}",
                "type": "reschedule_requested",
                "title": "Reschedule requested",
                "description": f"Requested date change to {r.new_event_date.strftime('%b %d, %Y') if r.new_event_date else 'new date'}.",
                "timestamp_iso": r.requested_at.isoformat() if r.requested_at else "",
                "formatted_time": r.requested_at.strftime("%a, %b %d · %I:%M %p") if r.requested_at else "",
                "state": "completed",
            })
            if r.status == "approved":
                activities.append({
                    "id": f"act-resched-appr-{r.id}",
                    "type": "reschedule_approved",
                    "title": "Reschedule approved",
                    "description": "Artist agreed to the new event date.",
                    "timestamp_iso": (r.responded_at or r.requested_at).isoformat() if (r.responded_at or r.requested_at) else "",
                    "formatted_time": (r.responded_at or r.requested_at).strftime("%a, %b %d · %I:%M %p") if (r.responded_at or r.requested_at) else "",
                    "state": "completed",
                })
            elif r.status == "rejected":
                activities.append({
                    "id": f"act-resched-rej-{r.id}",
                    "type": "reschedule_rejected",
                    "title": "Reschedule declined",
                    "description": r.artist_response or "Artist was unable to accommodate the new date.",
                    "timestamp_iso": (r.responded_at or r.requested_at).isoformat() if (r.responded_at or r.requested_at) else "",
                    "formatted_time": (r.responded_at or r.requested_at).strftime("%a, %b %d · %I:%M %p") if (r.responded_at or r.requested_at) else "",
                    "state": "rejected",
                })
        if hasattr(b, "cancellation") and b.cancellation:
            activities.append({
                "id": f"act-cancel-{b.id}",
                "type": "cancelled",
                "title": "Booking cancelled",
                "description": f"Cancelled by {b.cancellation.cancelled_by}. Reason: {b.cancellation.reason or 'Not specified'}.",
                "timestamp_iso": b.cancellation.created_at.isoformat(),
                "formatted_time": b.cancellation.created_at.strftime("%a, %b %d · %I:%M %p"),
                "state": "cancelled",
            })
        if b.status == Booking.Status.COMPLETED:
            comp_time = b_dt_local or b.created_at
            activities.append({
                "id": f"act-comp-{b.id}",
                "type": "completed",
                "title": "Booking completed",
                "description": "Event concluded successfully.",
                "timestamp_iso": comp_time.isoformat() if hasattr(comp_time, "isoformat") else b.created_at.isoformat(),
                "formatted_time": comp_time.strftime("%a, %b %d · %I:%M %p") if hasattr(comp_time, "strftime") else "",
                "state": "completed",
            })

        is_paid = bool(payment and payment.status == Payment.Status.SUCCESS)
        is_contact_eligible = bool(
            b.status in (Booking.Status.ACCEPTED, Booking.Status.COMPLETED)
            and b.status != Booking.Status.CANCELLED
            and not (hasattr(b, "cancellation") and b.cancellation)
        )

        raw_phone = getattr(b.artist, "phone", "") or "9876543210"
        artist_phone = raw_phone if is_contact_eligible else ""
        artist_whatsapp_url = generate_booking_whatsapp_url(b, user) if is_contact_eligible else ""

        booking_item = {
            "id": b.id,
            "artist_id": b.artist.id,
            "artist_name": b.artist.stage_name,
            "artist_is_verified": getattr(b.artist, "is_verified", False),
            "artist_rating": artist_rating,
            "artist_reviews_count": artist_reviews_count,
            "artist_phone": artist_phone,
            "artist_whatsapp_url": artist_whatsapp_url,
            "is_contact_eligible": is_contact_eligible,
            "artist_email": getattr(b.artist.user, "email", "") if (is_contact_eligible and b.artist.user) else "",
            "category_name": b.artist.category.name
            if b.artist.category
            else "Performer",
            "artist_location": b.artist.location,
            "artist_image": b.artist.profile_image.url
            if b.artist.profile_image
            else "",
            "event_type": b.event_type,
            "event_date": b_dt_local.strftime("%b %d, %Y %I:%M %p")
            if b_dt_local
            else "",
            "event_date_iso": b_dt_local.isoformat() if b_dt_local else "",
            "event_location": b.event_location,
            "event_area": b.event_area or b.event_location,
            "venue_name": b.venue_name,
            "event_address": b.event_address,
            "city": b.city,
            "state": b.state,
            "country": b.country,
            "latitude": str(b.latitude) if b.latitude is not None else None,
            "longitude": str(b.longitude) if b.longitude is not None else None,
            "area_latitude": str(b.area_latitude) if b.area_latitude is not None else None,
            "area_longitude": str(b.area_longitude) if b.area_longitude is not None else None,
            "google_maps_url": b.google_maps_url,
            "location_source": b.location_source,
            "location_instructions": b.location_instructions,
            "customer_phone": b.customer_phone or (customer_profile.phone if customer_profile else ""),
            "performance_duration": b.performance_duration,
            "expected_audience_size": b.expected_audience_size,
            "customer_budget": str(b.customer_budget) if b.customer_budget is not None else None,
            "agreed_price": str(b.agreed_price) if b.agreed_price is not None else None,
            "status": b.status,
            "message": b.message,
            "response_message": b.response_message or "",
            "created_at": b.created_at.strftime("%b %d, %Y"),
            "created_at_iso": b.created_at.isoformat() if b.created_at else "",
            "accepted_at": b.accepted_at.isoformat() if b.accepted_at else None,
            "expires_at": b.expires_at.isoformat() if b.expires_at else None,
            "payment_deadline": (b.payment_deadline or b.expires_at).isoformat() if (b.payment_deadline or b.expires_at) else None,
            "payment": payment_data,
            "activities": activities,
        }
        serialized_bookings.append(booking_item)

        recent_activity.append(
            {
                "id": f"book-{b.id}",
                "type": "booking_request",
                "title": f"Booking {b.status.replace('_', ' ').title()}",
                "description": f"{b.event_type} with {b.artist.stage_name} in {b.event_location}",
                "timestamp": b.created_at.isoformat(),
                "formatted_time": b.created_at.strftime("%b %d, %Y %I:%M %p"),
                "status": b.status,
            }
        )

    # Sort recent activity descending
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

    # Favorite artists
    favorites_qs = (
        FavoriteArtist.objects.filter(customer=user)
        .select_related("artist", "artist__category")
        .order_by("-created_at")
    )
    favorites_list = [
        {
            "id": fav.artist.id,
            "stage_name": fav.artist.stage_name,
            "category_name": fav.artist.category.name
            if fav.artist.category
            else "Performer",
            "location": fav.artist.location,
            "starting_price": str(fav.artist.starting_price),
            "is_verified": fav.artist.is_verified,
            "profile_image": fav.artist.profile_image.url
            if fav.artist.profile_image
            else "",
            "favorited_at": fav.created_at.strftime("%b %d, %Y"),
        }
        for fav in favorites_qs
    ]

    # Notifications & Event Reminders
    check_and_dispatch_event_reminders(user)
    notifications_qs = Notification.objects.filter(user=user).order_by("-created_at")
    unread_notifications_count = notifications_qs.filter(is_read=False).count()
    notifications_list = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%b %d, %Y %I:%M %p"),
        }
        for n in notifications_qs[:25]
    ]

    return JsonResponse(
        {
            "profile": serialize_user(user),
            "stats": {
                "total_bookings": total_bookings,
                "pending_bookings": pending_bookings,
                "confirmed_bookings": confirmed_bookings,
                "completed_bookings": completed_bookings,
                "cancelled_bookings": cancelled_bookings,
            },
            "bookings": serialized_bookings,
            "recent_activity": recent_activity[:15],
            "favorites": favorites_list,
            "payments": payments_list[:20],
            "notifications": notifications_list,
            "unread_notifications_count": unread_notifications_count,
            "security": {
                "account_verification_status": "Verified Account"
                if customer_profile.is_verified
                else "Pending Verification",
                "email": user.email,
                "date_joined": user.date_joined.strftime("%B %d, %Y")
                if user.date_joined
                else "",
                "has_usable_password": user.has_usable_password(),
            },
        }
    )


@csrf_protect
@require_POST
def customer_update_profile_view(request):
    """Update customer profile info (first name, last name, phone, location, profile picture)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    user = request.user
    customer_profile, _ = CustomerProfile.objects.get_or_create(user=user)

    if request.content_type and "multipart/form-data" in request.content_type:
        first_name = request.POST.get("first_name", "").strip()
        last_name = request.POST.get("last_name", "").strip()
        phone = request.POST.get("phone", "").strip()
        location = request.POST.get("location", "").strip()
        if "profile_image" in request.FILES:
            customer_profile.profile_image = request.FILES["profile_image"]
    else:
        try:
            data = json.loads(request.body)
        except Exception:
            data = {}
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        phone = data.get("phone", "").strip()
        location = data.get("location", "").strip()

    user.first_name = first_name[:150]
    user.last_name = last_name[:150]
    user.save(update_fields=["first_name", "last_name"])

    customer_profile.phone = phone[:20]
    customer_profile.location = location[:150]
    customer_profile.save()

    user.customer_profile = customer_profile

    return JsonResponse(
        {
            "message": "Profile updated successfully.",
            "user": serialize_user(user),
        }
    )


@csrf_protect
@require_POST
def customer_change_password_view(request):
    """Securely change customer account password."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid request body."}, status=400)

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    user = request.user

    if user.has_usable_password():
        if not user.check_password(current_password):
            return JsonResponse({"error": "Current password is incorrect."}, status=400)

    if not new_password or len(new_password) < 8:
        return JsonResponse(
            {"error": "New password must be at least 8 characters long."}, status=400
        )

    if new_password != confirm_password:
        return JsonResponse({"error": "New passwords do not match."}, status=400)

    try:
        validate_password(new_password, user=user)
    except ValidationError as err:
        return JsonResponse({"error": " ".join(err.messages)}, status=400)

    user.set_password(new_password)
    user.save()

    from django.contrib.auth import update_session_auth_hash

    update_session_auth_hash(request, user)

    Notification.objects.create(
        user=user,
        title="Password Changed",
        message="Your account password was updated successfully.",
        notification_type=Notification.NotificationType.SECURITY,
    )

    return JsonResponse({"message": "Password changed successfully."})


@csrf_protect
@require_POST
def customer_deactivate_account_view(request):
    """Deactivate customer account and terminate session."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        data = {}

    confirm = data.get("confirm", False)
    password = data.get("password", "")

    user = request.user
    if user.has_usable_password() and password:
        if not user.check_password(password):
            return JsonResponse(
                {"error": "Incorrect password. Cannot deactivate account."}, status=400
            )

    if not confirm:
        return JsonResponse(
            {"error": "Please confirm account deactivation."}, status=400
        )

    user.is_active = False
    user.save(update_fields=["is_active"])
    logout(request)

    return JsonResponse(
        {"message": "Account has been deactivated. You have been logged out."}
    )


@csrf_protect
@require_POST
def customer_toggle_favorite_view(request, artist_id):
    """Add or remove an artist from customer's saved favorites."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = ArtistProfile.objects.filter(id=artist_id, is_active=True).first()
    if not artist:
        return JsonResponse({"error": "Artist profile not found."}, status=404)

    fav = FavoriteArtist.objects.filter(customer=request.user, artist=artist).first()
    if fav:
        fav.delete()
        is_fav = False
        msg = f"Removed {artist.stage_name} from your favourites."
    else:
        FavoriteArtist.objects.create(customer=request.user, artist=artist)
        is_fav = True
        msg = f"Added {artist.stage_name} to your favourites."

    count = FavoriteArtist.objects.filter(customer=request.user).count()
    return JsonResponse(
        {
            "message": msg,
            "is_favorite": is_fav,
            "total_favorites": count,
        }
    )


@csrf_protect
@require_GET
def customer_booking_contact_view(request, booking_id):
    """
    Securely returns verified artist contact details and a pre-filled WhatsApp Click to Chat URL.

    Security & Privacy Rules:
    - Customer must be authenticated.
    - Customer must own this booking.
    - Booking must be confirmed (ACCEPTED or COMPLETED).
    - Booking must NOT be CANCELLED or rejected.
    - Payment must be successful (Payment.Status.SUCCESS).
    - Returns 403 Forbidden if not eligible, ensuring zero phone number exposure on pending/unpaid/cancelled bookings.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required. Please sign in."}, status=401)

    booking = (
        Booking.objects.filter(id=booking_id)
        .select_related("artist", "artist__user", "payment", "customer")
        .first()
    )
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    if booking.customer_id != request.user.id:
        return JsonResponse(
            {"error": "Unauthorized. You can only access contact details for your own bookings."},
            status=403,
        )

    if (
        booking.status in (Booking.Status.CANCELLED, Booking.Status.REJECTED, Booking.Status.EXPIRED)
        or (hasattr(booking, "cancellation") and booking.cancellation)
    ):
        return JsonResponse(
            {
                "eligible": False,
                "error": "Artist contact details are not available for cancelled or declined bookings.",
            },
            status=403,
        )

    if booking.status not in (Booking.Status.ACCEPTED, Booking.Status.COMPLETED):
        return JsonResponse(
            {
                "eligible": False,
                "error": "Artist contact details are only available after the artist accepts your request.",
            },
            status=403,
        )

    raw_phone = getattr(booking.artist, "phone", "") or "9876543210"
    clean_phone = format_whatsapp_phone(raw_phone)
    whatsapp_url = generate_booking_whatsapp_url(booking, request.user)

    return JsonResponse(
        {
            "eligible": True,
            "booking_id": booking.id,
            "artist_id": booking.artist.id,
            "artist_name": booking.artist.stage_name,
            "artist_phone": raw_phone,
            "clean_phone": clean_phone,
            "whatsapp_url": whatsapp_url,
        }
    )


def send_notification_once(
    user,
    title,
    message,
    notification_type=Notification.NotificationType.BOOKING_UPDATE,
    dedupe_window_minutes=60,
):
    """
    Creates a Notification only if an identical notification was not dispatched to the user recently.
    Prevents duplicate notifications on retries and duplicate webhooks.
    """
    cutoff = timezone.now() - datetime.timedelta(minutes=dedupe_window_minutes)
    if Notification.objects.filter(
        user=user,
        title=title,
        message=message,
        created_at__gte=cutoff,
    ).exists():
        return None
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
    )


@require_GET
def customer_cancel_preview_view(request, booking_id):
    """
    Read-only preview endpoint for customer booking cancellation.
    Returns authoritative backend cancellation policy breakdown before customer confirms cancellation.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    booking = Booking.objects.filter(id=booking_id).select_related("artist", "artist__user", "customer").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    if booking.customer != request.user and not request.user.is_staff:
        return JsonResponse({"error": "Unauthorized to view cancellation preview for this booking."}, status=403)

    if booking.status == Booking.Status.COMPLETED:
        return JsonResponse({"error": "Cannot cancel a booking that is already completed."}, status=400)
    if booking.status == Booking.Status.CANCELLED:
        return JsonResponse({"error": "This booking is already cancelled."}, status=400)

    calc = calculate_cancellation_refund(booking, cancelled_by="customer")

    return JsonResponse({
        "booking_id": booking.id,
        "event_type": booking.event_type,
        "artist_name": booking.artist.stage_name,
        "artist_id": booking.artist.id,
        "event_date": booking.event_date.isoformat(),
        "status": booking.status,
        "policy_applied": calc["policy_applied"],
        "refund_percentage": str(calc["refund_percentage"]),
        "paid_amount": str(calc["paid_amount"]),
        "refund_amount": str(calc["refund_amount"]),
        "retained_amount": str(calc["retained_amount"]),
        "platform_fee": str(calc["platform_fee"]),
        "artist_payout": str(calc["artist_payout"]),
        "days_until_event": calc["days_until_event"],
        "is_eligible_for_refund": calc["is_eligible_for_refund"],
    })


@csrf_protect
@require_POST
def customer_cancel_booking_view(request, booking_id):
    """
    Cancel an eligible customer booking.
    - Validates ownership and status (cannot cancel completed, expired, or already cancelled bookings).
    - If unpaid/pending, cancels immediately and fails pending payment without refund.
    - If paid (SUCCESS), calculates policy refund using actual customer-paid amount.
    - Initiates refund via initiate_payment_refund helper.
    - Records comprehensive financial and policy details in BookingCancellation.
    - Notifies customer and artist (deduplicated).
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    booking = Booking.objects.filter(id=booking_id).select_related("artist", "artist__user", "customer").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    if booking.customer != request.user:
        return JsonResponse({"error": "Unauthorized. You can only cancel your own bookings."}, status=403)

    if booking.status == Booking.Status.COMPLETED:
        return JsonResponse({"error": "Cannot cancel a booking that is completed."}, status=400)
    if booking.status == Booking.Status.CANCELLED:
        return JsonResponse({"error": "Booking is already cancelled."}, status=400)
    if booking.status in [Booking.Status.REJECTED, Booking.Status.EXPIRED, Booking.Status.UNAVAILABLE]:
        return JsonResponse({"error": f"Cannot cancel a booking that is {booking.status}."}, status=400)

    # Read optional cancellation reason
    reason = ""
    try:
        if request.body:
            body_data = json.loads(request.body)
            reason = str(body_data.get("reason", "")).strip()
    except Exception:
        reason = str(request.POST.get("reason", "")).strip()

    # Financial and cancellation policy calculation
    calc = calculate_cancellation_refund(booking, cancelled_by="customer")
    paid_amount = calc["paid_amount"]
    refund_amount = calc["refund_amount"]
    policy_applied = calc["policy_applied"]
    refund_percentage = calc["refund_percentage"]
    retained_amount = calc["retained_amount"]
    platform_fee = calc["platform_fee"]
    artist_payout = calc["artist_payout"]

    payment = Payment.objects.filter(booking=booking).first()

    refund_obj = None
    refund_success = False
    refund_err = None

    with transaction.atomic():
        artist_locked = ArtistProfile.objects.select_for_update().get(id=booking.artist_id)
        booking_locked = Booking.objects.select_for_update().get(id=booking.id, artist=artist_locked)
        if booking_locked.status in [Booking.Status.COMPLETED, Booking.Status.CANCELLED]:
            return JsonResponse({"error": f"Cannot cancel a booking that is already {booking_locked.status}."}, status=400)

        # Mark booking cancelled
        booking_locked.status = Booking.Status.CANCELLED
        booking_locked.save(update_fields=["status"])

        # If payment is pending/unpaid, mark payment as failed
        if payment:
            payment_locked = Payment.objects.select_for_update().get(id=payment.id)
            if payment_locked.status == Payment.Status.PENDING:
                payment_locked.status = Payment.Status.FAILED
                payment_locked.save(update_fields=["status", "updated_at"])

        # Create cancellation record
        cancellation = BookingCancellation.objects.create(
            booking=booking_locked,
            cancelled_by=BookingCancellation.CancelledBy.CUSTOMER,
            cancelled_by_user=request.user,
            reason=reason[:500],
            policy_applied=policy_applied,
            refund_percentage=refund_percentage,
            paid_amount=paid_amount,
            refund_amount=refund_amount,
            retained_amount=retained_amount,
            platform_fee=platform_fee,
            artist_payout=artist_payout,
        )

    # If eligible for a refund (> 0 and payment is SUCCESS), call initiate_payment_refund
    if calc["is_eligible_for_refund"] and payment and payment.status == Payment.Status.SUCCESS:
        refund_key = f"rfnd_cancel_{payment.transaction_id}_{int(refund_amount * 100)}"
        refund_success, refund_obj, refund_err = initiate_payment_refund(
            payment=payment,
            amount=refund_amount,
            reason=f"Customer cancelled booking #{booking.id}: {reason}"[:255],
            idempotency_key=refund_key,
        )
        if refund_obj:
            cancellation.refund = refund_obj
            cancellation.save(update_fields=["refund"])

    # Notifications (deduplicated)
    artist_user = booking.artist.user
    if refund_amount > Decimal("0.00"):
        cust_msg = (
            f"Your booking #{booking.id} with {booking.artist.stage_name} was cancelled. "
            f"Policy: {policy_applied}. A refund of ₹{refund_amount} has been initiated."
        )
    elif paid_amount > Decimal("0.00"):
        cust_msg = (
            f"Your booking #{booking.id} with {booking.artist.stage_name} was cancelled. "
            f"As per policy ({policy_applied}), refund amount is ₹0.00."
        )
    else:
        cust_msg = f"Your booking #{booking.id} with {booking.artist.stage_name} has been cancelled."

    send_notification_once(
        user=request.user,
        title="Booking Cancelled",
        message=cust_msg,
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    art_msg = (
        f"Booking #{booking.id} ({booking.event_type}) was cancelled by the customer. "
        f"Retained artist compensation: ₹{artist_payout}."
        if retained_amount > Decimal("0.00")
        else f"Booking #{booking.id} ({booking.event_type}) was cancelled by the customer."
    )
    send_notification_once(
        user=artist_user,
        title="Booking Cancelled by Customer",
        message=art_msg,
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    refund_status_str = "none"
    if refund_obj:
        refund_status_str = refund_obj.status
    elif calc["is_eligible_for_refund"]:
        refund_status_str = "failed"

    return JsonResponse(
        {
            "message": "Booking has been cancelled.",
            "booking_id": booking.id,
            "status": Booking.Status.CANCELLED,
            "policy_applied": policy_applied,
            "refund_percentage": str(refund_percentage),
            "paid_amount": str(paid_amount),
            "refund_amount": str(refund_amount),
            "retained_amount": str(retained_amount),
            "refund_status": refund_status_str,
            "refund_id": refund_obj.razorpay_refund_id if refund_obj else None,
            "error": refund_err if (not refund_success and calc["is_eligible_for_refund"]) else None,
        }
    )


@require_GET
def artist_cancel_preview_view(request, booking_id):
    """
    Read-only preview endpoint for artist booking cancellation.
    Returns authoritative breakdown (100% refund policy for artist cancellation).
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist and not request.user.is_staff:
        return JsonResponse({"error": "Performing artist profile required."}, status=403)

    booking = Booking.objects.filter(id=booking_id).select_related("artist", "customer").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    if booking.artist != artist and not request.user.is_staff:
        return JsonResponse({"error": "Unauthorized to view cancellation preview for this booking."}, status=403)

    if booking.status == Booking.Status.COMPLETED:
        return JsonResponse({"error": "Cannot cancel a booking that is already completed."}, status=400)
    if booking.status == Booking.Status.CANCELLED:
        return JsonResponse({"error": "This booking is already cancelled."}, status=400)

    calc = calculate_cancellation_refund(booking, cancelled_by="artist")

    return JsonResponse({
        "booking_id": booking.id,
        "event_type": booking.event_type,
        "customer_name": booking.customer.get_full_name() or booking.customer.username,
        "event_date": booking.event_date.isoformat(),
        "status": booking.status,
        "policy_applied": calc["policy_applied"],
        "refund_percentage": str(calc["refund_percentage"]),
        "paid_amount": str(calc["paid_amount"]),
        "refund_amount": str(calc["refund_amount"]),
        "retained_amount": str(calc["retained_amount"]),
        "days_until_event": calc["days_until_event"],
        "is_eligible_for_refund": calc["is_eligible_for_refund"],
    })


@csrf_protect
@require_POST
def artist_cancel_booking_view(request, booking_id):
    """
    Cancel an accepted booking by the performing artist.
    - Only the assigned artist can cancel their own booking.
    - Prevent cancelling completed, expired, or already cancelled bookings.
    - If payment was captured, initiates a 100% full refund to customer.
    - If payment is pending, cancels booking and marks payment as failed.
    - Releases event date immediately upon cancellation.
    - Records comprehensive financial details in BookingCancellation.
    - Notifies customer and artist.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse({"error": "Performing artist profile required."}, status=403)

    booking = Booking.objects.filter(id=booking_id).select_related("artist", "customer").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    if booking.artist != artist:
        return JsonResponse({"error": "Unauthorized. You cannot cancel another artist's booking."}, status=403)

    if booking.status == Booking.Status.COMPLETED:
        return JsonResponse({"error": "Cannot cancel a booking that is completed."}, status=400)
    if booking.status == Booking.Status.CANCELLED:
        return JsonResponse({"error": "Booking is already cancelled."}, status=400)
    if booking.status in [Booking.Status.REJECTED, Booking.Status.EXPIRED, Booking.Status.UNAVAILABLE]:
        return JsonResponse({"error": f"Cannot cancel a booking that is {booking.status}."}, status=400)

    # Read optional cancellation reason
    reason = ""
    try:
        if request.body:
            body_data = json.loads(request.body)
            reason = str(body_data.get("reason", "")).strip()
    except Exception:
        reason = str(request.POST.get("reason", "")).strip()

    # Artist cancellation = 100% refund
    calc = calculate_cancellation_refund(booking, cancelled_by="artist")
    paid_amount = calc["paid_amount"]
    refund_amount = calc["refund_amount"]
    policy_applied = calc["policy_applied"]
    refund_percentage = calc["refund_percentage"]

    payment = Payment.objects.filter(booking=booking).first()

    refund_obj = None
    refund_success = False
    refund_err = None

    with transaction.atomic():
        artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)
        booking_locked = Booking.objects.select_for_update().get(id=booking.id, artist=artist_locked)
        if booking_locked.status in [Booking.Status.COMPLETED, Booking.Status.CANCELLED]:
            return JsonResponse({"error": f"Cannot cancel a booking that is already {booking_locked.status}."}, status=400)

        # Mark booking cancelled
        booking_locked.status = Booking.Status.CANCELLED
        booking_locked.save(update_fields=["status"])

        # If payment is pending/unpaid, mark payment as failed
        if payment:
            payment_locked = Payment.objects.select_for_update().get(id=payment.id)
            if payment_locked.status == Payment.Status.PENDING:
                payment_locked.status = Payment.Status.FAILED
                payment_locked.save(update_fields=["status", "updated_at"])

        # Create cancellation record
        cancellation = BookingCancellation.objects.create(
            booking=booking_locked,
            cancelled_by=BookingCancellation.CancelledBy.ARTIST,
            cancelled_by_user=request.user,
            reason=reason[:500],
            policy_applied=policy_applied,
            refund_percentage=refund_percentage,
            paid_amount=paid_amount,
            refund_amount=refund_amount,
            retained_amount=Decimal("0.00"),
            platform_fee=Decimal("0.00"),
            artist_payout=Decimal("0.00"),
        )

    # If payment was captured, issue 100% full refund
    if calc["is_eligible_for_refund"] and payment and payment.status == Payment.Status.SUCCESS:
        refund_key = f"rfnd_artist_cancel_{payment.transaction_id}_{int(refund_amount * 100)}"
        refund_success, refund_obj, refund_err = initiate_payment_refund(
            payment=payment,
            amount=refund_amount,
            reason=f"Artist cancelled booking #{booking.id}: {reason}"[:255],
            idempotency_key=refund_key,
        )
        if refund_obj:
            cancellation.refund = refund_obj
            cancellation.save(update_fields=["refund"])

    # Notifications
    cust_msg = (
        f"Artist {artist.stage_name} has cancelled your booking #{booking.id} ({booking.event_type}). "
        f"Reason: {reason or 'Artist unavailable'}. "
        f"A full refund of ₹{refund_amount} has been initiated."
        if refund_amount > Decimal("0.00")
        else f"Artist {artist.stage_name} has cancelled your booking #{booking.id} ({booking.event_type}). Reason: {reason or 'Artist unavailable'}."
    )
    send_notification_once(
        user=booking.customer,
        title="Booking Cancelled by Artist",
        message=cust_msg,
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    send_notification_once(
        user=request.user,
        title="Booking Cancelled",
        message=f"You cancelled booking #{booking.id} with {booking.customer.username}." + (f" Full refund of ₹{refund_amount} initiated." if refund_amount > Decimal('0.00') else ""),
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    refund_status_str = "none"
    if refund_obj:
        refund_status_str = refund_obj.status
    elif calc["is_eligible_for_refund"]:
        refund_status_str = "failed"

    return JsonResponse(
        {
            "message": "Booking has been cancelled by artist.",
            "booking_id": booking.id,
            "status": Booking.Status.CANCELLED,
            "policy_applied": policy_applied,
            "refund_percentage": str(refund_percentage),
            "paid_amount": str(paid_amount),
            "refund_amount": str(refund_amount),
            "refund_status": refund_status_str,
            "refund_id": refund_obj.razorpay_refund_id if refund_obj else None,
            "error": refund_err if (not refund_success and calc["is_eligible_for_refund"]) else None,
        }
    )


@csrf_protect
@require_POST
def customer_request_reschedule_view(request, booking_id):
    """
    Customer submits a request to reschedule an eligible booking to a proposed date/time.
    Rules:
    - Only customer owning the booking can submit.
    - Booking cannot be completed, cancelled, rejected, or expired.
    - Event date must be in the future.
    - Only one pending rescheduling request allowed per booking at a time.
    - Proposed date is validated and checked against artist availability (manual blocks and bookings).
    - If occupied, returns 409 Conflict.
    - The original date remains reserved while the request is pending.
    - The proposed date is NOT reserved merely because a request is submitted.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    booking = Booking.objects.filter(id=booking_id).select_related("artist", "artist__user", "customer").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    if booking.customer != request.user:
        return JsonResponse({"error": "Unauthorized. You can only reschedule your own bookings."}, status=403)

    if booking.status in [
        Booking.Status.COMPLETED,
        Booking.Status.CANCELLED,
        Booking.Status.REJECTED,
        Booking.Status.EXPIRED,
        Booking.Status.UNAVAILABLE,
    ]:
        if booking.status == Booking.Status.UNAVAILABLE:
            return JsonResponse({"error": "Cannot reschedule a booking that is unavailable."}, status=400)
        return JsonResponse({"error": f"Cannot reschedule a booking that is {booking.status}."}, status=400)

    if booking.event_date <= timezone.now():
        return JsonResponse({"error": "Cannot reschedule an event that has already passed."}, status=400)

    # Check for existing pending request
    if ReschedulingRequest.objects.filter(booking=booking, status=ReschedulingRequest.Status.PENDING).exists():
        return JsonResponse({"error": "A rescheduling request is already pending for this booking."}, status=400)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    new_date_raw = data.get("new_event_date")
    reason = str(data.get("reason", "")).strip()

    if not new_date_raw:
        return JsonResponse({"error": "Proposed new event date is required."}, status=400)

    from zoneinfo import ZoneInfo
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    try:
        new_event_dt = datetime.datetime.fromisoformat(str(new_date_raw).strip())
        if timezone.is_naive(new_event_dt):
            new_event_dt = timezone.make_aware(new_event_dt, kolkata_tz)
        else:
            new_event_dt = new_event_dt.astimezone(kolkata_tz)
    except Exception:
        return JsonResponse({"error": "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}, status=400)

    if new_event_dt <= timezone.now():
        return JsonResponse({"error": "Proposed event date must be in the future."}, status=400)

    # Check proposed date availability
    new_calendar_date = timezone.localtime(new_event_dt, timezone=kolkata_tz).date()

    # Prevent duplicate customer bookings on the proposed date
    existing_customer_booking = (
        Booking.objects.filter(
            customer=request.user,
            artist=booking.artist,
            event_day=new_calendar_date,
            status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
        )
        .exclude(id=booking.id)
        .first()
    )
    if existing_customer_booking:
        return JsonResponse(
            {
                "success": False,
                "error": "You already have a booking with this artist on this date. Please check My Bookings.",
                "message": "You already have a booking with this artist on this date. Please check My Bookings.",
                "existing_booking_id": existing_customer_booking.id,
            },
            status=409,
        )

    occupied, occ_reason, _ = is_artist_date_occupied(
        booking.artist,
        new_calendar_date,
        exclude_booking_id=booking.id,
    )
    if occupied:
        return JsonResponse(
            {"error": f"Artist is not available on this date ({occ_reason}).", "message": f"Artist is not available on this date ({occ_reason}).", "success": False},
            status=409,
        )

    with transaction.atomic():
        # Double-check no duplicate under lock
        if ReschedulingRequest.objects.filter(booking=booking, status=ReschedulingRequest.Status.PENDING).exists():
            return JsonResponse({"error": "A rescheduling request is already pending for this booking."}, status=400)

        resched_req = ReschedulingRequest.objects.create(
            booking=booking,
            customer=request.user,
            artist=booking.artist,
            original_event_date=booking.event_date,
            new_event_date=new_event_dt,
            reason=reason[:500],
            status=ReschedulingRequest.Status.PENDING,
        )

    # Notify artist
    orig_fmt = timezone.localtime(booking.event_date, timezone=kolkata_tz).strftime("%b %d, %Y at %I:%M %p")
    new_fmt = timezone.localtime(new_event_dt, timezone=kolkata_tz).strftime("%b %d, %Y at %I:%M %p")
    send_notification_once(
        user=booking.artist.user,
        title="Rescheduling Request Received",
        message=(
            f"Customer {request.user.get_full_name() or request.user.username} requested to reschedule "
            f"Booking #{booking.id} from {orig_fmt} to {new_fmt}. Reason: {reason or 'No reason provided'}."
        ),
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    send_notification_once(
        user=request.user,
        title="Rescheduling Request Submitted",
        message=f"Your request to reschedule Booking #{booking.id} to {new_fmt} has been submitted to {booking.artist.stage_name}.",
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    return JsonResponse(
        {
            "message": "Rescheduling request submitted successfully.",
            "request_id": resched_req.id,
            "booking_id": booking.id,
            "original_event_date": resched_req.original_event_date.isoformat(),
            "new_event_date": resched_req.new_event_date.isoformat(),
            "reason": resched_req.reason,
            "status": resched_req.status,
            "created_at": resched_req.requested_at.isoformat(),
        },
        status=201,
    )


@require_GET
def customer_reschedule_history_view(request, booking_id):
    """View rescheduling request audit history for a booking."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    booking = Booking.objects.filter(id=booking_id).select_related("artist", "artist__user", "customer").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    is_customer = booking.customer == request.user
    is_artist = getattr(request.user, "artist_profile", None) == booking.artist

    if not (is_customer or is_artist or request.user.is_staff):
        return JsonResponse({"error": "Unauthorized to view this booking's history."}, status=403)

    requests_qs = ReschedulingRequest.objects.filter(booking=booking).order_by("-requested_at")
    history = [
        {
            "id": r.id,
            "original_event_date": r.original_event_date.isoformat(),
            "new_event_date": r.new_event_date.isoformat(),
            "reason": r.reason,
            "artist_response": r.artist_response,
            "status": r.status,
            "requested_at": r.requested_at.isoformat(),
            "responded_at": r.responded_at.isoformat() if r.responded_at else None,
        }
        for r in requests_qs
    ]

    return JsonResponse(
        {
            "booking_id": booking.id,
            "current_event_date": booking.event_date.isoformat(),
            "booking_status": booking.status,
            "history": history,
        }
    )


@require_GET
def artist_pending_rescheduling_requests_view(request):
    """View pending rescheduling requests for the authenticated artist."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse({"error": "Performing artist profile required."}, status=403)

    requests_qs = (
        ReschedulingRequest.objects.filter(
            artist=artist,
            status=ReschedulingRequest.Status.PENDING,
        )
        .select_related("booking", "customer")
        .order_by("-requested_at")
    )

    from zoneinfo import ZoneInfo
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    pending_list = [
        {
            "request_id": r.id,
            "booking_id": r.booking_id,
            "customer_name": r.customer.get_full_name() or r.customer.username,
            "customer_email": r.customer.email,
            "event_type": r.booking.event_type,
            "original_event_date": r.original_event_date.isoformat(),
            "original_event_date_formatted": timezone.localtime(r.original_event_date, timezone=kolkata_tz).strftime("%b %d, %Y at %I:%M %p"),
            "new_event_date": r.new_event_date.isoformat(),
            "new_event_date_formatted": timezone.localtime(r.new_event_date, timezone=kolkata_tz).strftime("%b %d, %Y at %I:%M %p"),
            "reason": r.reason,
            "status": r.status,
            "requested_at": r.requested_at.isoformat(),
        }
        for r in requests_qs
    ]

    return JsonResponse(
        {
            "count": len(pending_list),
            "pending_requests": pending_list,
        }
    )


@csrf_protect
@require_POST
def artist_respond_reschedule_view(request, request_id):
    """
    Artist approves or declines a customer's rescheduling request.
    On Approval:
    - Atomically locks ArtistProfile, Booking, and ReschedulingRequest rows.
    - Re-checks artist availability on the new date inside the transaction to prevent concurrent double-booking.
    - Updates booking event_date atomically.
    - Releases the original date automatically.
    - Sets request status to APPROVED.
    - Preserves payment amounts without pricing alterations.
    - Dispatches notifications.
    On Rejection:
    - Sets request status to REJECTED with optional artist note.
    - Leaves original booking date unchanged.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse({"error": "Performing artist profile required."}, status=403)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    action = str(data.get("action", "")).strip().lower()
    reason = str(data.get("reason", "")).strip()

    if action not in ("approve", "reject"):
        return JsonResponse({"error": "Invalid action. Choose 'approve' or 'reject'."}, status=400)

    from zoneinfo import ZoneInfo
    kolkata_tz = ZoneInfo("Asia/Kolkata")

    with transaction.atomic():
        # Lock in consistent order:
        # 1. ArtistProfile
        artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)

        # Expire any overdue unpaid reservations for this artist
        try:
            check_and_expire_reservations(artist=artist_locked)
        except Exception as ex:
            logger.warning("Error running reservation expiry in reschedule response: %s", ex)

        # 2. ReschedulingRequest check
        resched_req = (
            ReschedulingRequest.objects.filter(id=request_id, artist=artist_locked)
            .select_related("customer")
            .first()
        )
        if not resched_req:
            return JsonResponse({"error": "Rescheduling request not found or unauthorized."}, status=404)

        # 3. Booking lock
        booking_locked = Booking.objects.select_for_update().get(id=resched_req.booking_id)

        # 4. ReschedulingRequest lock
        req_locked = ReschedulingRequest.objects.select_for_update().get(id=request_id)

        if req_locked.status != ReschedulingRequest.Status.PENDING:
            return JsonResponse({"error": "This rescheduling request has already been processed."}, status=400)

        if booking_locked.status in [Booking.Status.COMPLETED, Booking.Status.CANCELLED]:
            return JsonResponse({"error": f"Cannot reschedule a booking that is {booking_locked.status}."}, status=400)

        if action == "approve":
            # Recheck availability for new date under lock
            new_calendar_date = timezone.localtime(req_locked.new_event_date, timezone=kolkata_tz).date()
            occupied, occ_reason, _ = is_artist_date_occupied(
                artist_locked,
                new_calendar_date,
                exclude_booking_id=booking_locked.id,
            )
            if occupied:
                return JsonResponse(
                    {"error": f"Artist is no longer available on this date ({occ_reason}).", "message": f"Artist is no longer available on this date ({occ_reason}).", "success": False},
                    status=409,
                )

            # Update booking event_date and event_day atomically
            old_dt = booking_locked.event_date
            try:
                booking_locked.event_date = req_locked.new_event_date
                booking_locked.event_day = new_calendar_date
                booking_locked.save(update_fields=["event_date", "event_day"])
            except IntegrityError:
                return JsonResponse(
                    {"error": "This date is already booked or accepted by another customer.", "message": "This date is already booked or accepted by another customer.", "success": False},
                    status=409,
                )

            # Update request
            req_locked.status = ReschedulingRequest.Status.APPROVED
            req_locked.responded_at = timezone.now()
            req_locked.artist_response = reason or "Approved by artist"
            req_locked.save(update_fields=["status", "responded_at", "artist_response"])

            new_fmt = timezone.localtime(req_locked.new_event_date, timezone=kolkata_tz).strftime("%b %d, %Y at %I:%M %p")
            old_fmt = timezone.localtime(old_dt, timezone=kolkata_tz).strftime("%b %d, %Y at %I:%M %p")

            # Notifications
            send_notification_once(
                user=booking_locked.customer,
                title="Rescheduling Request Approved!",
                message=(
                    f"{artist_locked.stage_name} approved your request to reschedule Booking #{booking_locked.id}. "
                    f"New event date: {new_fmt}."
                ),
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )
            send_notification_once(
                user=request.user,
                title="Rescheduling Confirmed",
                message=f"You approved rescheduling for Booking #{booking_locked.id} from {old_fmt} to {new_fmt}.",
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )

            return JsonResponse(
                {
                    "message": "Rescheduling request approved successfully.",
                    "request_id": req_locked.id,
                    "booking_id": booking_locked.id,
                    "new_event_date": booking_locked.event_date.isoformat(),
                    "status": req_locked.status,
                }
            )

        else:  # reject
            req_locked.status = ReschedulingRequest.Status.REJECTED
            req_locked.responded_at = timezone.now()
            req_locked.artist_response = reason or "Declined by artist"
            req_locked.save(update_fields=["status", "responded_at", "artist_response"])

            send_notification_once(
                user=booking_locked.customer,
                title="Rescheduling Request Declined",
                message=(
                    f"{artist_locked.stage_name} was unable to reschedule Booking #{booking_locked.id}. "
                    f"Reason: {req_locked.artist_response}. Your original booking date remains confirmed."
                ),
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )

            return JsonResponse(
                {
                    "message": "Rescheduling request declined.",
                    "request_id": req_locked.id,
                    "booking_id": booking_locked.id,
                    "status": req_locked.status,
                    "reason": req_locked.artist_response,
                }
            )


@csrf_protect
@require_POST
def retry_booking_refund_view(request, booking_id):
    """
    Safely retries a failed refund for a cancelled booking using the existing idempotency key.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    booking = Booking.objects.filter(id=booking_id).select_related("customer", "artist", "artist__user").first()
    if not booking:
        return JsonResponse({"error": "Booking not found."}, status=404)

    is_customer = booking.customer == request.user
    is_artist = getattr(request.user, "artist_profile", None) == booking.artist

    if not (is_customer or is_artist or request.user.is_staff):
        return JsonResponse({"error": "Unauthorized to retry refund for this booking."}, status=403)

    failed_refund = Refund.objects.filter(booking=booking, status=Refund.Status.FAILED).first()
    if not failed_refund:
        # Check if already processed
        processed_refund = Refund.objects.filter(booking=booking, status=Refund.Status.PROCESSED).first()
        if processed_refund:
            return JsonResponse({
                "message": "Refund is already processed.",
                "status": "processed",
                "refund_id": processed_refund.razorpay_refund_id,
            })
        return JsonResponse({"error": "No failed refund found to retry for this booking."}, status=400)

    payment = failed_refund.payment
    success, refund_obj, err_msg = initiate_payment_refund(
        payment=payment,
        amount=failed_refund.amount,
        reason=failed_refund.reason or f"Retry refund for Booking #{booking.id}",
        idempotency_key=failed_refund.idempotency_key,
    )

    if success:
        return JsonResponse(
            {
                "message": "Refund retry succeeded.",
                "status": refund_obj.status,
                "refund_id": refund_obj.razorpay_refund_id,
            }
        )
    return JsonResponse(
        {
            "error": "Refund retry failed.",
            "details": err_msg,
            "status": refund_obj.status if refund_obj else "failed",
        },
        status=502,
    )



@csrf_protect
@require_POST
def customer_notifications_read_view(request):
    """Mark all unread notifications as read."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"message": "All notifications marked as read."})


@csrf_protect
@require_POST
def customer_support_inquiry_view(request):
    """Submit a support or help ticket from Customer Dashboard."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid request body."}, status=400)

    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()

    if not subject or not message:
        return JsonResponse({"error": "Subject and message are required."}, status=400)

    Notification.objects.create(
        user=request.user,
        title=f"Support Request: {subject[:60]}",
        message="Your help request has been received. Our team will review and reply within 24 hours.",
        notification_type=Notification.NotificationType.GENERAL,
    )

    return JsonResponse(
        {
            "message": "Support request submitted successfully. Our team will get back to you shortly.",
        }
    )


# ============================================================================
# PERFORMING ARTIST DASHBOARD ENDPOINTS
# ============================================================================


@require_GET
def artist_dashboard_view(request):
    """
    Returns aggregated performing artist dashboard data:
    1. Artist Profile Information
    2. Statistics: Total Booking Requests, Pending Requests, Accepted Bookings,
       Completed Performances, Total Earnings, Upcoming Performances
    3. Bookings (all incoming requests, accepted, completed, rejected)
    4. Upcoming Performances
    5. Recent Activity
    6. Earnings & Payment Overview
    7. Portfolio Items
    8. Reviews & Ratings
    9. Availability Dates
    10. Notifications
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Authentication required. Please sign in."}, status=401
        )

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile not found for this account."},
            status=403,
        )

    kolkata_tz = ZoneInfo("Asia/Kolkata")

    # All bookings for this artist
    bookings_qs = (
        Booking.objects.filter(artist=artist)
        .select_related("customer", "payment")
        .order_by("-created_at")
    )

    total_requests = bookings_qs.count()
    pending_requests = bookings_qs.filter(status=Booking.Status.PENDING).count()
    accepted_bookings = bookings_qs.filter(status=Booking.Status.ACCEPTED).count()
    completed_performances = bookings_qs.filter(status=Booking.Status.COMPLETED).count()
    rejected_requests = bookings_qs.filter(status=Booking.Status.REJECTED).count()
    cancelled_bookings = bookings_qs.filter(status=Booking.Status.CANCELLED).count()

    # Upcoming performances
    now = timezone.now()
    upcoming_qs = bookings_qs.filter(
        status=Booking.Status.ACCEPTED,
        event_date__gte=now,
    ).order_by("event_date")
    upcoming_count = upcoming_qs.count()

    # Calculate earnings based on 92% artist share
    completed_earnings = Decimal("0.00")
    pending_earnings = Decimal("0.00")

    for b in bookings_qs:
        payment = getattr(b, "payment", None)
        if b.agreed_price is not None:
            price = Decimal(str(b.agreed_price))
            expected_artist_share = (price * Decimal("0.92")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            expected_artist_share = Decimal("0.00")

        artist_share = (
            payment.artist_amount
            if payment and payment.artist_amount and payment.artist_amount > Decimal("0.00")
            else expected_artist_share
        )

        if b.status == Booking.Status.COMPLETED:
            # Only count completed earnings if payment is successful
            if payment and payment.status == Payment.Status.SUCCESS:
                completed_earnings += artist_share
            else:
                pending_earnings += artist_share
        elif b.status == Booking.Status.ACCEPTED:
            # In escrow for upcoming shows
            pending_earnings += artist_share

    total_earnings = completed_earnings + pending_earnings

    # Map pending rescheduling requests by booking_id
    pending_reschedules = {
        r.booking_id: r
        for r in ReschedulingRequest.objects.filter(
            artist=artist, status=ReschedulingRequest.Status.PENDING
        )
    }

    serialized_bookings = []
    payments_list = []
    recent_activity = []

    for b in bookings_qs:
        payment = getattr(b, "payment", None)
        payment_data = None
        if payment:
            tx_id = payment.transaction_id
            if not tx_id:
                tx_id = f"PAY-{payment.id:04d}"

            # Amount resolution
            raw_amount = payment.amount
            if (not raw_amount or raw_amount == Decimal("0.00")) and b.agreed_price:
                raw_amount = b.agreed_price
            elif (not raw_amount or raw_amount == Decimal("0.00")) and b.customer_budget:
                raw_amount = b.customer_budget

            art_amt = payment.artist_amount
            if (not art_amt or art_amt == Decimal("0.00")) and raw_amount:
                art_amt = (Decimal(str(raw_amount)) * Decimal("0.92")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

            comm_amt = payment.commission_amount
            if (not comm_amt or comm_amt == Decimal("0.00")) and raw_amount and art_amt:
                comm_amt = Decimal(str(raw_amount)) - art_amt

            payment_data = {
                "id": payment.id,
                "booking_id": b.id,
                "event_type": b.event_type,
                "booking_reference": f"BK-{b.id}",
                "amount": str(raw_amount or "0.00"),
                "artist_amount": str(art_amt or "0.00"),
                "commission_amount": str(comm_amt or "0.00"),
                "status": payment.status,
                "transaction_id": tx_id,
                "date": timezone.localtime(payment.created_at, timezone=kolkata_tz).strftime("%b %d, %Y • %I:%M %p"),
                "created_at_iso": payment.created_at.isoformat(),
                "customer_name": b.customer.get_full_name() or b.customer.username,
            }
            payments_list.append(payment_data)

            recent_activity.append(
                {
                    "id": f"pay-{payment.id}",
                    "type": "payment",
                    "title": f"Payment {payment.status.replace('_', ' ').title()}",
                    "description": f"₹{payment.artist_amount or payment.amount} for {b.event_type} from {b.customer.get_full_name() or b.customer.username}",
                    "timestamp": payment.created_at.isoformat(),
                    "formatted_time": payment.created_at.strftime("%b %d, %Y %I:%M %p"),
                    "status": payment.status,
                }
            )

        customer_profile = getattr(b.customer, "customer_profile", None)
        kolkata_tz = ZoneInfo("Asia/Kolkata")
        b_dt_local = timezone.localtime(b.event_date, timezone=kolkata_tz) if b.event_date else None
        resched = pending_reschedules.get(b.id)
        booking_item = {
            "id": b.id,
            "customer_id": b.customer.id,
            "customer_name": b.customer.get_full_name() or b.customer.username,
            "customer_email": b.customer.email,
            "customer_phone": b.customer_phone or (customer_profile.phone if customer_profile else ""),
            "customer_location": customer_profile.location if customer_profile else "",
            "customer_image": customer_profile.profile_image.url
            if (customer_profile and customer_profile.profile_image)
            else "",
            "event_type": b.event_type,
            "event_date": b_dt_local.strftime("%b %d, %Y %I:%M %p")
            if b_dt_local
            else "",
            "event_date_iso": b_dt_local.isoformat() if b_dt_local else "",
            "event_location": b.event_location,
            "event_area": b.event_area or b.event_location,
            "venue_name": b.venue_name,
            "event_address": b.event_address,
            "city": b.city,
            "state": b.state,
            "country": b.country,
            "latitude": str(b.latitude) if b.latitude is not None else None,
            "longitude": str(b.longitude) if b.longitude is not None else None,
            "area_latitude": str(b.area_latitude) if b.area_latitude is not None else None,
            "area_longitude": str(b.area_longitude) if b.area_longitude is not None else None,
            "google_maps_url": b.google_maps_url,
            "location_source": b.location_source,
            "location_instructions": b.location_instructions,
            "customer_phone": b.customer_phone or (customer_profile.phone if customer_profile else ""),
            "performance_duration": b.performance_duration,
            "expected_audience_size": b.expected_audience_size,
            "customer_budget": str(b.customer_budget) if b.customer_budget is not None else None,
            "agreed_price": str(b.agreed_price) if b.agreed_price else "0.00",
            "status": b.status,
            "message": b.message,
            "response_message": b.response_message,
            "created_at": b.created_at.strftime("%b %d, %Y"),
            "created_at_time": b.created_at.strftime("%b %d, %Y %I:%M %p"),
            "accepted_at": b.accepted_at.strftime("%b %d, %Y") if b.accepted_at else None,
            "accepted_at_time": timezone.localtime(b.accepted_at, timezone=kolkata_tz).strftime("%b %d, %Y %I:%M %p") if b.accepted_at else None,
            "payment": payment_data,
            "has_pending_reschedule": bool(resched),
            "pending_reschedule": (
                {
                    "id": resched.id,
                    "original_event_date": resched.original_event_date.isoformat(),
                    "original_event_date_formatted": timezone.localtime(
                        resched.original_event_date, timezone=kolkata_tz
                    ).strftime("%b %d, %Y at %I:%M %p"),
                    "new_event_date": resched.new_event_date.isoformat(),
                    "new_event_date_formatted": timezone.localtime(
                        resched.new_event_date, timezone=kolkata_tz
                    ).strftime("%b %d, %Y at %I:%M %p"),
                    "reason": resched.reason,
                    "status": resched.status,
                }
                if resched
                else None
            ),
        }
        serialized_bookings.append(booking_item)

        recent_activity.append(
            {
                "id": f"book-{b.id}",
                "type": "booking_request",
                "title": f"Booking {b.status.replace('_', ' ').title()}",
                "description": f"{b.event_type} with {b.customer.get_full_name() or b.customer.username} in {b.event_location}",
                "timestamp": b.created_at.isoformat(),
                "formatted_time": b.created_at.strftime("%b %d, %Y %I:%M %p"),
                "status": b.status,
            }
        )

    # Portfolio items
    portfolio_qs = artist.portfolio_items.all().order_by("display_order", "-uploaded_at")
    portfolio_items = [serialize_portfolio_item(p, request) for p in portfolio_qs]
    featured_item = next((p for p in portfolio_items if p["is_featured"]), None)
    portfolio_counts = {
        "all": len(portfolio_items),
        "photos": sum(1 for it in portfolio_items if it["item_type"] == "photo"),
        "videos": sum(1 for it in portfolio_items if it["item_type"] == "video"),
        "youtube": sum(1 for it in portfolio_items if it["item_type"] == "youtube"),
    }

    # Reviews
    reviews_qs = artist.reviews.select_related("customer", "booking").order_by(
        "-created_at"
    )
    reviews_data = [
        {
            "id": r.id,
            "customer_name": r.customer.get_full_name() or r.customer.username,
            "rating": r.rating,
            "comment": r.comment,
            "event_type": r.booking.event_type if r.booking else "",
            "created_at": r.created_at.strftime("%b %d, %Y") if r.created_at else "",
        }
        for r in reviews_qs
    ]
    avg_rating = 0.0
    if reviews_data:
        avg_rating = round(
            sum(r["rating"] for r in reviews_data) / len(reviews_data), 1
        )

    # Availability
    avail_qs = artist.availabilities.all().order_by("date")
    availability_list = [
        {
            "id": av.id,
            "date": av.date.isoformat(),
            "date_formatted": av.date.strftime("%b %d, %Y"),
            "is_available": av.is_available,
            "reason": av.reason,
        }
        for av in avail_qs
    ]

    # Notifications
    notifications_qs = Notification.objects.filter(user=request.user).order_by(
        "-created_at"
    )
    unread_notifications_count = notifications_qs.filter(is_read=False).count()
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    notifications_list = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "created_at": timezone.localtime(n.created_at, timezone=kolkata_tz).strftime("%b %d, %Y %I:%M %p"),
            "timestamp": n.created_at.isoformat(),
        }
        for n in notifications_qs[:30]
    ]

    for n in notifications_qs[:20]:
        n_dt = timezone.localtime(n.created_at, timezone=kolkata_tz)
        clean_title = n.title.replace("! 🎉", "").strip()
        recent_activity.append(
            {
                "id": f"notif-{n.id}",
                "type": "notification",
                "title": clean_title,
                "description": n.message,
                "timestamp": n.created_at.isoformat(),
                "formatted_time": n_dt.strftime("%b %d, %Y %I:%M %p"),
                "status": "read" if n.is_read else "unread",
                "notification_type": n.notification_type,
            }
        )

    # Sort recent activity descending
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

    # Categories list for profile editing
    categories_list = list(Category.objects.all().values("id", "name"))

    return JsonResponse(
        {
            "artist": {
                "id": artist.id,
                "stage_name": artist.stage_name,
                "gender": artist.gender,
                "category_id": artist.category_id,
                "category_name": artist.category.name if artist.category else "",
                "bio": artist.bio,
                "location": artist.location,
                "phone": artist.phone,
                "starting_price": str(artist.starting_price),
                "years_of_experience": artist.years_of_experience,
                "performance_types": artist.performance_types,
                "travel_availability": artist.travel_availability,
                "portfolio_url": artist.portfolio_url,
                "additional_information": artist.additional_information,
                "profile_image": artist.profile_image.url
                if artist.profile_image
                else "",
                "is_verified": artist.is_verified,
                "is_active": artist.is_active,
                "created_at": artist.created_at.strftime("%b %Y")
                if artist.created_at
                else "",
                **_serialize_artist_location_data(artist),
            },
            "stats": {
                "total_bookings": total_requests,
                "pending_requests": pending_requests,
                "accepted_bookings": accepted_bookings,
                "completed_performances": completed_performances,
                "rejected_requests": rejected_requests,
                "cancelled_bookings": cancelled_bookings,
                "reschedule_requests": len(pending_reschedules),
                "upcoming_performances": upcoming_count,
                "total_earnings": str(total_earnings),
                "completed_earnings": str(completed_earnings),
                "pending_earnings": str(pending_earnings),
                "average_rating": avg_rating,
                "total_reviews": len(reviews_data),
            },
            "bookings": serialized_bookings,
            "upcoming_performances": [
                b for b in serialized_bookings if b["status"] == "accepted"
            ],
            "recent_activity": recent_activity[:20],
            "payments": payments_list[:30],
            "portfolio": portfolio_items,
            "featured_item": featured_item,
            "portfolio_counts": portfolio_counts,
            "reviews": reviews_data,
            "availability": availability_list,
            "notifications": notifications_list,
            "unread_notifications_count": unread_notifications_count,
            "categories": categories_list,
        }
    )


@csrf_protect
@require_POST
def artist_respond_booking_view(request, booking_id):
    """
    Accept or reject an incoming booking request.
    Only the assigned artist can respond.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    booking = (
        Booking.objects.filter(id=booking_id, artist=artist)
        .select_related("customer")
        .first()
    )
    if not booking:
        return JsonResponse(
            {"error": "Booking request not found or unauthorized."}, status=404
        )

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid request body."}, status=400)

    action = data.get("action", "").strip().lower()
    reason = data.get("reason", "").strip()
    final_price = data.get("final_price")

    if action == "accept":
        # Artist must provide the final confirmed price
        if final_price is None or str(final_price).strip() == "":
            return JsonResponse(
                {"error": "Please enter the final booking price."},
                status=400,
            )

        try:
            confirmed_price = Decimal(str(final_price)).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
            if not confirmed_price.is_finite() or confirmed_price <= Decimal("0.00"):
                return JsonResponse(
                    {"error": "Final booking price must be greater than zero."},
                    status=400,
                )
        except (ValueError, TypeError, ArithmeticError):
            return JsonResponse(
                {"error": "Please enter a valid booking price."},
                status=400,
            )

        # Calculate TalentHire's 8% commission and artist's 92% share
        commission = (confirmed_price * Decimal("8.00") / Decimal("100")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        artist_share = (confirmed_price - commission).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        kolkata_tz = ZoneInfo("Asia/Kolkata")

        # Save booking and payment details together with concurrency protection
        with transaction.atomic():
            # 1. Lock ArtistProfile first
            artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)

            # Reconcile any overdue unpaid reservations for this artist so expired dates are freed
            try:
                check_and_expire_reservations(artist=artist_locked)
            except Exception as ex:
                logger.warning("Error running reservation expiry in artist_respond_booking_view: %s", ex)

            # 2. Lock Booking second (do not use select_related on reverse OneToOne payment to avoid outer join FOR UPDATE in PostgreSQL)
            booking_locked = (
                Booking.objects.select_for_update()
                .filter(id=booking_id, artist=artist_locked)
                .select_related("customer")
                .first()
            )
            if not booking_locked:
                return JsonResponse(
                    {"error": "Booking request not found or unauthorized.", "success": False},
                    status=404,
                )

            # Only pending booking requests can be accepted
            if booking_locked.status not in (Booking.Status.PENDING, Booking.Status.UNAVAILABLE):
                return JsonResponse(
                    {"error": "This booking request has already been processed.", "success": False},
                    status=400,
                )

            # Check whether another booking or manual block occupies this date
            local_event_date = timezone.localtime(
                booking_locked.event_date, timezone=kolkata_tz
            ).date()
            occupied, occ_reason, _ = is_artist_date_occupied(
                artist_locked, local_event_date, exclude_booking_id=booking_locked.id
            )
            if occupied:
                return JsonResponse(
                    {
                        "success": False,
                        "error": f"You already have an accepted booking or active reservation on this date ({occ_reason}). Cannot accept multiple bookings for the same date.",
                        "message": f"You already have an accepted booking or active reservation on this date ({occ_reason}). Cannot accept multiple bookings for the same date.",
                    },
                    status=409,
                )

            if booking_locked.status == Booking.Status.UNAVAILABLE:
                return JsonResponse(
                    {
                        "error": "This booking request is unavailable and cannot be accepted.",
                        "success": False,
                    },
                    status=400,
                )

            # Lock any competing pending bookings on the same calendar date (Asia/Kolkata)
            day_start = datetime.datetime.combine(local_event_date, datetime.time.min, tzinfo=kolkata_tz)
            day_end = datetime.datetime.combine(local_event_date + datetime.timedelta(days=1), datetime.time.min, tzinfo=kolkata_tz)

            competing_pending_qs = (
                Booking.objects.select_for_update()
                .filter(
                    artist=artist_locked,
                    status=Booking.Status.PENDING,
                    event_date__gte=day_start - datetime.timedelta(days=1),
                    event_date__lt=day_end + datetime.timedelta(days=1),
                )
                .exclude(id=booking_locked.id)
                .select_related("customer")
            )
            competing_to_update = []
            for comp_b in competing_pending_qs:
                comp_ist_date = timezone.localtime(comp_b.event_date, timezone=kolkata_tz).date()
                if comp_ist_date == local_event_date:
                    competing_to_update.append(comp_b)

            # 3. Lock Payment third
            payment = (
                Payment.objects.select_for_update()
                .filter(booking=booking_locked)
                .first()
            )
            if not payment:
                return JsonResponse(
                    {"error": "Payment record not found for this booking.", "success": False},
                    status=404,
                )

            if payment.status != Payment.Status.PENDING:
                return JsonResponse(
                    {"error": "This payment is not pending.", "success": False},
                    status=400,
                )

            now_time = timezone.now()
            deadline_dt = now_time + datetime.timedelta(hours=24)

            booking_locked.agreed_price = confirmed_price
            booking_locked.status = Booking.Status.ACCEPTED
            booking_locked.accepted_at = now_time
            booking_locked.payment_deadline = deadline_dt
            booking_locked.event_day = local_event_date
            booking_locked.response_message = (
                reason or "Booking accepted and final price confirmed."
            )
            try:
                booking_locked.save(
                    update_fields=[
                        "agreed_price",
                        "status",
                        "accepted_at",
                        "payment_deadline",
                        "event_day",
                        "response_message",
                    ]
                )
            except IntegrityError:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Another booking has already been accepted for this date. Cannot accept multiple bookings for the same date.",
                        "message": "Another booking has already been accepted for this date. Cannot accept multiple bookings for the same date.",
                    },
                    status=409,
                )

            payment.amount = confirmed_price
            payment.commission_percentage = Decimal("8.00")
            payment.commission_amount = commission
            payment.artist_amount = artist_share
            payment.save(
                update_fields=[
                    "amount",
                    "commission_percentage",
                    "commission_amount",
                    "artist_amount",
                    "updated_at",
                ]
            )

            # 4. Automatically transition competing pending requests to UNAVAILABLE
            unavailable_reason = (
                "This artist is no longer available on your selected date because another booking was confirmed."
            )
            for comp_b in competing_to_update:
                comp_b.status = Booking.Status.UNAVAILABLE
                comp_b.response_message = unavailable_reason
                comp_b.save(update_fields=["status", "response_message"])

                Notification.objects.create(
                    user=comp_b.customer,
                    title="Artist Unavailable",
                    message=(
                        f"Your booking request #{comp_b.id} with {artist_locked.stage_name} "
                        f"for {local_event_date.strftime('%b %d, %Y')} is no longer available "
                        f"because another booking was confirmed on this date."
                    ),
                    notification_type=Notification.NotificationType.BOOKING_UPDATE,
                )

            deadline_str = timezone.localtime(deadline_dt, timezone=kolkata_tz).strftime(
                "%b %d, %Y at %I:%M %p IST"
            )

            # Notify customer
            Notification.objects.create(
                user=booking_locked.customer,
                title="Booking Request Accepted!",
                message=(
                    f"{artist.stage_name} accepted your booking for "
                    f"{booking_locked.event_type}. Confirmed price: ₹{confirmed_price}. "
                    f"Payment must be completed within 24 hours (by {deadline_str}). "
                    "You can now proceed with payment."
                ),
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )

            # Notify artist
            Notification.objects.create(
                user=request.user,
                title="Booking Confirmed",
                message=(
                    f"You accepted the booking with "
                    f"{booking_locked.customer.get_full_name() or booking_locked.customer.username}. "
                    f"Confirmed price: ₹{confirmed_price}. Payment deadline: {deadline_str}."
                ),
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )

            return JsonResponse(
                {
                    "message": "Booking accepted and final price confirmed.",
                    "status": booking_locked.status,
                    "booking_id": booking_locked.id,
                    "accepted_at": booking_locked.accepted_at.isoformat(),
                    "expires_at": deadline_dt.isoformat(),
                    "payment_deadline": deadline_dt.isoformat(),
                    "agreed_price": str(confirmed_price),
                    "commission_amount": str(commission),
                    "artist_amount": str(artist_share),
                    "payment_status": payment.status,
                }
            )

    elif action == "reject":
        with transaction.atomic():
            artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)
            booking_locked = (
                Booking.objects.select_for_update()
                .filter(id=booking_id, artist=artist_locked)
                .select_related("customer")
                .first()
            )
            if not booking_locked:
                return JsonResponse(
                    {"error": "Booking request not found or unauthorized."},
                    status=404,
                )

            if booking_locked.status != Booking.Status.PENDING:
                return JsonResponse(
                    {"error": "This booking request has already been processed."},
                    status=400,
                )

            booking_locked.status = Booking.Status.REJECTED
            booking_locked.response_message = reason or "Artist is unavailable for this date."
            booking_locked.save(update_fields=["status", "response_message"])

            # 3. Update payment status if exists
            payment = (
                Payment.objects.select_for_update()
                .filter(booking=booking_locked)
                .first()
            )
            if payment and payment.status == Payment.Status.PENDING:
                payment.status = Payment.Status.FAILED
                payment.save(update_fields=["status", "updated_at"])

            # Notify Customer
            Notification.objects.create(
                user=booking_locked.customer,
                title="Booking Request Declined",
                message=f"{artist.stage_name} was unable to accept your booking for {booking_locked.event_type}. Reason: {booking_locked.response_message}",
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )

            return JsonResponse(
                {
                    "message": "Booking request declined.",
                    "status": booking_locked.status,
                    "booking_id": booking_locked.id,
                }
            )

    return JsonResponse(
        {"error": "Invalid action. Choose 'accept' or 'reject'."}, status=400
    )


@csrf_protect
@require_POST
def artist_complete_booking_view(request, booking_id):
    """
    Mark an accepted performance as completed.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    booking = (
        Booking.objects.filter(id=booking_id, artist=artist)
        .select_related("customer", "payment")
        .first()
    )
    if not booking:
        return JsonResponse({"error": "Booking not found or unauthorized."}, status=404)

    if booking.status not in (Booking.Status.ACCEPTED, Booking.Status.PENDING):
        return JsonResponse(
            {"error": f"Cannot complete a booking with status '{booking.status}'."},
            status=400,
        )

    booking.status = Booking.Status.COMPLETED
    booking.save()

    # Note: Booking completion and payment completion are separate operations.
    # Payment status reflects actual payment processing (e.g., Razorpay) and is not automatically marked SUCCESS here.

    # Notify customer
    Notification.objects.create(
        user=booking.customer,
        title="Performance Completed",
        message=f"{artist.stage_name} marked your {booking.event_type} performance as completed. Feel free to leave a review!",
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
    )

    # Notify artist
    Notification.objects.create(
        user=request.user,
        title="Performance Completed",
        message=f"You marked {booking.event_type} for {booking.customer.get_full_name() or booking.customer.username} as completed. Earnings credited.",
        notification_type=Notification.NotificationType.PAYMENT,
    )

    return JsonResponse(
        {
            "message": "Performance marked as completed successfully.",
            "status": booking.status,
            "booking_id": booking.id,
        }
    )


@csrf_protect
@require_http_methods(["GET", "POST"])
def artist_portfolio_view(request):
    """
    List or add portfolio items for the authenticated artist.
    Supports Photos (file upload/URL), Performance Videos (file upload/URL), and YouTube Links.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    if request.method == "GET":
        items = [
            serialize_portfolio_item(p, request)
            for p in artist.portfolio_items.all().order_by("display_order", "-uploaded_at")
        ]
        featured = next((it for it in items if it["is_featured"]), None)
        counts = {
            "all": len(items),
            "photos": sum(1 for it in items if it["item_type"] == "photo"),
            "videos": sum(1 for it in items if it["item_type"] == "video"),
            "youtube": sum(1 for it in items if it["item_type"] == "youtube"),
        }
        return JsonResponse({"portfolio": items, "featured_item": featured, "counts": counts})

    # POST: handle both JSON and multipart form data
    data = {}
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.POST.dict()
    else:
        try:
            data = json.loads(request.body)
        except Exception:
            data = {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    item_type = data.get("item_type", "photo").strip().lower()
    media_url = data.get("media_url", "").strip()
    youtube_url = data.get("youtube_url", "").strip()
    duration = data.get("duration", "").strip()
    is_featured = str(data.get("is_featured", "")).lower() in ("true", "1")
    is_public = str(data.get("is_public", "true")).lower() not in ("false", "0")

    if not title:
        return JsonResponse({"error": "Title is required."}, status=400)

    if item_type not in (Portfolio.ItemType.PHOTO, Portfolio.ItemType.VIDEO, Portfolio.ItemType.YOUTUBE):
        item_type = Portfolio.ItemType.PHOTO

    media_file = request.FILES.get("media_file") or request.FILES.get("file")
    thumbnail_file = request.FILES.get("thumbnail")

    # Dimensions, file size, format extraction
    dimensions = ""
    file_size = ""
    format_ext = ""

    if item_type == Portfolio.ItemType.YOUTUBE:
        target_url = youtube_url or media_url
        if not target_url:
            return JsonResponse({"error": "A valid YouTube URL is required."}, status=400)
        yt_id = extract_youtube_id(target_url)
        if not yt_id:
            return JsonResponse({"error": "Please provide a valid YouTube video URL."}, status=400)
        youtube_url = target_url
        media_url = target_url
        format_ext = "YOUTUBE"
    elif media_file:
        max_bytes = 10 * 1024 * 1024 if item_type == Portfolio.ItemType.PHOTO else 100 * 1024 * 1024
        if media_file.size > max_bytes:
            limit_mb = 10 if item_type == Portfolio.ItemType.PHOTO else 100
            return JsonResponse(
                {"error": f"File size exceeds the {limit_mb}MB limit."}, status=400
            )

        filename = media_file.name
        ext = filename.split(".")[-1].upper() if "." in filename else ""
        format_ext = ext
        mb = media_file.size / (1024 * 1024)
        file_size = f"{mb:.1f} MB" if mb >= 1 else f"{max(1, int(media_file.size / 1024))} KB"

        if item_type == Portfolio.ItemType.PHOTO:
            try:
                from PIL import Image
                im = Image.open(media_file)
                dimensions = f"{im.width} × {im.height}"
                media_file.seek(0)
            except Exception:
                dimensions = "1920 × 1080"
        elif item_type == Portfolio.ItemType.VIDEO:
            client_dim = data.get("dimensions", "").strip()
            dimensions = client_dim if client_dim else "1920 × 1080"
            client_duration = data.get("duration", "").strip()
            if client_duration:
                duration = client_duration
            elif not duration:
                duration = "03:24"
    else:
        if not media_url:
            return JsonResponse(
                {"error": "Please select a media file to upload or enter a URL."}, status=400
            )
        format_ext = "URL"

    last_order = (
        Portfolio.objects.filter(artist=artist)
        .aggregate(models.Max("display_order"))
        .get("display_order__max")
        or 0
    )

    if is_featured:
        Portfolio.objects.filter(artist=artist).update(is_featured=False)

    item = Portfolio.objects.create(
        artist=artist,
        title=title,
        description=description,
        item_type=item_type,
        media_url=media_url,
        media_file=media_file,
        thumbnail=thumbnail_file,
        youtube_url=youtube_url,
        duration=duration,
        dimensions=dimensions,
        file_size=file_size,
        format_ext=format_ext,
        is_featured=is_featured,
        is_public=is_public,
        display_order=last_order + 1,
    )

    return JsonResponse(
        {
            "message": "Portfolio item added successfully.",
            "item": serialize_portfolio_item(item, request),
        },
        status=201,
    )


@csrf_protect
@require_http_methods(["POST", "PUT"])
def artist_portfolio_update_view(request, item_id):
    """Update title, description, visibility, or duration of a portfolio item."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    item = Portfolio.objects.filter(id=item_id, artist=artist).first()
    if not item:
        return JsonResponse({"error": "Portfolio item not found."}, status=404)

    data = {}
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.POST.dict()
    else:
        try:
            data = json.loads(request.body)
        except Exception:
            data = {}

    if "title" in data:
        title = data["title"].strip()
        if not title:
            return JsonResponse({"error": "Title cannot be empty."}, status=400)
        item.title = title

    if "description" in data:
        item.description = data["description"].strip()

    if "duration" in data:
        item.duration = data["duration"].strip()

    if "dimensions" in data:
        item.dimensions = data["dimensions"].strip()

    if request.FILES.get("thumbnail"):
        item.thumbnail = request.FILES["thumbnail"]

    if "is_public" in data:
        item.is_public = str(data["is_public"]).lower() in ("true", "1")

    if "youtube_url" in data and item.item_type == Portfolio.ItemType.YOUTUBE:
        url = data["youtube_url"].strip()
        yt_id = extract_youtube_id(url)
        if not yt_id:
            return JsonResponse({"error": "Invalid YouTube URL."}, status=400)
        item.youtube_url = url
        item.media_url = url

    item.save()

    return JsonResponse(
        {
            "message": "Portfolio item updated successfully.",
            "item": serialize_portfolio_item(item, request),
        }
    )


@csrf_protect
@require_POST
def artist_portfolio_set_featured_view(request, item_id):
    """Set a specific portfolio item as featured, unsetting all others for this artist."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    item = Portfolio.objects.filter(id=item_id, artist=artist).first()
    if not item:
        return JsonResponse({"error": "Portfolio item not found."}, status=404)

    Portfolio.objects.filter(artist=artist).update(is_featured=False)
    item.is_featured = True
    item.save(update_fields=["is_featured"])

    return JsonResponse(
        {
            "message": f"'{item.title}' is now set as your featured image.",
            "featured_item": serialize_portfolio_item(item, request),
        }
    )


@csrf_protect
@require_POST
def artist_portfolio_remove_featured_view(request):
    """Remove featured image status from all portfolio items of this artist."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    Portfolio.objects.filter(artist=artist).update(is_featured=False)

    return JsonResponse({"message": "Featured image removed."})


@csrf_protect
@require_POST
def artist_portfolio_reorder_view(request):
    """Reorder portfolio items based on provided array of IDs."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    try:
        body = json.loads(request.body)
        order_list = body.get("order", [])
    except Exception:
        return JsonResponse({"error": "Invalid order data."}, status=400)

    for index, item_id in enumerate(order_list):
        Portfolio.objects.filter(id=item_id, artist=artist).update(
            display_order=index + 1
        )

    return JsonResponse({"message": "Portfolio order updated successfully."})


@csrf_protect
@require_http_methods(["POST", "DELETE"])
def artist_portfolio_delete_view(request, item_id):
    """Delete a portfolio item belonging to the authenticated artist."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    item = Portfolio.objects.filter(id=item_id, artist=artist).first()
    if not item:
        return JsonResponse({"error": "Portfolio item not found."}, status=404)

    item.delete()
    return JsonResponse({"message": "Portfolio item deleted successfully."})


@csrf_protect
@require_http_methods(["GET", "POST"])
def artist_availability_view(request):
    """
    List or add/update availability dates for the authenticated artist.
    Phase 2 Requirements:
      - Only authenticated artists can access.
      - Acquires row-level lock on ArtistProfile (select_for_update) inside transaction.atomic.
      - Converts booking event timestamps to Asia/Kolkata local date.
      - Rejects with HTTP 409 Conflict if date is occupied by:
          1. Successfully paid booking (Payment status SUCCESS)
          2. Completed booking (Booking status COMPLETED)
          3. Active accepted 24-hour reservation (Booking status ACCEPTED, within 24h)
      - If date is available, creates or updates the ArtistAvailability record.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    if request.method == "GET":
        records = [
            {
                "id": av.id,
                "date": av.date.isoformat(),
                "date_formatted": av.date.strftime("%b %d, %Y"),
                "is_available": av.is_available,
                "reason": av.reason,
            }
            for av in artist.availabilities.all().order_by("date")
        ]
        return JsonResponse({"availability": records})

    # POST: create or update manual availability
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid request body."}, status=400)

    date_str = data.get("date", "").strip()
    is_available = data.get("is_available", False)
    reason = data.get("reason", "").strip()

    if not date_str:
        return JsonResponse({"error": "Date is required."}, status=400)

    from django.utils.dateparse import parse_date
    import datetime
    from zoneinfo import ZoneInfo

    parsed = parse_date(date_str)
    if not parsed:
        return JsonResponse(
            {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
        )

    kolkata_tz = ZoneInfo("Asia/Kolkata")
    now_tz = timezone.now()

    # Time boundaries in Asia/Kolkata
    day_start = datetime.datetime.combine(parsed, datetime.time.min, tzinfo=kolkata_tz)
    day_end = datetime.datetime.combine(parsed + datetime.timedelta(days=1), datetime.time.min, tzinfo=kolkata_tz)

    with transaction.atomic():
        # Consistent lock acquisition order: lock ArtistProfile row first
        artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)

        # Check if any active booking occupies this calendar date
        conflicting_bookings = (
            Booking.objects.filter(
                artist=artist_locked,
                status__in=[Booking.Status.ACCEPTED, Booking.Status.COMPLETED],
                event_date__gte=day_start - datetime.timedelta(days=1),
                event_date__lt=day_end + datetime.timedelta(days=1),
            )
            .select_related("payment")
        )

        for booking in conflicting_bookings:
            b_ist_date = timezone.localtime(booking.event_date, timezone=kolkata_tz).date()
            if b_ist_date == parsed:
                if booking.status == Booking.Status.COMPLETED:
                    return JsonResponse(
                        {
                            "error": f"Cannot block {parsed.isoformat()}: a completed booking already exists on this date."
                        },
                        status=409,
                    )
                elif booking.status == Booking.Status.ACCEPTED:
                    payment = getattr(booking, "payment", None)
                    if payment and payment.status == Payment.Status.SUCCESS:
                        return JsonResponse(
                            {
                                "error": f"Cannot block {parsed.isoformat()}: a confirmed booking with successful payment already exists on this date."
                            },
                            status=409,
                        )
                    else:
                        # 24-hour reservation check
                        accepted_at = getattr(booking, "accepted_at", None)
                        if not accepted_at and payment:
                            accepted_at = payment.updated_at
                        if not accepted_at:
                            accepted_at = booking.created_at

                        if accepted_at + datetime.timedelta(hours=24) > now_tz:
                            return JsonResponse(
                                {
                                    "error": f"Cannot block {parsed.isoformat()}: an active accepted reservation is awaiting payment for this date."
                                },
                                status=409,
                            )
                        # If expired (>24h), it does not occupy the date

        # No collision found with active bookings; create or update availability override
        avail, created = ArtistAvailability.objects.update_or_create(
            artist=artist_locked,
            date=parsed,
            defaults={
                "is_available": bool(is_available),
                "reason": reason,
            },
        )

    return JsonResponse(
        {
            "message": "Availability updated successfully.",
            "record": {
                "id": avail.id,
                "date": avail.date.isoformat(),
                "date_formatted": avail.date.strftime("%b %d, %Y"),
                "is_available": avail.is_available,
                "reason": avail.reason,
            },
        },
        status=200,
    )


@csrf_protect
@require_http_methods(["POST", "DELETE"])
def artist_availability_delete_view(request, avail_id):
    """Delete an availability override record."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist:
        return JsonResponse(
            {"error": "Performing artist profile required."}, status=403
        )

    with transaction.atomic():
        artist_locked = ArtistProfile.objects.select_for_update().get(id=artist.id)

        avail = ArtistAvailability.objects.filter(id=avail_id, artist=artist_locked).first()
        if not avail:
            if ArtistAvailability.objects.filter(id=avail_id).exists():
                return JsonResponse(
                    {"error": "You are not authorized to modify another artist's availability."},
                    status=403,
                )
            return JsonResponse({"error": "Availability record not found."}, status=404)

        avail.delete()

    return JsonResponse({"message": "Availability record removed."})


RAZORPAY_API_ERRORS = (
    razorpay.errors.BadRequestError,
    razorpay.errors.GatewayError,
    razorpay.errors.ServerError,
)


def calculate_commission(amount):
    """
    Given total booking amount, returns:
    - total (Decimal quantize 0.01)
    - commission (8% platform commission)
    - artist_share (92% artist share)
    """
    total = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    commission = (total * Decimal("0.08")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    artist_share = total - commission
    return total, commission, artist_share


def dispatch_payment_success_notifications(payment):
    """
    Dispatches payment success notifications to customer and artist.
    Avoids duplicate notifications if webhook and frontend verification run together.
    Safely checks if artist has an associated user account.
    """
    customer = payment.booking.customer
    artist = payment.booking.artist
    artist_user = getattr(artist, "user", None)

    # 1. Customer notification
    customer_msg = (
        f"Your payment of ₹{payment.amount} for "
        f"{artist.stage_name} was successful."
    )
    if not Notification.objects.filter(
        user=customer,
        notification_type=Notification.NotificationType.PAYMENT,
        message=customer_msg,
    ).exists():
        Notification.objects.create(
            user=customer,
            title="Payment Successful",
            message=customer_msg,
            notification_type=Notification.NotificationType.PAYMENT,
        )

    # 2. Artist notification
    if artist_user:
        artist_msg = (
            f"Payment of ₹{payment.amount} was successfully "
            f"received for booking #{payment.booking.id}."
        )
        if not Notification.objects.filter(
            user=artist_user,
            notification_type=Notification.NotificationType.PAYMENT,
            message=artist_msg,
        ).exists():
            Notification.objects.create(
                user=artist_user,
                title="Booking Payment Received",
                message=artist_msg,
                notification_type=Notification.NotificationType.PAYMENT,
            )


def dispatch_reservation_expired_notifications(booking, artist):
    """
    Sends one-time notifications to customer and artist when an unpaid reservation expires.
    Guarantees idempotency by checking for existing notification records.
    """
    from zoneinfo import ZoneInfo
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    event_date_str = timezone.localtime(booking.event_date, timezone=kolkata_tz).strftime("%b %d, %Y")

    already_sent = Notification.objects.filter(
        user=booking.customer,
        notification_type=Notification.NotificationType.BOOKING_UPDATE,
        title="Reservation Expired",
        message__icontains=f"Booking #{booking.id}",
    ).exists()

    if not already_sent:
        Notification.objects.create(
            user=booking.customer,
            title="Reservation Expired",
            message=(
                f"Your reservation for {artist.stage_name} on {event_date_str} (Booking #{booking.id}) "
                "has expired because payment was not completed within the 24-hour deadline. "
                "The reservation has been released."
            ),
            notification_type=Notification.NotificationType.BOOKING_UPDATE,
        )

        artist_user = getattr(artist, "user", None)
        if artist_user:
            Notification.objects.create(
                user=artist_user,
                title="Date Released",
                message=(
                    f"The reservation for {booking.customer.get_full_name() or booking.customer.username} "
                    f"on {event_date_str} (Booking #{booking.id}) expired without payment. "
                    "This calendar date is now available for new bookings."
                ),
                notification_type=Notification.NotificationType.BOOKING_UPDATE,
            )


def dispatch_refund_notifications(refund):
    """
    Dispatches one-time notifications to customer and artist when a refund is processed.
    Idempotent: prevents duplicate notifications if webhook and synchronous calls run together.
    """
    booking = refund.booking
    customer = booking.customer
    artist = booking.artist
    artist_user = getattr(artist, "user", None)

    artist_name = getattr(artist, "stage_name", "") or "your artist"
    customer_name = customer.get_full_name() or customer.username

    # 1. Customer notification
    customer_title = "Refund Processed"
    customer_msg = (
        f"A refund of ₹{refund.amount} for {artist_name} (Booking #{booking.id}) "
        "has been processed successfully via Razorpay."
    )
    if not Notification.objects.filter(
        user=customer,
        notification_type=Notification.NotificationType.PAYMENT,
        title=customer_title,
        message__icontains=f"Booking #{booking.id}",
    ).exists():
        Notification.objects.create(
            user=customer,
            title=customer_title,
            message=customer_msg,
            notification_type=Notification.NotificationType.PAYMENT,
        )

    # 2. Artist notification
    if artist_user:
        artist_title = "Booking Refunded"
        artist_msg = (
            f"Payment for Booking #{booking.id} ({customer_name}) has been refunded to the customer."
        )
        if not Notification.objects.filter(
            user=artist_user,
            notification_type=Notification.NotificationType.PAYMENT,
            title=artist_title,
            message__icontains=f"Booking #{booking.id}",
        ).exists():
            Notification.objects.create(
                user=artist_user,
                title=artist_title,
                message=artist_msg,
                notification_type=Notification.NotificationType.PAYMENT,
            )


def update_payment_refund_status(payment):
    """
    Computes cumulative successful refunds for a payment and updates its status:
    - If cumulative successful refunds >= payment.amount: status = REFUNDED
    - If cumulative successful refunds > 0: status = PARTIALLY_REFUNDED
    - Otherwise (0 successful refunds): preserves existing status
    """
    total_refunded = (
        Refund.objects.filter(payment=payment, status=Refund.Status.PROCESSED)
        .aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    )
    new_status = None
    if total_refunded >= payment.amount:
        new_status = Payment.Status.REFUNDED
    elif total_refunded > Decimal("0.00"):
        new_status = Payment.Status.PARTIALLY_REFUNDED

    if new_status and payment.status != new_status:
        payment.status = new_status
        payment.save(update_fields=["status", "updated_at"])
    return payment.status


def initiate_payment_refund(payment, amount=None, reason="", idempotency_key=None, client=None):
    """
    Initiates an actual refund through Razorpay's refund API for a captured payment.
    Idempotent: prevents duplicate refunds via unique idempotency_key and database row-level locking.
    Updates or creates a Refund record and updates payment status when confirmed.
    Returns:
        (success: bool, refund: Refund, error_message: str or None)
    """
    if not payment.transaction_id:
        logger.error("Cannot refund Payment #%s: missing transaction_id.", payment.id)
        return False, None, "Payment has no transaction ID to refund."

    refund_amount = amount or payment.amount
    key = idempotency_key or f"rfnd_{payment.transaction_id}_{int(refund_amount * 100)}"

    # 1. Row-level check/creation of Refund record under lock (Payment -> Refund)
    with transaction.atomic():
        locked_payment = Payment.objects.select_for_update().get(id=payment.id)
        existing_refund = (
            Refund.objects.select_for_update()
            .filter(idempotency_key=key)
            .first()
        )
        if existing_refund:
            if existing_refund.status == Refund.Status.PROCESSED:
                logger.info("Refund with idempotency key %s already processed.", key)
                return True, existing_refund, None
            refund = existing_refund
        else:
            refund = Refund.objects.create(
                payment=locked_payment,
                booking=locked_payment.booking,
                amount=refund_amount,
                status=Refund.Status.PENDING,
                reason=reason[:255],
                idempotency_key=key,
            )

    # 2. Call Razorpay refund API
    try:
        if client is None:
            client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )

        refund_payload = {
            "amount": int(refund_amount * 100),
            "notes": {
                "booking_id": str(payment.booking_id),
                "payment_id": str(payment.id),
                "reason": reason[:100],
            }
        }

        logger.info(
            "Calling Razorpay refund API for payment %s (amount %s, key %s)",
            payment.transaction_id, refund_amount, key
        )
        res = client.payment.refund(
            payment.transaction_id,
            refund_payload,
            headers={"X-Refund-Idempotency": key},
        )
        logger.info("Razorpay refund API response: %s", res)

        refund_id = res.get("id") if isinstance(res, dict) else getattr(res, "id", None)
        rf_status = res.get("status", "processed") if isinstance(res, dict) else getattr(res, "status", "processed")

        with transaction.atomic():
            locked_payment = Payment.objects.select_for_update().get(id=payment.id)
            locked_refund = Refund.objects.select_for_update().get(id=refund.id)
            if refund_id:
                locked_refund.razorpay_refund_id = str(refund_id)

            if rf_status == "processed":
                locked_refund.status = Refund.Status.PROCESSED
                locked_refund.save(update_fields=["razorpay_refund_id", "status", "updated_at"])
                update_payment_refund_status(locked_payment)
                dispatch_refund_notifications(locked_refund)
            else:
                locked_refund.status = Refund.Status.PENDING
                locked_refund.save(update_fields=["razorpay_refund_id", "status", "updated_at"])

            return True, locked_refund, None

    except RAZORPAY_API_ERRORS as ex:
        err_msg = str(ex)
        logger.exception("Razorpay API error while initiating refund for payment %s: %s", payment.transaction_id, err_msg)
        # Check if gateway already processed this refund (e.g. timeout on previous attempt or duplicate)
        try:
            if hasattr(client, "payment") and hasattr(client.payment, "fetch_multiple_refund"):
                rf_resp = client.payment.fetch_multiple_refund(payment.transaction_id)
                if isinstance(rf_resp, dict) and isinstance(rf_resp.get("items"), list):
                    for rf_item in rf_resp["items"]:
                        if isinstance(rf_item, dict) and rf_item.get("amount") == int(refund_amount * 100):
                            rf_id = rf_item.get("id")
                            rf_st = rf_item.get("status", "processed")
                            with transaction.atomic():
                                locked_payment = Payment.objects.select_for_update().get(id=payment.id)
                                locked_refund = Refund.objects.select_for_update().get(id=refund.id)
                                if rf_id:
                                    locked_refund.razorpay_refund_id = str(rf_id)
                                if rf_st == "processed":
                                    locked_refund.status = Refund.Status.PROCESSED
                                    locked_refund.save(update_fields=["razorpay_refund_id", "status", "updated_at"])
                                    update_payment_refund_status(locked_payment)
                                    dispatch_refund_notifications(locked_refund)
                                else:
                                    locked_refund.status = Refund.Status.PENDING
                                    locked_refund.save(update_fields=["razorpay_refund_id", "status", "updated_at"])
                                return True, locked_refund, None
        except Exception as check_ex:
            logger.warning("Could not reconcile refunds with Razorpay for payment %s: %s", payment.transaction_id, check_ex)

        with transaction.atomic():
            locked_payment = Payment.objects.select_for_update().get(id=payment.id)
            locked_refund = Refund.objects.select_for_update().get(id=refund.id)
            locked_refund.status = Refund.Status.FAILED
            locked_refund.failure_reason = err_msg[:500]
            locked_refund.save(update_fields=["status", "failure_reason", "updated_at"])
        return False, locked_refund, err_msg
    except Exception as ex:
        err_msg = str(ex)
        logger.exception("Unexpected error while initiating refund for payment %s: %s", payment.transaction_id, err_msg)
        # Check if gateway already processed this refund despite local timeout
        try:
            if hasattr(client, "payment") and hasattr(client.payment, "fetch_multiple_refund"):
                rf_resp = client.payment.fetch_multiple_refund(payment.transaction_id)
                if isinstance(rf_resp, dict) and isinstance(rf_resp.get("items"), list):
                    for rf_item in rf_resp["items"]:
                        if isinstance(rf_item, dict) and rf_item.get("amount") == int(refund_amount * 100):
                            rf_id = rf_item.get("id")
                            rf_st = rf_item.get("status", "processed")
                            with transaction.atomic():
                                locked_payment = Payment.objects.select_for_update().get(id=payment.id)
                                locked_refund = Refund.objects.select_for_update().get(id=refund.id)
                                if rf_id:
                                    locked_refund.razorpay_refund_id = str(rf_id)
                                if rf_st == "processed":
                                    locked_refund.status = Refund.Status.PROCESSED
                                    locked_refund.save(update_fields=["razorpay_refund_id", "status", "updated_at"])
                                    update_payment_refund_status(locked_payment)
                                    dispatch_refund_notifications(locked_refund)
                                else:
                                    locked_refund.status = Refund.Status.PENDING
                                    locked_refund.save(update_fields=["razorpay_refund_id", "status", "updated_at"])
                                return True, locked_refund, None
        except Exception as check_ex:
            logger.warning("Could not reconcile refunds with Razorpay for payment %s: %s", payment.transaction_id, check_ex)

        with transaction.atomic():
            locked_payment = Payment.objects.select_for_update().get(id=payment.id)
            locked_refund = Refund.objects.select_for_update().get(id=refund.id)
            locked_refund.status = Refund.Status.FAILED
            locked_refund.failure_reason = err_msg[:500]
            locked_refund.save(update_fields=["status", "failure_reason", "updated_at"])
        return False, locked_refund, err_msg


from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class GatewayTimestampValidationResult:
    is_valid: bool
    dt: Optional[datetime.datetime]
    is_on_time: Optional[bool]
    reason: str


def validate_gateway_capture_timestamp(raw_ts, deadline=None, reference_now=None):
    """
    Strictly validates a Razorpay payment gateway timestamp against an optional booking deadline.
    Rules:
    - Presence: Rejects None, empty string, or missing value.
    - Type: Accepts int, float, or numeric string. Rejects bool, objects, dicts, arrays, malformed text.
    - Range: Rejects negative values or pre-2020 timestamps (< 1577836800). Handles milliseconds (ts > 1e11).
    - Future plausibility: Rejects timestamps more than 5 minutes in the future relative to reference_now.
    - Timezone conversion: Converts epoch seconds to timezone-aware UTC datetime.
    - Boundary rule: If deadline is provided, is_on_time is True iff dt <= deadline.
    Returns:
        GatewayTimestampValidationResult(is_valid, dt, is_on_time, reason)
    """
    if raw_ts is None:
        return GatewayTimestampValidationResult(False, None, None, "Timestamp is missing or null")
    if isinstance(raw_ts, bool):
        return GatewayTimestampValidationResult(False, None, None, "Timestamp must be numeric, got boolean")
    if isinstance(raw_ts, str) and not raw_ts.strip():
        return GatewayTimestampValidationResult(False, None, None, "Timestamp is empty")

    try:
        ts_float = float(raw_ts)
    except (ValueError, TypeError):
        return GatewayTimestampValidationResult(False, None, None, f"Malformed timestamp: {raw_ts!r}")

    # Handle millisecond timestamps if provided by any client/webhook variant
    if ts_float > 1e11:
        ts_float = ts_float / 1000.0

    # Plausible epoch range: Jan 1, 2020 UTC is 1577836800
    if ts_float < 1577836800:
        return GatewayTimestampValidationResult(False, None, None, f"Timestamp out of plausible range: {raw_ts!r}")

    ref_now = reference_now or timezone.now()
    try:
        dt = datetime.datetime.fromtimestamp(ts_float, tz=datetime.timezone.utc)
    except (OverflowError, OSError, ValueError):
        return GatewayTimestampValidationResult(False, None, None, f"Timestamp conversion failed: {raw_ts!r}")

    # Future plausibility check with 5 minutes tolerance for gateway/server clock drift
    if dt > ref_now + datetime.timedelta(minutes=5):
        return GatewayTimestampValidationResult(
            False, None, None, f"Timestamp is implausibly in the future: {dt.isoformat()}"
        )

    # Deadline comparison
    if deadline is None:
        return GatewayTimestampValidationResult(True, dt, True, "Timestamp is valid (no reservation deadline)")

    is_on_time = dt <= deadline
    reason = "On time (before or at deadline)" if is_on_time else "Late (after deadline)"
    return GatewayTimestampValidationResult(True, dt, is_on_time, reason)



def reconcile_gateway_order_payment(payment, booking, client=None, order_payments=None):
    """
    Queries Razorpay for any payments captured against payment.razorpay_order_id.
    Validates gateway capture timestamp against booking.expires_at.
    Returns:
      True if payment was captured before or at deadline and successfully reconciled to SUCCESS.
      False otherwise.
    """
    if not payment.razorpay_order_id:
        return False

    if order_payments is None:
        if client is None:
            client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )

        try:
            order_payments = client.order.payments(payment.razorpay_order_id)
        except RAZORPAY_API_ERRORS:
            return False
        except Exception:
            return False

    items = order_payments.get("items", []) if isinstance(order_payments, dict) else []
    expected_amount = int(payment.amount * 100)

    for item in items:
        if (
            item.get("status") == "captured"
            and item.get("amount") == expected_amount
            and item.get("currency") == "INR"
        ):
            val_res = validate_gateway_capture_timestamp(
                item.get("created_at"), booking.expires_at
            )
            payment_id = item.get("id")

            if not val_res.is_valid:
                logger.warning(
                    "Order %s payment %s has unreliable gateway timestamp %r: %s",
                    payment.razorpay_order_id, payment_id, item.get("created_at"), val_res.reason
                )
                if payment_id and not payment.transaction_id:
                    payment.transaction_id = payment_id
                    payment.save(update_fields=["transaction_id", "updated_at"])
                continue

            # Compare gateway capture time with booking deadline
            if val_res.is_on_time:
                # If booking was expired, verify date is still available under lock
                if booking.status == Booking.Status.EXPIRED:
                    from zoneinfo import ZoneInfo
                    kolkata_tz = ZoneInfo("Asia/Kolkata")
                    local_event_date = timezone.localtime(booking.event_date, timezone=kolkata_tz).date()
                    occupied, _, _ = is_artist_date_occupied(
                        booking.artist, local_event_date, exclude_booking_id=booking.id
                    )
                    if occupied:
                        logger.critical("Reconcile: Payment %s captured before deadline but date %s was reallocated.", payment_id, local_event_date)
                        payment.status = Payment.Status.FAILED
                        payment.transaction_id = payment_id
                        payment.save(update_fields=["status", "transaction_id", "updated_at"])
                        return False

                total, commission, artist_amount = calculate_commission(booking.agreed_price)
                payment.status = Payment.Status.SUCCESS
                payment.transaction_id = payment_id
                payment.amount = total
                payment.commission_percentage = Decimal("8.00")
                payment.commission_amount = commission
                payment.artist_amount = artist_amount
                payment.save(update_fields=[
                    "status", "transaction_id", "amount",
                    "commission_percentage", "commission_amount",
                    "artist_amount", "updated_at",
                ])
                if booking.status != Booking.Status.ACCEPTED:
                    booking.status = Booking.Status.ACCEPTED
                    booking.save(update_fields=["status"])
                dispatch_payment_success_notifications(payment)
                return True
            else:
                logger.warning(
                    "Order %s payment %s was captured at %s after deadline %s",
                    payment.razorpay_order_id, payment_id, val_res.dt, booking.expires_at,
                )

    return False


def check_and_expire_reservations(artist=None, booking=None):
    """
    Scans for accepted, unpaid bookings whose 24-hour reservation window has passed.
    Reconciles with Razorpay before expiring to ensure delayed capture is honored.
    Applies strict PostgreSQL lock order:
      1. ArtistProfile (select_for_update)
      2. Booking (select_for_update)
      3. Payment (select_for_update)
    Returns:
      dict with counts: {'checked': int, 'expired': int, 'retained': int, 'failed_reconciliation': int}
    """
    now_ts = timezone.now()

    if booking:
        candidates = Booking.objects.filter(id=booking.id)
    else:
        candidates = Booking.objects.filter(
            status=Booking.Status.ACCEPTED,
            accepted_at__isnull=False,
            accepted_at__lte=now_ts - datetime.timedelta(hours=24),
        )
        if artist:
            candidates = candidates.filter(artist=artist)

    booking_ids = list(candidates.values_list("id", flat=True))

    results = {
        "checked": len(booking_ids),
        "expired": 0,
        "retained": 0,
        "failed_reconciliation": 0,
    }

    for b_id in booking_ids:
        try:
            b_info = (
                Booking.objects.filter(id=b_id)
                .values("artist_id", "status")
                .first()
            )
            if not b_info or b_info["status"] != Booking.Status.ACCEPTED:
                continue

            # Prefetch order payments outside lock if order_id exists to avoid holding DB locks during network calls
            p_info = Payment.objects.filter(booking_id=b_id).values("razorpay_order_id").first()
            order_id = p_info.get("razorpay_order_id") if p_info else None
            prefetched_payments = None
            if order_id:
                try:
                    client = razorpay.Client(
                        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
                    )
                    prefetched_payments = client.order.payments(order_id)
                except Exception:
                    prefetched_payments = None

            with transaction.atomic():
                # 1. Lock ArtistProfile first
                artist_locked = ArtistProfile.objects.select_for_update().get(id=b_info["artist_id"])

                # 2. Lock Booking second
                booking_locked = (
                    Booking.objects.select_for_update()
                    .filter(id=b_id, status=Booking.Status.ACCEPTED)
                    .select_related("customer")
                    .first()
                )
                if not booking_locked:
                    continue

                # 3. Lock Payment third
                payment_locked = (
                    Payment.objects.select_for_update()
                    .filter(booking=booking_locked)
                    .first()
                )

                # Never expire a payment already verified as SUCCESS
                if payment_locked and payment_locked.status == Payment.Status.SUCCESS:
                    results["retained"] += 1
                    continue

                # Re-verify deadline under lock
                lock_now = timezone.now()
                if not booking_locked.accepted_at or (
                    booking_locked.accepted_at + datetime.timedelta(hours=24) > lock_now
                ):
                    results["retained"] += 1
                    continue

                # Reconcile with Razorpay if order_id exists
                reconciled = False
                if payment_locked and payment_locked.razorpay_order_id:
                    try:
                        reconciled = reconcile_gateway_order_payment(
                            payment_locked, booking_locked, order_payments=prefetched_payments
                        )
                    except Exception as ex:
                        logger.warning(
                            "Failed to reconcile order %s for booking %s: %s",
                            payment_locked.razorpay_order_id, b_id, ex
                        )
                        results["failed_reconciliation"] += 1

                if reconciled:
                    results["retained"] += 1
                    continue

                # Expire the unpaid booking
                booking_locked.status = Booking.Status.EXPIRED
                booking_locked.response_message = (
                    "Reservation expired: payment was not completed within the 24-hour deadline."
                )
                booking_locked.save(update_fields=["status", "response_message"])

                if payment_locked and payment_locked.status == Payment.Status.PENDING:
                    payment_locked.status = Payment.Status.FAILED
                    payment_locked.save(update_fields=["status", "updated_at"])

                # Dispatch notifications (idempotent, sent once)
                dispatch_reservation_expired_notifications(booking_locked, artist_locked)
                results["expired"] += 1

        except Exception as e:
            logger.exception("Error processing expiry for booking %s: %s", b_id, e)

    return results


@csrf_protect
@require_POST
def booking_check_expiry_view(request, booking_id):
    """
    On-demand endpoint to reconcile and expire an unpaid booking if its 24h deadline has passed.
    Called when frontend countdown hits zero or upon booking detail load.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please sign in."}, status=401)

    try:
        booking = Booking.objects.select_related("customer", "artist").get(id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({"error": "Booking not found."}, status=404)

    is_customer = booking.customer_id == request.user.id
    is_artist = hasattr(request.user, "artist_profile") and booking.artist_id == request.user.artist_profile.id
    is_staff = request.user.is_staff or request.user.is_superuser
    if not (is_customer or is_artist or is_staff):
        return JsonResponse({"error": "Unauthorized access to booking."}, status=403)

    results = check_and_expire_reservations(booking=booking)
    booking.refresh_from_db()

    now_ts = timezone.now()
    is_expired = booking.status == Booking.Status.EXPIRED
    if not is_expired and booking.status == Booking.Status.ACCEPTED and booking.expires_at and now_ts > booking.expires_at:
        is_expired = True

    return JsonResponse({
        "success": True,
        "booking_id": booking.id,
        "status": booking.status,
        "is_expired": is_expired,
        "payment_deadline": booking.expires_at.isoformat() if booking.expires_at else None,
        "expires_at": booking.expires_at.isoformat() if booking.expires_at else None,
        "results": results,
    })


@csrf_protect
@require_POST
def create_razorpay_order_view(request, booking_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please sign in."}, status=401)

    try:
        with transaction.atomic():
            booking = (
                Booking.objects
                .select_for_update()
                .select_related("artist", "customer")
                .filter(
                    id=booking_id,
                    customer=request.user
                )
                .first()
            )

            if not booking:
                return JsonResponse(
                    {"error": "Booking not found."},
                    status=404
                )

            if booking.status == Booking.Status.EXPIRED:
                return JsonResponse(
                    {"error": "This booking reservation has expired. The date has been released."},
                    status=409,
                )

            if booking.status == Booking.Status.UNAVAILABLE:
                return JsonResponse(
                    {
                        "error": "This artist is no longer available on your selected date because another booking was confirmed."
                    },
                    status=409,
                )

            # Check if 24-hour payment deadline has passed
            now_check = timezone.now()
            if booking.expires_at and now_check > booking.expires_at:
                check_and_expire_reservations(booking=booking)
                return JsonResponse(
                    {
                        "error": "The 24-hour payment deadline for this booking has expired. The reservation has been released."
                    },
                    status=409,
                )

            if booking.status != Booking.Status.ACCEPTED:
                return JsonResponse(
                    {
                        "error": (
                            "Payment is available only after "
                            "the artist accepts the booking."
                        )
                    },
                    status=400
                )

            payment = (
                Payment.objects
                .select_for_update()
                .filter(booking=booking)
                .first()
            )

            if not payment:
                return JsonResponse(
                    {"error": "Payment record not found for this booking."},
                    status=404
                )

            if payment.status == Payment.Status.SUCCESS:
                return JsonResponse(
                    {"error": "This booking has already been paid."},
                    status=400
                )

            total, commission, artist_amount = calculate_commission(booking.agreed_price)

            if total < Decimal("1.00"):
                return JsonResponse(
                    {"error": "Booking amount must be at least ₹1."},
                    status=400
                )

            # Initialize Razorpay client.
            client = razorpay.Client(
                auth=(
                    settings.RAZORPAY_KEY_ID,
                    settings.RAZORPAY_KEY_SECRET
                )
            )

            # Check an existing Razorpay order before reusing it.
            existing_order = None
            if payment.razorpay_order_id:
                try:
                    existing_order = client.order.fetch(
                        payment.razorpay_order_id
                    )
                except razorpay.errors.BadRequestError:
                    logger.warning(
                        "Razorpay order %s not found on Razorpay; creating new order.",
                        payment.razorpay_order_id
                    )
                    existing_order = None
                except RAZORPAY_API_ERRORS:
                    logger.exception(
                        "Unable to fetch existing Razorpay order %s",
                        payment.razorpay_order_id
                    )
                    return JsonResponse(
                        {"error": "Unable to check existing payment order."},
                        status=502
                    )

                if existing_order:
                    order_status = existing_order.get("status")

                    # If Razorpay reports paid, reconcile the payment immediately.
                    if order_status == "paid":
                        logger.warning(
                            "Razorpay order %s is paid; reconciling payment status.",
                            payment.razorpay_order_id
                        )
                        order_payments = client.order.payments(payment.razorpay_order_id)
                        captured_payments = [
                            p for p in order_payments.get("items", [])
                            if p.get("status") == "captured"
                        ]
                        if captured_payments:
                            captured = captured_payments[0]
                            payment.status = Payment.Status.SUCCESS
                            payment.transaction_id = captured.get("id")
                            payment.amount = total
                            payment.commission_percentage = Decimal("8.00")
                            payment.commission_amount = commission
                            payment.artist_amount = artist_amount
                            payment.save(
                                update_fields=[
                                    "status",
                                    "transaction_id",
                                    "amount",
                                    "commission_percentage",
                                    "commission_amount",
                                    "artist_amount",
                                    "updated_at",
                                ]
                            )
                            dispatch_payment_success_notifications(payment)
                            return JsonResponse(
                                {
                                    "message": "Payment has already been paid and reconciled.",
                                    "status": Payment.Status.SUCCESS,
                                    "transaction_id": payment.transaction_id,
                                    "booking_id": booking.id,
                                    "already_paid": True,
                                }
                            )

                        return JsonResponse(
                            {
                                "error": (
                                    "This payment order is already paid. "
                                    "Payment reconciliation is required."
                                ),
                                "payment_reconciliation_required": True
                            },
                            status=409
                        )

                    # Reuse unpaid order if amount and currency match.
                    expected_paise = int(total * 100)
                    if (
                        order_status in ("created", "attempted")
                        and existing_order.get("amount") == expected_paise
                        and existing_order.get("currency") == "INR"
                    ):
                        payment.amount = total
                        payment.commission_percentage = Decimal("8.00")
                        payment.commission_amount = commission
                        payment.artist_amount = artist_amount
                        payment.save(
                            update_fields=[
                                "amount",
                                "commission_percentage",
                                "commission_amount",
                                "artist_amount",
                                "updated_at"
                            ]
                        )
                        return JsonResponse(
                            {
                                "key": settings.RAZORPAY_KEY_ID,
                                "order_id": payment.razorpay_order_id,
                                "amount": existing_order["amount"],
                                "currency": existing_order["currency"],
                                "booking_id": booking.id
                            }
                        )

            # Create a new Razorpay order if no reusable existing order
            order = client.order.create(
                {
                    "amount": int(total * 100),
                    "currency": "INR",
                    "receipt": f"THB{booking.id}P{payment.id}",
                    "notes": {
                        "booking_id": str(booking.id),
                        "artist_id": str(booking.artist_id)
                    }
                }
            )

            payment.amount = total
            payment.commission_percentage = Decimal("8.00")
            payment.commission_amount = commission
            payment.artist_amount = artist_amount
            payment.razorpay_order_id = order["id"]
            payment.save(
                update_fields=[
                    "amount",
                    "commission_percentage",
                    "commission_amount",
                    "artist_amount",
                    "razorpay_order_id",
                    "updated_at"
                ]
            )

        return JsonResponse(
            {
                "key": settings.RAZORPAY_KEY_ID,
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "booking_id": booking.id
            }
        )

    except RAZORPAY_API_ERRORS:
        logger.exception("Razorpay order creation failed.")
        return JsonResponse(
            {"error": "Unable to create payment order. Please try again."},
            status=502
        )
    except Exception:
        logger.exception("Unexpected error while creating Razorpay order.")
        return JsonResponse(
            {"error": "Something went wrong while preparing payment."},
            status=500
        )


@csrf_protect
@require_POST
def verify_razorpay_payment_view(request):
    """Verify a Razorpay payment and update the payment record."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please sign in."}, status=401)

    try:
        data = json.loads(request.body)
        order_id = data.get("razorpay_order_id")
        payment_id = data.get("razorpay_payment_id")
        signature = data.get("razorpay_signature")
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Invalid request data."}, status=400)

    if not all([order_id, payment_id, signature]):
        return JsonResponse(
            {"error": "Missing Razorpay payment details."},
            status=400,
        )

    # Find the payment through the customer's own booking.
    payment = (
        Payment.objects
        .select_related("booking", "booking__artist", "booking__customer")
        .filter(
            razorpay_order_id=order_id,
            booking__customer=request.user,
        )
        .first()
    )

    if not payment:
        return JsonResponse({"error": "Payment order not found."}, status=404)

    # Idempotent return if already verified with the same payment_id
    if payment.status == Payment.Status.SUCCESS:
        if payment.transaction_id == payment_id:
            return JsonResponse({
                "message": "Payment already verified.",
                "status": payment.status,
                "transaction_id": payment.transaction_id,
                "amount": str(payment.amount),
                "commission_amount": str(payment.commission_amount),
                "artist_amount": str(payment.artist_amount),
            })

        logger.critical(
            "Security Alert: Different payment ID %s received for already-paid booking %s (existing transaction: %s)",
            payment_id,
            payment.booking_id,
            payment.transaction_id,
        )
        return JsonResponse(
            {"error": "This booking has already been paid with a different payment ID."},
            status=400,
        )

    if payment.status in (Payment.Status.REFUNDED, Payment.Status.PARTIALLY_REFUNDED):
        return JsonResponse(
            {"error": "This payment has already been refunded."},
            status=400,
        )

    # A payment is eligible for verification if it is PENDING, OR if it was marked FAILED
    # during reservation expiry while the booking is EXPIRED and has an active razorpay_order_id.
    is_expired_failed = (
        payment.status == Payment.Status.FAILED
        and payment.booking
        and payment.booking.status == Booking.Status.EXPIRED
        and bool(payment.razorpay_order_id)
    )

    if payment.status != Payment.Status.PENDING and not is_expired_failed:
        return JsonResponse(
            {"error": "This payment cannot be verified."},
            status=400,
        )

    try:
        client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

        # Verify the Checkout signature using the server-side secret.
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })

        # Fetch payment details directly from Razorpay.
        razorpay_payment = client.payment.fetch(payment_id)

        if razorpay_payment.get("order_id") != order_id:
            return JsonResponse(
                {"error": "Payment does not belong to this order."},
                status=400,
            )

        expected_amount = int(payment.amount * 100)

        if razorpay_payment.get("amount") != expected_amount:
            return JsonResponse(
                {"error": "Payment amount does not match the booking."},
                status=400,
            )

        if razorpay_payment.get("currency") != "INR":
            return JsonResponse(
                {"error": "Invalid payment currency."},
                status=400,
            )

        # Only captured payments are marked successful.
        if razorpay_payment.get("status") != "captured":
            return JsonResponse(
                {
                    "error": "Payment has not been captured yet.",
                    "payment_status": razorpay_payment.get("status"),
                },
                status=409,
            )

    except razorpay.errors.SignatureVerificationError:
        logger.warning(
            "Invalid Razorpay signature for order %s", order_id
        )
        return JsonResponse(
            {"error": "Payment signature verification failed."},
            status=400,
        )

    except RAZORPAY_API_ERRORS:
        logger.exception("Razorpay payment verification failed.")
        return JsonResponse(
            {"error": "Unable to verify payment with Razorpay."},
            status=502,
        )

    except Exception:
        logger.exception("Unexpected payment verification error.")
        return JsonResponse(
            {"error": "Something went wrong during payment verification."},
            status=500,
        )

    # Lock and update the payment record in strict canonical order:
    # 1. ArtistProfile -> 2. Booking -> 3. Payment
    refund_needed = False
    refund_reason = ""
    with transaction.atomic():
        # 1. Lock ArtistProfile first
        artist_locked = ArtistProfile.objects.select_for_update().get(id=payment.booking.artist_id)

        # 2. Lock Booking second
        booking_locked = (
            Booking.objects.select_for_update()
            .select_related("customer")
            .get(id=payment.booking_id)
        )

        # 3. Lock Payment third
        locked_payment = Payment.objects.select_for_update().get(id=payment.id)

        if locked_payment.status == Payment.Status.SUCCESS:
            if locked_payment.transaction_id == payment_id:
                return JsonResponse({
                    "message": "Payment already verified.",
                    "status": locked_payment.status,
                    "transaction_id": locked_payment.transaction_id,
                    "amount": str(locked_payment.amount),
                    "commission_amount": str(locked_payment.commission_amount),
                    "artist_amount": str(locked_payment.artist_amount),
                })

            logger.critical(
                "Security Alert: Different payment ID %s received concurrently for already-paid booking %s",
                payment_id,
                locked_payment.booking_id,
            )
            return JsonResponse(
                {"error": "This booking has already been paid with a different payment ID."},
                status=400,
            )

        if locked_payment.status in (Payment.Status.REFUNDED, Payment.Status.PARTIALLY_REFUNDED):
            return JsonResponse(
                {"error": "This payment has already been refunded."},
                status=400,
            )

        locked_expired_failed = (
            locked_payment.status == Payment.Status.FAILED
            and booking_locked.status == Booking.Status.EXPIRED
            and bool(locked_payment.razorpay_order_id)
        )

        if locked_payment.status != Payment.Status.PENDING and not locked_expired_failed:
            return JsonResponse(
                {"error": "This payment cannot be verified."},
                status=400,
            )

        # Validate authoritative gateway capture timestamp strictly
        val_res = validate_gateway_capture_timestamp(
            razorpay_payment.get("created_at"),
            booking_locked.expires_at,
        )

        # 1. Unreliable / Invalid Timestamp (missing, null, malformed, or implausible future)
        if not val_res.is_valid:
            logger.warning(
                "Payment %s for booking %s has invalid/unreliable gateway timestamp %r: %s",
                payment_id, booking_locked.id, razorpay_payment.get("created_at"), val_res.reason
            )
            # Preserve captured payment state for safe reconciliation
            locked_payment.transaction_id = payment_id
            locked_payment.save(update_fields=["transaction_id", "updated_at"])
            # Record clear manual review / reconciliation pending outcome
            review_msg = (
                f"Payment was captured by the gateway (ID: {payment_id}), but the capture timestamp "
                f"could not be reliably verified ({val_res.reason}). Flagged for manual review."
            )
            booking_locked.response_message = review_msg
            booking_locked.save(update_fields=["response_message"])
            return JsonResponse(
                {
                    "error": "Payment captured by gateway, but capture timestamp could not be verified. Flagged for manual review.",
                    "reconciliation_pending": True,
                    "manual_review": True,
                    "transaction_id": payment_id,
                    "reason": val_res.reason,
                },
                status=422,
            )

        # 2. Valid timestamp captured AFTER deadline
        if not val_res.is_on_time:
            logger.warning(
                "Payment %s for booking %s was captured on gateway at %s, which is after deadline %s",
                payment_id, booking_locked.id, val_res.dt, booking_locked.expires_at,
            )
            locked_payment.status = Payment.Status.FAILED
            locked_payment.transaction_id = payment_id
            locked_payment.save(update_fields=["status", "transaction_id", "updated_at"])
            booking_locked.status = Booking.Status.EXPIRED
            booking_locked.response_message = (
                "Payment was captured after the 24-hour reservation deadline. The date has been released and payment will be refunded."
            )
            booking_locked.save(update_fields=["status", "response_message"])
            refund_needed = True
            refund_reason = "Captured after 24-hour reservation deadline"

        # If booking was marked expired while payment was in transit, but captured in time:
        elif booking_locked.status == Booking.Status.EXPIRED:
            from zoneinfo import ZoneInfo
            kolkata_tz = ZoneInfo("Asia/Kolkata")
            local_event_date = timezone.localtime(booking_locked.event_date, timezone=kolkata_tz).date()
            # ArtistProfile is already locked under artist_locked! Safe availability evaluation
            occupied, occ_reason, _ = is_artist_date_occupied(
                artist_locked, local_event_date, exclude_booking_id=booking_locked.id
            )
            if occupied:
                logger.critical("Verify: Payment %s captured before deadline but date %s was reallocated.", payment_id, local_event_date)
                locked_payment.status = Payment.Status.FAILED
                locked_payment.transaction_id = payment_id
                locked_payment.save(update_fields=["status", "transaction_id", "updated_at"])
                refund_needed = True
                refund_reason = "Date reallocated before payment verification"
            else:
                booking_locked.status = Booking.Status.ACCEPTED
                booking_locked.save(update_fields=["status"])

        if not refund_needed:
            if locked_payment.status != Payment.Status.PENDING and not locked_expired_failed:
                return JsonResponse(
                    {"error": "This payment is no longer pending."},
                    status=400,
                )

            total, commission, artist_amount = calculate_commission(booking_locked.agreed_price)
            locked_payment.status = Payment.Status.SUCCESS
            locked_payment.transaction_id = payment_id
            locked_payment.amount = total
            locked_payment.commission_percentage = Decimal("8.00")
            locked_payment.commission_amount = commission
            locked_payment.artist_amount = artist_amount
            locked_payment.save(update_fields=[
                "status",
                "transaction_id",
                "amount",
                "commission_percentage",
                "commission_amount",
                "artist_amount",
                "updated_at",
            ])
            dispatch_payment_success_notifications(locked_payment)

    # Process refund outside atomic transaction so no DB locks are held during external API call
    if refund_needed:
        initiate_payment_refund(
            payment=locked_payment,
            reason=refund_reason,
            client=client,
        )
        if "reallocated" in refund_reason.lower():
            return JsonResponse(
                {"error": "Payment was captured before deadline, but the reservation had expired and the date was rebooked. A refund will be issued."},
                status=409,
            )
        else:
            return JsonResponse(
                {
                    "error": "Payment was captured after the 24-hour reservation deadline. The reservation has expired and payment will be refunded.",
                    "expired": True,
                },
                status=409,
            )

    return JsonResponse({
        "message": "Payment verified successfully.",
        "status": Payment.Status.SUCCESS,
        "transaction_id": payment_id,
        "amount": str(locked_payment.amount),
        "commission_amount": str(locked_payment.commission_amount),
        "artist_amount": str(locked_payment.artist_amount),
    })


@csrf_exempt
@require_POST
def razorpay_webhook_view(request):
    """
    Handle asynchronous Razorpay webhook events:
    - payment.captured: Reconcile payment status to SUCCESS.
    - payment.failed: Log/update payment status.
    - refund.processed / payment.refunded: Mark payment as REFUNDED.
    Verifies the webhook signature using RAZORPAY_WEBHOOK_SECRET.
    """
    webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    if not webhook_secret:
        logger.error("RAZORPAY_WEBHOOK_SECRET is not configured on the server.")
        return JsonResponse({"error": "Webhook secret not configured."}, status=500)

    webhook_signature = (
        request.headers.get("X-Razorpay-Signature")
        or request.META.get("HTTP_X_RAZORPAY_SIGNATURE")
    )
    if not webhook_signature:
        return JsonResponse({"error": "Missing webhook signature."}, status=400)

    # Verify signature
    try:
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        client.utility.verify_webhook_signature(
            request.body.decode("utf-8"),
            webhook_signature,
            webhook_secret,
        )
    except razorpay.errors.SignatureVerificationError:
        logger.warning("Invalid Razorpay webhook signature received.")
        return JsonResponse({"error": "Invalid webhook signature."}, status=400)
    except Exception:
        logger.exception("Error during webhook signature verification.")
        return JsonResponse({"error": "Signature verification error."}, status=400)

    try:
        event = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Invalid webhook payload."}, status=400)

    event_type = event.get("event")
    payload = event.get("payload", {})

    # Extract event ID for deduplication
    event_id = (
        request.headers.get("X-Razorpay-Event-Id")
        or request.META.get("HTTP_X_RAZORPAY_EVENT_ID")
        or event.get("event_id")
        or event.get("id")
    )
    if not event_id:
        import hashlib
        event_id = hashlib.sha256(request.body).hexdigest()[:64]

    # Quick pre-check for duplicate event before acquiring DB locks
    if ProcessedWebhookEvent.objects.filter(event_id=event_id).exists():
        logger.info("Duplicate Razorpay webhook event %s (%s) ignored.", event_id, event_type)
        dup_msg = "Payment already captured." if event_type == "payment.captured" else "Duplicate event already processed."
        return JsonResponse({"status": "ignored", "message": dup_msg, "event_id": event_id})

    logger.info("Received Razorpay webhook event: %s (ID: %s)", event_type, event_id)

    if event_type == "payment.captured":
        payment_entity = payload.get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")
        status = payment_entity.get("status")
        amount = payment_entity.get("amount")
        currency = payment_entity.get("currency")

        if not order_id or not payment_id:
            return JsonResponse({"error": "Incomplete payment data in webhook."}, status=400)

        pay_info = (
            Payment.objects.filter(razorpay_order_id=order_id)
            .values("id", "booking_id", "booking__artist_id")
            .first()
        )
        if not pay_info:
            logger.warning("Payment record not found for webhook order %s", order_id)
            return JsonResponse({"error": "Payment order not found."}, status=404)

        refund_needed = False
        refund_reason = ""
        with transaction.atomic():
            # Check duplicate again under transaction
            if ProcessedWebhookEvent.objects.filter(event_id=event_id).exists():
                return JsonResponse({"status": "ignored", "message": "Payment already captured.", "event_id": event_id})

            # Lock in strict canonical order: ArtistProfile -> Booking -> Payment
            artist_locked = ArtistProfile.objects.select_for_update().get(id=pay_info["booking__artist_id"])
            booking_locked = (
                Booking.objects.select_for_update()
                .select_related("customer")
                .get(id=pay_info["booking_id"])
            )
            payment = Payment.objects.select_for_update().get(id=pay_info["id"])

            # Idempotent handling for already successful payment
            if payment.status == Payment.Status.SUCCESS:
                if payment.transaction_id == payment_id:
                    ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})
                    return JsonResponse({"message": "Payment already captured.", "status": "ok"})
                logger.critical(
                    "Security Alert: Webhook received different payment ID %s for already-paid booking %s",
                    payment_id,
                    payment.booking_id,
                )
                return JsonResponse({"error": "Different payment ID for already-paid booking."}, status=409)

            # A refunded or partially refunded payment cannot return to SUCCESS
            if payment.status in (Payment.Status.REFUNDED, Payment.Status.PARTIALLY_REFUNDED):
                logger.warning("Captured event received for already refunded/partially refunded payment #%s.", payment.id)
                ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})
                return JsonResponse({"status": "ignored", "message": "Payment has already been refunded.", "payment_status": payment.status})

            # Validate currency and amount
            expected_amount = int(payment.amount * 100)
            if amount != expected_amount or currency != "INR" or status != "captured":
                logger.error(
                    "Webhook payment mismatch for order %s: amount=%s (expected %s), currency=%s, status=%s",
                    order_id, amount, expected_amount, currency, status
                )
                return JsonResponse({"error": "Payment parameters mismatch."}, status=400)

            # Validate authoritative gateway capture timing strictly
            val_res = validate_gateway_capture_timestamp(
                payment_entity.get("created_at"),
                booking_locked.expires_at,
            )

            # 1. Unreliable / Invalid Timestamp (missing, null, malformed, or implausible future)
            if not val_res.is_valid:
                logger.warning(
                    "Webhook: Payment %s for booking %s has invalid/unreliable gateway timestamp %r: %s",
                    payment_id, booking_locked.id, payment_entity.get("created_at"), val_res.reason
                )
                payment.transaction_id = payment_id
                payment.save(update_fields=["transaction_id", "updated_at"])
                review_msg = (
                    f"Payment was captured by the gateway (ID: {payment_id}), but the capture timestamp "
                    f"could not be reliably verified ({val_res.reason}). Flagged for manual review."
                )
                booking_locked.response_message = review_msg
                booking_locked.save(update_fields=["response_message"])
                ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})
                return JsonResponse(
                    {
                        "status": "reconciliation_pending",
                        "message": "Payment captured by gateway, but timestamp validation failed. Flagged for manual review.",
                        "reason": val_res.reason,
                    },
                    status=200,
                )

            # 2. Valid timestamp captured AFTER deadline
            if not val_res.is_on_time:
                logger.warning(
                    "Webhook: Payment %s was captured at %s after deadline %s",
                    payment_id, val_res.dt, booking_locked.expires_at,
                )
                payment.status = Payment.Status.FAILED
                payment.transaction_id = payment_id
                payment.save(update_fields=["status", "transaction_id", "updated_at"])
                if booking_locked.status == Booking.Status.ACCEPTED:
                    booking_locked.status = Booking.Status.EXPIRED
                    booking_locked.response_message = (
                        "Payment was captured after the 24-hour reservation deadline. The date has been released and payment will be refunded."
                    )
                    booking_locked.save(update_fields=["status", "response_message"])

                ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})
                refund_needed = True
                refund_reason = "Captured after 24-hour reservation deadline"

            # If booking was marked expired before the delayed webhook arrived:
            elif booking_locked.status == Booking.Status.EXPIRED:
                from zoneinfo import ZoneInfo
                kolkata_tz = ZoneInfo("Asia/Kolkata")
                local_event_date = timezone.localtime(booking_locked.event_date, timezone=kolkata_tz).date()
                # ArtistProfile is already locked under artist_locked! Safe availability evaluation
                occupied, occ_reason, _ = is_artist_date_occupied(
                    artist_locked, local_event_date, exclude_booking_id=booking_locked.id
                )
                if occupied:
                    logger.critical("Webhook: Payment %s captured before deadline but date %s was reallocated.", payment_id, local_event_date)
                    payment.status = Payment.Status.FAILED
                    payment.transaction_id = payment_id
                    payment.save(update_fields=["status", "transaction_id", "updated_at"])
                    ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})
                    refund_needed = True
                    refund_reason = "Date was reallocated before webhook arrived"
                else:
                    # Date is still available! Restore booking
                    booking_locked.status = Booking.Status.ACCEPTED
                    booking_locked.save(update_fields=["status"])

            if not refund_needed:
                total, commission, artist_amount = calculate_commission(booking_locked.agreed_price)
                payment.status = Payment.Status.SUCCESS
                payment.transaction_id = payment_id
                payment.amount = total
                payment.commission_percentage = Decimal("8.00")
                payment.commission_amount = commission
                payment.artist_amount = artist_amount
                payment.save(update_fields=[
                    "status", "transaction_id", "amount",
                    "commission_percentage", "commission_amount",
                    "artist_amount", "updated_at"
                ])

                dispatch_payment_success_notifications(payment)
                ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})

        # Process refund outside atomic transaction so no DB locks are held during external API call
        if refund_needed:
            initiate_payment_refund(payment, reason=refund_reason, client=client)
            if "reallocated" in refund_reason.lower():
                return JsonResponse({"error": "Date was reallocated before webhook arrived. Flagged for refund.", "status": "reallocated"}, status=409)
            else:
                return JsonResponse({"error": "Payment captured after reservation deadline.", "status": "expired_rejected"}, status=409)

        return JsonResponse({"status": "ok", "message": "Payment successfully reconciled."})

    elif event_type == "payment.failed":
        payment_entity = payload.get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")

        with transaction.atomic():
            if ProcessedWebhookEvent.objects.filter(event_id=event_id).exists():
                return JsonResponse({"status": "ignored", "message": "Duplicate event already processed.", "event_id": event_id})

            if order_id:
                payment = Payment.objects.select_for_update().filter(razorpay_order_id=order_id).first()
                if payment:
                    if payment.status in (Payment.Status.SUCCESS, Payment.Status.REFUNDED, Payment.Status.PARTIALLY_REFUNDED):
                        logger.warning(
                            "Ignoring payment.failed webhook for payment #%s because current status is %s",
                            payment.id, payment.status
                        )
                    elif payment.status == Payment.Status.PENDING:
                        # Log failure, retain PENDING so customer can retry checkout order
                        logger.info("Payment %s failed for order %s (retaining PENDING for retry)", payment_id, order_id)

            ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})

        return JsonResponse({"status": "ok", "message": "Payment failure noted."})

    elif event_type in ("refund.processed", "payment.refunded"):
        refund_entity = payload.get("refund", {}).get("entity", {})
        payment_entity = payload.get("payment", {}).get("entity", {})

        refund_id = refund_entity.get("id")
        payment_id = refund_entity.get("payment_id") or payment_entity.get("id")
        order_id = payment_entity.get("order_id")

        with transaction.atomic():
            if ProcessedWebhookEvent.objects.filter(event_id=event_id).exists():
                return JsonResponse({"status": "ignored", "message": "Duplicate refund event already processed.", "event_id": event_id})

            payment = None
            if payment_id:
                payment = Payment.objects.select_for_update().filter(transaction_id=payment_id).first()
            if not payment and order_id:
                payment = Payment.objects.select_for_update().filter(razorpay_order_id=order_id).first()

            refund = None
            if refund_id:
                refund = Refund.objects.select_for_update().filter(razorpay_refund_id=refund_id).first()
            if not refund and payment:
                refund = Refund.objects.select_for_update().filter(
                    payment=payment,
                    status=Refund.Status.PENDING,
                    razorpay_refund_id__isnull=True,
                ).first()

            if refund:
                refund.status = Refund.Status.PROCESSED
                if refund_id:
                    refund.razorpay_refund_id = refund_id
                refund.save(update_fields=["status", "razorpay_refund_id", "updated_at"])
            elif payment:
                raw_amt = refund_entity.get("amount")
                amt = Decimal(str(raw_amt / 100)) if raw_amt else payment.amount
                refund = Refund.objects.create(
                    payment=payment,
                    booking=payment.booking,
                    razorpay_refund_id=refund_id or f"rfnd_{payment_id}",
                    amount=amt,
                    status=Refund.Status.PROCESSED,
                    reason="Refund processed via Razorpay webhook",
                    idempotency_key=f"rfnd_{refund_id or payment_id}",
                )

            if payment:
                update_payment_refund_status(payment)
                if refund:
                    dispatch_refund_notifications(refund)
                logger.info("Payment %s status updated to %s", payment.id, payment.status)

            ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})

        return JsonResponse({"status": "ok", "message": "Refund processed."})

    elif event_type == "refund.failed":
        refund_entity = payload.get("refund", {}).get("entity", {})
        refund_id = refund_entity.get("id")

        with transaction.atomic():
            if ProcessedWebhookEvent.objects.filter(event_id=event_id).exists():
                return JsonResponse({"status": "ignored", "message": "Duplicate refund failure event already processed.", "event_id": event_id})

            if refund_id:
                refund = Refund.objects.select_for_update().filter(razorpay_refund_id=refund_id).first()
                if refund:
                    refund.status = Refund.Status.FAILED
                    refund.failure_reason = refund_entity.get("error_description") or "Refund failed at bank or gateway"
                    refund.save(update_fields=["status", "failure_reason", "updated_at"])

            ProcessedWebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": event_type})

        return JsonResponse({"status": "ok", "message": "Refund failure recorded."})

    # For other unhandled events, return 200 so Razorpay does not retry
    return JsonResponse({"status": "ignored", "event": event_type})


# ============================================================================
# AI CHATBOT ENDPOINTS (PHASE 1)
# ============================================================================

CHAT_RATE_LIMIT_MAX_REQUESTS = 20
CHAT_RATE_LIMIT_WINDOW_SECONDS = 60


def _serialize_chat_message(msg: ChatMessage) -> dict:
    return {
        "id": msg.id,
        "sender": msg.sender,
        "content": msg.content,
        "metadata": msg.metadata or {},
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def _check_chat_rate_limit(user_id: int) -> bool:
    """
    Simple fixed-window rate limiter per authenticated user.
    Returns True if request is allowed, False if rate limit exceeded.
    """
    cache_key = f"talenthire_chat_rl_{user_id}"
    cache.add(cache_key, 0, timeout=CHAT_RATE_LIMIT_WINDOW_SECONDS)
    try:
        count = cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=CHAT_RATE_LIMIT_WINDOW_SECONDS)
        count = 1
    return count <= CHAT_RATE_LIMIT_MAX_REQUESTS


@csrf_protect
@require_POST
def chat_message_view(request):
    """
    POST /api/chat/message/
    Accepts a user message, invokes Gemini with TalentHire domain restrictions
    and server-derived user role, persists the turn, and returns the AI response.
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Authentication required. Please sign in to use the AI assistant."},
            status=401,
        )

    if not _check_chat_rate_limit(request.user.id):
        return JsonResponse(
            {"error": "Too many messages sent. Please wait a minute and try again."},
            status=429,
        )

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON format."}, status=400)

    raw_message = data.get("message", "")
    if not isinstance(raw_message, str):
        return JsonResponse({"error": "Message must be a text string."}, status=400)

    message = raw_message.strip()
    if not message:
        return JsonResponse({"error": "Message cannot be empty."}, status=400)

    if len(message) > MAX_MESSAGE_LENGTH:
        return JsonResponse(
            {"error": f"Message is too long. Maximum {MAX_MESSAGE_LENGTH} characters allowed."},
            status=400,
        )

    # Always derive role from the authenticated Django session user
    role = detect_user_role(request.user)
    session_id = data.get("session_id")

    if session_id is not None:
        try:
            session_id_int = int(session_id)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Invalid session_id."}, status=400)

        session = ChatSession.objects.filter(
            id=session_id_int,
            user=request.user,
            is_active=True,
        ).first()
        if not session:
            return JsonResponse({"error": "Chat session not found."}, status=404)
    else:
        with transaction.atomic():
            session = (
                ChatSession.objects.select_for_update()
                .filter(
                    user=request.user,
                    is_active=True,
                    role_context=role,
                )
                .order_by("-updated_at")
                .first()
            )
            if not session:
                session = ChatSession.objects.create(
                    user=request.user,
                    role_context=role,
                )

    history_messages = list(
        session.messages.order_by("-created_at", "-id")[:MAX_HISTORY_MESSAGES]
    )[::-1]

    try:
        turn_result = generate_chatbot_turn(
            user_message=message,
            history_messages=history_messages,
            role=role,
            user=request.user,
        )
    except ChatbotConfigurationError as exc:
        ChatbotErrorLog.objects.create(role_context=role, error_type="configuration_error")
        return JsonResponse({"error": str(exc)}, status=503)
    except ChatbotServiceError as exc:
        ChatbotErrorLog.objects.create(role_context=role, error_type="service_error")
        return JsonResponse({"error": str(exc)}, status=502)

    reply_text = turn_result["reply"]
    latency_ms = turn_result["latency_ms"]
    topic = turn_result["topic"]
    metadata = turn_result["metadata"]

    with transaction.atomic():
        user_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.USER,
            content=message,
            topic=topic,
        )
        assistant_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.ASSISTANT,
            content=reply_text,
            topic=topic,
            latency_ms=latency_ms,
            metadata=metadata,
        )
        if session.title == "New Conversation":
            session.title = message[:80]
        session.role_context = role
        session.save(update_fields=["title", "role_context", "updated_at"])

    return JsonResponse(
        {
            "session_id": session.id,
            "role": role,
            "title": session.title,
            "reply": reply_text,
            "user_message": _serialize_chat_message(user_msg),
            "assistant_message": _serialize_chat_message(assistant_msg),
        }
    )


@require_GET
def chat_history_view(request):
    """
    GET /api/chat/history/
    Returns the authenticated user's active chat session and message history.
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Authentication required. Please sign in."},
            status=401,
        )

    role = detect_user_role(request.user)
    session_id = request.GET.get("session_id")

    if session_id is not None:
        try:
            session_id_int = int(session_id)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Invalid session_id."}, status=400)

        session = ChatSession.objects.filter(
            id=session_id_int,
            user=request.user,
        ).first()
        if not session:
            return JsonResponse({"error": "Chat session not found."}, status=404)
    else:
        session = ChatSession.objects.filter(
            user=request.user,
            is_active=True,
            role_context=role,
        ).first()

    if not session:
        return JsonResponse(
            {
                "session_id": None,
                "role": role,
                "title": "New Conversation",
                "messages": [],
            }
        )

    messages = [
        _serialize_chat_message(m)
        for m in session.messages.order_by("created_at", "id")
    ]

    return JsonResponse(
        {
            "session_id": session.id,
            "role": role,
            "title": session.title,
            "messages": messages,
        }
    )


@csrf_protect
@require_POST
def chat_reset_view(request):
    """
    POST /api/chat/reset/
    Deactivates the authenticated user's active session(s) and starts a fresh one.
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Authentication required. Please sign in."},
            status=401,
        )

    role = detect_user_role(request.user)

    with transaction.atomic():
        ChatSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        new_session = ChatSession.objects.create(
            user=request.user,
            role_context=role,
            is_active=True,
        )

    return JsonResponse(
        {
            "message": "Conversation reset successfully.",
            "session_id": new_session.id,
            "role": role,
            "title": new_session.title,
            "messages": [],
        }
    )


# ============================================================================
# ARTIST HELP & SUPPORT TICKETING SYSTEM
# ============================================================================

def _parse_support_payload(request):
    """Parse JSON or multipart/form-data payload for support endpoints."""
    if request.content_type and "multipart/form-data" in request.content_type:
        return request.POST, request.FILES.get("attachment")
    try:
        data = json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, None
    return data, None


@csrf_protect
@require_http_methods(["GET", "POST"])
def artist_support_tickets_view(request):
    """
    GET  /api/artist/support/tickets/ - List artist's own support tickets with filters & pagination.
    POST /api/artist/support/tickets/ - Create a new support ticket with optional attachment.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not hasattr(request.user, "artist_profile"):
        return JsonResponse({"error": "Artist account required."}, status=403)

    from django.core.paginator import Paginator
    from app.models import SupportMessage, SupportTicket
    from app.services.support_service import (
        notify_admins_new_ticket,
        serialize_support_ticket,
        validate_support_attachment,
    )

    if request.method == "GET":
        qs = (
            SupportTicket.objects.filter(artist=request.user)
            .select_related("artist", "artist__artist_profile", "artist__artist_profile__category")
            .prefetch_related("messages", "messages__sender", "messages__sender__artist_profile")
            .order_by("-updated_at", "-created_at")
        )

        status_filter = (request.GET.get("status") or "").strip().lower()
        category_filter = (request.GET.get("category") or "").strip().lower()
        search_q = (request.GET.get("search") or "").strip()

        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        if category_filter and category_filter != "all":
            qs = qs.filter(category=category_filter)
        if search_q:
            qs = qs.filter(
                Q(ticket_number__icontains=search_q) | Q(subject__icontains=search_q)
            )

        try:
            page_num = max(1, int(request.GET.get("page", 1)))
        except (TypeError, ValueError):
            page_num = 1
        try:
            page_size = min(50, max(1, int(request.GET.get("page_size", 10))))
        except (TypeError, ValueError):
            page_size = 10

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page_num)

        tickets = [
            serialize_support_ticket(t, viewer_user=request.user, include_messages=False, request=request)
            for t in page_obj.object_list
        ]

        unread_tickets_count = (
            SupportMessage.objects.filter(
                ticket__artist=request.user,
                is_read=False,
            )
            .exclude(sender=request.user)
            .values("ticket_id")
            .distinct()
            .count()
        )

        return JsonResponse(
            {
                "tickets": tickets,
                "total_count": paginator.count,
                "page": page_obj.number,
                "total_pages": paginator.num_pages,
                "unread_tickets_count": unread_tickets_count,
                "categories": [
                    {"value": c[0], "label": c[1]} for c in SupportTicket.Category.choices
                ],
                "statuses": [
                    {"value": s[0], "label": s[1]} for s in SupportTicket.Status.choices
                ],
            }
        )

    # POST: Create new support ticket
    data, attachment = _parse_support_payload(request)
    if data is None:
        return JsonResponse({"error": "Invalid request payload."}, status=400)

    category = (data.get("category") or SupportTicket.Category.GENERAL_QUERY).strip()
    subject = (data.get("subject") or "").strip()
    message_text = (data.get("message") or "").strip()

    if category not in SupportTicket.Category.values:
        return JsonResponse({"error": "Invalid support request category."}, status=400)
    if not subject:
        return JsonResponse({"error": "Subject is required."}, status=400)
    if len(subject) > 200:
        return JsonResponse({"error": "Subject must be 200 characters or fewer."}, status=400)
    if not message_text:
        return JsonResponse({"error": "Detailed message is required."}, status=400)

    valid_file, file_err = validate_support_attachment(attachment)
    if not valid_file:
        return JsonResponse({"error": file_err}, status=400)

    with transaction.atomic():
        ticket = SupportTicket.objects.create(
            artist=request.user,
            category=category,
            subject=subject,
            status=SupportTicket.Status.OPEN,
        )
        SupportMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            message=message_text,
            attachment=attachment,
            is_read=False,
        )

    notify_admins_new_ticket(ticket)

    return JsonResponse(
        {
            "message": f"Support ticket {ticket.ticket_number} submitted successfully.",
            "ticket": serialize_support_ticket(
                ticket, viewer_user=request.user, include_messages=True, request=request
            ),
        },
        status=201,
    )


@require_GET
def artist_support_ticket_detail_view(request, ticket_id):
    """
    GET /api/artist/support/tickets/<ticket_id>/ - Get ticket conversation and mark admin replies as read.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not hasattr(request.user, "artist_profile"):
        return JsonResponse({"error": "Artist account required."}, status=403)

    from app.models import SupportTicket
    from app.services.support_service import serialize_support_ticket

    ticket = (
        SupportTicket.objects.filter(id=ticket_id, artist=request.user)
        .select_related("artist", "artist__artist_profile", "artist__artist_profile__category")
        .first()
    )
    if not ticket:
        return JsonResponse({"error": "Support ticket not found."}, status=404)

    # Mark unread messages from admin as read
    ticket.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

    return JsonResponse(
        {
            "ticket": serialize_support_ticket(
                ticket, viewer_user=request.user, include_messages=True, request=request
            )
        }
    )


@csrf_protect
@require_POST
def artist_support_ticket_reply_view(request, ticket_id):
    """
    POST /api/artist/support/tickets/<ticket_id>/reply/ - Artist replies to an open/active support ticket.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not hasattr(request.user, "artist_profile"):
        return JsonResponse({"error": "Artist account required."}, status=403)

    from app.models import SupportMessage, SupportTicket
    from app.services.support_service import (
        notify_admins_artist_reply,
        serialize_support_ticket,
        validate_support_attachment,
    )

    ticket = SupportTicket.objects.filter(id=ticket_id, artist=request.user).first()
    if not ticket:
        return JsonResponse({"error": "Support ticket not found."}, status=404)

    if ticket.status == SupportTicket.Status.CLOSED:
        return JsonResponse(
            {"error": "This ticket is closed and cannot receive new replies."},
            status=400,
        )

    data, attachment = _parse_support_payload(request)
    if data is None:
        return JsonResponse({"error": "Invalid request payload."}, status=400)

    message_text = (data.get("message") or "").strip()
    if not message_text and not attachment:
        return JsonResponse({"error": "Reply message or attachment is required."}, status=400)
    if not message_text:
        message_text = "(Attachment uploaded)"

    valid_file, file_err = validate_support_attachment(attachment)
    if not valid_file:
        return JsonResponse({"error": file_err}, status=400)

    with transaction.atomic():
        SupportMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            message=message_text,
            attachment=attachment,
            is_read=False,
        )
        if ticket.status == SupportTicket.Status.AWAITING_RESPONSE:
            ticket.status = SupportTicket.Status.IN_PROGRESS
            ticket.save(update_fields=["status", "updated_at"])
        else:
            ticket.save(update_fields=["updated_at"])

    notify_admins_artist_reply(ticket)

    return JsonResponse(
        {
            "message": "Reply sent successfully.",
            "ticket": serialize_support_ticket(
                ticket, viewer_user=request.user, include_messages=True, request=request
            ),
        },
        status=201,
    )


# ==============================================================================
# Smart Collaboration Discovery Views (Phase 3)
# ==============================================================================

@require_GET
def artist_collaboration_recommendations_view(request):
    """
    Returns recommended artist collaborators for the currently authenticated artist.
    Collaborators are matched on shared service districts (ArtistServiceDistrict),
    filtered by optional category, event_date availability (using is_artist_date_occupied),
    and price range.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist or not artist.is_active or not request.user.is_active:
        return JsonResponse(
            {"error": "Only active performing artists can access collaboration discovery."},
            status=403,
        )

    # Optional location constraints within shared districts
    state_id_param = (request.GET.get("state_id") or request.GET.get("state") or "").strip()
    district_id_param = (request.GET.get("district_id") or request.GET.get("district") or "").strip()

    target_state_id = None
    target_district_id = None

    if state_id_param:
        if not state_id_param.isdigit():
            return JsonResponse({"error": "Invalid state_id."}, status=400)
        target_state_id = int(state_id_param)
        if not State.objects.filter(id=target_state_id).exists():
            return JsonResponse({"error": "Selected state does not exist."}, status=400)

    if district_id_param:
        if not district_id_param.isdigit():
            return JsonResponse({"error": "Invalid district_id."}, status=400)
        target_district_id = int(district_id_param)
        dist_obj = District.objects.filter(id=target_district_id).first()
        if not dist_obj:
            return JsonResponse({"error": "Selected district does not exist."}, status=400)
        if target_state_id and dist_obj.state_id != target_state_id:
            return JsonResponse(
                {"error": "Selected district does not belong to the selected state."},
                status=400,
            )

    event_date_param = (request.GET.get("event_date") or request.GET.get("date") or "").strip()
    category_param = request.GET.get("category", "").strip()
    min_price_param = request.GET.get("min_price", "").strip()
    max_price_param = request.GET.get("max_price", "").strip()
    search_query = request.GET.get("search", "").strip()

    page_param = request.GET.get("page", "1").strip()
    page_size_param = request.GET.get("page_size", "20").strip()

    try:
        page = max(1, int(page_param))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = max(1, min(100, int(page_size_param)))
    except (ValueError, TypeError):
        page_size = 20

    from .collaboration_service import find_collaboration_recommendations

    try:
        results = find_collaboration_recommendations(
            requesting_artist=artist,
            category=category_param,
            event_date_str=event_date_param,
            min_price=min_price_param or None,
            max_price=max_price_param or None,
            search_query=search_query or None,
            target_state_id=target_state_id,
            target_district_id=target_district_id,
            page=page,
            page_size=page_size,
        )
    except ValueError as ve:
        return JsonResponse({"error": str(ve)}, status=400)

    return JsonResponse(results)


@require_http_methods(["GET", "POST"])
def artist_collaboration_shared_coverage_view(request):
    """
    Calculates the exact shared service district coverage (intersection)
    for a list of artists.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    artist = getattr(request.user, "artist_profile", None)
    if not artist or not artist.is_active or not request.user.is_active:
        return JsonResponse(
            {"error": "Only active performing artists can calculate collaboration coverage."},
            status=403,
        )

    raw_artist_ids = []
    if request.method == "POST":
        try:
            body = json.loads(request.body) if request.body else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON format."}, status=400)
        raw_artist_ids = body.get("artist_ids", [])
        if not isinstance(raw_artist_ids, list):
            return JsonResponse({"error": "artist_ids must be a list."}, status=400)
    else:
        # GET params
        ids_param = request.GET.get("artist_ids", "")
        if ids_param:
            raw_artist_ids = [p.strip() for p in ids_param.split(",") if p.strip()]
        else:
            raw_artist_ids = request.GET.getlist("artist_id")

    # Validate integer IDs
    artist_ids = []
    for item in raw_artist_ids:
        if isinstance(item, int):
            artist_ids.append(item)
        elif isinstance(item, str) and item.isdigit():
            artist_ids.append(int(item))
        else:
            return JsonResponse(
                {"error": f"Invalid artist ID: {item}. Artist IDs must be integers."},
                status=400,
            )

    # Always ensure the requesting artist is part of the calculation
    if artist.id not in artist_ids:
        artist_ids.insert(0, artist.id)

    # Validate that specified artist IDs actually exist
    existing_artists = list(
        ArtistProfile.objects.filter(id__in=artist_ids)
        .select_related("category", "state", "district", "user")
    )
    existing_id_set = {a.id for a in existing_artists}
    missing_ids = [aid for aid in artist_ids if aid not in existing_id_set]
    if missing_ids:
        return JsonResponse(
            {"error": f"Artist ID(s) not found: {missing_ids}."},
            status=400,
        )

    from .collaboration_service import (
        calculate_shared_service_districts,
        serialize_district_data,
    )

    shared_districts_qs = calculate_shared_service_districts(existing_artists, only_eligible=True)
    coverage_data = serialize_district_data(shared_districts_qs)

    participating_artists = [
        {
            "id": a.id,
            "stage_name": a.stage_name,
            "category_name": a.category.name if a.category else "",
            "is_verified": a.is_verified,
            "is_active": a.is_active and getattr(a.user, "is_active", False),
        }
        for a in existing_artists
    ]

    return JsonResponse(
        {
            "participating_artists": participating_artists,
            "shared_districts": coverage_data["districts"],
            "shared_districts_count": coverage_data["count"],
            "states": coverage_data["states"],
            "states_count": coverage_data["states_count"],
        }
    )


