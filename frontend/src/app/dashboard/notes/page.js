// app/dashboard/notes/page.js
'use client';

import { useState, useEffect } from 'react';
import API from '@/utils/api';
import Link from 'next/link';
import { 
  ArrowLeft,
  Plus, 
  Search, 
  Filter, 
  ThumbsUp, 
  Download, 
  Bookmark, 
  MessageSquare, 
  Calendar,
  X,
  FileText,
  Loader2,
  BookmarkCheck,
  Send,
  Eye,
  Pin
} from 'lucide-react';

export default function BrowseNotes() {
  // DB content states
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter/Sort states
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [semester, setSemester] = useState('');
  const [tag, setTag] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Detail Modal states
  const [selectedNote, setSelectedNote] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Fetch subjects for filters
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await API.get('/auth/me');
        setCurrentUser(userRes.data?.user || userRes.data);

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
        console.error('Error loading user data:', err);
      }
    };
    fetchUserData();
  }, []);

  const handleTogglePin = async (noteId, e) => {
    e.stopPropagation();
    try {
      const res = await API.post(`/notes/${noteId}/pin`);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isPinned: res.data.isPinned } : n));
    } catch (err) {
      console.error('Error toggling pin status:', err);
      alert(err.response?.data?.message || 'Only faculty members can pin notes');
    }
  };

  // Fetch notes on filter or sort change
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (subjectId) params.append('subjectId', subjectId);
      if (semester) params.append('semester', semester);
      if (tag) params.append('tag', tag);
      if (sortBy) params.append('sortBy', sortBy);
      if (bookmarkedOnly) params.append('bookmarkedOnly', 'true');

      const res = await API.get(`/notes?${params.toString()}`);
      setNotes(res.data);
    } catch (err) {
      console.error(err);
      setError('Error loading notes feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [search, subjectId, semester, tag, sortBy, bookmarkedOnly]);

  // Open note details and fetch its comments
  const handleOpenNote = async (note) => {
    setSelectedNote(note);
    setCommentsLoading(true);
    setComments([]);
    setCommentInput('');
    try {
      const res = await API.get(`/notes/${note.id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Toggle upvote
  const handleToggleUpvote = async (noteId, e) => {
    e?.stopPropagation();
    try {
      const res = await API.post(`/notes/${noteId}/upvote`);
      const { upvoted } = res.data;

      // Update local state
      setNotes(prevNotes => prevNotes.map(n => {
        if (n.id === noteId) {
          return {
            ...n,
            hasUpvoted: upvoted,
            upvotesCount: upvoted ? n.upvotesCount + 1 : n.upvotesCount - 1
          };
        }
        return n;
      }));

      // Update selectedNote if modal is open
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote(prev => ({
          ...prev,
          hasUpvoted: upvoted,
          upvotesCount: upvoted ? prev.upvotesCount + 1 : prev.upvotesCount - 1
        }));
      }
    } catch (err) {
      console.error('Error upvoting note:', err);
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = async (noteId, e) => {
    e?.stopPropagation();
    try {
      const res = await API.post(`/notes/${noteId}/bookmark`);
      const { bookmarked } = res.data;

      // Update local state
      setNotes(prevNotes => prevNotes.map(n => {
        if (n.id === noteId) {
          return {
            ...n,
            hasBookmarked: bookmarked
          };
        }
        return n;
      }));

      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote(prev => ({
          ...prev,
          hasBookmarked: bookmarked
        }));
      }
    } catch (err) {
      console.error('Error bookmarking note:', err);
    }
  };

  // Handle download
  const handleDownload = async (note) => {
    try {
      await API.post(`/notes/${note.id}/download`);
      
      // Update local downloads count
      setNotes(prevNotes => prevNotes.map(n => {
        if (n.id === note.id) {
          return { ...n, downloadsCount: n.downloadsCount + 1 };
        }
        return n;
      }));

      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote(prev => ({ ...prev, downloadsCount: prev.downloadsCount + 1 }));
      }

      // Open file in new tab (supports both Supabase cloud URLs and legacy local uploads)
      const targetUrl = note.fileUrl?.startsWith('http') ? note.fileUrl : `http://localhost:5000${note.fileUrl}`;
      window.open(targetUrl, '_blank');
    } catch (err) {
      console.error('Error downloading note:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedNote) return;

    try {
      const res = await API.post(`/notes/${selectedNote.id}/comments`, {
        content: commentInput
      });
      setComments(prev => [...prev, res.data]);
      setCommentInput('');
      
      // Update comments count locally
      setNotes(prevNotes => prevNotes.map(n => {
        if (n.id === selectedNote.id) {
          return { ...n, commentsCount: n.commentsCount + 1 };
        }
        return n;
      }));

      setSelectedNote(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  return (
    <div className="flex-grow bg-slate-950 text-slate-100 p-6 min-h-screen relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-100">Browse Study Notes</h1>
          </div>

          <Link
            href="/dashboard/notes/create"
            className="inline-flex items-center gap-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/10 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4.5 w-4.5" /> Upload Note
          </Link>
        </div>

        {/* Filter Toolbar */}
        <section className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 backdrop-blur-md flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search notes, topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg text-slate-200 placeholder-slate-600 text-xs transition-all outline-none"
              />
            </div>

            {/* Subject Filter */}
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg text-slate-300 text-xs transition-all outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>

            {/* Semester Filter */}
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg text-slate-300 text-xs transition-all outline-none"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>

            {/* Sorter selection */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg text-slate-300 text-xs transition-all outline-none"
            >
              <option value="date">Sort by: Recent</option>
              <option value="upvotes">Sort by: Most Upvotes</option>
              <option value="downloads">Sort by: Most Downloads</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900 pt-3">
            {/* Tag search quick input */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Filtered Tag:</span>
              {tag ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded flex items-center gap-1.5">
                  #{tag}
                  <button onClick={() => setTag('')} className="hover:text-rose-400">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ) : (
                <input
                  type="text"
                  placeholder="Type tag & press enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setTag(e.target.value.trim().toLowerCase());
                      e.target.value = '';
                    }
                  }}
                  className="bg-transparent border-none text-slate-300 placeholder-slate-600 text-xs outline-none w-40 focus:placeholder-slate-500"
                />
              )}
            </div>

            {/* Bookmarks toggle */}
            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${
                bookmarkedOnly
                  ? 'bg-violet-600/10 border-violet-500 text-violet-400 shadow-md shadow-violet-500/5'
                  : 'bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-800 hover:text-slate-400'
              }`}
            >
              <BookmarkCheck className="h-3.5 w-3.5" /> Bookmarked Only
            </button>
          </div>
        </section>

        {/* Notes Grid */}
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <span className="text-slate-500 text-xs">Fetching study guides...</span>
          </div>
        ) : error ? (
          <div className="p-10 text-center rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm">
            {error}
          </div>
        ) : notes.length === 0 ? (
          <div className="p-20 text-center border border-slate-900 bg-slate-900/10 rounded-2xl text-slate-500 text-sm">
            No study notes found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleOpenNote(note)}
                className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 hover:border-slate-800 hover:bg-slate-900/30 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden group"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 text-[9px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                        {note.subject.name}
                      </span>
                      {note.isPinned && (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded flex items-center gap-1">
                          <Pin className="h-2.5 w-2.5 fill-amber-400" /> Pinned
                        </span>
                      )}
                      {note.user?.role === 'PROFESSOR' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                          Official Material
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {currentUser?.role === 'PROFESSOR' && (
                        <button
                          onClick={(e) => handleTogglePin(note.id, e)}
                          className={`p-1 rounded-md hover:bg-slate-800 transition-colors ${note.isPinned ? 'text-amber-400' : 'text-slate-500'}`}
                          title={note.isPinned ? 'Unpin note' : 'Pin note for students'}
                        >
                          <Pin className={`h-3.5 w-3.5 ${note.isPinned ? 'fill-amber-400' : ''}`} />
                        </button>
                      )}
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Sem {note.subject.semester}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-violet-400 transition-colors line-clamp-1">
                    {note.title}
                  </h3>
                  
                  {note.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {note.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-900 flex flex-col gap-3 mt-4">
                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((t) => (
                        <span 
                          key={t.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setTag(t.name);
                          }}
                          className="text-[9px] text-violet-500 hover:underline"
                        >
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions summary */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => handleToggleUpvote(note.id, e)}
                        className={`flex items-center gap-1 hover:text-violet-400 transition-colors ${note.hasUpvoted ? 'text-violet-400' : ''}`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> {note.upvotesCount}
                      </button>
                      
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> {note.commentsCount}
                      </span>

                      {note.fileUrl && (
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" /> {note.downloadsCount}
                        </span>
                      )}
                    </div>

                    <button 
                      onClick={(e) => handleToggleBookmark(note.id, e)}
                      className={`hover:text-violet-400 transition-colors ${note.hasBookmarked ? 'text-violet-400' : ''}`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${note.hasBookmarked ? 'fill-violet-400' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* DETAIL MODAL OVERLAY */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded">
                    {selectedNote.subject.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Semester {selectedNote.subject.semester} • {selectedNote.visibility}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-100 mt-2">{selectedNote.title}</h2>
                <span className="text-xs text-slate-400 mt-1">
                  Uploaded by: {selectedNote.user.name} ({selectedNote.user.role === 'STUDENT' ? 'Student' : 'Faculty'})
                </span>
              </div>

              <button
                onClick={() => setSelectedNote(null)}
                className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-6 flex flex-col md:grid md:grid-cols-12 gap-6">
              
              {/* Content Panel - 7 cols */}
              <div className="md:col-span-7 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-6">
                
                {selectedNote.description && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Description</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 border border-slate-950 p-3 rounded-lg">
                      {selectedNote.description}
                    </p>
                  </div>
                )}

                {/* Content rendering */}
                <div className="flex-grow flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Note Content</span>
                  
                  {selectedNote.fileUrl ? (
                    // File Attachment View
                    <div className="p-4 bg-slate-950 border border-slate-950 rounded-lg flex flex-col items-center justify-center gap-4 py-8 text-center">
                      <div className="h-16 w-16 rounded-xl bg-violet-600/10 flex items-center justify-center border border-violet-500/10">
                        <FileText className="h-8 w-8 text-violet-400" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-200 block truncate max-w-xs mx-auto">
                          {selectedNote.fileName}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono block mt-1">
                          File Type: {selectedNote.fileType}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownload(selectedNote)}
                        className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-500/10 transition-all hover:scale-[1.02]"
                      >
                        <Download className="h-4 w-4" /> Download Material
                      </button>
                    </div>
                  ) : (
                    // Written Editor Note View
                    <div className="p-4 bg-slate-950 border border-slate-950 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                      {selectedNote.content}
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-auto">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleUpvote(selectedNote.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold hover:text-violet-400 transition-colors ${
                        selectedNote.hasUpvoted ? 'text-violet-400' : 'text-slate-400'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" /> {selectedNote.upvotesCount} Upvotes
                    </button>

                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Download className="h-4 w-4" /> {selectedNote.downloadsCount} Downloads
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleBookmark(selectedNote.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold hover:text-violet-400 transition-colors ${
                      selectedNote.hasBookmarked ? 'text-violet-400' : 'text-slate-400'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${selectedNote.hasBookmarked ? 'fill-violet-400' : ''}`} /> 
                    {selectedNote.hasBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>
              </div>

              {/* Comments Panel - 5 cols */}
              <div className="md:col-span-5 flex flex-col gap-4 max-h-[50vh] md:max-h-none">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Comment Thread ({comments.length})
                </span>

                {/* Comments List */}
                <div className="flex-grow overflow-y-auto flex flex-col gap-3 max-h-56 md:max-h-72 pr-1">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      No comments yet. Start the discussion!
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div 
                        key={comment.id}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400">
                          <span>{comment.user.name}</span>
                          <span className="text-[8px] text-slate-600">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Post Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 mt-auto">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-grow px-3 py-2 bg-slate-950 border border-slate-850 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-200 placeholder-slate-600 text-xs transition-all outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim()}
                    className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all disabled:opacity-40"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
