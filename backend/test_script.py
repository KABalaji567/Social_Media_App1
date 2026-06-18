import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'social_media_app.settings')
django.setup()

from django.contrib.auth.models import User
from posts.models import Post
from comments.models import Comment
from chat.models import Conversation, Message

try:
    print("Checking if test data exists or creating it...")
    user1, _ = User.objects.get_or_create(username="testuser1", email="test1@test.com")
    user1.set_password("password123")
    user1.save()

    user2, _ = User.objects.get_or_create(username="testuser2", email="test2@test.com")
    user2.set_password("password123")
    user2.save()

    post, _ = Post.objects.get_or_create(
        user=user1,
        caption="Test post caption",
        image="profiles/photos/default.png"
    )

    print("Creating comment...")
    comment = Comment.objects.create(
        user=user2,
        post=post,
        content="This is a test comment!"
    )
    print(f"Comment created successfully: {comment.id} - '{comment.content}'")

    print("Creating conversation...")
    conv = Conversation.objects.create()
    conv.participants.add(user1, user2)
    conv.save()

    print("Creating message...")
    msg = Message.objects.create(
        conversation=conv,
        sender=user1,
        text="Hello user 2!"
    )
    print(f"Message created successfully: {msg.id} - '{msg.text}'")

    print("ALL TESTS PASSED SUCCESSFULLY ON BACKEND")
except Exception as e:
    import traceback
    print("BACKEND CODE ERROR ENCOUNTERED:")
    traceback.print_exc()
