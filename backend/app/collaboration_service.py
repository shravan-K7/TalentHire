import datetime
import re
from collections import defaultdict
from django.db import models
from django.utils import timezone

from .models import ArtistProfile, ArtistServiceDistrict, CollaborationTeamPortfolio, District, State


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


def calculate_team_shared_service_districts(team):
    """
    Calculates the strict intersection of service districts for all active members
    of a CollaborationTeam.
    Rule:
    - Every active member must contribute.
    - If any active member has no service districts or disjoint coverage, intersection is empty.
    - If an active member is inactive or unverified, the team is marked ineligible for public discovery.
    """
    is_eligible, reason = team.check_eligibility()
    active_memberships = list(team.get_active_members())
    if not active_memberships:
        return District.objects.none(), is_eligible, reason

    active_artists = [m.artist for m in active_memberships]
    # Calculate intersection across all active members
    districts_qs = calculate_shared_service_districts(active_artists, only_eligible=False)
    return districts_qs, is_eligible, reason


def serialize_team_summary(team, current_artist=None):
    """
    Serializes basic team information for dashboard lists.
    """
    active_members_qs = team.get_active_members()
    active_count = active_members_qs.count()
    pending_count = team.memberships.filter(status="pending").count()

    districts_qs, is_eligible, reason = calculate_team_shared_service_districts(team)
    districts_count = districts_qs.count()

    owner = team.owner
    base_loc = owner.location or (
        f"{owner.district.name}, {owner.state.name}"
        if owner.district and owner.state
        else "India"
    )

    logo_url = None
    if getattr(team, "profile_image", None):
        try:
            logo_url = team.profile_image.url
        except Exception:
            logo_url = None

    cover_url = None
    if getattr(team, "cover_image", None):
        try:
            cover_url = team.cover_image.url
        except Exception:
            cover_url = None

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "category": {
            "id": team.category_id,
            "name": team.category.name,
        } if getattr(team, "category", None) else None,
        "category_name": team.category.name if getattr(team, "category", None) else "",
        "profile_image": logo_url,
        "cover_image": cover_url,
        "is_publicly_visible": getattr(team, "is_publicly_visible", True),
        "is_active": team.is_active,
        "created_at": team.created_at.strftime("%b %d, %Y") if team.created_at else "",
        "is_owner": bool(current_artist and current_artist.id == team.owner_id),
        "owner": {
            "id": owner.id,
            "stage_name": owner.stage_name,
            "category_name": owner.category.name if owner.category else "",
            "profile_image": owner.profile_image.url if owner.profile_image else None,
            "base_location": base_loc,
        },
        "active_members_count": active_count,
        "pending_invitations_count": pending_count,
        "shared_districts_count": districts_count,
        "is_eligible_for_discovery": is_eligible,
        "eligibility_reason": reason if not is_eligible else None,
    }


def serialize_team_detail(team, current_artist=None):
    """
    Serializes full team details including active members, pending invitations,
    and structured shared service coverage grouped by state.
    """
    summary = serialize_team_summary(team, current_artist=current_artist)

    # Active members
    active_memberships = (
        team.get_active_members()
        .select_related("artist", "artist__category", "artist__user", "artist__district", "artist__state")
        .order_by("role", "-joined_at")
    )
    active_members = []
    for m in active_memberships:
        art = m.artist
        loc = art.location or (
            f"{art.district.name}, {art.state.name}"
            if art.district and art.state
            else "India"
        )
        active_members.append(
            {
                "id": m.id,
                "artist_id": art.id,
                "stage_name": art.stage_name,
                "category_name": art.category.name if art.category else "",
                "role": m.role,
                "profile_image": art.profile_image.url if art.profile_image else None,
                "base_location": loc,
                "is_active": art.is_active and getattr(art.user, "is_active", False),
                "is_verified": art.is_verified,
                "joined_at": m.joined_at.strftime("%b %d, %Y") if m.joined_at else None,
            }
        )

    # Pending invitations (only visible to owner or team members)
    pending_memberships = (
        team.memberships.filter(status="pending")
        .select_related("artist", "artist__category", "artist__district", "artist__state", "invited_by")
        .order_by("-created_at")
    )
    pending_invitations = []
    for p in pending_memberships:
        art = p.artist
        loc = art.location or (
            f"{art.district.name}, {art.state.name}"
            if art.district and art.state
            else "India"
        )
        pending_invitations.append(
            {
                "id": p.id,
                "artist_id": art.id,
                "stage_name": art.stage_name,
                "category_name": art.category.name if art.category else "",
                "profile_image": art.profile_image.url if art.profile_image else None,
                "base_location": loc,
                "invited_by_name": p.invited_by.stage_name if p.invited_by else "",
                "message": p.message,
                "created_at": p.created_at.strftime("%b %d, %Y") if p.created_at else None,
            }
        )

    # Shared coverage
    districts_qs, is_eligible, reason = calculate_team_shared_service_districts(team)
    coverage_data = serialize_district_data(districts_qs)

    summary["active_members"] = active_members
    summary["pending_invitations"] = pending_invitations
    summary["shared_coverage"] = {
        "districts": coverage_data["districts"],
        "count": coverage_data["count"],
        "states": coverage_data["states"],
        "states_count": coverage_data["states_count"],
        "message": "No common service coverage" if coverage_data["count"] == 0 else "",
    }

    return summary


