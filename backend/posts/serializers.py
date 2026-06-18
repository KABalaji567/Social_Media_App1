from rest_framework import serializers
from .models import Post, Tag, Category, SavedPost
from accounts.serializers import UserSerializer

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'

    def get_likes_count(self, obj):
        return obj.reactions.filter(type='LIKE').count()

    def get_dislikes_count(self, obj):
        return obj.reactions.filter(type='DISLIKE').count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return obj.reactions.filter(user=user, type='LIKE').exists()
        return False

    def get_is_disliked(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return obj.reactions.filter(user=user, type='DISLIKE').exists()
        return False

    def get_is_saved(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return obj.saved_by.filter(user=user).exists()
        return False
