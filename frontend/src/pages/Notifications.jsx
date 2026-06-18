import React, { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Mail, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const { notifications, markAsRead, markAllAsRead } = useContext(SocketContext);
  const navigate = useNavigate();

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    
    // Route appropriately based on notification target
    if (notif.notification_type === 'FOLLOW') {
      navigate(`/profile/${notif.sender.username}`);
    } else if ((notif.notification_type === 'LIKE' || notif.notification_type === 'COMMENT') && notif.post) {
      // Navigate to explore/feed to view post or filter by ID if detail view existed.
      // For now, redirect to the author's profile to view the post.
      navigate(`/profile/${notif.post.user?.username || notif.recipient.username}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LIKE':
        return <Heart className="notif-icon-type like" />;
      case 'COMMENT':
        return <MessageCircle className="notif-icon-type comment" />;
      case 'FOLLOW':
        return <UserPlus className="notif-icon-type follow" />;
      case 'MESSAGE':
        return <Mail className="notif-icon-type message" />;
      default:
        return null;
    }
  };

  return (
    <div className="notifications-page-container">
      <div className="notifications-card glass-panel animate-fade-in">
        <header className="notifications-header">
          <div className="title-row">
            <h3>Notifications</h3>
            {notifications.some((n) => !n.is_read) && (
              <button className="mark-all-read-btn" onClick={markAllAsRead}>
                <CheckCircle2 className="read-all-icon" />
                Mark all as read
              </button>
            )}
          </div>
          <p>Stay up to date with your interactions</p>
        </header>

        <main className="notifications-list-container">
          {notifications.length === 0 ? (
            <div className="empty-notifications">
              <CheckCircle2 className="empty-notif-icon" />
              <h4>All Caught Up!</h4>
              <p>You have no notifications. Interactions with your profile will appear here.</p>
            </div>
          ) : (
            <div className="notifications-stack">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`notification-item-card ${notif.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-icon-wrapper">
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  
                  <div className="notif-content-detail">
                    <p className="notif-text">
                      <span className="notif-sender-name">@{notif.sender.username}</span>{' '}
                      {notif.text || 'interacted with your profile'}
                    </p>
                    <span className="notif-time">
                      {formatDistanceToNow(new Date(notif.created_at))} ago
                    </span>
                  </div>

                  {!notif.is_read && <div className="unread-dot"></div>}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Notifications;
