import logging
from django.core.management.base import BaseCommand
from app.views import check_and_expire_reservations

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Reconciles payment status and expires unpaid accepted reservations "
        "whose 24-hour payment deadline has passed."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--artist-id",
            type=int,
            dest="artist_id",
            default=None,
            help="Optionally check and expire reservations for a specific artist ID.",
        )
        parser.add_argument(
            "--booking-id",
            type=int,
            dest="booking_id",
            default=None,
            help="Optionally check and expire a specific booking ID.",
        )

    def handle(self, *args, **options):
        artist_id = options.get("artist_id")
        booking_id = options.get("booking_id")

        artist = None
        if artist_id:
            from app.models import ArtistProfile
            artist = ArtistProfile.objects.filter(id=artist_id).first()
            if not artist:
                self.stderr.write(self.style.ERROR(f"ArtistProfile with ID {artist_id} not found."))
                return

        booking = None
        if booking_id:
            from app.models import Booking
            booking = Booking.objects.filter(id=booking_id).first()
            if not booking:
                self.stderr.write(self.style.ERROR(f"Booking with ID {booking_id} not found."))
                return

        self.stdout.write(self.style.NOTICE("Running reservation expiry check..."))

        results = check_and_expire_reservations(artist=artist, booking=booking)

        msg = (
            f"Expiry check complete: checked={results['checked']}, "
            f"expired={results['expired']}, retained={results['retained']}, "
            f"failed_reconciliation={results['failed_reconciliation']}"
        )
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))
