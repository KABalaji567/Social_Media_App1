import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Grid, Bookmark, Edit2, Check, X, Camera } from 'lucide-react';

const Profile = () => {
  const { username } = useParams();
  const { user: currentUser, reloadUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'saved'
  
  // Edit Profile States
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const targetUsername = username || currentUser?.username;
  const isOwnProfile = currentUser && currentUser.username === targetUsername;

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile Info
      const profileRes = await api.get(`/profiles/${targetUsername}/`);
      setProfile(profileRes.data);
      setFullName(profileRes.data.full_name || '');
      setBio(profileRes.data.bio || '');

      // 2. Fetch User's Posts
      // Search for user posts, then filter on frontend to match author username exactly
      const postsRes = await api.get(`/posts/?search=${targetUsername}`);
      const filteredPosts = (postsRes.data.results || postsRes.data || []).filter(
        (post) => post.user.username === targetUsername
      );
      setPosts(filteredPosts);

      // 3. Fetch Saved Posts (only if own profile)
      if (isOwnProfile) {
        const savedRes = await api.get('/posts/saved/');
        // Saved posts API returns list of SavedPost objects: { id, user, post, created_at }
        // Map to get the Post object directly
        const postsList = (savedRes.data.results || savedRes.data || []).map((sp) => sp.post);
        setSavedPosts(postsList);
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
      toast.error('User profile not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetUsername) {
      fetchProfileData();
    }
  }, [username, targetUsername]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const endpoint = profile.is_following ? 'unfollow' : 'follow';
    try {
      const res = await api.post(`/profiles/${targetUsername}/${endpoint}/`);
      toast.success(res.data.message);
      
      // Update follow status in UI
      setProfile((prev) => ({
        ...prev,
        is_following: !prev.is_following,
        followers_count: prev.is_following 
          ? Math.max(0, prev.followers_count - 1) 
          : prev.followers_count + 1
      }));
    } catch (err) {
      console.error('Failed to toggle follow', err);
      toast.error('Unable to complete request');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('bio', bio);
    if (profilePhoto) {
      formData.append('profile_photo', profilePhoto);
    }

    try {
      const res = await api.put(`/profiles/${currentUser.username}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setProfile(res.data);
      setEditMode(false);
      toast.success('Profile updated successfully!');
      reloadUser();
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    // Update posts state
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    // Update saved posts state
    setSavedPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  };

  if (loading) {
    return (
      <div className="feed-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      {/* Profile Header Card */}
      <div className="profile-header-card glass-panel animate-fade-in">
        {/* Cover Photo */}
        <div className="profile-cover">
          {profile.cover_photo && (
            <img 
              src={profile.cover_photo.startsWith('http') ? profile.cover_photo : `http://localhost:8000${profile.cover_photo}`} 
              alt="Cover" 
              className="cover-img"
            />
          )}
        </div>

        {/* Profile Content */}
        <div className="profile-info-section">
          <div className="profile-avatar-row">
            <div className="profile-avatar-large">
              {profile.profile_photo && !profile.profile_photo.includes('default.png') ? (
                <img 
                  src={profile.profile_photo.startsWith('http') ? profile.profile_photo : `http://localhost:8000${profile.profile_photo}`} 
                  alt={profile.username} 
                  className="avatar-large-img"
                />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>

            <div className="profile-action-btn-container">
              {isOwnProfile ? (
                !editMode ? (
                  <button className="btn-secondary" onClick={() => setEditMode(true)}>
                    <Edit2 className="edit-btn-icon" />
                    Edit Profile
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                )
              ) : (
                <button 
                  className={`btn-primary ${profile.is_following ? 'unfollow-btn-style' : ''}`}
                  onClick={handleFollowToggle}
                >
                  {profile.is_following ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          {/* Edit Form OR Profile Display */}
          {!editMode ? (
            <div className="profile-metadata">
              <h2 className="profile-username-heading">@{profile.username}</h2>
              {profile.full_name && <h4 className="profile-fullname-heading">{profile.full_name}</h4>}
              {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="profile-edit-form">
              <div className="form-group">
                <label>Profile Image</label>
                <div className="image-select-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePhoto(e.target.files[0])}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="editFullName">Display Name</label>
                <input
                  type="text"
                  id="editFullName"
                  className="glass-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={saveLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editBio">Bio</label>
                <textarea
                  id="editBio"
                  className="glass-input"
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={saveLoading}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={saveLoading}>
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Profile Statistics */}
          <div className="profile-stats-bar">
            <div className="stat-item">
              <span className="stat-count">{profile.posts_count}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <span className="stat-count">{profile.followers_count}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-count">{profile.following_count}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="profile-tabs-nav glass-panel">
        <button 
          className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <Grid className="tab-icon" />
          Posts
        </button>

        {isOwnProfile && (
          <button 
            className={`profile-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <Bookmark className="tab-icon" />
            Saved Posts
          </button>
        )}
      </div>

      {/* Grid Content */}
      <div className="profile-tab-content">
        {activeTab === 'posts' ? (
          posts.length === 0 ? (
            <p className="no-posts-msg">No posts shared yet.</p>
          ) : (
            <div className="explore-grid-layout">
              {posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onUpdate={handlePostUpdate} 
                />
              ))}
            </div>
          )
        ) : (
          savedPosts.length === 0 ? (
            <p className="no-posts-msg">No saved posts.</p>
          ) : (
            <div className="explore-grid-layout">
              {savedPosts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onUpdate={handlePostUpdate} 
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Profile;
