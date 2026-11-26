from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase

from app.models import ArtistProfile, Category, Notification, SupportMessage, SupportTicket

User = get_user_model()


class ArtistHelpSupportWorkflowTests(TestCase):
    def setUp(self):
        self.cat, _ = Category.objects.get_or_create(name="Singers & Vocalists")

        self.admin_user = User.objects.create_user(
            username="support_admin",
            email="admin@talenthire.in",
            password="Password123!",
            is_staff=True,
            is_superuser=True,
        )

        self.artist_user = User.objects.create_user(
            username="support_artist",
            email="artist@talenthire.in",
            password="Password123!",
        )
        self.artist_profile = ArtistProfile.objects.create(
            user=self.artist_user,
            stage_name="Aarav Live",
            category=self.cat,
            location="Kochi, Kerala",
            phone="9876543210",
            starting_price=25000,
            is_verified=True,
        )

        self.other_artist_user = User.objects.create_user(
            username="other_artist",
            email="other@talenthire.in",
            password="Password123!",
        )
        self.other_artist_profile = ArtistProfile.objects.create(
            user=self.other_artist_user,
            stage_name="DJ Pulse",
            category=self.cat,
            location="Mumbai",
            phone="9876543211",
            starting_price=30000,
            is_verified=True,
        )

        self.customer_user = User.objects.create_user(
            username="support_customer",
            email="customer@talenthire.in",
            password="Password123!",
        )

        self.artist_client = Client()
        self.other_artist_client = Client()
        self.admin_client = Client()
        self.customer_client = Client()

        self.artist_client.force_login(self.artist_user)
        self.other_artist_client.force_login(self.other_artist_user)
        self.admin_client.force_login(self.admin_user)
        self.customer_client.force_login(self.customer_user)

    def test_full_support_ticket_lifecycle_and_permissions(self):
        # 1. Artist submits a suggestion with an optional PNG attachment
        png_file = SimpleUploadedFile(
            "screenshot.png",
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
            content_type="image/png",
        )
        create_res = self.artist_client.post(
            "/api/artist/support/tickets/",
            {
                "category": "suggestion",
                "subject": "Add dark mode calendar export",
                "message": "Please allow exporting accepted gigs to iCal format.",
                "attachment": png_file,
            },
        )
        self.assertEqual(create_res.status_code, 201)
        created_data = create_res.json()
        ticket = created_data["ticket"]
        ticket_id = ticket["id"]
        self.assertTrue(ticket["ticket_number"].startswith("SUP-"))
        self.assertEqual(ticket["status"], "open")
        self.assertEqual(ticket["category"], "suggestion")
        self.assertEqual(len(ticket["messages"]), 1)
        self.assertTrue(ticket["messages"][0]["attachment_url"])

        # 2. Admin receives notification & sees the ticket in Support Management
        self.assertTrue(
            Notification.objects.filter(
                user=self.admin_user,
                title__icontains=ticket["ticket_number"],
            ).exists()
        )
        admin_list_res = self.admin_client.get(
            f"/api/admin/support/tickets/?search={ticket['ticket_number']}&category=suggestion&status=open"
        )
        self.assertEqual(admin_list_res.status_code, 200)
        self.assertEqual(admin_list_res.json()["total_count"], 1)

        # Permission checks: another artist & customer cannot access this ticket
        self.assertEqual(
            self.other_artist_client.get(f"/api/artist/support/tickets/{ticket_id}/").status_code,
            404,
        )
        self.assertEqual(
            self.customer_client.get("/api/artist/support/tickets/").status_code,
            403,
        )
        self.assertEqual(
            self.artist_client.get("/api/admin/support/tickets/").status_code,
            403,
        )

        # 3. Admin opens and replies (status automatically moves to awaiting_response)
        admin_detail_res = self.admin_client.get(f"/api/admin/support/tickets/{ticket_id}/")
        self.assertEqual(admin_detail_res.status_code, 200)

        admin_reply_res = self.admin_client.post(
            f"/api/admin/support/tickets/{ticket_id}/reply/",
            {
                "message": "Great idea! We have queued this for our next sprint.",
                "status": "awaiting_response",
            },
        )
        self.assertEqual(admin_reply_res.status_code, 201)
        self.assertEqual(admin_reply_res.json()["ticket"]["status"], "awaiting_response")

        # 4. Artist receives notification & sees unread reply count
        self.assertTrue(
            Notification.objects.filter(
                user=self.artist_user,
                title__icontains=f"Support Reply [{ticket['ticket_number']}]",
            ).exists()
        )
        artist_list_res = self.artist_client.get("/api/artist/support/tickets/")
        self.assertEqual(artist_list_res.status_code, 200)
        self.assertEqual(artist_list_res.json()["unread_tickets_count"], 1)

        # 5. Artist opens conversation (marks read) and replies back
        artist_detail_res = self.artist_client.get(f"/api/artist/support/tickets/{ticket_id}/")
        self.assertEqual(artist_detail_res.status_code, 200)
        self.assertEqual(len(artist_detail_res.json()["ticket"]["messages"]), 2)

        artist_reply_res = self.artist_client.post(
            f"/api/artist/support/tickets/{ticket_id}/reply/",
            {"message": "Thanks! Looking forward to seeing it live."},
        )
        self.assertEqual(artist_reply_res.status_code, 201)
        self.assertEqual(artist_reply_res.json()["ticket"]["status"], "in_progress")

        # 6. Admin marks ticket as Resolved
        resolve_res = self.admin_client.post(
            f"/api/admin/support/tickets/{ticket_id}/status/",
            data='{"status": "resolved"}',
            content_type="application/json",
        )
        self.assertEqual(resolve_res.status_code, 200)
        self.assertEqual(resolve_res.json()["ticket"]["status"], "resolved")

        # 7. Artist sees the updated Resolved status & notification
        final_artist_res = self.artist_client.get(f"/api/artist/support/tickets/{ticket_id}/")
        self.assertEqual(final_artist_res.status_code, 200)
        self.assertEqual(final_artist_res.json()["ticket"]["status"], "resolved")
        self.assertEqual(len(final_artist_res.json()["ticket"]["messages"]), 3)
        self.assertTrue(
            Notification.objects.filter(
                user=self.artist_user,
                title__icontains=f"Ticket Status Updated [{ticket['ticket_number']}]",
            ).exists()
        )

        # Closing ticket prevents further artist replies
        close_res = self.admin_client.post(
            f"/api/admin/support/tickets/{ticket_id}/status/",
            data='{"status": "closed"}',
            content_type="application/json",
        )
        self.assertEqual(close_res.status_code, 200)
        closed_reply_res = self.artist_client.post(
            f"/api/artist/support/tickets/{ticket_id}/reply/",
            {"message": "Trying to reply after close"},
        )
        self.assertEqual(closed_reply_res.status_code, 400)

    def test_unsupported_attachment_rejected(self):
        bad_file = SimpleUploadedFile(
            "malware.exe",
            b"MZ\x90\x00",
            content_type="application/x-msdownload",
        )
        res = self.artist_client.post(
            "/api/artist/support/tickets/",
            {
                "category": "technical_issue",
                "subject": "Upload error",
                "message": "Testing file restriction.",
                "attachment": bad_file,
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file type", res.json()["error"])
