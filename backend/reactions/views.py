from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Reaction
from .serializers import ReactionSerializer
from posts.models import Post

class ReactionViewSet(viewsets.ModelViewSet):
    queryset = Reaction.objects.all()
    serializer_class = ReactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        post_id = request.data.get('post')
        reaction_type = request.data.get('type') # 'LIKE' or 'DISLIKE'

        if not post_id or reaction_type not in ['LIKE', 'DISLIKE']:
            return Response({"error": "Post ID and valid type ('LIKE' or 'DISLIKE') are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

        reaction, created = Reaction.objects.get_or_create(
            user=request.user,
            post=post,
            defaults={'type': reaction_type}
        )

        if not created:
            if reaction.type == reaction_type:
                # Toggle off if user clicked the same button again
                reaction.delete()
                return Response({"message": "Reaction removed"}, status=status.HTTP_200_OK)
            else:
                # Update reaction type if they changed from LIKE to DISLIKE or vice versa
                reaction.type = reaction_type
                reaction.save()
                return Response({"message": "Reaction updated"}, status=status.HTTP_200_OK)

        return Response(ReactionSerializer(reaction).data, status=status.HTTP_201_CREATED)
