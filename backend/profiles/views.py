from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from .models import Profile, Follow
from .serializers import ProfileSerializer, FollowSerializer
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'user__username'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, user__username=None):
        profile = self.get_object()
        if profile.user == request.user:
            return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)
        
        follow, created = Follow.objects.get_or_create(follower=request.user, following=profile.user)
        if not created:
            return Response({"message": "Already following"}, status=status.HTTP_200_OK)
        
        return Response({"message": "Successfully followed"}, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unfollow(self, request, user__username=None):
        profile = self.get_object()
        follow = Follow.objects.filter(follower=request.user, following=profile.user)
        if follow.exists():
            follow.delete()
            return Response({"message": "Successfully unfollowed"}, status=status.HTTP_200_OK)
        return Response({"error": "Not following"}, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=['get'])
    def followers(self, request, user__username=None):
        profile = self.get_object()
        followers = Follow.objects.filter(following=profile.user)
        serializer = FollowSerializer(followers, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['get'])
    def following(self, request, user__username=None):
        profile = self.get_object()
        following = Follow.objects.filter(follower=profile.user)
        serializer = FollowSerializer(following, many=True)
        return Response(serializer.data)
