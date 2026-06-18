from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_photo = models.ImageField(upload_to='profiles/photos/', default='profiles/photos/default.png', blank=True)
    cover_photo = models.ImageField(upload_to='profiles/covers/', default='profiles/covers/default_cover.png', blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    
    # We can use properties or annotate for counts, but storing them can be faster for high-read apps
    # For this implementation, we'll use properties to calculate them dynamically
    
    @property
    def followers_count(self):
        return self.user.followers.count()
    
    @property
    def following_count(self):
        return self.user.following.count()
    
    @property
    def posts_count(self):
        return self.user.posts.count()

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Follow(models.Model):
    follower = models.ForeignKey(User, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower} follows {self.following}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
