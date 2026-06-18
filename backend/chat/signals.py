from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message
from notifications.models import Notification

@receiver(post_save, sender=Message)
def create_message_notification(sender, instance, created, **kwargs):
    if created:
        recipient = instance.conversation.participants.exclude(id=instance.sender.id).first()
        if recipient:
            Notification.objects.create(
                recipient=recipient,
                sender=instance.sender,
                notification_type='MESSAGE',
                text=f"{instance.sender.username} sent you a message"
            )
