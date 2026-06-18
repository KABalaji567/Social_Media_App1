import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Send, MessageSquare, Plus, Check, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Chat = () => {
  const { user: currentUser } = useContext(AuthContext);
  const { connectToChat } = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Starting chat with a new user
  const [newChatUsername, setNewChatUsername] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState('');
  const typingTimeoutRef = useRef(null);

  // WebSocket ref — used for real-time notifications only (not for sending)
  const socketRef = useRef(null);
  const wsOpenRef = useRef(false);
  const messagesEndRef = useRef(null);

  // ─────────────────────────────────────────
  // Fetch conversation list
  // ─────────────────────────────────────────
  const fetchConversations = useCallback(async (selectId = null) => {
    try {
      const res = await api.get('/chat/');
      // DRF pagination: unwrap results if needed
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data.results || []);
      setConversations(list);
      setConversationsLoading(false);

      if (selectId) {
        const found = list.find(c => c.id === selectId);
        if (found) setActiveConversation(found);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
      toast.error('Could not load conversations');
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─────────────────────────────────────────
  // When active conversation changes: load messages + connect WS
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!activeConversation) return;

    let cancelled = false;

    const loadMessages = async () => {
      setMessagesLoading(true);
      setMessages([]);
      try {
        const res = await api.get(`/chat/${activeConversation.id}/messages/`);
        if (!cancelled) {
          // This endpoint returns a direct array (no pagination)
          const msgList = Array.isArray(res.data)
            ? res.data
            : (res.data.results || []);
          setMessages(msgList);

          // Mark conversation as read in the list
          setConversations(prev =>
            prev.map(c => c.id === activeConversation.id ? { ...c, unread_count: 0 } : c)
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load messages', err);
          toast.error('Could not load messages');
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    loadMessages();

    // ── WebSocket for real-time push (receive-only; we send via REST) ──
    wsOpenRef.current = false;
    const ws = connectToChat(activeConversation.id, {
      onMessage: (message) => {
        if (cancelled) return;
        // Avoid duplicate: only add if message not already in list
        setMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        // Immediately send a seen receipt
        if (wsOpenRef.current && message.sender?.username !== currentUser.username) {
          ws.send(JSON.stringify({ type: 'seen' }));
        }
      },
      onTyping: (username, typingState) => {
        if (!cancelled && username !== currentUser.username) {
          setOtherUserTyping(typingState ? username : '');
        }
      },
      onSeen: (username) => {
        if (!cancelled && username !== currentUser.username) {
          setMessages(prev =>
            prev.map(m => m.sender?.username === currentUser.username ? { ...m, is_seen: true } : m)
          );
        }
      }
    });

    ws.onopen = () => {
      wsOpenRef.current = true;
      ws.send(JSON.stringify({ type: 'seen' }));
    };

    ws.onclose = () => {
      wsOpenRef.current = false;
    };

    socketRef.current = ws;

    return () => {
      cancelled = true;
      wsOpenRef.current = false;
      setOtherUserTyping('');
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [activeConversation?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // ─────────────────────────────────────────
  // Send a message — REST API (reliable) + WS typing cleanup
  // ─────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !activeConversation || sending) return;

    setMessageText('');
    setSending(true);

    // Stop typing indicator
    if (isTyping && wsOpenRef.current && socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'typing', is_typing: false }));
      setIsTyping(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      // ✅ Primary: send via REST API — always reliable regardless of WS state
      const res = await api.post(`/chat/${activeConversation.id}/send_message/`, { text });
      // Add the saved message directly to local state (avoid waiting for WS echo)
      setMessages(prev => {
        if (prev.find(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });

      // Also notify via WS so the OTHER user's browser receives the message
      if (wsOpenRef.current && socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'chat_message',
          message: res.data.text
        }));
      }

      // Update last message preview in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConversation.id
            ? { ...c, last_message: res.data, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send message', err);
      toast.error('Message could not be sent. Please try again.');
      setMessageText(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────
  // Typing indicator on input change
  // ─────────────────────────────────────────
  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (wsOpenRef.current && socketRef.current) {
      if (!isTyping) {
        socketRef.current.send(JSON.stringify({ type: 'typing', is_typing: true }));
        setIsTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsOpenRef.current && socketRef.current) {
          socketRef.current.send(JSON.stringify({ type: 'typing', is_typing: false }));
        }
        setIsTyping(false);
      }, 3000);
    }
  };

  // ─────────────────────────────────────────
  // Start a new conversation
  // ─────────────────────────────────────────
  const handleStartNewChat = async (e) => {
    e.preventDefault();
    const targetUsername = newChatUsername.trim();
    if (!targetUsername) return;

    if (targetUsername === currentUser.username) {
      toast.warn('You cannot chat with yourself');
      return;
    }

    // Check if conversation already open in list
    const existing = conversations.find(c =>
      c.participants.some(p => p.username === targetUsername)
    );
    if (existing) {
      setActiveConversation(existing);
      setNewChatUsername('');
      return;
    }

    setStartingChat(true);
    try {
      const res = await api.post('/chat/', { participant: targetUsername });
      setNewChatUsername('');
      await fetchConversations(res.data.id);
      toast.success(`Started conversation with @${targetUsername}`);
    } catch (err) {
      console.error('Failed to start conversation', err);
      const msg = err.response?.status === 404
        ? `User "@${targetUsername}" not found`
        : 'Unable to start conversation';
      toast.error(msg);
    } finally {
      setStartingChat(false);
    }
  };

  // ─────────────────────────────────────────
  // Helper
  // ─────────────────────────────────────────
  const getOtherParticipant = (conv) =>
    conv.participants.find(p => p.username !== currentUser.username) || { username: 'Unknown User' };

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <div className="chat-layout-container glass-panel animate-fade-in">
      {/* ── Left: Conversations list ── */}
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h4>Inbox</h4>
          <form onSubmit={handleStartNewChat} className="new-chat-form">
            <input
              type="text"
              className="glass-input new-chat-input"
              placeholder="Enter username to message..."
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
              disabled={startingChat}
            />
            <button type="submit" className="new-chat-btn" disabled={startingChat || !newChatUsername.trim()}>
              {startingChat
                ? <Loader2 className="spinner-icon animate-spin" />
                : <Plus className="plus-icon" />
              }
            </button>
          </form>
        </div>

        <div className="conversations-list">
          {conversationsLoading ? (
            <div className="conversations-loading">
              <div className="spinner mini"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-inbox">
              <MessageSquare className="empty-inbox-icon" />
              <p>No messages yet</p>
              <span className="empty-inbox-hint">Type a username above to start chatting</span>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isActive = activeConversation?.id === conv.id;
              const hasUnread = conv.unread_count > 0;
              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                  onClick={() => setActiveConversation(conv)}
                >
                  <div className="conv-avatar">
                    {other.username[0].toUpperCase()}
                  </div>
                  <div className="conv-meta">
                    <span className="conv-username">@{other.username}</span>
                    {conv.last_message && (
                      <span className="conv-last-text">
                        {conv.last_message.sender?.username === currentUser.username ? 'You: ' : ''}
                        {conv.last_message.text}
                      </span>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="conv-unread-badge">{conv.unread_count}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Message room ── */}
      <div className="chat-room-container">
        {activeConversation ? (
          <>
            <header className="chat-room-header">
              <div className="room-header-avatar">
                {getOtherParticipant(activeConversation).username[0].toUpperCase()}
              </div>
              <div>
                <span className="room-header-username">
                  @{getOtherParticipant(activeConversation).username}
                </span>
                {otherUserTyping && (
                  <span className="room-header-typing">typing...</span>
                )}
              </div>
            </header>

            <div className="messages-area">
              {messagesLoading ? (
                <div className="messages-loading">
                  <div className="spinner"></div>
                </div>
              ) : (
                <div className="messages-stack">
                  {messages.length === 0 && (
                    <div className="no-messages-yet">
                      <MessageSquare className="no-messages-icon" />
                      <p>No messages yet. Say hello! 👋</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwn = msg.sender?.username === currentUser.username;
                    const timeAgo = msg.created_at
                      ? formatDistanceToNow(new Date(msg.created_at)) + ' ago'
                      : '';
                    return (
                      <div key={msg.id} className={`message-bubble-wrapper ${isOwn ? 'own' : 'incoming'}`}>
                        {!isOwn && (
                          <div className="message-avatar">
                            {msg.sender?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="message-bubble-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-meta">
                            <span className="message-time">{timeAgo}</span>
                            {isOwn && (
                              <span className="message-status">
                                {msg.is_seen
                                  ? <CheckCheck className="status-icon seen" />
                                  : <Check className="status-icon sent" />
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator bubble */}
                  {otherUserTyping && (
                    <div className="message-bubble-wrapper incoming">
                      <div className="message-avatar">
                        {getOtherParticipant(activeConversation).username[0].toUpperCase()}
                      </div>
                      <div className="message-bubble-content typing-glow">
                        <div className="typing-dots">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                className="glass-input chat-input-field"
                placeholder="Type a message..."
                value={messageText}
                onChange={handleInputChange}
                disabled={sending}
                autoFocus
              />
              <button type="submit" className="chat-send-btn" disabled={!messageText.trim() || sending}>
                {sending
                  ? <Loader2 className="spinner-icon animate-spin" />
                  : <Send className="send-icon" />
                }
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <MessageSquare className="no-chat-icon" />
            <h3>Your Messages</h3>
            <p>Select a conversation from the inbox, or type a username above to start a new chat.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
