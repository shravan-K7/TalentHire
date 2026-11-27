import datetime
import re
from collections import defaultdict
from django.db import models
from django.utils import timezone

from .models import ArtistProfile, ArtistServiceDistrict, District, State


def is_artist_eligible_for_collaboration(artist):
    """
    Check if an artist is eligible for collaboration discovery and teams.
    Strictly follows existing platform public visibility rules:
    - profile must be active (is_active=True)
    - profile must be verified (is_verified=True)
    - associated user account must be active (user.is_active=True)
    """
    if not artist:
        return False
    user = getattr(artist, "user", None)
    if not user or not user.is_active:
        return False
    if not artist.is_active:
        return False
    if not artist.is_verified:
        return False
    return True


def extract_active_artist_ids(members, only_eligible=True):
    """
    Extracts a list of unique artist IDs from a flexible collection of members.
    Supports:
    - Iterable of ArtistProfile instances
    - Iterable of artist IDs (int or numeric str)
    - Iterable of dicts or objects with status/membership_status and artist/artist_id

    Strictly excludes:
    - Pending, declined, removed, inactive, or rejected members
    - Inactive or unverified artists if only_eligible is True
    """
    if not members:
        return []

    candidate_ids = []
    INACTIVE_STATUSES = {
        "pending",
        "declined",
        "removed",
        "inactive",
        "rejected",
        "cancelled",
        "suspended",
        "left",
    }

    for item in members:
        if item is None:
            continue

        # Dict with status
        if isinstance(item, dict):
            status = str(item.get("status") or item.get("membership_status") or "active").strip().lower()
            if status in INACTIVE_STATUSES or status != "active":
                continue
            art = item.get("artist") or item.get("artist_id") or item.get("id")
            if isinstance(art, ArtistProfile):
                candidate_ids.append(art.id)
            elif art and str(art).isdigit():
                candidate_ids.append(int(art))
            continue

        # Object with status attribute
        status_attr = getattr(item, "status", None) or getattr(item, "membership_status", None)
        if status_attr is not None:
            status_str = str(status_attr).strip().lower()
            if status_str in INACTIVE_STATUSES or status_str != "active":
                continue
            art = getattr(item, "artist", None) or getattr(item, "artist_id", None)
            if isinstance(art, ArtistProfile):
                candidate_ids.append(art.id)
            elif art and str(art).isdigit():
                candidate_ids.append(int(art))
            continue

        # Direct ArtistProfile instance
        if isinstance(item, ArtistProfile):
            candidate_ids.append(item.id)
            continue

        # Raw ID (int or numeric str)
        if isinstance(item, int):
            candidate_ids.append(item)
            continue
        if isinstance(item, str) and item.isdigit():
            candidate_ids.append(int(item))
            continue

    # De-duplicate while preserving insertion order
    unique_ids = list(dict.fromkeys(candidate_ids))
    if not unique_ids:
        return []

    if only_eligible:
        # Validate existence and platform eligibility in a single query
        eligible_qs = ArtistProfile.objects.filter(
            id__in=unique_ids,
            is_active=True,
            is_verified=True,
            user__is_active=True,
        ).values_list("id", flat=True)
        eligible_set = set(eligible_qs)
        return [aid for aid in unique_ids if aid in eligible_set]

    return unique_ids


