from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from django.contrib.auth.models import User

class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        participant_username = request.data.get('participant')
        if not participant_username:
            return Response({"error": "Participant username required"}, status=status.HTTP_400_BAD_REQUEST)
        
        participant = get_object_or_404(User, username=participant_username)
        
        # Check if conversation already exists
        conversation = Conversation.objects.filter(participants=request.user).filter(participants=participant).first()
        
        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, participant)
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()
        
        # Mark messages as seen
        messages.exclude(sender=request.user).update(is_seen=True)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        text = request.data.get('text')
        if not text:
            return Response({"error": "Text required"}, status=status.HTTP_400_BAD_REQUEST)
        
        message = Message.objects.create(conversation=conversation, sender=request.user, text=text)
        conversation.save() # Update updated_at
        
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
