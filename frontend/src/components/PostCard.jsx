import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { 
  Heart, 
  ThumbsDown, 
  MessageCircle, 
  Bookmark, 
  Send 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PostCard = ({ post, onUpdate }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Optimistic UI updates helper
  const handleReaction = async (reactionType) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Calculate optimistic new state
    let updatedLikes = post.likes_count;
    let updatedDislikes = post.dislikes_count;
    let newIsLiked = post.is_liked;
    let newIsDisliked = post.is_disliked;

    if (reactionType === 'LIKE') {
      if (post.is_liked) {
        updatedLikes = Math.max(0, updatedLikes - 1);
        newIsLiked = false;
      } else {
        updatedLikes += 1;
        newIsLiked = true;
        if (post.is_disliked) {
          updatedDislikes = Math.max(0, updatedDislikes - 1);
          newIsDisliked = false;
        }
      }
    } else if (reactionType === 'DISLIKE') {
      if (post.is_disliked) {
        updatedDislikes = Math.max(0, updatedDislikes - 1);
        newIsDisliked = false;
      } else {
        updatedDislikes += 1;
        newIsDisliked = true;
        if (post.is_liked) {
          updatedLikes = Math.max(0, updatedLikes - 1);
          newIsLiked = false;
        }
      }
    }

    // Call onUpdate to update parent state immediately (optimistic update)
    onUpdate({
      ...post,
      likes_count: updatedLikes,
      dislikes_count: updatedDislikes,
      is_liked: newIsLiked,
      is_disliked: newIsDisliked
    });

    try {
      await api.post('/reactions/', { post: post.id, type: reactionType });
    } catch (err) {
      console.error('Failed to update reaction', err);
      // Revert to original if API failed
      onUpdate(post);
    }
  };

  const handleDoubleClick = () => {
    if (!post.is_liked) {
      handleReaction('LIKE');
    }
    setShowHeartBurst(true);
    setTimeout(() => {
      setShowHeartBurst(false);
    }, 800);
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    onUpdate({
      ...post,
      is_saved: !post.is_saved
    });

    try {
      await api.post(`/posts/${post.id}/save_post/`);
    } catch (err) {
      console.error('Failed to toggle save post', err);
      onUpdate(post);
    }
  };

  const loadComments = async () => {
    try {
      const res = await api.get(`/comments/?post=${post.id}`);
      // DRF returns paginated: { count, results: [] } — unwrap the array
      const commentsList = Array.isArray(res.data)
        ? res.data
        : (res.data.results || []);
      setComments(commentsList);
      setCommentsLoaded(true);
    } catch (err) {
      console.error('Failed to fetch comments', err);
      toast.error('Could not load comments');
    }
  };

  const handleToggleComments = () => {
    if (!showComments && !commentsLoaded) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const tempText = commentText.trim();
    setCommentText(''); // clear input immediately for responsiveness

    try {
      const res = await api.post('/comments/', {
        post: post.id,
        content: tempText
      });
      
      // Ensure prev is always an array before spreading
      setComments((prev) => (Array.isArray(prev) ? [...prev, res.data] : [res.data]));
      
      // Update comments count on parent state
      onUpdate({
        ...post,
        comments_count: post.comments_count + 1
      });
    } catch (err) {
      console.error('Failed to post comment', err);
      const errorMsg = err.response?.data?.detail
        || err.response?.data?.content?.[0]
        || 'Could not post comment. Please try again.';
      toast.error(errorMsg);
      setCommentText(tempText); // restore text so user doesn't lose their input
    }
  };

  const dateFormatted = post.created_at 
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) 
    : '';

  return (
    <article className="post-card glass-card animate-fade-in">
      {/* Post Header */}
      <header className="post-header">
        <div className="post-author-info" onClick={() => navigate(`/profile/${post.user.username}`)}>
          <div className="post-avatar">
            {post.user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="post-username">{post.user.username}</div>
            <div className="post-time">{dateFormatted}</div>
          </div>
        </div>
        
        {post.category && (
          <span 
            className="category-badge"
            onClick={() => navigate(`/explore?category=${post.category.name}`)}
          >
            {post.category.name}
          </span>
        )}
      </header>

      {/* Post Image Container */}
      <div className="post-image-wrapper" onDoubleClick={handleDoubleClick}>
        <img 
          src={post.image.startsWith('http') ? post.image : `http://localhost:8000${post.image}`} 
          alt={post.caption || 'Post image'} 
          className="post-image"
          loading="lazy"
        />
        {showHeartBurst && (
          <div className="heart-burst-overlay">
            <Heart className="burst-heart-icon" />
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="post-actions">
        <div className="action-buttons-group">
          <button 
            className={`action-btn like-btn ${post.is_liked ? 'active' : ''}`}
            onClick={() => handleReaction('LIKE')}
            title="Like"
          >
            <Heart className="action-icon" />
            <span className="action-count">{post.likes_count}</span>
          </button>
          
          <button 
            className={`action-btn dislike-btn ${post.is_disliked ? 'active' : ''}`}
            onClick={() => handleReaction('DISLIKE')}
            title="Dislike"
          >
            <ThumbsDown className="action-icon" />
            <span className="action-count">{post.dislikes_count}</span>
          </button>

          <button 
            className="action-btn comment-btn"
            onClick={handleToggleComments}
            title="Comments"
          >
            <MessageCircle className="action-icon" />
            <span className="action-count">{post.comments_count}</span>
          </button>
        </div>

        <button 
          className={`action-btn save-btn ${post.is_saved ? 'active' : ''}`}
          onClick={handleToggleSave}
          title={post.is_saved ? 'Unsave' : 'Save'}
        >
          <Bookmark className="action-icon" />
        </button>
      </div>

      {/* Caption & Tags */}
      <div className="post-caption-section">
        {post.caption && (
          <p className="post-caption">
            <span className="caption-username" onClick={() => navigate(`/profile/${post.user.username}`)}>
              {post.user.username}
            </span>{' '}
            {post.caption}
          </p>
        )}
        
        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.map((tag) => (
              <span 
                key={tag.id} 
                className="tag-link"
                onClick={() => navigate(`/explore?tag=${tag.name}`)}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expandable Comments Panel */}
      {showComments && (
        <div className="comments-panel">
          <div className="comments-list">
            {!Array.isArray(comments) || comments.length === 0 ? (
              <p className="no-comments">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-avatar">
                    {comment.user.username[0].toUpperCase()}
                  </div>
                  <div className="comment-content-wrapper">
                    <p className="comment-text">
                      <span className="comment-username" onClick={() => navigate(`/profile/${comment.user.username}`)}>
                        {comment.user.username}
                      </span>{' '}
                      {comment.content}
                    </p>
                    <span className="comment-time">
                      {formatDistanceToNow(new Date(comment.created_at))} ago
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <form onSubmit={handlePostComment} className="comment-form">
              <input
                type="text"
                className="glass-input comment-input"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" className="comment-submit-btn" disabled={!commentText.trim()}>
                <Send className="send-icon" />
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};

export default PostCard;
