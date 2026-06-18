from rest_framework import serializers
from .models import Profile, Follow
from django.contrib.auth.models import User
from accounts.serializers import UserSerializer

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    followers_count = serializers.ReadOnlyField()
    following_count = serializers.ReadOnlyField()
    posts_count = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ('id', 'user', 'profile_photo', 'cover_photo', 'full_name', 'bio', 
                  'followers_count', 'following_count', 'posts_count', 'is_following')

    def get_is_following(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return Follow.objects.filter(follower=user, following=obj.user).exists()
        return False

class FollowSerializer(serializers.ModelSerializer):
    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = '__all__'
