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


class CollaborationTeamProfileAndPortfolioTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Geography
        cls.india = Country.objects.create(name="India", code="IN")
        cls.kerala = State.objects.create(
            name="Kerala", code="KL", country=cls.india, is_union_territory=False
        )
        cls.d_kozhikode = District.objects.create(name="Kozhikode", state=cls.kerala)
        cls.d_kannur = District.objects.create(name="Kannur", state=cls.kerala)

        # Categories
        cls.cat_band = Category.objects.create(name="Bands", description="Musical Bands")
        cls.cat_vocal = Category.objects.create(name="Vocalists", description="Singers")

        # Artist 1: Owner (Aarav)
        cls.u_aarav = User.objects.create_user(
            username="aarav_owner", email="aarav@example.com", password="password123"
        )
        cls.a_aarav = ArtistProfile.objects.create(
            user=cls.u_aarav,
            stage_name="Aarav Vocalist",
            category=cls.cat_vocal,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("12000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(
            artist=cls.a_aarav, district=cls.d_kozhikode
        )
        ArtistServiceDistrict.objects.create(
            artist=cls.a_aarav, district=cls.d_kannur
        )

        # Artist 2: Member (Benny)
        cls.u_benny = User.objects.create_user(
            username="benny_member", email="benny@example.com", password="password123"
        )
        cls.a_benny = ArtistProfile.objects.create(
            user=cls.u_benny,
            stage_name="Benny Bass",
            category=cls.cat_band,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("10000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(
            artist=cls.a_benny, district=cls.d_kozhikode
        )
        ArtistServiceDistrict.objects.create(
            artist=cls.a_benny, district=cls.d_kannur
        )

        # Artist 3: Outsider (Charlie)
        cls.u_charlie = User.objects.create_user(
            username="charlie_out", email="charlie@example.com", password="password123"
        )
        cls.a_charlie = ArtistProfile.objects.create(
            user=cls.u_charlie,
            stage_name="Charlie Drums",
            category=cls.cat_band,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("8000.00"),
            is_verified=True,
            is_active=True,
        )

        # Team Setup
        cls.team = CollaborationTeam.objects.create(
            name="Tharangam Band",
            description="Leading fusion ensemble in Kerala",
            owner=cls.a_aarav,
            category=cls.cat_band,
            is_active=True,
            is_publicly_visible=True,
        )
        cls.m_owner = CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_aarav,
            role=CollaborationTeamMember.Role.OWNER,
            status=CollaborationTeamMember.Status.ACTIVE,
            joined_at=timezone.now(),
        )
        cls.m_benny = CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_benny,
            role=CollaborationTeamMember.Role.MEMBER,
            status=CollaborationTeamMember.Status.ACTIVE,
            joined_at=timezone.now(),
        )

    def setUp(self):
        self.client = Client()

    # -------------------------------------------------------------------------
    # Team Profile Management Tests
    # -------------------------------------------------------------------------

    def test_owner_can_update_team_profile(self):
        """Team owner can update name, description, category, and public visibility."""
        self.client.force_login(self.u_aarav)
        payload = {
            "name": "Tharangam Fusion Live",
            "description": "Updated grand fusion ensemble description",
            "category_id": self.cat_vocal.id,
            "is_publicly_visible": True,
        }
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/profile/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["team"]["name"], "Tharangam Fusion Live")
        self.assertEqual(data["team"]["category"]["id"], self.cat_vocal.id)

        self.team.refresh_from_db()
        self.assertEqual(self.team.name, "Tharangam Fusion Live")
        self.assertEqual(self.team.category, self.cat_vocal)

    def test_non_owner_member_cannot_update_team_profile(self):
        """Active non-owner member receives HTTP 403 when attempting to update team profile."""
        self.client.force_login(self.u_benny)
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/profile/",
            data=json.dumps({"name": "Hacked Name"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Only the team owner", res.json()["error"])

    def test_unauthenticated_cannot_update_team_profile(self):
        """Unauthenticated user receives HTTP 401."""
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/profile/",
            data=json.dumps({"name": "Hacked Name"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 401)

    def test_team_profile_name_validation(self):
        """Empty team name or excessive length is rejected with HTTP 400."""
        self.client.force_login(self.u_aarav)
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/profile/",
            data=json.dumps({"name": "   "}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Team name cannot be empty", res.json()["error"])

    # -------------------------------------------------------------------------
    # Team Portfolio CRUD & Reordering Tests
    # -------------------------------------------------------------------------

    def test_owner_can_add_youtube_portfolio_item(self):
        """Owner can add a YouTube video item with auto thumbnail generation."""
        self.client.force_login(self.u_aarav)
        payload = {
            "item_type": "youtube",
            "title": "Live at Kochi Stadium",
            "description": "Fusion performance live 2026",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "is_public": True,
        }
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/portfolio/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        item = data["item"]
        self.assertEqual(item["title"], "Live at Kochi Stadium")
        self.assertEqual(item["item_type"], "youtube")
        self.assertEqual(item["youtube_id"], "dQw4w9WgXcQ")
        self.assertIn("hqdefault.jpg", item["thumbnail_url"])

    def test_invalid_youtube_url_rejected(self):
        """Non-YouTube or malformed URL returns HTTP 400."""
        self.client.force_login(self.u_aarav)
        payload = {
            "item_type": "youtube",
            "youtube_url": "https://notyoutube.com/watch?v=123",
        }
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/portfolio/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)

    def test_non_owner_cannot_add_portfolio_item(self):
        """Non-owner member receives HTTP 403 when adding portfolio items."""
        self.client.force_login(self.u_benny)
        payload = {
            "item_type": "youtube",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        }
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/portfolio/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

    def test_owner_can_update_and_delete_portfolio_item(self):
        """Owner can update item properties and delete items; non-owner cannot."""
        item = CollaborationTeamPortfolio.objects.create(
            team=self.team,
            item_type="photo",
            title="Concert Photo 1",
            media_url="https://example.com/photo1.jpg",
            is_public=True,
            display_order=1,
        )

        # Non-owner cannot update
        self.client.force_login(self.u_benny)
        res = self.client.put(
            f"/api/artist/teams/{self.team.id}/portfolio/{item.id}/",
            data=json.dumps({"title": "Benny Edited Title"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

        # Owner can update
        self.client.force_login(self.u_aarav)
        res = self.client.put(
            f"/api/artist/teams/{self.team.id}/portfolio/{item.id}/",
            data=json.dumps({"title": "Aarav Edited Title", "is_public": False}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.title, "Aarav Edited Title")
        self.assertFalse(item.is_public)

        # Owner can delete
        del_res = self.client.delete(
            f"/api/artist/teams/{self.team.id}/portfolio/{item.id}/"
        )
        self.assertEqual(del_res.status_code, 200)
        self.assertFalse(
            CollaborationTeamPortfolio.objects.filter(id=item.id).exists()
        )

    def test_owner_can_reorder_portfolio_items(self):
        """Owner can update display_order of portfolio items."""
        p1 = CollaborationTeamPortfolio.objects.create(
            team=self.team, item_type="photo", title="P1", display_order=1
        )
        p2 = CollaborationTeamPortfolio.objects.create(
            team=self.team, item_type="photo", title="P2", display_order=2
        )

        self.client.force_login(self.u_aarav)
        res = self.client.post(
            f"/api/artist/teams/{self.team.id}/portfolio/reorder/",
            data=json.dumps({"item_ids": [p2.id, p1.id]}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p2.display_order, 1)
        self.assertEqual(p1.display_order, 2)

    # -------------------------------------------------------------------------
    # Public Team Profile & Privacy Isolation Tests
    # -------------------------------------------------------------------------

    def test_public_team_detail_accessible(self):
        """Public team profile endpoint returns team info, active members, shared coverage, and public media."""
        # Add public and private portfolio items
        CollaborationTeamPortfolio.objects.create(
            team=self.team, item_type="photo", title="Public Photo", is_public=True, display_order=1
        )
        CollaborationTeamPortfolio.objects.create(
            team=self.team, item_type="photo", title="Secret Photo", is_public=False, display_order=2
        )

        # Unauthenticated public request
        res = self.client.get(f"/api/teams/{self.team.id}/")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["name"], "Tharangam Band")
        self.assertEqual(data["members_count"], 2)
        # Shared coverage has Kozhikode and Kannur
        self.assertEqual(data["shared_coverage"]["count"], 2)

        # Only 1 public portfolio item returned; private item is excluded
        self.assertEqual(data["portfolio_count"], 1)
        self.assertEqual(data["portfolio"][0]["title"], "Public Photo")

        # Zero private data leakage
        for m in data["members"]:
            self.assertNotIn("email", m)
            self.assertNotIn("user_id", m)
            self.assertNotIn("phone", m)
        self.assertNotIn("pending_invitations", data)

    def test_private_team_profile_isolation(self):
        """When is_publicly_visible is False, public users get 404 while owner gets preview."""
        self.team.is_publicly_visible = False
        self.team.save()

        # Public user -> 404
        pub_res = self.client.get(f"/api/teams/{self.team.id}/")
        self.assertEqual(pub_res.status_code, 404)
        self.assertIn("profile is set to private", pub_res.json()["error"])

        # Authenticated owner -> 200 with preview flag
        self.client.force_login(self.u_aarav)
        owner_res = self.client.get(f"/api/teams/{self.team.id}/")
        self.assertEqual(owner_res.status_code, 200)
        self.assertTrue(owner_res.json()["is_preview"])

    def test_inactive_team_returns_404_for_all(self):
        """When team is deactivated (is_active=False), returns 404 for everyone."""
        self.team.is_active = False
        self.team.save()

        # Public -> 404
        pub_res = self.client.get(f"/api/teams/{self.team.id}/")
        self.assertEqual(pub_res.status_code, 404)

        # Owner -> 404
        self.client.force_login(self.u_aarav)
        owner_res = self.client.get(f"/api/teams/{self.team.id}/")
        self.assertEqual(owner_res.status_code, 404)
