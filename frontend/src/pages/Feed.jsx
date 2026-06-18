import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import api from '../utils/api';
import { Flame, Compass, Sparkles } from 'lucide-react';

const Feed = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts/feed/');
      setPosts(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load feed', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/posts/categories/');
      // Django returns tags or categories viewset results
      setCategories(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchCategories();
  }, []);

  const handlePostUpdate = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  return (
    <div className="feed-layout">
      {/* Posts Section */}
      <div className="feed-posts-container">
        {loading ? (
          <div className="feed-loading">
            <div className="spinner"></div>
            <p>Loading your feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-feed glass-panel">
            <Sparkles className="empty-icon" />
            <h3>Your Feed is Empty</h3>
            <p>Share your thoughts, photos, or explore tags and categories to fill it up!</p>
            <button className="btn-primary" onClick={() => navigate('/create')}>
              Create First Post
            </button>
          </div>
        ) : (
          <div className="posts-stack">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onUpdate={handlePostUpdate} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Side Suggestions Panel */}
      <div className="feed-side-panel">
        {user && (
          <div className="user-profile-summary-card glass-panel" onClick={() => navigate(`/profile/${user.username}`)}>
            <div className="user-summary-avatar">
              {user.username[0].toUpperCase()}
            </div>
            <div className="user-summary-details">
              <span className="user-summary-name">@{user.username}</span>
              <span className="user-summary-fullname">
                {user.profile?.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Member'}
              </span>
            </div>
          </div>
        )}

        <div className="trending-categories-card glass-panel">
          <div className="card-header-icon">
            <Flame className="trending-icon" />
            <h4>Explore Categories</h4>
          </div>
          
          <div className="categories-list-vertical">
            {categories.length === 0 ? (
              <p className="no-trends">No categories created yet.</p>
            ) : (
              categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="category-item-link"
                  onClick={() => navigate(`/explore?category=${cat.name}`)}
                >
                  <Compass className="compass-icon" />
                  <span>{cat.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feed;
