import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from './AuthContext';
import api from '../utils/api';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const notificationSocketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setNotifications(list);
      setUnreadNotificationsCount(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = localStorage.getItem('access_token');
      const wsUrl = `${protocol}//${window.location.host}/ws/notifications/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      notificationSocketRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setNotifications((prev) => [data, ...prev]);
        setUnreadNotificationsCount((prev) => prev + 1);
      };

      ws.onerror = (err) => {
        console.error('Notification socket error', err);
      };

      ws.onclose = () => {
        console.log('Notification socket closed');
      };

      return () => {
        ws.close();
      };
    } else {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      if (notificationSocketRef.current) {
        notificationSocketRef.current.close();
      }
    }
  }, [user]);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all/');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const connectToChat = (conversationId, callbacks) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('access_token');
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${conversationId}/?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message' && callbacks.onMessage) {
        callbacks.onMessage(data.message);
      } else if (data.type === 'typing' && callbacks.onTyping) {
        callbacks.onTyping(data.user, data.is_typing);
      } else if (data.type === 'seen' && callbacks.onSeen) {
        callbacks.onSeen(data.user);
      }
    };

    ws.onerror = (err) => {
      console.error(`Chat WebSocket error for conversation ${conversationId}`, err);
    };

    ws.onclose = () => {
      console.log(`Chat socket closed for conversation ${conversationId}`);
    };

    return ws;
  };

  return (
    <SocketContext.Provider
      value={{
        notifications,
        unreadNotificationsCount,
        markAllAsRead,
        markAsRead,
        connectToChat,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
