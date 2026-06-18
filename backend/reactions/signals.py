from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Reaction
from notifications.models import Notification

@receiver(post_save, sender=Reaction)
def create_reaction_notification(sender, instance, created, **kwargs):
    if created and instance.type == 'LIKE' and instance.user != instance.post.user:
        Notification.objects.create(
            recipient=instance.post.user,
            sender=instance.user,
            notification_type='LIKE',
            post=instance.post,
            text=f"{instance.user.username} liked your post"
        )