def calculate_shared_service_districts(members, only_eligible=True):
    """
    Calculates the intersection of service districts for a list of active team members.
    A district is shared only when EVERY active team member covers it via ArtistServiceDistrict.
    Frontend-supplied district lists cannot dictate team coverage.

    Returns:
    A Django QuerySet of District objects common to all active members,
    ordered by state__name, name.
    Returns District.objects.none() if members list is empty or intersection is empty.
    """
    active_artist_ids = extract_active_artist_ids(members, only_eligible=only_eligible)
    n_artists = len(active_artist_ids)

    if n_artists == 0:
        return District.objects.none()

    # If only 1 artist, their entire service district set is their coverage
    if n_artists == 1:
        artist_id = active_artist_ids[0]
        district_ids = ArtistServiceDistrict.objects.filter(
            artist_id=artist_id
        ).values_list("district_id", flat=True)
        return District.objects.filter(id__in=district_ids).select_related("state", "state__country").order_by(
            "state__name", "name"
        )

    # For multiple artists: group by district_id and filter by cnt == n_artists
    # Because (artist, district) has a unique constraint, count(distinct artist_id) == n_artists
    # guarantees every active member has configured coverage for that district.
    shared_district_ids = (
        ArtistServiceDistrict.objects.filter(artist_id__in=active_artist_ids)
        .values("district_id")
        .annotate(cnt=models.Count("artist_id", distinct=True))
        .filter(cnt=n_artists)
        .values_list("district_id", flat=True)
    )

    return District.objects.filter(id__in=shared_district_ids).select_related(
        "state", "state__country"
    ).order_by("state__name", "name")


def serialize_district_data(district_qs):
    """
    Serializes a queryset or list of District objects into a structured dictionary
    including district list, total count, and grouped states coverage.
    """
    districts_list = []
    states_map = {}

    for d in district_qs:
        s = d.state
        districts_list.append(
            {
                "id": d.id,
                "name": d.name,
                "state_id": s.id,
                "state_name": s.name,
                "state_code": getattr(s, "code", "") or "",
                "is_union_territory": getattr(s, "is_union_territory", False),
            }
        )
        if s.id not in states_map:
            states_map[s.id] = {
                "id": s.id,
                "name": s.name,
                "code": getattr(s, "code", "") or "",
                "is_union_territory": getattr(s, "is_union_territory", False),
                "districts": [],
            }
        states_map[s.id]["districts"].append({"id": d.id, "name": d.name})

    return {
        "districts": districts_list,
        "count": len(districts_list),
        "states": list(states_map.values()),
        "states_count": len(states_map),
    }


