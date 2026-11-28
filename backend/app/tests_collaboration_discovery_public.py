import json
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from app.models import (
    ArtistProfile,
    ArtistServiceDistrict,
    Category,
    CollaborationTeam,
    CollaborationTeamMember,
    CollaborationTeamPortfolio,
    Country,
    District,
    State,
)

User = get_user_model()


class PublicCollaborationDiscoveryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Geography
        cls.india = Country.objects.create(name="India", code="IN")
        cls.kerala = State.objects.create(
            name="Kerala", code="KL", country=cls.india, is_union_territory=False
        )
        cls.karnataka = State.objects.create(
            name="Karnataka", code="KA", country=cls.india, is_union_territory=False
        )

        cls.d_kozhikode = District.objects.create(name="Kozhikode", state=cls.kerala)
        cls.d_kannur = District.objects.create(name="Kannur", state=cls.kerala)
        cls.d_bengaluru = District.objects.create(name="Bengaluru Urban", state=cls.karnataka)

        # Categories
        cls.cat_fusion = Category.objects.create(name="Fusion Bands", description="Fusion Musical Bands")
        cls.cat_dance = Category.objects.create(name="Dance Ensembles", description="Dance Groups")

        # Artist 1: Verified (Aarav) - Kozhikode, Kannur
        cls.u_aarav = User.objects.create_user(
            username="aarav_disc", email="aarav@example.com", password="password123"
        )
        cls.a_aarav = ArtistProfile.objects.create(
            user=cls.u_aarav,
            stage_name="Aarav Strings",
            category=cls.cat_fusion,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("12000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_aarav, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_aarav, district=cls.d_kannur)

        # Artist 2: Verified (Benny) - Kozhikode, Kannur, Bengaluru
        cls.u_benny = User.objects.create_user(
            username="benny_disc", email="benny@example.com", password="password123"
        )
        cls.a_benny = ArtistProfile.objects.create(
            user=cls.u_benny,
            stage_name="Benny Bassist",
            category=cls.cat_fusion,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("10000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_benny, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_benny, district=cls.d_kannur)
        ArtistServiceDistrict.objects.create(artist=cls.a_benny, district=cls.d_bengaluru)

        # Artist 3: Verified (Maya) - Bengaluru only
        cls.u_maya = User.objects.create_user(
            username="maya_disc", email="maya@example.com", password="password123"
        )
        cls.a_maya = ArtistProfile.objects.create(
            user=cls.u_maya,
            stage_name="Maya Dance",
            category=cls.cat_dance,
            country=cls.india,
            state=cls.karnataka,
            district=cls.d_bengaluru,
            starting_price=Decimal("15000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_maya, district=cls.d_bengaluru)

        # Artist 4: Unverified Performer
        cls.u_unverified = User.objects.create_user(
            username="unverif_disc", email="unverif@example.com", password="password123"
        )
        cls.a_unverified = ArtistProfile.objects.create(
            user=cls.u_unverified,
            stage_name="Rookie Performer",
            category=cls.cat_dance,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            is_verified=False,
            is_active=True,
        )

        # Team 1: Tharangam (Aarav + Benny) -> Shared coverage: Kozhikode, Kannur (Kerala)
        cls.t_tharangam = CollaborationTeam.objects.create(
            name="Tharangam Ensemble",
            description="Leading instrumental fusion band in South India",
            owner=cls.a_aarav,
            category=cls.cat_fusion,
            is_active=True,
            is_publicly_visible=True,
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_tharangam, artist=cls.a_aarav, role="owner", status="active", joined_at=timezone.now()
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_tharangam, artist=cls.a_benny, role="member", status="active", joined_at=timezone.now()
        )
        CollaborationTeamPortfolio.objects.create(
            team=cls.t_tharangam,
            item_type="photo",
            title="Stage Photo 1",
            media_url="https://example.com/p1.jpg",
            is_public=True,
            display_order=1,
        )

        # Team 2: Maya Natya (Maya + Benny) -> Shared coverage: Bengaluru Urban (Karnataka)
        cls.t_maya = CollaborationTeam.objects.create(
            name="Maya Natya Troupe",
            description="Contemporary classical dance collaboration",
            owner=cls.a_maya,
            category=cls.cat_dance,
            is_active=True,
            is_publicly_visible=True,
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_maya, artist=cls.a_maya, role="owner", status="active", joined_at=timezone.now()
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_maya, artist=cls.a_benny, role="member", status="active", joined_at=timezone.now()
        )

        # Team 3: Private Team (Hidden)
        cls.t_private = CollaborationTeam.objects.create(
            name="Secret Studio Project",
            description="Private rehearsal group",
            owner=cls.a_aarav,
            category=cls.cat_fusion,
            is_active=True,
            is_publicly_visible=False,
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_private, artist=cls.a_aarav, role="owner", status="active"
        )

        # Team 4: Inactive Team (Disbanded)
        cls.t_inactive = CollaborationTeam.objects.create(
            name="Disbanded Troupe",
            description="Former performing troupe",
            owner=cls.a_aarav,
            category=cls.cat_fusion,
            is_active=False,
            is_publicly_visible=True,
        )

        # Team 5: Ineligible Team (Contains unverified member)
        cls.t_ineligible = CollaborationTeam.objects.create(
            name="Unverified Collab Crew",
            description="Contains unverified artist",
            owner=cls.a_aarav,
            category=cls.cat_fusion,
            is_active=True,
            is_publicly_visible=True,
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_ineligible, artist=cls.a_aarav, role="owner", status="active"
        )
        CollaborationTeamMember.objects.create(
            team=cls.t_ineligible, artist=cls.a_unverified, role="member", status="active"
        )

    def setUp(self):
        self.client = Client()

    def test_public_teams_list_endpoint_and_pagination(self):
        """GET /api/teams/ returns eligible public teams with pagination metadata."""
        res = self.client.get("/api/teams/")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("teams", data)
        self.assertIn("total_count", data)
        self.assertIn("page", data)
        self.assertIn("has_more", data)
        self.assertIn("categories", data)

        # Only Team 1 (Tharangam) and Team 2 (Maya Natya) are eligible and public
        team_ids = [t["id"] for t in data["teams"]]
        self.assertIn(self.t_tharangam.id, team_ids)
        self.assertIn(self.t_maya.id, team_ids)
        self.assertEqual(data["total_count"], 2)

    def test_private_inactive_and_ineligible_teams_excluded(self):
        """Private, inactive, and ineligible teams are strictly excluded from public collaboration discovery."""
        res = self.client.get("/api/teams/")
        data = res.json()
        team_ids = [t["id"] for t in data["teams"]]

        self.assertNotIn(self.t_private.id, team_ids)
        self.assertNotIn(self.t_inactive.id, team_ids)
        self.assertNotIn(self.t_ineligible.id, team_ids)

    def test_filter_by_search_keyword(self):
        """Search query matches team name, description, category, or active member stage name."""
        # Search by team name
        res1 = self.client.get("/api/teams/?search=Tharangam")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["total_count"], 1)
        self.assertEqual(res1.json()["teams"][0]["id"], self.t_tharangam.id)

        # Search by active member stage name (Benny Bassist is in both teams)
        res2 = self.client.get("/api/teams/?search=Bassist")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["total_count"], 2)

        # Search with no match
        res3 = self.client.get("/api/teams/?search=NonExistentEnsembleXYZ")
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json()["total_count"], 0)

    def test_filter_by_category(self):
        """Filtering by category ID or name returns matching teams only."""
        res = self.client.get(f"/api/teams/?category={self.cat_dance.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["total_count"], 1)
        self.assertEqual(res.json()["teams"][0]["id"], self.t_maya.id)

    def test_filter_by_state(self):
        """Filtering by state returns teams covering shared districts in that state."""
        # Kerala state -> Tharangam covers Kozhikode & Kannur
        res_kl = self.client.get(f"/api/teams/?state_id={self.kerala.id}")
        self.assertEqual(res_kl.status_code, 200)
        kl_ids = [t["id"] for t in res_kl.json()["teams"]]
        self.assertIn(self.t_tharangam.id, kl_ids)
        self.assertNotIn(self.t_maya.id, kl_ids)

        # Karnataka state -> Maya Natya covers Bengaluru Urban
        res_ka = self.client.get(f"/api/teams/?state_id={self.karnataka.id}")
        self.assertEqual(res_ka.status_code, 200)
        ka_ids = [t["id"] for t in res_ka.json()["teams"]]
        self.assertIn(self.t_maya.id, ka_ids)
        self.assertNotIn(self.t_tharangam.id, ka_ids)

    def test_filter_by_district(self):
        """Filtering by district returns teams whose shared coverage includes that district."""
        res = self.client.get(f"/api/teams/?district_id={self.d_kozhikode.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["total_count"], 1)
        self.assertEqual(res.json()["teams"][0]["id"], self.t_tharangam.id)

    def test_team_card_fields_and_zero_private_leakage(self):
        """Team cards contain required public fields and zero private member information."""
        res = self.client.get(f"/api/teams/?search=Tharangam")
        self.assertEqual(res.status_code, 200)
        team_card = res.json()["teams"][0]

        # Public fields
        self.assertEqual(team_card["id"], self.t_tharangam.id)
        self.assertEqual(team_card["name"], "Tharangam Ensemble")
        self.assertEqual(team_card["active_members_count"], 2)
        self.assertEqual(team_card["shared_districts_count"], 2)
        self.assertEqual(team_card["portfolio_count"], 1)
        self.assertEqual(len(team_card["portfolio_previews"]), 1)
        self.assertEqual(team_card["portfolio_previews"][0]["title"], "Stage Photo 1")

        # Zero private leakage check
        card_str = json.dumps(team_card)
        self.assertNotIn("email", card_str)
        self.assertNotIn("phone", card_str)
        self.assertNotIn("user_id", card_str)
        self.assertNotIn("pending_invitations", card_str)