def serialize_team_portfolio_item(item, request=None):
    """
    Serializes a CollaborationTeamPortfolio item into a JSON-friendly dict.
    Supports Photos, uploaded Videos, and YouTube embeds with thumbnails.
    """
    from .views import extract_youtube_id

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
    yt_id = None
    if item.thumbnail:
        try:
            thumbnail_url = request.build_absolute_uri(item.thumbnail.url) if request else item.thumbnail.url
        except Exception:
            thumbnail_url = item.thumbnail.url
    elif item.thumbnail_url:
        thumbnail_url = item.thumbnail_url

    if item.item_type == CollaborationTeamPortfolio.ItemType.YOUTUBE or item.youtube_url:
        yt_id = extract_youtube_id(item.youtube_url or item.media_url)
        if yt_id and not thumbnail_url:
            thumbnail_url = f"https://img.youtube.com/vi/{yt_id}/hqdefault.jpg"
    elif item.item_type == CollaborationTeamPortfolio.ItemType.PHOTO and media_url and not thumbnail_url:
        thumbnail_url = media_url

    return {
        "id": item.id,
        "team_id": item.team_id,
        "title": item.title,
        "description": item.description,
        "item_type": item.item_type,
        "media_url": media_url,
        "thumbnail_url": thumbnail_url,
        "youtube_url": item.youtube_url,
        "youtube_id": yt_id,
        "youtube_embed_url": f"https://www.youtube.com/embed/{yt_id}" if yt_id else "",
        "duration": item.duration,
        "dimensions": item.dimensions,
        "file_size": item.file_size,
        "format_ext": item.format_ext,
        "is_featured": item.is_featured,
        "is_public": item.is_public,
        "display_order": item.display_order,
        "uploaded_at": item.uploaded_at.strftime("%b %d, %Y") if item.uploaded_at else "",
    }


