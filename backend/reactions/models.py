from django.db import models
from django.contrib.auth.models import User
from posts.models import Post

class Reaction(models.Model):
    LIKE = 'LIKE'
    DISLIKE = 'DISLIKE'
    REACTION_TYPES = [
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reactions')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    type = models.CharField(max_length=10, choices=REACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} {self.type}d {self.post}"
