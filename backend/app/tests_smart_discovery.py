import datetime
import json
from zoneinfo import ZoneInfo
from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone

from app.models import (
    ArtistAvailability,
    ArtistProfile,
    ArtistServiceDistrict,
    Booking,
    Category,
    Country,
    District,
    Payment,
    State,
)


class SmartArtistDiscoveryTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.kolkata_tz = ZoneInfo("Asia/Kolkata")

        self.cat_singer = Category.objects.create(name="Singer")
        self.cat_band = Category.objects.create(name="Band")

        self.india = Country.objects.create(name="India", code="IN")

        self.kerala = State.objects.create(country=self.india, name="Kerala", code="KL")
        self.karnataka = State.objects.create(country=self.india, name="Karnataka", code="KA")

        self.kozhikode = District.objects.create(state=self.kerala, name="Kozhikode")
        self.kannur = District.objects.create(state=self.kerala, name="Kannur")
        self.ernakulam = District.objects.create(state=self.kerala, name="Ernakulam")

        self.bengaluru = District.objects.create(state=self.karnataka, name="Bengaluru Urban")
        self.mysuru = District.objects.create(state=self.karnataka, name="Mysuru")

        # Artist 1: Base Karnataka, but travels to Kozhikode (Kerala) and Mysuru (Karnataka)
        self.u1 = User.objects.create_user(username="artist_ka_travel", email="a1@test.com", password="pass")
        self.artist_ka_travel = ArtistProfile.objects.create(
            user=self.u1,
            stage_name="Karnataka Wanderer",
            category=self.cat_singer,
            gender="male",
            state=self.karnataka,
            district=self.bengaluru,
            location="Bengaluru, Karnataka",
            starting_price=10000,
            is_active=True,
            is_verified=True,
        )
        ArtistServiceDistrict.objects.create(artist=self.artist_ka_travel, district=self.bengaluru)
        ArtistServiceDistrict.objects.create(artist=self.artist_ka_travel, district=self.mysuru)
        ArtistServiceDistrict.objects.create(artist=self.artist_ka_travel, district=self.kozhikode)

        # Artist 2: Base Kerala, services Kozhikode, Kannur, and Ernakulam (multi-district Kerala)
        self.u2 = User.objects.create_user(username="artist_kl_local", email="a2@test.com", password="pass")
        self.artist_kl_local = ArtistProfile.objects.create(
            user=self.u2,
            stage_name="Kerala Local Band",
            category=self.cat_band,
            gender="group",
            state=self.kerala,
            district=self.kozhikode,
            location="Kozhikode, Kerala",
            starting_price=25000,
            is_active=True,
            is_verified=True,
        )
        ArtistServiceDistrict.objects.create(artist=self.artist_kl_local, district=self.kozhikode)
        ArtistServiceDistrict.objects.create(artist=self.artist_kl_local, district=self.kannur)
        ArtistServiceDistrict.objects.create(artist=self.artist_kl_local, district=self.ernakulam)

        # Artist 3: Base Karnataka, services only Bengaluru
        self.u3 = User.objects.create_user(username="artist_ka_local", email="a3@test.com", password="pass")
        self.artist_ka_local = ArtistProfile.objects.create(
            user=self.u3,
            stage_name="Bengaluru Soloist",
            category=self.cat_singer,
            gender="female",
            state=self.karnataka,
            district=self.bengaluru,
            location="Bengaluru, Karnataka",
            starting_price=15000,
            is_active=True,
            is_verified=False,
        )
        ArtistServiceDistrict.objects.create(artist=self.artist_ka_local, district=self.bengaluru)

        # Customer user for booking tests
        self.cust_user = User.objects.create_user(username="cust1", email="cust@test.com", password="pass")

    def test_same_state_and_cross_state_district_search(self):
        # Search by Kozhikode (Kerala) district ID
        res = self.client.get(f"/api/artists/?district_id={self.kozhikode.id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        ids = [a["id"] for a in data["artists"]]

        # Both Artist 1 (Karnataka base, covers Kozhikode) and Artist 2 (Kerala base) must match
        self.assertIn(self.artist_ka_travel.id, ids)
        self.assertIn(self.artist_kl_local.id, ids)
        # Artist 3 (Bengaluru only) must not match
        self.assertNotIn(self.artist_ka_local.id, ids)

    def test_state_filtering_and_duplicate_prevention(self):
        # Artist 2 services 3 districts in Kerala (Kozhikode, Kannur, Ernakulam).
        # Querying Kerala state must return Artist 2 exactly once (no duplicates).
        res = self.client.get(f"/api/artists/?state_id={self.kerala.id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        ids = [a["id"] for a in data["artists"]]

        self.assertEqual(ids.count(self.artist_kl_local.id), 1)
        self.assertIn(self.artist_ka_travel.id, ids)
        self.assertNotIn(self.artist_ka_local.id, ids)

    def test_mismatched_state_and_district_rejected(self):
        # District Bengaluru belongs to Karnataka, not Kerala
        res = self.client.get(f"/api/artists/?state_id={self.kerala.id}&district_id={self.bengaluru.id}")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Selected district does not belong to the selected state.")

        # Invalid IDs rejected
        self.assertEqual(self.client.get("/api/artists/?state_id=abc").status_code, 400)
        self.assertEqual(self.client.get("/api/artists/?district_id=xyz").status_code, 400)
        self.assertEqual(self.client.get("/api/artists/?state_id=99999").status_code, 400)
        self.assertEqual(self.client.get("/api/artists/?district_id=99999").status_code, 400)

    def test_event_date_validation(self):
        self.assertEqual(self.client.get("/api/artists/?event_date=invalid").status_code, 400)
        self.assertEqual(self.client.get("/api/artists/?event_date=2026/12/25").status_code, 400)
        self.assertEqual(self.client.get("/api/artists/?event_date=2026-02-31").status_code, 400)

    def test_event_date_manual_block_excluded(self):
        target_date = datetime.date(2027, 4, 15)
        ArtistAvailability.objects.create(
            artist=self.artist_ka_travel,
            date=target_date,
            is_available=False,
            reason="Personal vacation",
        )

        # Searching on target_date excludes artist 1
        res = self.client.get(f"/api/artists/?event_date={target_date.isoformat()}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertNotIn(self.artist_ka_travel.id, ids)

        # Searching on the following day includes artist 1
        res_next = self.client.get("/api/artists/?event_date=2027-04-16")
        self.assertEqual(res_next.status_code, 200)
        ids_next = [a["id"] for a in res_next.json()["artists"]]
        self.assertIn(self.artist_ka_travel.id, ids_next)

    def test_event_date_completed_booking_excluded(self):
        target_date = datetime.date(2027, 5, 20)
        event_dt = datetime.datetime.combine(target_date, datetime.time(18, 0), tzinfo=self.kolkata_tz)
        Booking.objects.create(
            customer=self.cust_user,
            artist=self.artist_ka_travel,
            event_type="Concert",
            event_date=event_dt,
            event_day=target_date,
            event_location="Kozhikode, Kerala",
            agreed_price=10000,
            status=Booking.Status.COMPLETED,
        )

        res = self.client.get(f"/api/artists/?event_date={target_date.isoformat()}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertNotIn(self.artist_ka_travel.id, ids)

    def test_event_date_paid_accepted_booking_excluded(self):
        target_date = datetime.date(2027, 6, 10)
        event_dt = datetime.datetime.combine(target_date, datetime.time(19, 0), tzinfo=self.kolkata_tz)
        b = Booking.objects.create(
            customer=self.cust_user,
            artist=self.artist_ka_travel,
            event_type="Wedding",
            event_date=event_dt,
            event_day=target_date,
            event_location="Mysuru, Karnataka",
            agreed_price=12000,
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(days=2),
        )
        Payment.objects.create(
            booking=b,
            amount=12000,
            status=Payment.Status.SUCCESS,
            transaction_id="pay_test_paid",
        )

        res = self.client.get(f"/api/artists/?event_date={target_date.isoformat()}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertNotIn(self.artist_ka_travel.id, ids)

    def test_event_date_active_unpaid_reservation_excluded(self):
        # Accepted 2 hours ago: within 24h reservation window
        target_date = datetime.date(2027, 7, 5)
        event_dt = datetime.datetime.combine(target_date, datetime.time(17, 0), tzinfo=self.kolkata_tz)
        Booking.objects.create(
            customer=self.cust_user,
            artist=self.artist_ka_travel,
            event_type="Party",
            event_date=event_dt,
            event_day=target_date,
            event_location="Kozhikode, Kerala",
            agreed_price=10000,
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=2),
        )

        res = self.client.get(f"/api/artists/?event_date={target_date.isoformat()}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertNotIn(self.artist_ka_travel.id, ids)

    def test_event_date_expired_unpaid_reservation_included(self):
        # Accepted 30 hours ago: 24h reservation expired, date released
        target_date = datetime.date(2027, 8, 12)
        event_dt = datetime.datetime.combine(target_date, datetime.time(17, 0), tzinfo=self.kolkata_tz)
        Booking.objects.create(
            customer=self.cust_user,
            artist=self.artist_ka_travel,
            event_type="Party",
            event_date=event_dt,
            event_day=target_date,
            event_location="Kozhikode, Kerala",
            agreed_price=10000,
            status=Booking.Status.ACCEPTED,
            accepted_at=timezone.now() - datetime.timedelta(hours=30),
        )

        res = self.client.get(f"/api/artists/?event_date={target_date.isoformat()}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertIn(self.artist_ka_travel.id, ids)

    def test_event_date_pending_booking_does_not_block_date(self):
        # Ordinary pending booking does NOT block date availability
        target_date = datetime.date(2027, 9, 15)
        event_dt = datetime.datetime.combine(target_date, datetime.time(18, 0), tzinfo=self.kolkata_tz)
        Booking.objects.create(
            customer=self.cust_user,
            artist=self.artist_ka_travel,
            event_type="Fest",
            event_date=event_dt,
            event_day=target_date,
            event_location="Kozhikode, Kerala",
            agreed_price=10000,
            status=Booking.Status.PENDING,
        )

        res = self.client.get(f"/api/artists/?event_date={target_date.isoformat()}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertIn(self.artist_ka_travel.id, ids)

    def test_combined_filters(self):
        # Filter by Kozhikode district + Category Singer + starting_price <= 12000 + gender male
        res = self.client.get(
            f"/api/artists/?district_id={self.kozhikode.id}&category={self.cat_singer.id}&max_price=12000&gender=male"
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        ids = [a["id"] for a in data["artists"]]
        self.assertEqual(ids, [self.artist_ka_travel.id])

        # Filter with min_price that excludes artist 1
        res_min = self.client.get(f"/api/artists/?district_id={self.kozhikode.id}&min_price=15000")
        self.assertEqual(res_min.status_code, 200)
        ids_min = [a["id"] for a in res_min.json()["artists"]]
        self.assertEqual(ids_min, [self.artist_kl_local.id])

    def test_unapproved_and_inactive_artist_exclusion(self):
        # Inactive artist
        inactive_user = User.objects.create_user(username="inactive_a", email="ina@test.com", password="pass")
        inactive_artist = ArtistProfile.objects.create(
            user=inactive_user,
            stage_name="Inactive Artist",
            category=self.cat_singer,
            state=self.kerala,
            district=self.kozhikode,
            starting_price=5000,
            is_active=False,
            is_verified=True,
        )
        ArtistServiceDistrict.objects.create(artist=inactive_artist, district=self.kozhikode)

        # Deactivated user
        deactivated_user = User.objects.create_user(username="deact_a", email="deact@test.com", password="pass", is_active=False)
        deact_artist = ArtistProfile.objects.create(
            user=deactivated_user,
            stage_name="Deactivated User Artist",
            category=self.cat_singer,
            state=self.kerala,
            district=self.kozhikode,
            starting_price=5000,
            is_active=True,
            is_verified=True,
        )
        ArtistServiceDistrict.objects.create(artist=deact_artist, district=self.kozhikode)

        res = self.client.get(f"/api/artists/?district_id={self.kozhikode.id}")
        self.assertEqual(res.status_code, 200)
        ids = [a["id"] for a in res.json()["artists"]]
        self.assertNotIn(inactive_artist.id, ids)
        self.assertNotIn(deact_artist.id, ids)

        # Verified filter check
        res_verified = self.client.get(f"/api/artists/?district_id={self.bengaluru.id}&verified=true")
        self.assertEqual(res_verified.status_code, 200)
        verified_ids = [a["id"] for a in res_verified.json()["artists"]]
        self.assertIn(self.artist_ka_travel.id, verified_ids)
        self.assertNotIn(self.artist_ka_local.id, verified_ids)  # is_verified=False

    def test_legacy_filters_backward_compatibility(self):
        res_loc = self.client.get("/api/artists/?location=Bengaluru")
        self.assertEqual(res_loc.status_code, 200)
        ids = [a["id"] for a in res_loc.json()["artists"]]
        self.assertIn(self.artist_ka_travel.id, ids)
        self.assertIn(self.artist_ka_local.id, ids)
        self.assertNotIn(self.artist_kl_local.id, ids)
