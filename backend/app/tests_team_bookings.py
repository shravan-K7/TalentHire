import json
import datetime
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone
from zoneinfo import ZoneInfo

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
    TeamBooking,
    TeamBookingMemberConfirmation,
    Booking,
    Payment,
    CustomerProfile,
    Notification,
)

User = get_user_model()


class TeamBookingTests(TestCase):
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
        cls.cat_dj = Category.objects.create(name="DJs", description="Disc Jockeys")

        # 1. Customer User
        cls.u_customer = User.objects.create_user(
            username="customer_rahul", email="rahul@example.com", password="password123"
        )
        cls.cp_customer = CustomerProfile.objects.create(
            user=cls.u_customer, phone="9876543210", location="Kozhikode, Kerala"
        )

        # 2. Another Customer User
        cls.u_other_customer = User.objects.create_user(
            username="other_customer", email="other@example.com", password="password123"
        )

        # 3. Artist 1: Owner (Aarav)
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
        ArtistServiceDistrict.objects.create(artist=cls.a_aarav, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_aarav, district=cls.d_kannur)

        # 4. Artist 2: Active Member (Benny)
        cls.u_benny = User.objects.create_user(
            username="benny_artist", email="benny@example.com", password="password123"
        )
        cls.a_benny = ArtistProfile.objects.create(
            user=cls.u_benny,
            stage_name="DJ Benny",
            category=cls.cat_dj,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("8000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_benny, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_benny, district=cls.d_kannur)

        # 5. Artist 3: Active Member (Chitra)
        cls.u_chitra = User.objects.create_user(
            username="chitra_artist", email="chitra@example.com", password="password123"
        )
        cls.a_chitra = ArtistProfile.objects.create(
            user=cls.u_chitra,
            stage_name="Chitra Flutist",
            category=cls.cat_band,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("10000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_chitra, district=cls.d_kozhikode)

        # 6. Artist 4: Unrelated Artist (Dev)
        cls.u_dev = User.objects.create_user(
            username="dev_unrelated", email="dev@example.com", password="password123"
        )
        cls.a_dev = ArtistProfile.objects.create(
            user=cls.u_dev,
            stage_name="Dev Sitar",
            category=cls.cat_band,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            starting_price=Decimal("5000.00"),
            is_verified=True,
            is_active=True,
        )

        # Collaboration Team (Tharangam)
        cls.team = CollaborationTeam.objects.create(
            name="Tharangam Ensemble",
            description="Leading fusion collective",
            owner=cls.a_aarav,
            category=cls.cat_band,
            is_active=True,
            is_publicly_visible=True,
        )
        # Owner membership
        CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_aarav,
            role=CollaborationTeamMember.Role.OWNER,
            status=CollaborationTeamMember.Status.ACTIVE,
        )
        # Benny membership
        CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_benny,
            role=CollaborationTeamMember.Role.MEMBER,
            status=CollaborationTeamMember.Status.ACTIVE,
        )
        # Chitra membership
        CollaborationTeamMember.objects.create(
            team=cls.team,
            artist=cls.a_chitra,
            role=CollaborationTeamMember.Role.MEMBER,
            status=CollaborationTeamMember.Status.ACTIVE,
        )

        # Performance Package (Aarav + Benny)
        cls.pkg = CollaborationPackage.objects.create(
            team=cls.team,
            name="Fusion Sunset Set",
            description="Vocal and live DJ fusion set",
            starting_price=Decimal("25000.00"),
            duration_minutes=90,
            category=cls.cat_band,
            included_services=["Live vocals", "DJ setup", "Sound check"],
            requirements="Stage monitors and 2 power sockets",
            is_active=True,
        )
        cls.pkg.participating_members.set([cls.a_aarav, cls.a_benny])

    def setUp(self):
        self.client = Client()

    def test_customer_creates_team_booking_success(self):
        """Authenticated customer can request a team booking."""
        self.client.force_login(self.u_customer)

        future_date = (timezone.now() + datetime.timedelta(days=10)).replace(hour=18, minute=0, second=0, microsecond=0)
        payload = {
            "event_type": "Wedding Sangeet",
            "event_date": future_date.isoformat(),
            "venue_name": "Taj Malabar Ballroom",
            "event_location": "Kochi",
            "city": "Kochi",
            "state": "Kerala",
            "expected_audience_size": 300,
            "additional_requirements": "Sound system provided by hotel.",
        }

        resp = self.client.post(
            f"/api/teams/{self.team.id}/packages/{self.pkg.id}/book/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["message"], "Team booking request submitted successfully. Awaiting team owner review.")

        tb_data = data["booking"]
        self.assertEqual(tb_data["status"], "pending_owner_review")
        self.assertEqual(tb_data["package"]["name"], "Fusion Sunset Set")
        self.assertEqual(tb_data["package"]["price"], 25000.0)

        # Verify DB record
        tb = TeamBooking.objects.get(id=tb_data["id"])
        self.assertEqual(tb.customer, self.u_customer)
        self.assertEqual(tb.team, self.team)
        self.assertEqual(tb.package, self.pkg)
        self.assertEqual(tb.package_price, Decimal("25000.00"))
        self.assertEqual(set(tb.participating_members.values_list("id", flat=True)), {self.a_aarav.id, self.a_benny.id})

        # Verify owner received notification
        notif = Notification.objects.filter(user=self.u_aarav, title__icontains="New Team Booking Request").first()
        self.assertIsNotNone(notif)

    def test_artist_cannot_book_team(self):
        """Artist accounts are blocked from booking teams (403 Forbidden)."""
        self.client.force_login(self.u_aarav)
        future_date = (timezone.now() + datetime.timedelta(days=10)).isoformat()
        payload = {"event_type": "Birthday", "event_date": future_date}

        resp = self.client.post(
            f"/api/teams/{self.team.id}/packages/{self.pkg.id}/book/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Only customer accounts", resp.json()["error"])

    def test_inactive_package_or_team_rejected(self):
        """Booking inactive team or package returns 404."""
        self.client.force_login(self.u_customer)
        self.pkg.is_active = False
        self.pkg.save()

        future_date = (timezone.now() + datetime.timedelta(days=10)).isoformat()
        payload = {"event_type": "Birthday", "event_date": future_date}

        resp = self.client.post(
            f"/api/teams/{self.team.id}/packages/{self.pkg.id}/book/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_past_event_date_rejected(self):
        """Event dates in the past are rejected with 400."""
        self.client.force_login(self.u_customer)
        past_date = (timezone.now() - datetime.timedelta(days=2)).isoformat()
        payload = {"event_type": "Festival", "event_date": past_date}

        resp = self.client.post(
            f"/api/teams/{self.team.id}/packages/{self.pkg.id}/book/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("must be in the future", resp.json()["error"])

    def test_member_date_conflict_rejected(self):
        """If any participating member already has a confirmed booking on that date, request is rejected."""
        target_day = (timezone.now() + datetime.timedelta(days=15)).date()
        target_dt = timezone.make_aware(
            datetime.datetime.combine(target_day, datetime.time(19, 0)),
            ZoneInfo("Asia/Kolkata"),
        )

        # Book Benny on that day for a solo performance
        Booking.objects.create(
            artist=self.a_benny,
            customer=self.u_other_customer,
            event_type="Solo DJ Set",
            event_date=target_dt,
            event_location="Kozhikode",
            status=Booking.Status.ACCEPTED,
        )

        self.client.force_login(self.u_customer)
        payload = {"event_type": "Corporate Gala", "event_date": target_dt.isoformat()}

        resp = self.client.post(
            f"/api/teams/{self.team.id}/packages/{self.pkg.id}/book/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("DJ Benny", resp.json()["error"])

    def test_owner_approves_booking_triggers_member_confirmations(self):
        """
        When team owner approves booking:
        - Status becomes PENDING_MEMBER_CONFIRMATIONS.
        - TeamBookingMemberConfirmation records are created for all participating members.
        - Owner's confirmation is automatically accepted.
        - Other members (Benny) receive notification.
        """
        future_date = (timezone.now() + datetime.timedelta(days=20)).replace(hour=19, minute=0, second=0, microsecond=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=self.pkg.starting_price,
            event_type="Festival Night",
            event_date=future_date,
            event_day=future_date.date(),
            event_location="Kozhikode",
            status=TeamBooking.Status.PENDING_OWNER_REVIEW,
        )
        tb.participating_members.set([self.a_aarav, self.a_benny])

        # Login as team owner (Aarav)
        self.client.force_login(self.u_aarav)
        resp = self.client.post(
            f"/api/artist/teams/{self.team.id}/bookings/{tb.id}/respond/",
            data=json.dumps({"action": "approve", "message": "Approved by Aarav"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.PENDING_MEMBER_CONFIRMATIONS)
        self.assertIsNotNone(tb.owner_reviewed_at)
        self.assertEqual(tb.owner_response_message, "Approved by Aarav")

        # Confirmations check
        aarav_conf = TeamBookingMemberConfirmation.objects.get(team_booking=tb, artist=self.a_aarav)
        self.assertEqual(aarav_conf.status, "accepted")

        benny_conf = TeamBookingMemberConfirmation.objects.get(team_booking=tb, artist=self.a_benny)
        self.assertEqual(benny_conf.status, "pending")

        # Benny got notification
        notif = Notification.objects.filter(user=self.u_benny, title__icontains="Confirmation Request").first()
        self.assertIsNotNone(notif)

    def test_owner_rejects_booking(self):
        """Team owner rejection marks booking REJECTED and notifies customer."""
        future_date = (timezone.now() + datetime.timedelta(days=12)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=self.pkg.starting_price,
            event_type="Birthday Bash",
            event_date=future_date,
            event_day=future_date.date(),
            event_location="Kannur",
            status=TeamBooking.Status.PENDING_OWNER_REVIEW,
        )
        tb.participating_members.set([self.a_aarav])

        self.client.force_login(self.u_aarav)
        resp = self.client.post(
            f"/api/artist/teams/{self.team.id}/bookings/{tb.id}/respond/",
            data=json.dumps({"action": "reject", "message": "Team has private commitments."}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.REJECTED)
        self.assertEqual(tb.rejection_reason, "Team has private commitments.")

        # Customer notified
        notif = Notification.objects.filter(user=self.u_customer, title__icontains="Declined").first()
        self.assertIsNotNone(notif)

    def test_unauthorized_artist_cannot_respond_to_owner_review(self):
        """Unrelated artist cannot approve/reject an owner booking review (403 Forbidden)."""
        future_date = (timezone.now() + datetime.timedelta(days=12)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=self.pkg.starting_price,
            event_type="Birthday",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.PENDING_OWNER_REVIEW,
        )

        self.client.force_login(self.u_dev)  # Dev is not team owner
        resp = self.client.post(
            f"/api/artist/teams/{self.team.id}/bookings/{tb.id}/respond/",
            data=json.dumps({"action": "approve"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_single_member_decline_rejects_entire_booking(self):
        """If ANY participating member declines their confirmation, the entire team booking is REJECTED."""
        future_date = (timezone.now() + datetime.timedelta(days=22)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=self.pkg.starting_price,
            event_type="College Fest",
            event_date=future_date,
            event_day=future_date.date(),
            event_location="Kozhikode",
            status=TeamBooking.Status.PENDING_MEMBER_CONFIRMATIONS,
        )
        tb.participating_members.set([self.a_aarav, self.a_benny])

        # Setup confirmations
        TeamBookingMemberConfirmation.objects.create(
            team_booking=tb, artist=self.a_aarav, status="accepted"
        )
        benny_conf = TeamBookingMemberConfirmation.objects.create(
            team_booking=tb, artist=self.a_benny, status="pending"
        )

        # Benny declines
        self.client.force_login(self.u_benny)
        resp = self.client.post(
            f"/api/artist/team-bookings/confirmations/{benny_conf.id}/respond/",
            data=json.dumps({"action": "decline", "message": "DJ equipment under maintenance."}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.REJECTED)
        self.assertEqual(tb.declined_by_artist, self.a_benny)
        self.assertIn("DJ equipment under maintenance", tb.rejection_reason)

        benny_conf.refresh_from_db()
        self.assertEqual(benny_conf.status, "declined")

        # Both customer and owner notified
        cust_notif = Notification.objects.filter(user=self.u_customer, title__icontains="Team Booking Declined").first()
        self.assertIsNotNone(cust_notif)
        owner_notif = Notification.objects.filter(user=self.u_aarav, title__icontains="Team Member Declined").first()
        self.assertIsNotNone(owner_notif)

    def test_all_members_accept_triggers_awaiting_payment_with_24h_deadline(self):
        """
        When ALL participating members accept:
        - Status becomes AWAITING_PAYMENT.
        - Sets 24-hour payment deadline.
        - Creates pending Payment record with 8% commission.
        """
        future_date = (timezone.now() + datetime.timedelta(days=25)).replace(hour=20, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=Decimal("25000.00"),
            event_type="New Year Bash",
            event_date=future_date,
            event_day=future_date.date(),
            event_location="Kozhikode",
            status=TeamBooking.Status.PENDING_MEMBER_CONFIRMATIONS,
        )
        tb.participating_members.set([self.a_aarav, self.a_benny])

        # Aarav already accepted as owner
        TeamBookingMemberConfirmation.objects.create(
            team_booking=tb, artist=self.a_aarav, status="accepted"
        )
        benny_conf = TeamBookingMemberConfirmation.objects.create(
            team_booking=tb, artist=self.a_benny, status="pending"
        )

        # Benny accepts
        self.client.force_login(self.u_benny)
        resp = self.client.post(
            f"/api/artist/team-bookings/confirmations/{benny_conf.id}/respond/",
            data=json.dumps({"action": "accept", "message": "Ready to perform!"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.AWAITING_PAYMENT)
        self.assertIsNotNone(tb.all_members_confirmed_at)
        self.assertIsNotNone(tb.payment_deadline)

        # Deadline should be roughly 24 hours from now
        deadline_diff = tb.payment_deadline - timezone.now()
        self.assertTrue(datetime.timedelta(hours=23) <= deadline_diff <= datetime.timedelta(hours=25))

        # Check Payment record created with 8% commission
        payment = Payment.objects.get(team_booking=tb)
        self.assertEqual(payment.amount, Decimal("25000.00"))
        expected_commission = round(Decimal("25000.00") * Decimal("0.08"), 2)
        expected_artist_share = Decimal("25000.00") - expected_commission
        self.assertEqual(payment.commission_amount, expected_commission)
        self.assertEqual(payment.artist_amount, expected_artist_share)
        self.assertEqual(payment.status, Payment.Status.PENDING)

        # Customer notified to pay
        notif = Notification.objects.filter(user=self.u_customer, title__icontains="Payment Required").first()
        self.assertIsNotNone(notif)

    def test_unrelated_artist_cannot_respond_to_others_confirmation(self):
        """Artist cannot accept or decline another artist's confirmation request (403 Forbidden)."""
        future_date = (timezone.now() + datetime.timedelta(days=18)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=Decimal("25000.00"),
            event_type="Gig",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.PENDING_MEMBER_CONFIRMATIONS,
        )
        benny_conf = TeamBookingMemberConfirmation.objects.create(
            team_booking=tb, artist=self.a_benny, status="pending"
        )

        self.client.force_login(self.u_dev)  # Dev is not Benny
        resp = self.client.post(
            f"/api/artist/team-bookings/confirmations/{benny_conf.id}/respond/",
            data=json.dumps({"action": "accept"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)

    @patch("razorpay.Client")
    def test_create_razorpay_order_team_booking(self, mock_razorpay_cls):
        """Customer creates Razorpay order for booking in AWAITING_PAYMENT status."""
        mock_client = MagicMock()
        mock_razorpay_cls.return_value = mock_client
        mock_client.order.create.return_value = {"id": "order_team_123456"}

        future_date = (timezone.now() + datetime.timedelta(days=14)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=Decimal("25000.00"),
            event_type="Concert",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.AWAITING_PAYMENT,
            payment_deadline=timezone.now() + datetime.timedelta(hours=24),
        )
        tb.participating_members.set([self.a_aarav, self.a_benny])

        self.client.force_login(self.u_customer)
        resp = self.client.post(
            f"/api/team-bookings/{tb.id}/create-order/",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["order_id"], "order_team_123456")
        self.assertEqual(data["amount"], 2500000)  # Paise

        payment = Payment.objects.get(team_booking=tb)
        self.assertEqual(payment.razorpay_order_id, "order_team_123456")

    @patch("razorpay.Client")
    def test_verify_razorpay_payment_team_booking_success(self, mock_razorpay_cls):
        """
        Verify payment endpoint confirms team booking:
        - Signature verified.
        - Payment marked SUCCESS.
        - TeamBooking marked CONFIRMED.
        - Notifications sent to Customer, Owner, and Participating Artists.
        """
        mock_client = MagicMock()
        mock_razorpay_cls.return_value = mock_client
        mock_client.utility.verify_payment_signature.return_value = True
        mock_client.payment.fetch.return_value = {
            "id": "pay_team_999",
            "order_id": "order_team_123456",
            "amount": 2500000,
            "currency": "INR",
            "status": "captured",
            "created_at": int(timezone.now().timestamp()),
        }

        future_date = (timezone.now() + datetime.timedelta(days=14)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=Decimal("25000.00"),
            event_type="Concert",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.AWAITING_PAYMENT,
            payment_deadline=timezone.now() + datetime.timedelta(hours=24),
        )
        tb.participating_members.set([self.a_aarav, self.a_benny])

        Payment.objects.create(
            team_booking=tb,
            amount=Decimal("25000.00"),
            razorpay_order_id="order_team_123456",
            status=Payment.Status.PENDING,
        )

        self.client.force_login(self.u_customer)
        resp = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": "order_team_123456",
                "razorpay_payment_id": "pay_team_999",
                "razorpay_signature": "mock_sig_123",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.CONFIRMED)

        payment = Payment.objects.get(team_booking=tb)
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.transaction_id, "pay_team_999")

        # Verify idempotency: calling again returns success without error
        resp2 = self.client.post(
            "/api/payments/verify/",
            data=json.dumps({
                "razorpay_order_id": "order_team_123456",
                "razorpay_payment_id": "pay_team_999",
                "razorpay_signature": "mock_sig_123",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertIn("already verified", resp2.json()["message"])

    def test_payment_deadline_expiry_releases_reservation(self):
        """Bookings with payment deadline in the past transition to EXPIRED."""
        past_deadline = timezone.now() - datetime.timedelta(minutes=30)
        future_date = (timezone.now() + datetime.timedelta(days=10)).replace(hour=18, minute=0)

        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=Decimal("25000.00"),
            event_type="Show",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.AWAITING_PAYMENT,
            payment_deadline=past_deadline,
        )
        tb.participating_members.set([self.a_aarav])

        # Attempt to create payment order
        self.client.force_login(self.u_customer)
        resp = self.client.post(
            f"/api/team-bookings/{tb.id}/create-order/",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 409)
        self.assertIn("expired", resp.json()["error"])

        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.EXPIRED)

    def test_customer_cancels_team_booking(self):
        """Customer can cancel a pending or awaiting-payment team booking."""
        future_date = (timezone.now() + datetime.timedelta(days=8)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=Decimal("25000.00"),
            event_type="Party",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.PENDING_OWNER_REVIEW,
        )

        self.client.force_login(self.u_customer)
        resp = self.client.post(
            f"/api/customer/team-bookings/{tb.id}/cancel/",
            data=json.dumps({"reason": "Event venue unavailable."}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        tb.refresh_from_db()
        self.assertEqual(tb.status, TeamBooking.Status.CANCELLED)
        self.assertEqual(tb.rejection_reason, "Event venue unavailable.")

    def test_package_edits_do_not_alter_booking_snapshot(self):
        """
        Editing a package after a booking is submitted does not alter the booking's
        saved snapshot of price, duration, inclusions, or requirements.
        """
        future_date = (timezone.now() + datetime.timedelta(days=12)).replace(hour=18, minute=0)
        tb = TeamBooking.objects.create(
            customer=self.u_customer,
            team=self.team,
            package=self.pkg,
            package_name=self.pkg.name,
            package_price=self.pkg.starting_price,
            package_duration_minutes=self.pkg.duration_minutes,
            package_inclusions=self.pkg.included_services,
            event_type="Sangeet",
            event_date=future_date,
            event_day=future_date.date(),
            status=TeamBooking.Status.PENDING_OWNER_REVIEW,
        )

        # Team owner changes package price and services
        self.pkg.starting_price = Decimal("35000.00")
        self.pkg.duration_minutes = 120
        self.pkg.included_services = ["Different services"]
        self.pkg.save()

        # Booking snapshot remains intact
        tb.refresh_from_db()
        self.assertEqual(tb.package_price, Decimal("25000.00"))
        self.assertEqual(tb.package_duration_minutes, 90)
        self.assertEqual(tb.package_inclusions, ["Live vocals", "DJ setup", "Sound check"])
