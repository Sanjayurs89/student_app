// app/dashboard/rooms/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import io from 'socket.io-client';
import API from '@/utils/api';
import { 
  GraduationCap, 
  Users, 
  Home, 
  LogOut, 
  Loader2, 
  Plus, 
  Search, 
  BookOpen, 
  Download, 
  MessageSquare, 
  ArrowLeft,
  X,
  FileText,
  Upload,
  Calendar,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

export default function StudyRoomsPage() {
  const router = useRouter();

  // Global App States
  const [currentUser, setCurrentUser] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [discoverRooms, setDiscoverRooms] = useState([]);
  const [subjects, setSubjects] = useState([]); // for note uploading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation / Tab States
  const [activeTab, setActiveTab] = useState('joined'); // 'joined' | 'discover'
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomNotes, setRoomNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  
  // Presence / Socket States
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  // Modal / Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Note Upload Form States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubjId, setNoteSubjId] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteMode, setNoteMode] = useState('write'); // 'upload' | 'write'
  const [noteContent, setNoteContent] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [noteTags, setNoteTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // 1. Fetch Init User Profile & Room Lists
  useEffect(() => {
    const initPage = async () => {
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

        // Fetch joined rooms, discoverable rooms & subjects
        await Promise.all([
          fetchJoinedRooms(),
          fetchDiscoverRooms(),
          fetchSubjects()
        ]);
      } catch (err) {
        console.error('Error fetching init data:', err);
        setError('Failed to fetch rooms metadata. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  // Real-time Presence Socket Connection
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !currentUser) return;

    // Connect to Socket.io backend
    const socket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Rooms connected to socket server');
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

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser]);

  // Helper fetch functions
  const fetchJoinedRooms = async () => {
    try {
      const res = await API.get('/rooms');
      setJoinedRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiscoverRooms = async () => {
    try {
      const res = await API.get('/rooms/discover');
      setDiscoverRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await API.get('/academic/live-count');
      if (res.data.subjects) {
        setSubjects(res.data.subjects);
      } else if (res.data.classCounts) {
        const uniqueSubjects = [];
        const seen = new Set();
        res.data.classCounts.forEach(c => {
          if (!seen.has(c.subjectId)) {
            seen.add(c.subjectId);
            uniqueSubjects.push({ id: c.subjectId, name: c.subjectName, code: c.subjectCode });
          }
        });
        setSubjects(uniqueSubjects);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    }
  };

  // 2. Load Room Notes on selection
  useEffect(() => {
    if (!activeRoom) {
      setRoomNotes([]);
      return;
    }

    const fetchRoomNotes = async () => {
      setNotesLoading(true);
      try {
        const res = await API.get(`/rooms/${activeRoom.id}/notes`);
        setRoomNotes(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setNotesLoading(false);
      }
    };

    fetchRoomNotes();
  }, [activeRoom]);

  // 3. Create Study Room Handler
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await API.post('/rooms', {
        name: newRoomName.trim(),
        description: newRoomDesc.trim()
      });
      // Add new room to list and make active
      setJoinedRooms((prev) => [res.data, ...prev]);
      setActiveRoom(res.data);
      setMobileView('detail');
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomDesc('');
      // Refresh discover list too just in case
      fetchDiscoverRooms();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating study room');
    } finally {
      setCreateLoading(false);
    }
  };

  // 4. Join Room Handler
  const handleJoinRoom = async (roomId) => {
    try {
      await API.post(`/rooms/${roomId}/join`);
      // Find room in discover list
      const room = discoverRooms.find(r => r.id === roomId);
      if (room) {
        // Move to joined list
        setJoinedRooms((prev) => [
          {
            ...room,
            _count: { members: (room._count?.members || 0) + 1, notes: 0 }
          },
          ...prev
        ]);
        setDiscoverRooms((prev) => prev.filter(r => r.id !== roomId));
        setActiveRoom({
          ...room,
          _count: { members: (room._count?.members || 0) + 1, notes: 0 }
        });
        setMobileView('detail');
        setActiveTab('joined');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error joining study room');
    }
  };

  // 5. Leave / Delete Room Handler
  const handleLeaveRoom = async (room) => {
    const isCreator = room.creatorId === currentUser.id;
    const confirmMsg = isCreator 
      ? 'Warning: You are the creator of this study room. Leaving it will delete the room and all shared notes permanently. Proceed?'
      : 'Are you sure you want to leave this study room?';

    if (!confirm(confirmMsg)) return;

    try {
      await API.post(`/rooms/${room.id}/leave`);
      setJoinedRooms((prev) => prev.filter(r => r.id !== room.id));
      setActiveRoom(null);
      setMobileView('list');
      fetchDiscoverRooms();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error leaving study room');
    }
  };

  // 6. Note Upload Tag Handlers
  const addTag = (tagName) => {
    const cleanTag = tagName.trim().toLowerCase();
    if (!cleanTag) return;
    if (noteTags.includes(cleanTag)) {
      setTagInput('');
      return;
    }
    if (noteTags.length >= 5) {
      setUploadError('You can add a maximum of 5 tags');
      return;
    }
    setNoteTags([...noteTags, cleanTag]);
    setTagInput('');
    setUploadError('');
  };

  const removeTag = (index) => {
    setNoteTags(noteTags.filter((_, i) => i !== index));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10MB limit.');
      return;
    }
    setNoteFile(selectedFile);
    setUploadError('');
  };

  // 7. Upload Note Handler
  const handleUploadNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      setUploadError('Note title is required.');
      return;
    }
    if (!noteSubjId) {
      setUploadError('Please select a course subject.');
      return;
    }
    if (noteMode === 'write' && !noteContent.trim()) {
      setUploadError('Please write some content.');
      return;
    }
    if (noteMode === 'upload' && !noteFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('title', noteTitle.trim());
    formData.append('subjectId', noteSubjId);
    formData.append('visibility', 'ROOM');
    formData.append('roomId', activeRoom.id);
    formData.append('description', noteDesc.trim());
    formData.append('tags', JSON.stringify(noteTags));

    if (noteMode === 'write') {
      formData.append('content', noteContent);
    } else {
      formData.append('file', noteFile);
    }

    try {
      await API.post('/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Refresh room notes
      const notesRes = await API.get(`/rooms/${activeRoom.id}/notes`);
      setRoomNotes(notesRes.data);

      // Update local joinedRooms list count
      setJoinedRooms(prev => prev.map(r => r.id === activeRoom.id 
        ? { ...r, _count: { ...r._count, notes: (r._count?.notes || 0) + 1 } }
        : r
      ));

      // Reset states
      setShowUploadModal(false);
      setNoteTitle('');
      setNoteSubjId('');
      setNoteDesc('');
      setNoteContent('');
      setNoteFile(null);
      setNoteTags([]);
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || 'Failed to upload note.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleDownload = async (noteId, fileName) => {
    try {
      await API.post(`/notes/${noteId}/download`);
      // Update local download count
      setRoomNotes(prev => prev.map(n => n.id === noteId ? { ...n, downloadsCount: n.downloadsCount + 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Loading Virtual Study Rooms...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Subtle depth lighting blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Global Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-violet-500" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            CampusConnect Rooms
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2.5 rounded-xl border border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800 transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <Home className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Study Hub Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex gap-6 overflow-hidden relative z-10">
        
        {/* ROOMS LIST SIDEBAR */}
        <aside className={`
          flex-col w-full md:w-80 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md overflow-hidden shrink-0
          ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}
        `}>
          {/* Header & Create Room button */}
          <div className="p-4 border-b border-slate-900 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200">Study Groups</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-600/10 hover:scale-105"
              title="Create Room"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Directory Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-900 p-2 gap-1">
            <button
              onClick={() => setActiveTab('joined')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'joined' 
                  ? 'bg-slate-900 text-slate-100 border border-slate-800' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              My Rooms ({joinedRooms.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'discover' 
                  ? 'bg-slate-900 text-slate-100 border border-slate-800' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Discover ({discoverRooms.length})
            </button>
          </div>

          {/* Rooms Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
            {activeTab === 'joined' ? (
              // JOINED ROOMS LIST
              joinedRooms.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  You haven't joined any study rooms yet. Go to Discover to join.
                </div>
              ) : (
                joinedRooms.map((room) => {
                  const isActive = activeRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        setActiveRoom(room);
                        setMobileView('detail');
                      }}
                      className={`
                        w-full p-3.5 rounded-xl flex items-center justify-between text-left transition-all border
                        ${isActive 
                          ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-violet-500/30 text-slate-100 shadow-md' 
                          : 'border-transparent hover:bg-slate-900/50 hover:border-slate-900 text-slate-400 hover:text-slate-200'}
                      `}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{room.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold tracking-wide mt-0.5">
                          {room._count?.members || 1} members &bull; {room._count?.notes || 0} notes
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 hover:text-slate-300 transition-colors pl-2" />
                    </button>
                  );
                })
              )
            ) : (
              // DISCOVERABLE ROOMS LIST
              discoverRooms.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No other study rooms are available to join in the college database.
                </div>
              ) : (
                discoverRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/30 flex flex-col gap-2.5 transition-all text-left"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 truncate">{room.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{room.description || 'No description provided.'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900/50">
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {room._count?.members || 1} members
                      </span>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/10 transition-all hover:scale-105"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </aside>

        {/* ACTIVE STUDY ROOM WORKSPACE */}
        <main className={`
          flex-grow flex-col rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md overflow-hidden relative
          ${mobileView === 'detail' ? 'flex' : 'hidden md:flex'}
        `}>
          {activeRoom ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Room Top Header Info */}
              <div className="p-4 md:p-6 border-b border-slate-900 bg-slate-900/10 backdrop-blur-sm sticky top-0 z-20 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2.5 rounded-xl border border-slate-900 text-slate-400 hover:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-slate-100 truncate">{activeRoom.name}</h3>
                    <p className="text-xs text-slate-400 truncate mt-1">
                      Creator: <span className="font-semibold text-slate-300">{activeRoom.creator?.name}</span> &bull; Description: {activeRoom.description || 'No description'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Join Chat shortcut */}
                  <Link
                    href={`/dashboard/chat`}
                    className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-violet-600/15 flex items-center gap-2 text-xs font-bold transition-all hover:scale-103"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Join Chat</span>
                  </Link>

                  <button
                    onClick={() => handleLeaveRoom(activeRoom)}
                    className="p-2.5 text-slate-400 hover:text-rose-400 border border-slate-900 hover:border-rose-500/20 hover:bg-rose-500/5 rounded-xl transition-all"
                    title={activeRoom.creatorId === currentUser.id ? 'Delete Room' : 'Leave Room'}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Workspace Main Pane */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* SHARED NOTES SECTION */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-slate-900 flex flex-col gap-6 custom-scrollbar">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-400" />
                      <h4 className="text-sm font-bold text-slate-200">Shared Study Notes</h4>
                    </div>

                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-300 hover:to-indigo-300 rounded-xl transition-all hover:scale-102 flex items-center gap-1.5 shadow-md shadow-indigo-500/5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Share Note
                    </button>
                  </div>

                  {notesLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                      <span className="text-xs text-slate-500">Decrypting shared library...</span>
                    </div>
                  ) : roomNotes.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-xl bg-slate-900/60 border border-slate-850 text-slate-500 flex items-center justify-center mb-4">
                        <FolderOpen className="h-6 w-6 text-slate-400" />
                      </div>
                      <h5 className="text-sm font-bold text-slate-300">No notes shared yet</h5>
                      <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                        Share text summaries or upload PDFs, slides, and exam preparation material inside this room.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {roomNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-5 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h5 className="text-sm font-bold text-slate-100">{note.title}</h5>
                              <p className="text-xs text-slate-500 mt-1">
                                Shared by <span className="font-semibold text-slate-400">{note.user?.name}</span> &bull; {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            {/* Download Button (if file exists) */}
                            {note.fileUrl && (
                              <a
                                href={note.fileUrl.startsWith('http') ? note.fileUrl : `${process.env.NEXT_PUBLIC_API_URL}${note.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                download={note.fileName}
                                onClick={() => handleDownload(note.id, note.fileName)}
                                className="p-2.5 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
                                title={`Download: ${note.fileName}`}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          {note.description && (
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/20 border border-slate-900/30 p-3 rounded-xl">
                              {note.description}
                            </p>
                          )}

                          {note.content && (
                            <div className="text-xs text-slate-300 bg-slate-950 border border-slate-900/50 p-4 rounded-xl max-h-40 overflow-y-auto custom-scrollbar font-light whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </div>
                          )}

                          {/* Footer details: tags, downloads count */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 mt-1 border-t border-slate-900/50">
                            <div className="flex flex-wrap gap-1.5">
                              {note.tags?.map(t => (
                                <span key={t.id} className="text-[9px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded-md">
                                  #{t.name}
                                </span>
                              ))}
                            </div>

                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              {note.downloadsCount} downloads
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MEMBERS LIST SIDEPANEL */}
                <div className="w-full lg:w-60 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 custom-scrollbar shrink-0">
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                    <Users className="h-4.5 w-4.5 text-indigo-400" />
                    <h4 className="text-sm font-bold text-slate-200">Room Members ({activeRoom.members?.length || 1})</h4>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {activeRoom.members?.map((mem) => {
                      const isRoomCreator = mem.user?.id === activeRoom.creatorId;
                      return (
                        <div
                          key={mem.user?.id}
                          className="p-3 rounded-xl border border-slate-900 bg-slate-950/40 flex items-center gap-3"
                        >
                          <div className="relative shrink-0">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold shadow-md shadow-violet-500/10">
                              {mem.user?.name ? mem.user.name.substring(0, 1).toUpperCase() : 'U'}
                            </div>
                            {onlineUsers.has(mem.user?.id) && (
                              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" title="Online" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                              {mem.user?.name}
                              {isRoomCreator && (
                                <span className="text-[8px] bg-amber-500/5 border border-amber-500/25 text-amber-400 px-1 py-0.2 rounded font-bold uppercase tracking-wide">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                              {mem.user?.role}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Blank State selection */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-3xl bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-400 mb-6 shadow-xl shadow-violet-500/5">
                <Users className="h-8 w-8 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">No Study Room Selected</h3>
              <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
                Select a virtual study room from the sidebar, or search and join existing ones under the **Discover** directory.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-400" /> Create Study Room
            </h3>
            <p className="text-xs text-slate-500 mt-1">Form a new group for courses, assignments, or doubt solving.</p>

            <form onSubmit={handleCreateRoom} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Algorithms Study Group"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="What is the group focused on? Mention course codes or homework topics."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  rows="3"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createLoading || !newRoomName.trim()}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create & Enter Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHARE NOTE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-400" /> Share Note to Room
            </h3>
            <p className="text-xs text-slate-500 mt-1">This note will be visible exclusively to members of **{activeRoom.name}**.</p>

            {uploadError && (
              <div className="mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center gap-2.5 text-rose-400 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadNote} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Binary Search Trees Guide"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Subject</label>
                  <select
                    required
                    value={noteSubjId}
                    onChange={(e) => setNoteSubjId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="Summary of the note topics, formulas, or chapters..."
                  value={noteDesc}
                  onChange={(e) => setNoteDesc(e.target.value)}
                  rows="2"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>



              {noteMode === 'write' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note Content</label>
                  <textarea
                    required
                    placeholder="Type or paste study summaries, math equations, or guidelines here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows="6"
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 custom-scrollbar font-mono leading-relaxed"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document File</label>
                  <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-slate-700 transition-colors relative cursor-pointer bg-slate-950/20">
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-300">
                      {noteFile ? noteFile.name : 'Select PDF, DOCX, or Image'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Max file size: 10MB (PDF, PNG, JPG, JPEG, DOCX)
                    </p>
                  </div>
                </div>
              )}

              {/* Tags Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags (Max 5)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Press enter to add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    className="flex-grow bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Add
                  </button>
                </div>

                {noteTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 bg-slate-950/40 border border-slate-900/30 p-2.5 rounded-xl">
                    {noteTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 select-none"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(idx)}
                          className="hover:text-rose-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploadLoading || !noteTitle.trim() || !noteSubjId}
                className="mt-2 w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Share Note to Members
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
