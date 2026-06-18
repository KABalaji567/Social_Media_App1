from django.urls import path
from .views import ProfileDetailView, FollowUserView, FollowersListView, FollowingListView

urlpatterns = [
    path('<str:username>/', ProfileDetailView.as_view(), name='profile_detail'),
    path('<str:username>/follow/', FollowUserView.as_view(), name='follow_user'),
    path('<str:username>/followers/', FollowersListView.as_view(), name='followers_list'),
    path('<str:username>/following/', FollowingListView.as_view(), name='following_list'),
]