def serialize_team_public_profile(team, request=None):
    """
    Serializes a team's public-facing profile:
    - Team details (name, description, category, profile_image, cover_image)
    - Active accepted members ONLY (stage name, category, profile photo, artist profile ID, role)
    - Public portfolio items (is_public=True)
    - Dynamic shared service coverage (strict intersection of active members)
    - Team eligibility and visibility status
    Zero leakage of pending invitations, customer/artist emails, phones, or internal User IDs.
    """
    # 1. Active members ONLY
    active_memberships = (
        team.get_active_members()
        .select_related("artist", "artist__category", "artist__district", "artist__state")
        .order_by("role", "-joined_at")
    )
    members_data = []
    for m in active_memberships:
        art = m.artist
        p_img = None
        if art.profile_image:
            try:
                p_img = request.build_absolute_uri(art.profile_image.url) if request else art.profile_image.url
            except Exception:
                p_img = None

        loc = art.location or (
            f"{art.district.name}, {art.state.name}"
            if art.district and art.state
            else "India"
        )
        members_data.append(
            {
                "id": m.id,
                "artist_id": art.id,
                "stage_name": art.stage_name,
                "category_id": art.category_id,
                "category_name": art.category.name if art.category else "",
                "role": m.role,
                "profile_image": p_img,
                "base_location": loc,
                "starting_price": str(art.starting_price or "0.00"),
                "is_verified": art.is_verified,
            }
        )

    # 2. Public portfolio items ONLY
    portfolio_qs = (
        CollaborationTeamPortfolio.objects.filter(team=team, is_public=True)
        .order_by("display_order", "-uploaded_at")
    )
    portfolio_data = [serialize_team_portfolio_item(p, request=request) for p in portfolio_qs]

    # 3. Dynamic shared service coverage
    districts_qs, is_eligible, reason = calculate_team_shared_service_districts(team)
    cov = serialize_district_data(districts_qs)

    # 4. Active performance packages ONLY (Phase 5B)
    from .models import CollaborationPackage
    packages_qs = (
        CollaborationPackage.objects.filter(team=team, is_active=True)
        .prefetch_related("participating_members__category")
        .order_by("-created_at")
    )
    packages_data = [serialize_team_package(p, request=request) for p in packages_qs]

    logo_url = None
    if getattr(team, "profile_image", None):
        try:
            logo_url = request.build_absolute_uri(team.profile_image.url) if request else team.profile_image.url
        except Exception:
            logo_url = None

    cover_url = None
    if getattr(team, "cover_image", None):
        try:
            cover_url = request.build_absolute_uri(team.cover_image.url) if request else team.cover_image.url
        except Exception:
            cover_url = None

    owner = team.owner
    owner_img = None
    if owner.profile_image:
        try:
            owner_img = request.build_absolute_uri(owner.profile_image.url) if request else owner.profile_image.url
        except Exception:
            owner_img = None

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "category": {
            "id": team.category_id,
            "name": team.category.name,
        } if getattr(team, "category", None) else None,
        "category_name": team.category.name if getattr(team, "category", None) else "",
        "profile_image": logo_url,
        "cover_image": cover_url,
        "is_active": team.is_active,
        "is_publicly_visible": getattr(team, "is_publicly_visible", True),
        "created_at": team.created_at.strftime("%b %d, %Y") if team.created_at else "",
        "owner": {
            "id": owner.id,
            "stage_name": owner.stage_name,
            "category_name": owner.category.name if owner.category else "",
            "profile_image": owner_img,
        },
        "members": members_data,
        "members_count": len(members_data),
        "portfolio": portfolio_data,
        "portfolio_count": len(portfolio_data),
        "packages": packages_data,
        "packages_count": len(packages_data),
        "shared_coverage": {
            "districts": cov["districts"],
            "count": cov["count"],
            "states": cov["states"],
            "states_count": cov["states_count"],
        },
        "is_eligible_for_discovery": is_eligible,
        "eligibility_reason": reason if not is_eligible else None,
    }


def serialize_team_card(team, request=None, precalculated_coverage=None):
    """
    Serializes a team card for the public Explore Performers / Collaboration Discovery page.
    Includes:
    - id, name, description, category
    - profile_image, cover_image
    - active_members_count
    - base_location (from owner or primary active members)
    - shared_districts_count, shared_states_count, shared_states
    - portfolio_previews (up to 4 public items for preview thumbnails)
    - created_at
    - owner basic summary (safe public data only)
    Zero leakage of private member information.
    """
    owner = team.owner
    logo_url = None
    if getattr(team, "profile_image", None):
        try:
            logo_url = request.build_absolute_uri(team.profile_image.url) if request else team.profile_image.url
        except Exception:
            logo_url = None

    cover_url = None
    if getattr(team, "cover_image", None):
        try:
            cover_url = request.build_absolute_uri(team.cover_image.url) if request else team.cover_image.url
        except Exception:
            cover_url = None

    base_loc = owner.location or (
        f"{owner.district.name}, {owner.state.name}"
        if owner.district and owner.state
        else "India"
    )

    if precalculated_coverage is not None:
        coverage_data = precalculated_coverage
    else:
        districts_qs, _, _ = calculate_team_shared_service_districts(team)
        coverage_data = serialize_district_data(districts_qs)

    # Public portfolio preview items (up to 4)
    from .models import CollaborationTeamPortfolio
    portfolio_qs = CollaborationTeamPortfolio.objects.filter(
        team=team, is_public=True
    ).order_by("display_order", "-uploaded_at")[:4]

    previews = [serialize_team_portfolio_item(p, request=request) for p in portfolio_qs]
    total_portfolio_count = CollaborationTeamPortfolio.objects.filter(
        team=team, is_public=True
    ).count()

    active_members_count = team.get_active_members().count()

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description or "",
        "category": {
            "id": team.category_id,
            "name": team.category.name,
        } if getattr(team, "category", None) else None,
        "category_name": team.category.name if getattr(team, "category", None) else (owner.category.name if owner.category else ""),
        "profile_image": logo_url,
        "cover_image": cover_url,
        "active_members_count": active_members_count,
        "base_location": base_loc,
        "shared_districts_count": coverage_data["count"],
        "shared_states_count": coverage_data["states_count"],
        "shared_states": [st["name"] for st in coverage_data.get("states", [])],
        "portfolio_count": total_portfolio_count,
        "portfolio_previews": previews,
        "created_at": team.created_at.strftime("%b %d, %Y") if team.created_at else "",
        "owner": {
            "id": owner.id,
            "stage_name": owner.stage_name,
            "category_name": owner.category.name if owner.category else "",
        },
    }


