import json
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from app.models import (
    ArtistProfile,
    ArtistServiceDistrict,
    Category,
    CollaborationPackage,
    CollaborationTeam,
    CollaborationTeamMember,
    Country,
    District,
    State,
)

User = get_user_model()


class CollaborationPackageTests(TestCase):
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
        cls.cat_vocal = Category.objects.create(name="Singers", description="Vocalists")

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

        # Artist 3: Pending Invitee (Charlie)
        cls.u_charlie = User.objects.create_user(
            username="charlie_pending", email="charlie@example.com", password="password123"
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
        ArtistServiceDistrict.objects.create(
            artist=cls.a_charlie, district=cls.d_kozhikode
        )

        # Artist 4: Outsider (Divya)
        cls.u_divya = User.objects.create_user(
            username="divya_outsider", email="divya@example.com", password="password123"
        )
        cls.a_divya = ArtistProfile.objects.create(
            user=cls.u_divya,
            stage_name="Divya Flute",
            category=cls.cat_band,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("7000.00"),
            is_verified=True,
            is_active=True,
        )

        # Team Creation
        cls.team = CollaborationTeam.objects.create(
            name="Acoustic Pulse",
            description="High energy acoustic and vocal collaboration",
            owner=cls.a_aarav,
            category=cls.cat_band,
            is_active=True,
            is_publicly_visible=True,
        )

        # Memberships:
        # Aarav - Owner (Active)
        cls.m_aarav = CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_aarav,
            role=CollaborationTeamMember.Role.OWNER,
            status=CollaborationTeamMember.Status.ACTIVE,
            invited_by=cls.a_aarav,
            responded_at=timezone.now(),
        )
        # Benny - Member (Active)
        cls.m_benny = CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_benny,
            role=CollaborationTeamMember.Role.MEMBER,
            status=CollaborationTeamMember.Status.ACTIVE,
            invited_by=cls.a_aarav,
            responded_at=timezone.now(),
        )
        # Charlie - Pending
        cls.m_charlie = CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_charlie,
            role=CollaborationTeamMember.Role.MEMBER,
            status=CollaborationTeamMember.Status.PENDING,
            invited_by=cls.a_aarav,
        )

    def setUp(self):
        self.client_aarav = Client()
        self.client_aarav.force_login(self.u_aarav)

        self.client_benny = Client()
        self.client_benny.force_login(self.u_benny)

        self.client_divya = Client()
        self.client_divya.force_login(self.u_divya)

        self.anon_client = Client()

    def test_owner_can_create_package_successfully(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"
        payload = {
            "name": "Live Acoustic Duo Special",
            "description": "2-hour soulful acoustic and vocal stage performance.",
            "starting_price": 25000,
            "duration_minutes": 120,
            "category": "Singers",
            "included_services": [
                "2x 60-minute acoustic sets",
                "Pro vocal sound setup",
                "1 custom request song",
            ],
            "requirements": "2 vocal microphones, stereo DI box",
            "participating_member_ids": [self.a_aarav.id, self.a_benny.id],
            "is_active": True,
        }

        response = self.client_aarav.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data.get("success"))
        pkg = data.get("package")
        self.assertEqual(pkg.get("name"), "Live Acoustic Duo Special")
        self.assertEqual(pkg.get("starting_price"), 25000.0)
        self.assertEqual(pkg.get("duration_minutes"), 120)
        self.assertEqual(pkg.get("duration_display"), "2 hrs")
        self.assertEqual(len(pkg.get("participating_members")), 2)
        self.assertEqual(len(pkg.get("included_services")), 3)

        # DB verification
        db_pkg = CollaborationPackage.objects.get(id=pkg["id"])
        self.assertEqual(db_pkg.name, "Live Acoustic Duo Special")
        self.assertEqual(db_pkg.participating_members.count(), 2)

    def test_non_owner_member_cannot_create_package(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"
        payload = {
            "name": "Benny Solo Spot",
            "starting_price": 8000,
            "duration_minutes": 60,
            "participating_member_ids": [self.a_benny.id],
        }
        response = self.client_benny.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("owner", response.json().get("error", "").lower())

    def test_unauthenticated_or_outsider_rejected(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"
        # Unauthenticated
        res_anon = self.anon_client.get(url)
        self.assertEqual(res_anon.status_code, 401)

        # Outsider
        res_divya = self.client_divya.get(url)
        self.assertEqual(res_divya.status_code, 403)

    def test_validation_rejects_negative_price(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"
        payload = {
            "name": "Negative Price Package",
            "starting_price": -500,
            "duration_minutes": 60,
            "participating_member_ids": [self.a_aarav.id],
        }
        response = self.client_aarav.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("price", response.json().get("error", "").lower())

    def test_validation_rejects_invalid_duration(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"
        payload = {
            "name": "Zero Duration Package",
            "starting_price": 5000,
            "duration_minutes": 0,
            "participating_member_ids": [self.a_aarav.id],
        }
        response = self.client_aarav.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("duration", response.json().get("error", "").lower())

    def test_participating_members_must_be_active_accepted_members(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"

        # 1. Charlie is pending
        payload_pending = {
            "name": "Pending Member Package",
            "starting_price": 10000,
            "duration_minutes": 60,
            "participating_member_ids": [self.a_aarav.id, self.a_charlie.id],
        }
        res_pending = self.client_aarav.post(
            url, data=json.dumps(payload_pending), content_type="application/json"
        )
        self.assertEqual(res_pending.status_code, 400)
        self.assertIn("active", res_pending.json().get("error", "").lower())

        # 2. Divya is not in the team
        payload_outsider = {
            "name": "Outsider Member Package",
            "starting_price": 10000,
            "duration_minutes": 60,
            "participating_member_ids": [self.a_divya.id],
        }
        res_outsider = self.client_aarav.post(
            url, data=json.dumps(payload_outsider), content_type="application/json"
        )
        self.assertEqual(res_outsider.status_code, 400)

    def test_duplicate_member_ids_deduplicated_safely(self):
        url = f"/api/artist/teams/{self.team.id}/packages/"
        payload = {
            "name": "Duplicate Members Test",
            "starting_price": 15000,
            "duration_minutes": 90,
            "participating_member_ids": [self.a_aarav.id, self.a_aarav.id, self.a_benny.id, self.a_aarav.id],
        }
        response = self.client_aarav.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        pkg_data = response.json().get("package")
        self.assertEqual(len(pkg_data.get("participating_members")), 2)

    def test_owner_can_edit_and_delete_package(self):
        # Create package
        pkg = CollaborationPackage.objects.create(
            team=self.team,
            name="Initial Package",
            starting_price=Decimal("10000"),
            duration_minutes=60,
            is_active=True,
        )
        pkg.participating_members.add(self.a_aarav)

        detail_url = f"/api/artist/teams/{self.team.id}/packages/{pkg.id}/"

        # Non-owner cannot update
        res_fail = self.client_benny.put(
            detail_url,
            data=json.dumps({"name": "Hacked Name"}),
            content_type="application/json",
        )
        self.assertEqual(res_fail.status_code, 403)

        # Owner can update
        res_update = self.client_aarav.put(
            detail_url,
            data=json.dumps({
                "name": "Updated Duo Headline Set",
                "starting_price": 18000,
                "duration_minutes": 90,
                "is_active": False,
                "participating_member_ids": [self.a_aarav.id, self.a_benny.id],
            }),
            content_type="application/json",
        )
        self.assertEqual(res_update.status_code, 200)
        pkg.refresh_from_db()
        self.assertEqual(pkg.name, "Updated Duo Headline Set")
        self.assertEqual(pkg.starting_price, Decimal("18000"))
        self.assertEqual(pkg.duration_minutes, 90)
        self.assertFalse(pkg.is_active)
        self.assertEqual(pkg.participating_members.count(), 2)

        # Owner can delete
        res_del = self.client_aarav.delete(detail_url)
        self.assertEqual(res_del.status_code, 200)
        self.assertFalse(CollaborationPackage.objects.filter(id=pkg.id).exists())

    def test_public_team_profile_exposes_active_packages_only(self):
        # Package 1: Active
        pkg_active = CollaborationPackage.objects.create(
            team=self.team,
            name="Active Stage Set",
            description="Publicly visible set",
            starting_price=Decimal("20000"),
            duration_minutes=75,
            category=self.cat_vocal,
            included_services=["Live vocals", "Setup"],
            is_active=True,
        )
        pkg_active.participating_members.add(self.a_aarav, self.a_benny)

        # Package 2: Inactive
        pkg_inactive = CollaborationPackage.objects.create(
            team=self.team,
            name="Draft / Inactive Set",
            description="Internal draft",
            starting_price=Decimal("15000"),
            duration_minutes=60,
            is_active=False,
        )
        pkg_inactive.participating_members.add(self.a_aarav)

        # Public team view
        public_url = f"/api/teams/{self.team.id}/"
        response = self.anon_client.get(public_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        packages = data.get("packages", [])
        self.assertEqual(len(packages), 1)
        self.assertEqual(packages[0]["name"], "Active Stage Set")
        self.assertEqual(packages[0]["duration_display"], "1 hr 15 mins")
        self.assertEqual(data.get("packages_count"), 1)

        # Ensure no private data leaked in participating members
        member_data = packages[0]["participating_members"][0]
        self.assertNotIn("email", member_data)
        self.assertNotIn("phone", member_data)
        self.assertNotIn("user", member_data)
        self.assertNotIn("password", member_data)
        self.assertIn("stage_name", member_data)
        self.assertIn("category_name", member_data)
