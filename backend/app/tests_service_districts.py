import json
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import Client, TestCase

from app.models import (
    ArtistProfile,
    ArtistServiceDistrict,
    Category,
    City,
    Country,
    District,
    State,
)


class ArtistServiceDistrictTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name="Singer")

        self.india = Country.objects.create(name="India", code="IN")
        self.uae = Country.objects.create(name="United Arab Emirates", code="AE")

        self.kerala = State.objects.create(country=self.india, name="Kerala", code="KL")
        self.karnataka = State.objects.create(country=self.india, name="Karnataka", code="KA")
        self.dubai_state = State.objects.create(country=self.uae, name="Dubai", code="DXB")

        self.kozhikode = District.objects.create(state=self.kerala, name="Kozhikode")
        self.kannur = District.objects.create(state=self.kerala, name="Kannur")
        self.ernakulam = District.objects.create(state=self.kerala, name="Ernakulam")

        self.bengaluru = District.objects.create(state=self.karnataka, name="Bengaluru Urban")
        self.mysuru = District.objects.create(state=self.karnataka, name="Mysuru")

        self.dubai_district = District.objects.create(state=self.dubai_state, name="Dubai Central")

        self.city_kozhikode = City.objects.create(
            district=self.kozhikode, state=self.kerala, name="Kozhikode City"
        )
        self.city_bengaluru = City.objects.create(
            district=self.bengaluru, state=self.karnataka, name="Bengaluru"
        )

        self.artist_user = User.objects.create_user(
            username="artist1", email="artist1@example.com", password="Password123!"
        )
        self.other_user = User.objects.create_user(
            username="artist2", email="artist2@example.com", password="Password123!"
        )
        self.other_artist = ArtistProfile.objects.create(
            user=self.other_user,
            category=self.category,
            stage_name="Other Artist",
            bio="Other bio",
            location="Mysuru, Karnataka",
            starting_price=5000,
        )

    def _base_payload(self, **overrides):
        data = {
            "stage_name": "Melodic Waves",
            "category": self.category.id,
            "gender": "male",
            "bio": "Live acoustic performer.",
            "starting_price": "12000",
            "years_of_experience": 5,
            "performance_types": ["Solo performance"],
            "state": self.kerala.id,
            "district": self.kozhikode.id,
            "city": self.city_kozhikode.id,
            "service_districts": [self.kozhikode.id, self.kannur.id],
        }
        data.update(overrides)
        return data

    def test_location_lookup_endpoints(self):
        res_states = self.client.get("/api/locations/states/?country=IN")
        self.assertEqual(res_states.status_code, 200)
        state_names = [s["name"] for s in res_states.json()["states"]]
        self.assertIn("Kerala", state_names)
        self.assertIn("Karnataka", state_names)
        self.assertNotIn("Dubai", state_names)

        res_districts = self.client.get(f"/api/locations/districts/?state_id={self.kerala.id}")
        self.assertEqual(res_districts.status_code, 200)
        dist_names = [d["name"] for d in res_districts.json()["districts"]]
        self.assertEqual(dist_names, ["Ernakulam", "Kannur", "Kozhikode"])

        res_cities = self.client.get(f"/api/locations/cities/?district_id={self.kozhikode.id}")
        self.assertEqual(res_cities.status_code, 200)
        self.assertEqual(res_cities.json()["cities"][0]["name"], "Kozhikode City")

    def test_multiple_districts_in_one_state_and_automatic_base_district(self):
        self.client.force_login(self.artist_user)
        # Intentionally omit base district (kozhikode) from service_districts
        payload = self._base_payload(service_districts=[self.kannur.id, self.ernakulam.id])
        res = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        artist_data = body["artist"]

        self.assertEqual(artist_data["state"]["id"], self.kerala.id)
        self.assertEqual(artist_data["district"]["id"], self.kozhikode.id)
        self.assertEqual(artist_data["city"]["id"], self.city_kozhikode.id)
        self.assertEqual(
            set(artist_data["service_district_ids"]),
            {self.kozhikode.id, self.kannur.id, self.ernakulam.id},
        )
        self.assertEqual(len(artist_data["service_states"]), 1)
        self.assertEqual(artist_data["service_states"][0]["name"], "Kerala")

    def test_multiple_states_with_multiple_districts(self):
        self.client.force_login(self.artist_user)
        payload = self._base_payload(
            city=None,
            service_districts=[
                self.kozhikode.id,
                self.kannur.id,
                self.bengaluru.id,
                self.mysuru.id,
            ],
        )
        res = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        artist_data = res.json()["artist"]
        self.assertIsNone(artist_data["city"])
        self.assertEqual(
            set(artist_data["service_district_ids"]),
            {self.kozhikode.id, self.kannur.id, self.bengaluru.id, self.mysuru.id},
        )
        state_names = {s["name"] for s in artist_data["service_states"]}
        self.assertEqual(state_names, {"Kerala", "Karnataka"})

        # Verify list filtering by district_id works across multi-state coverage
        list_res = self.client.get(f"/api/artists/?district_id={self.bengaluru.id}")
        self.assertEqual(list_res.status_code, 200)
        ids = [a["id"] for a in list_res.json()["artists"]]
        self.assertIn(artist_data["id"], ids)

    def test_duplicate_district_prevention(self):
        self.client.force_login(self.artist_user)
        payload = self._base_payload(
            service_districts=[self.kozhikode.id, self.kannur.id, self.kannur.id, self.kozhikode.id]
        )
        res = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        artist = ArtistProfile.objects.get(user=self.artist_user)
        self.assertEqual(ArtistServiceDistrict.objects.filter(artist=artist).count(), 2)

        # Direct model duplicate raises ValidationError / IntegrityError
        with self.assertRaises((ValidationError, IntegrityError)):
            ArtistServiceDistrict.objects.create(artist=artist, district=self.kannur)

    def test_invalid_district_ids_and_non_indian_district_rejected(self):
        self.client.force_login(self.artist_user)

        res_missing = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(self._base_payload(service_districts=[999999])),
            content_type="application/json",
        )
        self.assertEqual(res_missing.status_code, 400)
        self.assertIn("service_districts", res_missing.json()["errors"])

        res_non_indian = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(self._base_payload(service_districts=[self.dubai_district.id])),
            content_type="application/json",
        )
        self.assertEqual(res_non_indian.status_code, 400)
        self.assertIn("service_districts", res_non_indian.json()["errors"])

    def test_invalid_state_district_and_city_relationships_rejected(self):
        self.client.force_login(self.artist_user)

        # Bengaluru belongs to Karnataka, not Kerala
        res_bad_dist = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(self._base_payload(state=self.kerala.id, district=self.bengaluru.id)),
            content_type="application/json",
        )
        self.assertEqual(res_bad_dist.status_code, 400)
        self.assertIn("district", res_bad_dist.json()["errors"])

        # Bengaluru city belongs to Bengaluru district, not Kozhikode
        res_bad_city = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(
                self._base_payload(
                    state=self.kerala.id,
                    district=self.kozhikode.id,
                    city=self.city_bengaluru.id,
                )
            ),
            content_type="application/json",
        )
        self.assertEqual(res_bad_city.status_code, 400)
        self.assertIn("city", res_bad_city.json()["errors"])

    def test_ownership_and_permission_enforcement(self):
        # Unauthenticated rejected
        res_unauth = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(self._base_payload()),
            content_type="application/json",
        )
        self.assertEqual(res_unauth.status_code, 401)

        # Authenticated artist cannot hijack another artist via artist_id in payload
        self.client.force_login(self.artist_user)
        payload = self._base_payload(artist_id=self.other_artist.id)
        res = self.client.post(
            "/api/artist/profile/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertNotEqual(res.json()["artist"]["id"], self.other_artist.id)
        self.assertEqual(ArtistServiceDistrict.objects.filter(artist=self.other_artist).count(), 0)

    def test_formdata_registration_and_legacy_compatibility(self):
        self.client.force_login(self.artist_user)

        # FormData registration with JSON-encoded service_districts
        res = self.client.post(
            "/api/artist/profile/",
            data={
                "stage_name": "FormData Artist",
                "category": str(self.category.id),
                "gender": "female",
                "bio": "Bio text",
                "starting_price": "15000",
                "years_of_experience": "3",
                "performance_types": json.dumps(["Weddings"]),
                "state": str(self.kerala.id),
                "district": str(self.kozhikode.id),
                "city": "",
                "service_districts": json.dumps([self.kozhikode.id, self.kannur.id]),
            },
        )
        self.assertEqual(res.status_code, 201)
        artist = ArtistProfile.objects.get(user=self.artist_user)
        self.assertEqual(artist.location, "Kozhikode, Kerala")
        self.assertEqual(artist.service_districts.count(), 2)

        # Legacy update without state/district/service_districts preserves existing coverage
        res_legacy = self.client.post(
            "/api/artist/profile/",
            data={
                "stage_name": "FormData Artist Updated",
                "category": str(self.category.id),
                "gender": "female",
                "bio": "Updated bio",
                "location": "Kozhikode, Kerala",
                "starting_price": "16000",
                "travel_availability": "state",
            },
        )
        self.assertEqual(res_legacy.status_code, 200)
        artist.refresh_from_db()
        self.assertEqual(artist.service_districts.count(), 2)

    def test_legacy_international_artist_preserved_and_response_structure(self):
        intl_user = User.objects.create_user(
            username="intl_artist", email="intl@example.com", password="Password123!"
        )
        intl_artist = ArtistProfile.objects.create(
            user=intl_user,
            category=self.category,
            stage_name="Global Act",
            bio="International performer",
            location="Dubai, UAE",
            travel_availability="international",
            starting_price=50000,
        )

        detail_res = self.client.get(f"/api/artists/{intl_artist.id}/")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()["artist"]
        self.assertEqual(detail["location"], "Dubai, UAE")
        self.assertEqual(detail["travel_availability"], "international")
        self.assertIsNone(detail["state"])
        self.assertIsNone(detail["district"])
        self.assertEqual(detail["service_districts"], [])
        self.assertEqual(detail["service_district_ids"], [])
        self.assertEqual(detail["service_states"], [])

        # Dashboard also returns structured fields
        self.client.force_login(intl_user)
        dash_res = self.client.get("/api/artist/dashboard/")
        self.assertEqual(dash_res.status_code, 200)
        dash_artist = dash_res.json()["artist"]
        self.assertIn("service_districts", dash_artist)
        self.assertIn("service_district_ids", dash_artist)
        self.assertIn("service_states", dash_artist)

    def test_artist_detail_api_service_coverage_grouped_by_state(self):
        """
        Verify GET /api/artists/<id>/ returns service districts grouped by state,
        includes district counts, and preserves travel_availability unchanged.
        """
        covered_user = User.objects.create_user(
            username="covered_artist", email="covered@example.com", password="Password123!"
        )
        covered_artist = ArtistProfile.objects.create(
            user=covered_user,
            category=self.category,
            stage_name="Aarav South Tour",
            bio="Multi-state performing band",
            location="Kozhikode, Kerala",
            travel_availability="state",
            starting_price=25000,
            is_active=True,
            is_verified=True,
            state=self.kerala,
            district=self.kozhikode,
        )
        # Configure coverage in Kerala (2 districts) and Karnataka (1 district)
        ArtistServiceDistrict.objects.create(artist=covered_artist, district=self.kozhikode)
        ArtistServiceDistrict.objects.create(artist=covered_artist, district=self.kannur)
        ArtistServiceDistrict.objects.create(artist=covered_artist, district=self.bengaluru)

        res = self.client.get(f"/api/artists/{covered_artist.id}/")
        self.assertEqual(res.status_code, 200)
        data = res.json()["artist"]

        # Travel availability must remain unchanged
        self.assertEqual(data["travel_availability"], "state")
        self.assertEqual(data["travel_availability_display"], "Across my state")

        # Total covered districts
        self.assertEqual(len(data["service_districts"]), 3)
        self.assertEqual(
            set(data["service_district_ids"]),
            {self.kozhikode.id, self.kannur.id, self.bengaluru.id},
        )

        # Grouped by state
        self.assertEqual(len(data["service_states"]), 2)
        state_names = [st["name"] for st in data["service_states"]]
        self.assertIn("Karnataka", state_names)
        self.assertIn("Kerala", state_names)

        kerala_group = next(st for st in data["service_states"] if st["name"] == "Kerala")
        self.assertEqual(len(kerala_group["districts"]), 2)
        kerala_dist_names = [d["name"] for d in kerala_group["districts"]]
        self.assertIn("Kozhikode", kerala_dist_names)
        self.assertIn("Kannur", kerala_dist_names)

        karnataka_group = next(st for st in data["service_states"] if st["name"] == "Karnataka")
        self.assertEqual(len(karnataka_group["districts"]), 1)
        self.assertEqual(karnataka_group["districts"][0]["name"], "Bengaluru Urban")