def serialize_team_package(pkg, request=None):
    """
    Serializes a CollaborationPackage into a JSON-friendly dict (Phase 5B).
    Includes participating members (active stage name, category, profile photo).
    Zero leakage of private member information.
    """
    members_data = []
    for artist in pkg.participating_members.select_related("category").all():
        p_img = None
        if artist.profile_image:
            try:
                p_img = request.build_absolute_uri(artist.profile_image.url) if request else artist.profile_image.url
            except Exception:
                p_img = None
        members_data.append({
            "id": artist.id,
            "artist_id": artist.id,
            "stage_name": artist.stage_name,
            "category_name": artist.category.name if artist.category else "",
            "profile_image": p_img,
        })

    services = pkg.included_services
    if isinstance(services, str):
        try:
            services = json.loads(services)
        except Exception:
            services = [s.strip() for s in services.split("\n") if s.strip()]

    return {
        "id": pkg.id,
        "team_id": pkg.team_id,
        "name": pkg.name,
        "description": pkg.description,
        "starting_price": float(pkg.starting_price),
        "duration_minutes": pkg.duration_minutes,
        "duration_display": pkg.duration_display,
        "category": pkg.category.name if getattr(pkg, "category", None) else "",
        "category_id": pkg.category_id,
        "category_name": pkg.category.name if getattr(pkg, "category", None) else "",
        "included_services": services if isinstance(services, list) else [],
        "requirements": pkg.requirements,
        "is_active": pkg.is_active,
        "participating_members": members_data,
        "participating_members_count": len(members_data),
        "created_at": pkg.created_at.strftime("%b %d, %Y") if pkg.created_at else "",
        "updated_at": pkg.updated_at.strftime("%b %d, %Y") if pkg.updated_at else "",
    }


