import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Conversation, Message
from .serializers import MessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user = self.scope['user']

        if self.user.is_authenticated:
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'chat_message':
            message_text = data['message']
            sender_id = self.user.id
            
            # Save message to database
            message = await self.save_message(self.conversation_id, sender_id, message_text)
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_event',
                    'message': message
                }
            )
        elif message_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_event',
                    'user': self.user.username,
                    'is_typing': data['is_typing']
                }
            )
        elif message_type == 'seen':
            await self.mark_messages_as_seen(self.conversation_id, self.user)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'seen_event',
                    'user': self.user.username
                }
            )

    # Receive message from room group
    async def chat_message_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    async def typing_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user': event['user'],
            'is_typing': event['is_typing']
        }))

    async def seen_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'seen',
            'user': event['user']
        }))

    @database_sync_to_async
    def save_message(self, conversation_id, sender_id, text):
        conversation = Conversation.objects.get(id=conversation_id)
        sender = User.objects.get(id=sender_id)
        message = Message.objects.create(conversation=conversation, sender=sender, text=text)
        conversation.save() # Update updated_at
        return MessageSerializer(message).data

    @database_sync_to_async
    def mark_messages_as_seen(self, conversation_id, user):
        conversation = Conversation.objects.get(id=conversation_id)
        conversation.messages.exclude(sender=user).update(is_seen=True)
