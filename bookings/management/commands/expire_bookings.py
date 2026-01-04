from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from bookings.models import Booking

class Command(BaseCommand):
    help = 'Expires pending bookings older than 15 minutes'

    def handle(self, *args, **kwargs):
        threshold_time = timezone.now() - timedelta(minutes=15)
        
        # Find pending bookings older than threshold
        expired_bookings = Booking.objects.filter(
            status='pending',
            created_at__lt=threshold_time
        )
        
        count = expired_bookings.count()
        if count > 0:
            self.stdout.write(f"Found {count} expired pending bookings. Cancelling...")
            # We can either delete them or mark them as cancelled. 
            # Marking as cancelled is safer for audit trails.
            # However, if we want to free up slots immediately and not clutter DB, deletion might be preferred.
            # Given "clean up", and that 'cancelled' status exists, let's mark as cancelled 
            # so the slot becomes free (assuming filtering excludes cancelled).
            
            # Note: The taken_slots view excludes 'cancelled'.
            
            updated = expired_bookings.update(status='cancelled', notes='Auto-cancelled due to non-payment timeout')
            self.stdout.write(self.style.SUCCESS(f"Successfully cancelled {updated} bookings."))
        else:
            self.stdout.write("No expired pending bookings found.")
