from rest_framework import viewsets, permissions, status, decorators, filters
from rest_framework.response import Response
from .models import Post, Tag, Category, SavedPost
from .serializers import PostSerializer, TagSerializer, CategorySerializer, SavedPostSerializer
from django.db.models import Q

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['caption', 'tags__name', 'category__name', 'user__username']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @decorators.action(detail=False, methods=['get'])
    def feed(self, request):
        # In a real app, this would be posts from following users
        # For this clone, we'll show all posts ordered by date
        posts = Post.objects.all().order_by('-created_at')
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def save_post(self, request, pk=None):
        post = self.get_object()
        saved_post, created = SavedPost.objects.get_or_create(user=request.user, post=post)
        if not created:
            saved_post.delete()
            return Response({"message": "Removed from saved posts"}, status=status.HTTP_200_OK)
        return Response({"message": "Added to saved posts"}, status=status.HTTP_201_CREATED)

    @decorators.action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def saved(self, request):
        saved_posts = SavedPost.objects.filter(user=request.user)
        serializer = SavedPostSerializer(saved_posts, many=True, context={'request': request})
        return Response(serializer.data)

    @decorators.action(detail=False, methods=['get'])
    def by_tag(self, request):
        tag_name = request.query_params.get('tag')
        if not tag_name:
            return Response({"error": "Tag name required"}, status=status.HTTP_400_BAD_REQUEST)
        posts = Post.objects.filter(tags__name=tag_name.lower())
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @decorators.action(detail=False, methods=['get'])
    def by_category(self, request):
        cat_name = request.query_params.get('category')
        if not cat_name:
            return Response({"error": "Category name required"}, status=status.HTTP_400_BAD_REQUEST)
        posts = Post.objects.filter(category__name=cat_name)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
