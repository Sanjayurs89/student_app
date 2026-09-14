// app/dashboard/chat/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import io from 'socket.io-client';
import API from '@/utils/api';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  Send, 
  ArrowLeft, 
  Hash, 
  User, 
  Loader2, 
  LogOut, 
  Home,
  MessageSquareOff
} from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileView, setMobileView] = useState('rooms'); // 'rooms' | 'chat'
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Fetch user information & Chat rooms
  useEffect(() => {
    const initChat = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch profile
        const meRes = await API.get('/auth/me');
        const user = meRes.data.user;
        setCurrentUser(user);

        if (!user.isOnboarded) {
          router.push('/onboarding');
          return;
        }

        // Fetch authorized rooms
        const roomsRes = await API.get('/chat/rooms');
        setRooms(roomsRes.data);
        setRoomsLoading(false);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Could not initialize chat session. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [router]);

  // 2. Initialize and handle Socket.io connection
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !currentUser) return;

    // Connect to Socket.io backend
    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('initial_online_users', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on('user_online', (data) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
    });

    socket.on('user_offline', (data) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser]);

  // 3. Handle Room Subscription and Historical Messages loading
  useEffect(() => {
    if (!activeRoom) return;

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const res = await API.get(`/chat/messages/${activeRoom.roomId}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();

    const socket = socketRef.current;
    if (socket) {
      // Join socket room
      socket.emit('join_room', activeRoom.roomId);

      // Listen for incoming messages
      const handleNewMessage = (msg) => {
        if (msg.roomId === activeRoom.roomId) {
          setMessages((prev) => [...prev, msg]);
        }
      };

      socket.on('new_message', handleNewMessage);

      // Cleanup subscription on activeRoom change
      return () => {
        socket.emit('leave_room', activeRoom.roomId);
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [activeRoom]);

  // 4. Auto scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 5. Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeRoom) return;

    const socket = socketRef.current;
    if (socket && socketConnected) {
      socket.emit('send_message', {
        roomId: activeRoom.roomId,
        content: inputMessage.trim()
      });
      setInputMessage('');
    } else {
      alert('Cannot send message: Socket disconnected. Trying to reconnect...');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Connecting to real-time chat servers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center">
          <p className="text-rose-400 font-semibold mb-4">{error}</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Global Navigation Header (Solid Opaque - No Blur Bleed) */}
      <header className="border-b border-slate-800 bg-[#070c18] shrink-0 z-50 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-violet-500" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            CampusConnect Chat
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Socket status badge */}
          <div className="hidden sm:flex items-center gap-2 border border-slate-800 bg-slate-900 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
            <div className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {socketConnected ? 'Connected' : 'Offline'}
          </div>

          <Link
            href="/dashboard"
            className="p-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 bg-slate-900 transition-all flex items-center gap-2 text-sm font-semibold"
            title="Dashboard"
          >
            <Home className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 bg-slate-900 transition-all"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex gap-6 overflow-hidden relative z-10">
        
        {/* ROOMS LIST PANEL */}
        <aside className={`
          flex-col w-full md:w-80 rounded-2xl border border-slate-800 bg-[#0b101d] overflow-hidden shrink-0 shadow-xl
          ${mobileView === 'rooms' ? 'flex' : 'hidden md:flex'}
        `}>
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]">
            <h2 className="text-base font-bold text-white">Channels</h2>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">Select a discussion room below</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
            {roomsLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading channels...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No active channels found. Complete profile onboarding.
              </div>
            ) : (
              rooms.map((room) => {
                const isActive = activeRoom?.roomId === room.roomId;
                return (
                  <button
                    key={room.roomId}
                    onClick={() => {
                      setActiveRoom(room);
                      setMobileView('chat');
                    }}
                    className={`
                      w-full p-3.5 rounded-xl flex items-center gap-3 text-left transition-all duration-200 border
                      ${isActive 
                        ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border-violet-500/50 text-white shadow-md' 
                        : 'border-transparent hover:bg-slate-900/80 hover:border-slate-800 text-slate-300 hover:text-white'}
                    `}
                  >
                    <div className={`
                      h-9 w-9 rounded-lg flex items-center justify-center shrink-0
                      ${isActive 
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                        : room.type === 'CLASS' 
                          ? 'bg-violet-500/10 text-violet-400 border border-slate-800' 
                          : 'bg-indigo-500/10 text-indigo-400 border border-slate-800'}
                    `}>
                      {room.type === 'CLASS' ? (
                        <GraduationCap className="h-5 w-5" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate text-slate-100">
                          {room.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                        {room.type} Room
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* CHAT MESSAGES WINDOW */}
        <main className={`
          flex-1 flex-col rounded-2xl border border-slate-800 bg-[#0b101d] overflow-hidden relative shadow-xl
          ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}
        `}>
          {activeRoom ? (
            <>
              {/* Room Header */}
              <div className="p-4 md:px-6 border-b border-slate-800 flex items-center gap-4 bg-[#0f172a] shrink-0 z-20 shadow-md">
                {/* Back button for mobile */}
                <button
                  onClick={() => setMobileView('rooms')}
                  className="md:hidden p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  {activeRoom.type === 'CLASS' ? (
                    <GraduationCap className="h-5 w-5" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white truncate leading-snug">{activeRoom.name}</h3>
                    <span className="px-2 py-0.5 text-[9px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded-md shrink-0 uppercase tracking-wide">
                      {activeRoom.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate mt-0.5 font-medium">{activeRoom.description}</p>
                </div>
              </div>

              {/* Message History Scroller */}
              <div className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col gap-4 custom-scrollbar">
                {messagesLoading ? (
                  <div className="flex-grow flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <span className="text-sm text-slate-400 font-light">Decrypting room archive...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                    <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 animate-bounce">
                      <Hash className="h-6 w-6 text-violet-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-200">Welcome to the channel!</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                      This is the beginning of the room. Send a message to start real-time collaboration.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSelf = msg.userId === currentUser.id;
                    const isProfessor = msg.user?.role === 'PROFESSOR';
                    const showDate = index === 0 || 
                      new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                    
                    return (
                      <div key={msg.id} className="flex flex-col gap-2">
                        {showDate && (
                          <div className="text-center my-3 relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <span className="relative px-3 py-0.5 rounded-full border border-slate-800 bg-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[80%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                          {/* Sender metadata */}
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            {!isSelf && onlineUsers.has(msg.userId) && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 border border-slate-950 animate-pulse" title="Online" />
                            )}
                            <span className="text-xs font-extrabold text-slate-300">
                              {isSelf ? 'You' : msg.user?.name}
                            </span>
                            <span className={`
                              text-[9px] font-bold px-1.5 py-0.2 rounded-md tracking-wider uppercase
                              ${isProfessor 
                                ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20' 
                                : 'text-violet-300 bg-violet-500/10 border border-violet-500/20'}
                            `}>
                              {isProfessor ? 'FACULTY' : 'STUDENT'}
                            </span>
                          </div>

                          {/* Message Bubble */}
                          <div className={`
                            px-4.5 py-3 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm
                            ${isSelf 
                              ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-medium rounded-tr-none' 
                              : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'}
                          `}>
                            {msg.content}
                          </div>

                          {/* Timestamp */}
                          <span className="text-[9px] text-slate-400 mt-1 px-1 font-medium">
                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-[#0f172a] sticky bottom-0 z-20 flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Message ${activeRoom.name}...`}
                  className="flex-grow bg-slate-950 border border-slate-900 hover:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-250 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          ) : (
            /* Blank state workspace selection */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-3xl bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-400 mb-6 shadow-xl shadow-indigo-500/5">
                <MessageSquareOff className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">No Channel Selected</h3>
              <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
                Select a class channel or a subject discussion board from the sidebar to start talking, asking doubts, or coordinating tasks in real-time.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
