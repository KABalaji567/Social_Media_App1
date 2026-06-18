from rest_framework import serializers
from .models import Post, Tag, Category, SavedPost
from django.contrib.auth.models import User
from accounts.serializers import UserSerializer

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name')

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name')

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    category_name = serializers.CharField(write_only=True, required=False)
    likes_count = serializers.IntegerField(read_only=True)
    dislikes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id', 'user', 'image', 'caption', 'tags', 'category', 
            'tag_names', 'category_name', 'created_at', 'updated_at',
            'likes_count', 'dislikes_count', 'comments_count',
            'is_liked', 'is_disliked', 'is_saved'
        )

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.reactions.filter(user=request.user, type='LIKE').exists()
        return False

    def get_is_disliked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.reactions.filter(user=request.user, type='DISLIKE').exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(user=request.user).exists()
        return False

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        category_name = validated_data.pop('category_name', None)
        
        post = Post.objects.create(**validated_data)
        
        for name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=name.lower().strip('#'))
            post.tags.add(tag)
            
        if category_name:
            category, _ = Category.objects.get_or_create(name=category_name)
            post.category = category
            post.save()
            
        return post

class SavedPostSerializer(serializers.ModelSerializer):
    post = PostSerializer(read_only=True)

    class Meta:
        model = SavedPost
        fields = ('id', 'user', 'post', 'created_at')
