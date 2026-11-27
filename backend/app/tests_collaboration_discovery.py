import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from django.utils import timezone

from app.models import (
    ArtistAvailability,
    ArtistProfile,
    ArtistServiceDistrict,
    Booking,
    Category,
    Country,
    District,
    State,
)
from app.collaboration_service import (
    calculate_shared_service_districts,
    extract_active_artist_ids,
    find_collaboration_recommendations,
    is_artist_eligible_for_collaboration,
    serialize_district_data,
)

User = get_user_model()


class SmartCollaborationDiscoveryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client = Client()
        cls.kolkata_tz = ZoneInfo("Asia/Kolkata")

        # Location Hierarchy
        cls.india = Country.objects.create(name="India", code="IN")
        cls.kerala = State.objects.create(
            name="Kerala", code="KL", country=cls.india, is_union_territory=False
        )
        cls.karnataka = State.objects.create(
            name="Karnataka", code="KA", country=cls.india, is_union_territory=False
        )
        cls.tamil_nadu = State.objects.create(
            name="Tamil Nadu", code="TN", country=cls.india, is_union_territory=False
        )

        # Kerala Districts
        cls.d_kozhikode = District.objects.create(name="Kozhikode", state=cls.kerala)
        cls.d_kannur = District.objects.create(name="Kannur", state=cls.kerala)
        cls.d_wayanad = District.objects.create(name="Wayanad", state=cls.kerala)
        cls.d_kasaragod = District.objects.create(name="Kasaragod", state=cls.kerala)
        cls.d_malappuram = District.objects.create(name="Malappuram", state=cls.kerala)

        # Karnataka Districts
        cls.d_bengaluru = District.objects.create(name="Bengaluru Urban", state=cls.karnataka)
        cls.d_mysuru = District.objects.create(name="Mysuru", state=cls.karnataka)

        # Categories
        cls.cat_singer = Category.objects.create(name="Singers", description="Vocalists")
        cls.cat_dancer = Category.objects.create(name="Dancers", description="Dance performers")
        cls.cat_dj = Category.objects.create(name="DJs", description="Disc jockeys")
        cls.cat_musician = Category.objects.create(name="Instrumentalists", description="Musicians")

        # 1. Primary Logged-in Artist (Singer): Base Kozhikode, covers Kozhikode, Kannur, Kasaragod
        cls.u_primary = User.objects.create_user(
            username="primary_artist", email="primary@example.com", password="password123"
        )
        cls.a_primary = ArtistProfile.objects.create(
            user=cls.u_primary,
            stage_name="Aarav Vocals",
            category=cls.cat_singer,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("15000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_primary, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_primary, district=cls.d_kannur)
        ArtistServiceDistrict.objects.create(artist=cls.a_primary, district=cls.d_kasaragod)

        # 2. Dancer Collaborator: Covers Kozhikode, Wayanad, Kannur
        cls.u_dancer = User.objects.create_user(
            username="dancer_artist", email="dancer@example.com", password="password123"
        )
        cls.a_dancer = ArtistProfile.objects.create(
            user=cls.u_dancer,
            stage_name="Maya Dance Troupe",
            category=cls.cat_dancer,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("20000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_dancer, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_dancer, district=cls.d_wayanad)
        ArtistServiceDistrict.objects.create(artist=cls.a_dancer, district=cls.d_kannur)

        # 3. DJ Collaborator: Covers Kozhikode, Malappuram
        cls.u_dj = User.objects.create_user(
            username="dj_artist", email="dj@example.com", password="password123"
        )
        cls.a_dj = ArtistProfile.objects.create(
            user=cls.u_dj,
            stage_name="DJ Rex",
            category=cls.cat_dj,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("12000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_dj, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_dj, district=cls.d_malappuram)

        # 4. Cross-state Musician: Base Karnataka (Bengaluru), covers Bengaluru, Mysuru, AND Kozhikode (Kerala)
        cls.u_musician = User.objects.create_user(
            username="cross_state_musician", email="musician@example.com", password="password123"
        )
        cls.a_musician = ArtistProfile.objects.create(
            user=cls.u_musician,
            stage_name="Karnataka Fusion Band",
            category=cls.cat_musician,
            country=cls.india,
            state=cls.karnataka,
            district=cls.d_bengaluru,
            location="Bengaluru, Karnataka",
            starting_price=Decimal("25000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_musician, district=cls.d_bengaluru)
        ArtistServiceDistrict.objects.create(artist=cls.a_musician, district=cls.d_mysuru)
        ArtistServiceDistrict.objects.create(artist=cls.a_musician, district=cls.d_kozhikode)

        # 5. Non-overlapping Artist: Only covers Bengaluru and Mysuru
        cls.u_bengaluru_only = User.objects.create_user(
            username="bengaluru_only", email="blronly@example.com", password="password123"
        )
        cls.a_bengaluru_only = ArtistProfile.objects.create(
            user=cls.u_bengaluru_only,
            stage_name="Bengaluru Solo Guitarist",
            category=cls.cat_musician,
            country=cls.india,
            state=cls.karnataka,
            district=cls.d_bengaluru,
            location="Bengaluru, Karnataka",
            starting_price=Decimal("8000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_bengaluru_only, district=cls.d_bengaluru)
        ArtistServiceDistrict.objects.create(artist=cls.a_bengaluru_only, district=cls.d_mysuru)

        # 6. Unverified Artist: Covers Kozhikode but not approved
        cls.u_unverified = User.objects.create_user(
            username="unverified_artist", email="unverified@example.com", password="password123"
        )
        cls.a_unverified = ArtistProfile.objects.create(
            user=cls.u_unverified,
            stage_name="Pending Vocalist",
            category=cls.cat_singer,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("10000.00"),
            is_verified=False,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_unverified, district=cls.d_kozhikode)

        # 7. Inactive Artist: is_active=False
        cls.u_inactive = User.objects.create_user(
            username="inactive_artist", email="inactive@example.com", password="password123"
        )
        cls.a_inactive = ArtistProfile.objects.create(
            user=cls.u_inactive,
            stage_name="Inactive Performer",
            category=cls.cat_dancer,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("10000.00"),
            is_verified=True,
            is_active=False,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_inactive, district=cls.d_kozhikode)

        # 8. Customer user (not an artist)
        cls.u_customer = User.objects.create_user(
            username="regular_customer", email="customer@example.com", password="password123"
        )

    # --------------------------------------------------------------------------
    # 1. District Intersection Unit Tests
    # --------------------------------------------------------------------------

    def test_example_intersection_singer_dancer_dj(self):
        """
        Verify the exact product example:
        - Singer: Kozhikode, Kannur, Kasaragod
        - Dancer: Kozhikode, Wayanad, Kannur
        - DJ: Kozhikode, Malappuram
        Intersection must be exactly [Kozhikode].
        """
        shared = calculate_shared_service_districts([self.a_primary, self.a_dancer, self.a_dj])
        self.assertEqual(list(shared.values_list("name", flat=True)), ["Kozhikode"])

    def test_two_member_multiple_districts_intersection(self):
        """
        Singer (Kozhikode, Kannur, Kasaragod) + Dancer (Kozhikode, Wayanad, Kannur)
        Intersection must be [Kannur, Kozhikode] (alphabetical by name).
        """
        shared = calculate_shared_service_districts([self.a_primary, self.a_dancer])
        names = list(shared.values_list("name", flat=True))
        self.assertEqual(sorted(names), ["Kannur", "Kozhikode"])

    def test_cross_state_shared_coverage(self):
        """
        Singer (Kerala base) and Musician (Karnataka base, covers Kozhikode too)
        Intersection must return Kozhikode.
        """
        shared = calculate_shared_service_districts([self.a_primary, self.a_musician])
        self.assertEqual(list(shared.values_list("name", flat=True)), ["Kozhikode"])

    def test_empty_intersection_returns_none(self):
        """
        Singer (Kozhikode, Kannur, Kasaragod) + Bengaluru-only Artist (Bengaluru, Mysuru)
        Intersection has zero common districts.
        """
        shared = calculate_shared_service_districts([self.a_primary, self.a_bengaluru_only])
        self.assertEqual(shared.count(), 0)

    def test_empty_member_list_returns_none(self):
        """Empty member list returns empty queryset safely."""
        shared = calculate_shared_service_districts([])
        self.assertEqual(shared.count(), 0)

    def test_single_member_coverage(self):
        """Single member returns all configured service districts for that member."""
        shared = calculate_shared_service_districts([self.a_primary])
        self.assertEqual(shared.count(), 3)
        self.assertIn("Kozhikode", list(shared.values_list("name", flat=True)))
        self.assertIn("Kannur", list(shared.values_list("name", flat=True)))
        self.assertIn("Kasaragod", list(shared.values_list("name", flat=True)))

    def test_pending_declined_removed_members_excluded(self):
        """
        Ensure pending/declined/removed member dictionaries or objects do not
        contribute to team coverage intersection.
        """
        members = [
            {"artist": self.a_primary, "status": "active"},
            {"artist": self.a_dancer, "status": "active"},
            # Inactive/pending collaborator whose service district would otherwise restrict the intersection
            {"artist": self.a_bengaluru_only, "status": "pending"},
            {"artist": self.a_dj, "status": "declined"},
            {"artist": self.a_musician, "status": "removed"},
        ]
        # Only active members (a_primary & a_dancer) are evaluated
        shared = calculate_shared_service_districts(members)
        names = sorted(list(shared.values_list("name", flat=True)))
        self.assertEqual(names, ["Kannur", "Kozhikode"])

    def test_unverified_and_inactive_artists_excluded_from_calculation(self):
        """
        Ensure artists who fail platform public visibility rules are excluded from
        active team coverage.
        """
        self.assertFalse(is_artist_eligible_for_collaboration(self.a_unverified))
        self.assertFalse(is_artist_eligible_for_collaboration(self.a_inactive))
        self.assertTrue(is_artist_eligible_for_collaboration(self.a_primary))

        members = [self.a_primary, self.a_unverified, self.a_inactive]
        # Only a_primary is eligible
        shared = calculate_shared_service_districts(members, only_eligible=True)
        self.assertEqual(shared.count(), 3)

    def test_service_district_changes_dynamically_reflected(self):
        """
        Modifying an artist's service districts immediately affects subsequent
        shared coverage calculations without stale results.
        """
        # Initially Singer + DJ = [Kozhikode]
        shared1 = calculate_shared_service_districts([self.a_primary, self.a_dj])
        self.assertEqual(list(shared1.values_list("name", flat=True)), ["Kozhikode"])

        # Add Kannur to DJ's coverage
        new_sd = ArtistServiceDistrict.objects.create(artist=self.a_dj, district=self.d_kannur)
        try:
            shared2 = calculate_shared_service_districts([self.a_primary, self.a_dj])
            self.assertEqual(sorted(list(shared2.values_list("name", flat=True))), ["Kannur", "Kozhikode"])
        finally:
            new_sd.delete()

    # --------------------------------------------------------------------------
    # 2. Recommendations Service Unit Tests
    # --------------------------------------------------------------------------

    def test_recommendations_exclude_requesting_artist(self):
        """Requesting artist must never appear in their own recommendations."""
        res = find_collaboration_recommendations(requesting_artist=self.a_primary)
        collab_ids = [c["id"] for c in res["collaborators"]]
        self.assertNotIn(self.a_primary.id, collab_ids)

    def test_recommendations_exclude_unverified_and_inactive(self):
        """Unverified and inactive artists must not be recommended."""
        res = find_collaboration_recommendations(requesting_artist=self.a_primary)
        collab_ids = [c["id"] for c in res["collaborators"]]
        self.assertNotIn(self.a_unverified.id, collab_ids)
        self.assertNotIn(self.a_inactive.id, collab_ids)

    def test_recommendations_exclude_disjoint_artists(self):
        """Artists with zero shared service districts must not be recommended."""
        res = find_collaboration_recommendations(requesting_artist=self.a_primary)
        collab_ids = [c["id"] for c in res["collaborators"]]
        self.assertNotIn(self.a_bengaluru_only.id, collab_ids)

    def test_recommendations_include_cross_state_collaborators(self):
        """
        Cross-state artist (Bengaluru Fusion Band) serving Kozhikode must be recommended,
        and show Kozhikode as a shared district.
        """
        res = find_collaboration_recommendations(requesting_artist=self.a_primary)
        collab_ids = [c["id"] for c in res["collaborators"]]
        self.assertIn(self.a_musician.id, collab_ids)

        musician_card = next(c for c in res["collaborators"] if c["id"] == self.a_musician.id)
        shared_names = [d["name"] for d in musician_card["shared_districts"]]
        self.assertIn("Kozhikode", shared_names)

    def test_recommendations_event_date_availability(self):
        """
        When event_date is passed, exclude artists who have manual blocks or bookings on that date.
        """
        event_date = "2027-05-15"
        cal_date = datetime.date(2027, 5, 15)

        # DJ has a manual block on this date
        ArtistAvailability.objects.create(
            artist=self.a_dj,
            date=cal_date,
            is_available=False,
            reason="Private gig",
        )

        res = find_collaboration_recommendations(
            requesting_artist=self.a_primary,
            event_date_str=event_date,
        )
        collab_ids = [c["id"] for c in res["collaborators"]]
        self.assertNotIn(self.a_dj.id, collab_ids)
        self.assertIn(self.a_dancer.id, collab_ids)

    def test_recommendations_category_and_price_filters(self):
        """Filter recommendations by category and price range."""
        res = find_collaboration_recommendations(
            requesting_artist=self.a_primary,
            category="Dancers",
            min_price=15000,
            max_price=22000,
        )
        collab_ids = [c["id"] for c in res["collaborators"]]
        self.assertEqual(collab_ids, [self.a_dancer.id])

    # --------------------------------------------------------------------------
    # 3. HTTP Endpoints Tests
    # --------------------------------------------------------------------------

    def test_recommendations_endpoint_requires_auth(self):
        """Unauthenticated call to recommendations returns 401."""
        res = self.client.get("/api/artist/collaborations/recommendations/")
        self.assertEqual(res.status_code, 401)

    def test_recommendations_endpoint_requires_artist_profile(self):
        """Non-artist customer user returns 403."""
        self.client.force_login(self.u_customer)
        res = self.client.get("/api/artist/collaborations/recommendations/")
        self.assertEqual(res.status_code, 403)

    def test_recommendations_endpoint_success(self):
        """Authenticated artist gets structured recommendations with shared districts."""
        self.client.force_login(self.u_primary)
        res = self.client.get("/api/artist/collaborations/recommendations/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("collaborators", data)
        self.assertIn("total_count", data)
        self.assertIn("my_districts_count", data)
        self.assertGreaterEqual(len(data["collaborators"]), 2)

        # Verify shared districts metadata structure
        first_c = data["collaborators"][0]
        self.assertIn("shared_districts", first_c)
        self.assertIn("shared_districts_count", first_c)
        self.assertIn("shared_states", first_c)

    def test_recommendations_endpoint_invalid_date_format_400(self):
        """Invalid date format returns 400."""
        self.client.force_login(self.u_primary)
        res = self.client.get("/api/artist/collaborations/recommendations/?event_date=15-05-2027")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid event_date format", res.json()["error"])

    def test_shared_coverage_endpoint_post(self):
        """POST /api/artist/collaborations/shared-coverage/ computes intersection correctly."""
        self.client.force_login(self.u_primary)
        payload = {
            "artist_ids": [self.a_dancer.id, self.a_dj.id],
        }
        res = self.client.post(
            "/api/artist/collaborations/shared-coverage/",
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["shared_districts_count"], 1)
        self.assertEqual(data["shared_districts"][0]["name"], "Kozhikode")
        self.assertEqual(len(data["participating_artists"]), 3)  # primary + dancer + dj

    def test_shared_coverage_endpoint_invalid_artist_id_400(self):
        """Non-integer artist ID returns 400."""
        self.client.force_login(self.u_primary)
        res = self.client.post(
            "/api/artist/collaborations/shared-coverage/",
            data={"artist_ids": ["abc"]},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Artist IDs must be integers", res.json()["error"])