def serialize_team_booking(tb, current_user=None, request=None):
    """
    Phase 6: Serializes a TeamBooking with audit timestamps, package snapshots,
    member confirmation progress, and payment status.
    Protects private customer data (phone) except for owner and the customer themselves.
    """
    from zoneinfo import ZoneInfo
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    local_event_date = timezone.localtime(tb.event_date, timezone=kolkata_tz) if tb.event_date else None

    # Determine caller roles
    is_customer = bool(current_user and current_user.id == tb.customer_id)
    caller_artist = getattr(current_user, "artist_profile", None) if current_user else None
    is_owner = bool(caller_artist and caller_artist.id == tb.team.owner_id)
    is_participating = bool(caller_artist and tb.participating_members.filter(id=caller_artist.id).exists())

    # Build member confirmations list
    confirmations_data = []
    accepted_count = 0
    pending_count = 0
    declined_count = 0
    caller_confirmation_id = None
    caller_can_confirm = False

    for conf in tb.member_confirmations.select_related("artist", "artist__category").all():
        if conf.status == "accepted":
            accepted_count += 1
        elif conf.status == "pending":
            pending_count += 1
        elif conf.status == "declined":
            declined_count += 1

        if caller_artist and conf.artist_id == caller_artist.id:
            caller_confirmation_id = conf.id
            if conf.status == "pending" and tb.status == tb.Status.PENDING_MEMBER_CONFIRMATIONS:
                caller_can_confirm = True

        img = None
        if conf.artist.profile_image:
            try:
                img = request.build_absolute_uri(conf.artist.profile_image.url) if request else conf.artist.profile_image.url
            except Exception:
                img = conf.artist.profile_image.url

        confirmations_data.append({
            "id": conf.id,
            "artist_id": conf.artist_id,
            "stage_name": conf.artist.stage_name,
            "category_name": conf.artist.category.name if conf.artist.category else "",
            "profile_image": img,
            "status": conf.status,
            "responded_at": conf.responded_at.isoformat() if conf.responded_at else None,
            "response_message": conf.response_message,
        })

    # Payment details (if created)
    payment_data = None
    payment = getattr(tb, "payment", None)
    if payment:
        payment_data = {
            "id": payment.id,
            "status": payment.status,
            "amount": float(payment.amount),
            "commission_amount": float(payment.commission_amount),
            "artist_amount": float(payment.artist_amount),
            "razorpay_order_id": payment.razorpay_order_id,
            "transaction_id": payment.transaction_id,
        }

    # Team image
    team_image = None
    if tb.team.profile_image:
        try:
            team_image = request.build_absolute_uri(tb.team.profile_image.url) if request else tb.team.profile_image.url
        except Exception:
            team_image = tb.team.profile_image.url

    # Check expiration
    now = timezone.now()
    is_expired = False
    if tb.status == tb.Status.AWAITING_PAYMENT and tb.payment_deadline and now > tb.payment_deadline:
        is_expired = True
    elif tb.status == tb.Status.PENDING_MEMBER_CONFIRMATIONS and tb.member_confirmation_deadline and now > tb.member_confirmation_deadline:
        is_expired = True

    can_pay = bool(is_customer and tb.status == tb.Status.AWAITING_PAYMENT and not is_expired)
    can_owner_approve = bool(is_owner and tb.status == tb.Status.PENDING_OWNER_REVIEW)
    can_cancel = bool(is_customer and tb.status in [tb.Status.PENDING_OWNER_REVIEW, tb.Status.PENDING_MEMBER_CONFIRMATIONS, tb.Status.AWAITING_PAYMENT])

    return {
        "id": tb.id,
        "team": {
            "id": tb.team_id,
            "name": tb.team.name,
            "profile_image": team_image,
            "owner_id": tb.team.owner_id,
            "owner_name": tb.team.owner.stage_name if tb.team.owner else "",
        },
        "package": {
            "id": tb.package_id,
            "name": tb.package_name,
            "category": tb.package_category,
            "price": float(tb.package_price),
            "duration_minutes": tb.package_duration_minutes,
            "duration_display": tb.package_duration_display,
            "included_services": tb.package_inclusions,
            "requirements": tb.package_requirements,
        },
        "customer": {
            "id": tb.customer_id,
            "username": tb.customer.username,
            "full_name": f"{tb.customer.first_name} {tb.customer.last_name}".strip() or tb.customer.username,
            "phone": tb.customer_phone if (is_customer or is_owner) else "",
        },
        "event": {
            "type": tb.event_type,
            "date": tb.event_date.isoformat() if tb.event_date else None,
            "date_display": local_event_date.strftime("%b %d, %Y at %I:%M %p") if local_event_date else "",
            "day": tb.event_day.isoformat() if tb.event_day else None,
            "location": tb.event_location,
            "address": tb.event_address,
            "venue_name": tb.venue_name,
            "city": tb.city,
            "state": tb.state,
            "district_id": tb.district_id,
            "district_name": tb.district.name if tb.district else "",
            "expected_audience_size": tb.expected_audience_size,
            "performance_duration": tb.performance_duration,
            "additional_requirements": tb.additional_requirements,
            "customer_message": tb.customer_message,
        },
        "status": tb.status,
        "status_display": tb.get_status_display(),
        "is_expired": is_expired,
        "owner_reviewed_at": tb.owner_reviewed_at.isoformat() if tb.owner_reviewed_at else None,
        "owner_response_message": tb.owner_response_message,
        "all_members_confirmed_at": tb.all_members_confirmed_at.isoformat() if tb.all_members_confirmed_at else None,
        "payment_deadline": tb.payment_deadline.isoformat() if tb.payment_deadline else None,
        "member_confirmation_deadline": tb.member_confirmation_deadline.isoformat() if tb.member_confirmation_deadline else None,
        "rejection_reason": tb.rejection_reason,
        "declined_by_artist_name": tb.declined_by_artist.stage_name if tb.declined_by_artist else None,
        "member_confirmations": confirmations_data,
        "confirmations_summary": {
            "total": len(confirmations_data),
            "accepted": accepted_count,
            "pending": pending_count,
            "declined": declined_count,
        },
        "payment": payment_data,
        "permissions": {
            "is_customer": is_customer,
            "is_owner": is_owner,
            "is_participating": is_participating,
            "can_owner_approve": can_owner_approve,
            "can_confirm": caller_can_confirm,
            "confirmation_id": caller_confirmation_id,
            "can_pay": can_pay,
            "can_cancel": can_cancel,
        },
        "created_at": tb.created_at.isoformat() if tb.created_at else None,
        "updated_at": tb.updated_at.isoformat() if tb.updated_at else None,
    }


