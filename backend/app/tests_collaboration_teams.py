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
    Country,
    District,
    Notification,
    State,
)

User = get_user_model()


class CollaborationTeamManagementTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client = Client()

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
        cls.d_wayanad = District.objects.create(name="Wayanad", state=cls.kerala)
        cls.d_bengaluru = District.objects.create(name="Bengaluru Urban", state=cls.karnataka)

        # Categories
        cls.cat_singer = Category.objects.create(name="Singers", description="Vocalists")
        cls.cat_dancer = Category.objects.create(name="Dancers", description="Dancers")
        cls.cat_dj = Category.objects.create(name="DJs", description="DJs")

        # 1. Singer (Owner): Kozhikode, Kannur
        cls.u_singer = User.objects.create_user(
            username="singer_owner", email="singer@example.com", password="password123"
        )
        cls.a_singer = ArtistProfile.objects.create(
            user=cls.u_singer,
            stage_name="Singer Aarav",
            category=cls.cat_singer,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("15000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_singer, district=cls.d_kozhikode)
        ArtistServiceDistrict.objects.create(artist=cls.a_singer, district=cls.d_kannur)

        # 2. Dancer (Invitee / Member): Kozhikode, Wayanad
        cls.u_dancer = User.objects.create_user(
            username="dancer_member", email="dancer@example.com", password="password123"
        )
        cls.a_dancer = ArtistProfile.objects.create(
            user=cls.u_dancer,
            stage_name="Dancer Maya",
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

        # 3. DJ (Disjoint coverage): Bengaluru only
        cls.u_dj = User.objects.create_user(
            username="dj_member", email="dj@example.com", password="password123"
        )
        cls.a_dj = ArtistProfile.objects.create(
            user=cls.u_dj,
            stage_name="DJ Rex",
            category=cls.cat_dj,
            country=cls.india,
            state=cls.karnataka,
            district=cls.d_bengaluru,
            location="Bengaluru, Karnataka",
            starting_price=Decimal("12000.00"),
            is_verified=True,
            is_active=True,
        )
        ArtistServiceDistrict.objects.create(artist=cls.a_dj, district=cls.d_bengaluru)

        # 4. Inactive/Unverified Artist
        cls.u_unverified = User.objects.create_user(
            username="unverified_art", email="unv@example.com", password="password123"
        )
        cls.a_unverified = ArtistProfile.objects.create(
            user=cls.u_unverified,
            stage_name="Unverified Performer",
            category=cls.cat_singer,
            country=cls.india,
            state=cls.kerala,
            district=cls.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("10000.00"),
            is_verified=False,
            is_active=True,
        )

        # 5. Customer (Non-artist)
        cls.u_customer = User.objects.create_user(
            username="regular_cust", email="cust@example.com", password="password123"
        )

    # --------------------------------------------------------------------------
    # 1. Team Creation Tests
    # --------------------------------------------------------------------------

    def test_team_creation_success(self):
        """Authenticated artist creates team, becomes owner and active member."""
        self.client.force_login(self.u_singer)
        payload = {
            "name": "Kozhikode Fusion Ensemble",
            "description": "A collaborative group performing fusion sets.",
        }
        res = self.client.post(
            "/api/artist/teams/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()["team"]
        self.assertEqual(data["name"], "Kozhikode Fusion Ensemble")
        self.assertTrue(data["is_owner"])
        self.assertEqual(data["active_members_count"], 1)
        self.assertEqual(data["active_members"][0]["artist_id"], self.a_singer.id)
        self.assertEqual(data["active_members"][0]["role"], "owner")
        # Shared coverage initially equals creator's coverage (2 districts: Kozhikode, Kannur)
        self.assertEqual(data["shared_coverage"]["count"], 2)

    def test_team_creation_validation(self):
        """Blank name is rejected with 400."""
        self.client.force_login(self.u_singer)
        res = self.client.post(
            "/api/artist/teams/",
            data=json.dumps({"name": "   "}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Team name is required", res.json()["error"])

    def test_team_creation_requires_artist(self):
        """Non-artist customer cannot create a team (403)."""
        self.client.force_login(self.u_customer)
        res = self.client.post(
            "/api/artist/teams/",
            data=json.dumps({"name": "Customer Team"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

    # --------------------------------------------------------------------------
    # 2. Invitations Tests
    # --------------------------------------------------------------------------

    def test_team_invitation_flow(self):
        """Owner can invite eligible artist, notification created, invitee responds."""
        # 1. Create team
        self.client.force_login(self.u_singer)
        t_res = self.client.post(
            "/api/artist/teams/",
            data=json.dumps({"name": "Acoustic Duo"}),
            content_type="application/json",
        )
        team_id = t_res.json()["team"]["id"]

        # 2. Invite Dancer
        inv_res = self.client.post(
            f"/api/artist/teams/{team_id}/invite/",
            data=json.dumps({"artist_id": self.a_dancer.id, "message": "Join our duo!"}),
            content_type="application/json",
        )
        self.assertEqual(inv_res.status_code, 201)

        # Verify notification created for invitee
        notif = Notification.objects.filter(user=self.u_dancer).first()
        self.assertIsNotNone(notif)
        self.assertIn("Acoustic Duo", notif.title)

        # 3. Prevent duplicate pending invitation
        dup_res = self.client.post(
            f"/api/artist/teams/{team_id}/invite/",
            data=json.dumps({"artist_id": self.a_dancer.id}),
            content_type="application/json",
        )
        self.assertEqual(dup_res.status_code, 400)
        self.assertIn("pending invitation already exists", dup_res.json()["error"])

        # 4. Invitee views received invitations
        self.client.force_login(self.u_dancer)
        list_inv_res = self.client.get("/api/artist/teams/invitations/")
        self.assertEqual(list_inv_res.status_code, 200)
        invs = list_inv_res.json()["invitations"]
        self.assertEqual(len(invs), 1)
        self.assertEqual(invs[0]["team_id"], team_id)
        inv_id = invs[0]["id"]

        # 5. Invitee accepts invitation
        accept_res = self.client.post(
            f"/api/artist/teams/invitations/{inv_id}/respond/",
            data=json.dumps({"action": "accept"}),
            content_type="application/json",
        )
        self.assertEqual(accept_res.status_code, 200)

        # Verify owner got notification
        owner_notif = Notification.objects.filter(
            user=self.u_singer, title__icontains="Invitation Accepted"
        ).first()
        self.assertIsNotNone(owner_notif)

        # 6. Verify shared coverage automatically recalculated:
        # Singer (Kozhikode, Kannur) + Dancer (Kozhikode, Wayanad) = [Kozhikode] (1 district)
        detail_res = self.client.get(f"/api/artist/teams/{team_id}/")
        self.assertEqual(detail_res.status_code, 200)
        team_data = detail_res.json()["team"]
        self.assertEqual(team_data["active_members_count"], 2)
        self.assertEqual(team_data["shared_coverage"]["count"], 1)
        self.assertEqual(team_data["shared_coverage"]["districts"][0]["name"], "Kozhikode")

    def test_invitation_restrictions(self):
        """Cannot invite self, unverified artists, or non-members."""
        self.client.force_login(self.u_singer)
        team = CollaborationTeam.objects.create(name="Solo Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )

        # Cannot invite self
        res_self = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": self.a_singer.id}),
            content_type="application/json",
        )
        self.assertEqual(res_self.status_code, 400)
        self.assertIn("cannot invite yourself", res_self.json()["error"])

        # Cannot invite unverified artist
        res_unv = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": self.a_unverified.id}),
            content_type="application/json",
        )
        self.assertEqual(res_unv.status_code, 400)
        self.assertIn("inactive or pending verification", res_unv.json()["error"])

        # Non-owner cannot invite
        self.client.force_login(self.u_dancer)
        res_non_owner = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": self.a_dj.id}),
            content_type="application/json",
        )
        self.assertEqual(res_non_owner.status_code, 403)

    def test_invitation_targeting_and_isolation(self):
        """
        Verify:
        - Owner sends an invitation.
        - Invitation record is created correctly with status 'pending' and metadata.
        - Only the intended artist receives it; unrelated artists cannot see or respond to it.
        """
        self.client.force_login(self.u_singer)
        team = CollaborationTeam.objects.create(name="Isolation Test Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )

        # 1. Singer invites Dancer
        invite_res = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": self.a_dancer.id, "message": "Exclusive invite for Maya"}),
            content_type="application/json",
        )
        self.assertEqual(invite_res.status_code, 201)
        data = invite_res.json()
        self.assertEqual(data["artist_id"], self.a_dancer.id)
        inv_id = data["invitation_id"]

        # Verify DB record
        membership = CollaborationTeamMember.objects.get(id=inv_id)
        self.assertEqual(membership.team_id, team.id)
        self.assertEqual(membership.artist_id, self.a_dancer.id)
        self.assertEqual(membership.invited_by_id, self.a_singer.id)
        self.assertEqual(membership.status, CollaborationTeamMember.Status.PENDING)
        self.assertEqual(membership.role, CollaborationTeamMember.Role.MEMBER)
        self.assertEqual(membership.message, "Exclusive invite for Maya")
        self.assertIsNone(membership.joined_at)
        self.assertIsNone(membership.responded_at)

        # 2. Intended artist (Dancer) sees it under received invitations
        self.client.force_login(self.u_dancer)
        dancer_invs = self.client.get("/api/artist/teams/invitations/").json()
        self.assertEqual(dancer_invs["count"], 1)
        self.assertEqual(dancer_invs["invitations"][0]["id"], inv_id)
        self.assertEqual(dancer_invs["invitations"][0]["team_name"], "Isolation Test Team")

        # 3. Unrelated artist (DJ) CANNOT see the invitation
        self.client.force_login(self.u_dj)
        dj_invs = self.client.get("/api/artist/teams/invitations/").json()
        self.assertEqual(dj_invs["count"], 0)
        self.assertEqual(len(dj_invs["invitations"]), 0)

        # 4. Unrelated artist (DJ) CANNOT respond to Dancer's invitation
        unauthorized_res = self.client.post(
            f"/api/artist/teams/invitations/{inv_id}/respond/",
            data=json.dumps({"action": "accept"}),
            content_type="application/json",
        )
        self.assertEqual(unauthorized_res.status_code, 403)
        self.assertIn("permission", unauthorized_res.json()["error"])

    def test_invitation_resolves_user_id_and_stage_name(self):
        """
        Verify that passing User ID or Stage Name maps correctly to the target ArtistProfile,
        preventing User ID vs ArtistProfile ID confusion.
        """
        self.client.force_login(self.u_singer)
        team = CollaborationTeam.objects.create(name="ID Resolution Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )

        # 1. Invite an artist using their User ID instead of ArtistProfile ID
        u_target = User.objects.create_user(
            username="target_artist_user", email="target_res@example.com", password="password123"
        )
        a_target = ArtistProfile.objects.create(
            user=u_target,
            stage_name="Target Resolution Artist",
            category=self.cat_dancer,
            country=self.india,
            state=self.kerala,
            district=self.d_kozhikode,
            location="Kozhikode, Kerala",
            starting_price=Decimal("18000.00"),
            is_verified=True,
            is_active=True,
        )

        res_by_user_id = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": u_target.id, "message": "Inviting via user PK"}),
            content_type="application/json",
        )
        self.assertEqual(res_by_user_id.status_code, 201)
        # Verify mapped to ArtistProfile, NOT confused with User ID
        self.assertEqual(res_by_user_id.json()["artist_id"], a_target.id)

        # 2. Invite DJ using Stage Name "DJ Rex"
        res_by_name = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": "DJ Rex", "message": "Inviting via stage name"}),
            content_type="application/json",
        )
        self.assertEqual(res_by_name.status_code, 201)
        self.assertEqual(res_by_name.json()["artist_id"], self.a_dj.id)

    def test_declining_invitation_does_not_add_to_my_teams(self):
        """
        Declining an invitation sets status to declined and does NOT add the team to the artist's My Teams list.
        """
        self.client.force_login(self.u_singer)
        team = CollaborationTeam.objects.create(name="Decline Test Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )

        # Invite DJ
        inv_res = self.client.post(
            f"/api/artist/teams/{team.id}/invite/",
            data=json.dumps({"artist_id": self.a_dj.id, "message": "Join and test decline"}),
            content_type="application/json",
        )
        self.assertEqual(inv_res.status_code, 201)
        inv_id = inv_res.json()["invitation_id"]

        # DJ declines
        self.client.force_login(self.u_dj)
        decline_res = self.client.post(
            f"/api/artist/teams/invitations/{inv_id}/respond/",
            data=json.dumps({"action": "decline"}),
            content_type="application/json",
        )
        self.assertEqual(decline_res.status_code, 200)
        self.assertEqual(decline_res.json()["status"], "declined")

        # DJ checks My Teams -> 0 teams
        my_teams = self.client.get("/api/artist/teams/").json()
        self.assertEqual(my_teams["count"], 0)
        self.assertEqual(len(my_teams["teams"]), 0)

        # DJ checks received invitations -> 0 pending
        invs = self.client.get("/api/artist/teams/invitations/").json()
        self.assertEqual(invs["count"], 0)

        # In DB, status is DECLINED
        membership = CollaborationTeamMember.objects.get(id=inv_id)
        self.assertEqual(membership.status, CollaborationTeamMember.Status.DECLINED)
        self.assertIsNotNone(membership.responded_at)
        self.assertIsNone(membership.joined_at)

    # --------------------------------------------------------------------------
    # 3. Disjoint Coverage & Empty Intersection
    # --------------------------------------------------------------------------

    def test_disjoint_coverage_displays_no_common_coverage(self):
        """When an active member has disjoint coverage, intersection is 0 and message is shown."""
        team = CollaborationTeam.objects.create(name="Cross-State Trio", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )
        # Add DJ (covers only Bengaluru)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dj, role="member", status="active"
        )

        self.client.force_login(self.u_singer)
        res = self.client.get(f"/api/artist/teams/{team.id}/")
        self.assertEqual(res.status_code, 200)
        data = res.json()["team"]
        self.assertEqual(data["shared_coverage"]["count"], 0)
        self.assertEqual(data["shared_coverage"]["message"], "No common service coverage")

    # --------------------------------------------------------------------------
    # 4. Member Ineligibility Marks Team Ineligible
    # --------------------------------------------------------------------------

    def test_inactive_member_marks_team_ineligible(self):
        """
        If an active member becomes inactive or unverified, team is marked
        ineligible for public discovery instead of silently excluding them.
        """
        team = CollaborationTeam.objects.create(name="Aarav & Maya", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dancer, role="member", status="active"
        )

        # Both are active and verified -> eligible
        self.client.force_login(self.u_singer)
        res1 = self.client.get(f"/api/artist/teams/{team.id}/")
        self.assertTrue(res1.json()["team"]["is_eligible_for_discovery"])

        # Now Dancer's profile becomes unverified
        self.a_dancer.is_verified = False
        self.a_dancer.save()

        try:
            res2 = self.client.get(f"/api/artist/teams/{team.id}/")
            data = res2.json()["team"]
            self.assertFalse(data["is_eligible_for_discovery"])
            self.assertIn("Dancer Maya", data["eligibility_reason"])
            self.assertIn("pending verification", data["eligibility_reason"])
        finally:
            self.a_dancer.is_verified = True
            self.a_dancer.save()

    # --------------------------------------------------------------------------
    # 5. Removing Members and Leaving Teams
    # --------------------------------------------------------------------------

    def test_owner_removes_member(self):
        """Owner removes member; membership becomes removed, coverage recalculates."""
        team = CollaborationTeam.objects.create(name="Team to Prune", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )
        dancer_mem = CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dancer, role="member", status="active"
        )

        self.client.force_login(self.u_singer)
        # Attempt to remove owner -> rejected
        owner_mem = CollaborationTeamMember.objects.get(team=team, artist=self.a_singer)
        res_bad = self.client.post(
            f"/api/artist/teams/{team.id}/members/{owner_mem.id}/remove/"
        )
        self.assertEqual(res_bad.status_code, 400)
        self.assertIn("owner cannot be removed", res_bad.json()["error"])

        # Remove dancer -> success
        res_rem = self.client.post(
            f"/api/artist/teams/{team.id}/members/{dancer_mem.id}/remove/"
        )
        self.assertEqual(res_rem.status_code, 200)

        # Removed member no longer contributes to coverage
        dancer_mem.refresh_from_db()
        self.assertEqual(dancer_mem.status, "removed")

        # Singer now has full initial coverage restored (2 districts)
        detail_res = self.client.get(f"/api/artist/teams/{team.id}/")
        self.assertEqual(detail_res.json()["team"]["active_members_count"], 1)
        self.assertEqual(detail_res.json()["team"]["shared_coverage"]["count"], 2)

    def test_member_leaves_team(self):
        """Ordinary member leaves team."""
        team = CollaborationTeam.objects.create(name="Leaving Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dancer, role="member", status="active"
        )

        self.client.force_login(self.u_dancer)
        res_leave = self.client.post(f"/api/artist/teams/{team.id}/leave/")
        self.assertEqual(res_leave.status_code, 200)

        mem = CollaborationTeamMember.objects.get(team=team, artist=self.a_dancer)
        self.assertEqual(mem.status, "left")

    def test_owner_leaves_with_transfer_or_close(self):
        """Owner leaving can transfer ownership or close team safely."""
        team = CollaborationTeam.objects.create(name="Transfer Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dancer, role="member", status="active"
        )

        self.client.force_login(self.u_singer)

        # Owner cannot leave without transfer or close when other members exist
        res_fail = self.client.post(f"/api/artist/teams/{team.id}/leave/")
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn("transfer ownership", res_fail.json()["error"])

        # Transfer ownership to dancer
        res_transfer = self.client.post(
            f"/api/artist/teams/{team.id}/leave/",
            data=json.dumps({"new_owner_id": self.a_dancer.id}),
            content_type="application/json",
        )
        self.assertEqual(res_transfer.status_code, 200)

        team.refresh_from_db()
        self.assertEqual(team.owner_id, self.a_dancer.id)
        dancer_mem = CollaborationTeamMember.objects.get(team=team, artist=self.a_dancer)
        self.assertEqual(dancer_mem.role, "owner")

    def test_artist_candidate_suggestions_by_letters(self):
        """User types letters and receives matching verified artist suggestions."""
        self.client.force_login(self.u_singer)

        # Search for letter 'd'
        res = self.client.get("/api/artist/candidates/?q=d")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue("candidates" in data)
        stage_names = [c["stage_name"] for c in data["candidates"]]

        # Should find dancer and DJ
        self.assertIn("Dancer Maya", stage_names)
        self.assertIn("DJ Rex", stage_names)
        # Should not include self
        self.assertNotIn("Singer Soul", stage_names)

        # Search specifically for 'dan'
        res_dan = self.client.get("/api/artist/candidates/?q=dan")
        self.assertEqual(res_dan.status_code, 200)
        dan_names = [c["stage_name"] for c in res_dan.json()["candidates"]]
        self.assertIn("Dancer Maya", dan_names)
        self.assertNotIn("DJ Rex", dan_names)

    def test_artist_candidate_suggestions_membership_flag(self):
        """Candidates are correctly flagged if already member or pending invitation."""
        team = CollaborationTeam.objects.create(name="Flag Team", owner=self.a_singer)
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_singer, role="owner", status="active"
        )
        # Dancer is already an active member
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dancer, role="member", status="active"
        )
        # DJ has a pending invitation
        CollaborationTeamMember.objects.create(
            team=team, artist=self.a_dj, role="member", status="pending", invited_by=self.a_singer
        )

        self.client.force_login(self.u_singer)
        res = self.client.get(f"/api/artist/teams/{team.id}/candidates/?q=d")
        self.assertEqual(res.status_code, 200)

        candidates = {c["id"]: c for c in res.json()["candidates"]}
        self.assertTrue(candidates[self.a_dancer.id]["is_already_member"])
        self.assertFalse(candidates[self.a_dancer.id]["has_pending_invitation"])

        self.assertFalse(candidates[self.a_dj.id]["is_already_member"])
        self.assertTrue(candidates[self.a_dj.id]["has_pending_invitation"])

    def test_artist_candidate_suggestions_unauthenticated(self):
        """Unauthenticated requests are rejected."""
        self.client.logout()
        res = self.client.get("/api/artist/candidates/?q=a")
        self.assertEqual(res.status_code, 401)