def find_collaboration_recommendations(
    requesting_artist,
    category=None,
    event_date_str=None,
    min_price=None,
    max_price=None,
    search_query=None,
    target_state_id=None,
    target_district_id=None,
    page=1,
    page_size=20,
):
    """
    Finds compatible artist collaborators for a requesting artist based on:
    - Shared service districts (calculated via ArtistServiceDistrict)
    - Category compatibility
    - Event date availability (reusing is_artist_date_occupied logic)
    - Optional price range
    - Keyword search

    Strict requirements:
    - Requesting artist is excluded.
    - Only eligible artists are returned.
    - Duplicates are avoided.
    - Returns serialized collaborators with shared districts metadata.
    """
    from .views import get_occupied_artist_ids_for_date

    # 1. Fetch requesting artist's service districts
    my_district_ids = set(
        ArtistServiceDistrict.objects.filter(artist=requesting_artist).values_list(
            "district_id", flat=True
        )
    )

    if not my_district_ids:
        return {
            "collaborators": [],
            "total_count": 0,
            "page": page,
            "page_size": page_size,
            "has_more": False,
            "my_districts_count": 0,
            "message": "You have not configured any service districts yet. Add your travel coverage to discover collaborators.",
        }

    # 2. Filter candidate pool by shared service districts
    candidate_district_filter = models.Q(service_districts__district_id__in=my_district_ids)

    if target_district_id:
        candidate_district_filter &= models.Q(service_districts__district_id=target_district_id)
    elif target_state_id:
        candidate_district_filter &= models.Q(service_districts__district__state_id=target_state_id)

    qs = (
        ArtistProfile.objects.filter(
            candidate_district_filter,
            is_active=True,
            is_verified=True,
            user__is_active=True,
        )
        .exclude(id=requesting_artist.id)
        .select_related("category", "country", "state", "district", "city", "user")
        .prefetch_related("service_districts__district__state")
        .distinct()
    )

    # 3. Category filter
    if category and str(category).strip() and str(category).lower() != "all":
        cat_str = str(category).strip()
        if cat_str.isdigit():
            qs = qs.filter(category_id=int(cat_str))
        else:
            qs = qs.filter(
                models.Q(category__name__iexact=cat_str)
                | models.Q(category__name__icontains=cat_str)
            )

    # 4. Search query
    if search_query and search_query.strip():
        term = search_query.strip()
        qs = qs.filter(
            models.Q(stage_name__icontains=term)
            | models.Q(bio__icontains=term)
            | models.Q(category__name__icontains=term)
            | models.Q(performance_types__icontains=term)
        )

    # 5. Price filtering
    if min_price is not None:
        try:
            qs = qs.filter(starting_price__gte=float(min_price))
        except (ValueError, TypeError):
            pass

    if max_price is not None:
        try:
            qs = qs.filter(starting_price__lte=float(max_price))
        except (ValueError, TypeError):
            pass

    # 6. Event date availability
    occupied_ids = set()
    calendar_date = None
    if event_date_str and str(event_date_str).strip():
        clean_date_str = str(event_date_str).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", clean_date_str):
            raise ValueError("Invalid event_date format. Expected YYYY-MM-DD.")
        try:
            year, month, day = [int(p) for p in clean_date_str.split("-")]
            calendar_date = datetime.date(year, month, day)
        except ValueError:
            raise ValueError("Invalid event_date. Date does not exist.")

        occupied_ids = get_occupied_artist_ids_for_date(calendar_date)
        if occupied_ids:
            qs = qs.exclude(id__in=occupied_ids)

    # 7. Collect artist IDs and compute shared district mappings
    candidate_artists = list(qs)
    if not candidate_artists:
        return {
            "collaborators": [],
            "total_count": 0,
            "page": page,
            "page_size": page_size,
            "has_more": False,
            "my_districts_count": len(my_district_ids),
        }

    candidate_ids = [a.id for a in candidate_artists]

    # Batch load all shared service district records
    shared_sd_qs = (
        ArtistServiceDistrict.objects.filter(
            artist_id__in=candidate_ids,
            district_id__in=my_district_ids,
        )
        .select_related("district", "district__state")
        .order_by("district__state__name", "district__name")
    )

    shared_districts_by_artist = defaultdict(list)
    for sd in shared_sd_qs:
        shared_districts_by_artist[sd.artist_id].append(
            {
                "id": sd.district.id,
                "name": sd.district.name,
                "state_id": sd.district.state_id,
                "state_name": sd.district.state.name,
            }
        )

    # Attach shared coverage metadata and sort:
    # Most shared districts first, then rating, then starting price
    def sort_key(artist):
        shared_count = len(shared_districts_by_artist.get(artist.id, []))
        rating = getattr(artist, "avg_rating", 0) or 0
        return (-shared_count, -float(rating), float(artist.starting_price or 0))

    candidate_artists.sort(key=sort_key)

    total_count = len(candidate_artists)
    start = (page - 1) * page_size
    end = start + page_size
    paged_artists = candidate_artists[start:end]
    has_more = end < total_count

    from .views import serialize_artist_summary

    serialized_collaborators = []
    for artist in paged_artists:
        base_summary = serialize_artist_summary(artist)
        shared_list = shared_districts_by_artist.get(artist.id, [])
        # Group shared districts by state for clean display
        state_names = list(dict.fromkeys(d["state_name"] for d in shared_list))
        base_summary["shared_districts"] = shared_list
        base_summary["shared_districts_count"] = len(shared_list)
        base_summary["shared_states"] = state_names
        base_summary["is_available_on_date"] = (
            (artist.id not in occupied_ids) if calendar_date else None
        )
        serialized_collaborators.append(base_summary)

    return {
        "collaborators": serialized_collaborators,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_more": has_more,
        "my_districts_count": len(my_district_ids),
        "event_date": calendar_date.isoformat() if calendar_date else None,
    }
