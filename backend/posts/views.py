from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import Post, Tag, Category, SavedPost
from .serializers import PostSerializer, TagSerializer, CategorySerializer
from reactions.models import Reaction

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['caption', 'tags__name', 'category__name', 'user__username']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        reaction, created = Reaction.objects.get_or_create(user=request.user, post=post)
        
        if not created and reaction.type == Reaction.LIKE:
            reaction.delete()
            return Response({'status': 'unliked'}, status=status.HTTP_200_OK)
        
        reaction.type = Reaction.LIKE
        reaction.save()
        return Response({'status': 'liked'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def dislike(self, request, pk=None):
        post = self.get_object()
        reaction, created = Reaction.objects.get_or_create(user=request.user, post=post)
        
        if not created and reaction.type == Reaction.DISLIKE:
            reaction.delete()
            return Response({'status': 'undisliked'}, status=status.HTTP_200_OK)
        
        reaction.type = Reaction.DISLIKE
        reaction.save()
        return Response({'status': 'disliked'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def save_post(self, request, pk=None):
        post = self.get_object()
        saved_post, created = SavedPost.objects.get_or_create(user=request.user, post=post)
        
        if not created:
            saved_post.delete()
            return Response({'status': 'removed'}, status=status.HTTP_200_OK)
        
        return Response({'status': 'saved'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def saved(self, request):
        saved_posts = SavedPost.objects.filter(user=request.user)
        posts = [sp.post for sp in saved_posts]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def feed(self, request):
        if request.user.is_authenticated:
            # Get posts from followed users
            following_users = request.user.following.values_list('following', flat=True)
            posts = Post.objects.filter(user_id__in=following_users) | Post.objects.filter(user=request.user)
        else:
            posts = Post.objects.all()
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
