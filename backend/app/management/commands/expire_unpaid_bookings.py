"""
Management command: expire_unpaid_bookings
Alias for expire_unpaid_reservations.
Reconciles gateway payments and expires unpaid accepted reservations
whose 24-hour payment deadline has passed.
"""

from app.management.commands.expire_unpaid_reservations import Command

__all__ = ["Command"]
