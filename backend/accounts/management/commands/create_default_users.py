from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from profiles.models import Profile

class Command(BaseCommand):
    help = 'Creates default users and an admin'

    def handle(self, *args, **kwargs):
        # Create admin
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
            self.stdout.write(self.style.SUCCESS('Admin user created'))
        else:
            self.stdout.write(self.style.WARNING('Admin user already exists'))

        # Create default users
        for i in range(1, 5):
            username = f'user{i}'
            password = 'user123'
            email = f'user{i}@example.com'
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(username=username, email=email, password=password)
                self.stdout.write(self.style.SUCCESS(f'User {username} created'))
            else:
                self.stdout.write(self.style.WARNING(f'User {username} already exists'))
