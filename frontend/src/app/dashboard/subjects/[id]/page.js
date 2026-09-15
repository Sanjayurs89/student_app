// app/dashboard/subjects/[id]/page.js
'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/utils/api';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  LogOut, 
  Home, 
  Loader2, 
  Plus, 
  X,
  FileText,
  Calendar,
  AlertCircle,
  Megaphone,
  HelpCircle,
  Download,
  Trash2,
  Clock,
  MapPin,
  Upload
} from 'lucide-react';

export default function SubjectDashboardPage({ params }) {
  const router = useRouter();
  const { id: subjectId } = use(params);

  // Global App States
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard Data
  const [subject, setSubject] = useState(null);
  const [slots, setSlots] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sectionName, setSectionName] = useState('');
  const [semester, setSemester] = useState(null);
  
  // Onboarding metadata (sections & subjects) for modals
  const [sections, setSections] = useState([]);
  
  // UI Tabs State
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'timetable' | 'doubts' | 'notes'

  // Modals States
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annSectionId, setAnnSectionId] = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotDay, setSlotDay] = useState('MONDAY');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [slotLocation, setSlotLocation] = useState('');
  const [slotSectionId, setSlotSectionId] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);
  
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [doubtTitle, setDoubtTitle] = useState('');
  const [doubtContent, setDoubtContent] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [noteMode, setNoteMode] = useState('write'); // 'write' | 'upload'
  const [noteTags, setNoteTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState('');

  // 1. Fetch data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch current user
        const meRes = await API.get('/auth/me');
        const user = meRes.data.user;
        setCurrentUser(user);

        if (!user.isOnboarded) {
          router.push('/onboarding');
          return;
        }

        // Fetch subject dashboard aggregated data
        const dashRes = await API.get(`/academic/subjects/${subjectId}/dashboard`);
        const { subject, sectionName, semester, slots, announcements, doubts, notes } = dashRes.data;
        
        setSubject(subject);
        setSectionName(sectionName);
        setSemester(semester);
        setSlots(slots);
        setAnnouncements(announcements);
        setDoubts(doubts);
        setNotes(notes);

        // Fetch onboarding sections data for professor dropdowns
        if (user.role === 'PROFESSOR') {
          const onboardingRes = await API.get(`/academic/onboarding-data?departmentId=${subject.departmentId}`);
          setSections(onboardingRes.data.sections);
        }
      } catch (err) {
        console.error('Error fetching subject dashboard:', err);
        setError('Failed to load dashboard data. Please verify database connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [subjectId, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const isProfessor = currentUser?.role === 'PROFESSOR';

  // 2. Submit Announcement Handler
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    if (isProfessor && !annSectionId) {
      alert('Please select a target section.');
      return;
    }

    setAnnLoading(true);
    try {
      const res = await API.post('/communication/announcements', {
        title: annTitle.trim(),
        content: annContent.trim(),
        subjectId,
        sectionId: annSectionId
      });
      // Prepend newly created announcement
      setAnnouncements((prev) => [
        { ...res.data, sender: { name: currentUser.name } },
        ...prev
      ]);
      setShowAnnModal(false);
      setAnnTitle('');
      setAnnContent('');
      setAnnSectionId('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating announcement');
    } finally {
      setAnnLoading(false);
    }
  };

  // 3. Submit Timetable Slot Handler
  const handlePostSlot = async (e) => {
    e.preventDefault();
    if (!slotLocation.trim() || !slotSectionId) return;

    setSlotLoading(true);
    try {
      const res = await API.post('/timetable', {
        dayOfWeek: slotDay,
        startTime: slotStart,
        endTime: slotEnd,
        location: slotLocation.trim(),
        subjectId,
        sectionId: slotSectionId
      });
      // Reload slots
      const dashRes = await API.get(`/academic/subjects/${subjectId}/dashboard`);
      setSlots(dashRes.data.slots);
      
      setShowSlotModal(false);
      setSlotLocation('');
      setSlotSectionId('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating lecture slot');
    } finally {
      setSlotLoading(false);
    }
  };

  // 4. Delete Timetable Slot Handler
  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Are you sure you want to delete this lecture slot?')) return;
    try {
      await API.delete(`/timetable/${slotId}`);
      setSlots((prev) => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting slot');
    }
  };

  // 5. Submit Doubt Handler
  const handlePostDoubt = async (e) => {
    e.preventDefault();
    if (!doubtTitle.trim() || !doubtContent.trim()) return;

    setDoubtLoading(true);
    try {
      const res = await API.post('/communication/doubts', {
        title: doubtTitle.trim(),
        content: doubtContent.trim(),
        subjectId
      });
      setDoubts((prev) => [
        { ...res.data, user: { name: currentUser.name }, _count: { answers: 0 } },
        ...prev
      ]);
      setShowDoubtModal(false);
      setDoubtTitle('');
      setDoubtContent('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error posting doubt');
    } finally {
      setDoubtLoading(false);
    }
  };

  // 6. Note Helpers
  const addTag = (tag) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !noteTags.includes(cleanTag)) {
      if (noteTags.length >= 5) {
        setNoteError('Max 5 tags allowed.');
        return;
      }
      setNoteTags([...noteTags, cleanTag]);
      setTagInput('');
      setNoteError('');
    }
  };

  const removeTag = (idx) => {
    setNoteTags(noteTags.filter((_, i) => i !== idx));
  };

  const handleUploadNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      setNoteError('Title is required');
      return;
    }
    if (noteMode === 'write' && !noteContent.trim()) {
      setNoteError('Content is required');
      return;
    }
    if (noteMode === 'upload' && !noteFile) {
      setNoteError('Please select a file');
      return;
    }

    setNoteLoading(true);
    setNoteError('');

    const formData = new FormData();
    formData.append('title', noteTitle.trim());
    formData.append('subjectId', subjectId);
    formData.append('visibility', 'PUBLIC');
    formData.append('description', noteDesc.trim());
    formData.append('tags', JSON.stringify(noteTags));

    if (noteMode === 'write') {
      formData.append('content', noteContent.trim());
    } else {
      formData.append('file', noteFile);
    }

    try {
      await API.post('/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Reload notes
      const dashRes = await API.get(`/academic/subjects/${subjectId}/dashboard`);
      setNotes(dashRes.data.notes);
      
      setShowNoteModal(false);
      setNoteTitle('');
      setNoteDesc('');
      setNoteContent('');
      setNoteFile(null);
      setNoteTags([]);
    } catch (err) {
      console.error(err);
      setNoteError(err.response?.data?.message || 'Failed to upload note.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDownload = async (noteId) => {
    try {
      await API.post(`/notes/${noteId}/download`);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, downloadsCount: n.downloadsCount + 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Opening Subject Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center">
          <p className="text-rose-400 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = hr % 12 || 12;
    return `${hr12}:${minutes} ${ampm}`;
  };

  // Filter sections by current subject's semester for professor announcements/timetable selection
  const filteredSections = sections.filter(sec => sec.semester === subject?.semester);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Dynamic lighting blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Global Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-violet-500" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            {subject?.code} Dashboard
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

      {/* Subject Header Banner */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 relative z-10">
        <section className="p-6 md:p-8 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-lg uppercase tracking-wider">
              {subject?.department?.code} &bull; Semester {subject?.semester}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2.5">{subject?.name}</h1>
            <p className="text-sm text-slate-400 mt-1.5">Official course materials, timetables, doubting hub and broadcasts.</p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            {/* Display target section for students */}
            {!isProfessor && sectionName && (
              <div className="px-4 py-3.5 rounded-xl border border-slate-900 bg-slate-950/60 flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-400" />
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">My Section</div>
                  <div className="text-xs font-semibold text-slate-200">Section {sectionName}</div>
                </div>
              </div>
            )}
            <div className="px-4 py-3.5 rounded-xl border border-slate-900 bg-slate-950/60 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-violet-400" />
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Lectures / Wk</div>
                <div className="text-xs font-semibold text-slate-200">{slots.length} Classes</div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Workspace: Tabs & Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* TAB SIDE NAVIGATION */}
          <aside className="lg:col-span-1 flex flex-row lg:flex-col gap-1 bg-slate-900/10 border border-slate-900 p-2 rounded-2xl overflow-x-auto lg:overflow-x-visible">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                activeTab === 'announcements'
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Megaphone className="h-4.5 w-4.5" />
              Announcements ({announcements.length})
            </button>
            <button
              onClick={() => setActiveTab('timetable')}
              className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                activeTab === 'timetable'
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Calendar className="h-4.5 w-4.5" />
              Lecture Slots ({slots.length})
            </button>
            <button
              onClick={() => setActiveTab('doubts')}
              className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                activeTab === 'doubts'
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <HelpCircle className="h-4.5 w-4.5" />
              Doubting Hub ({doubts.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                activeTab === 'notes'
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              Study Notes ({notes.length})
            </button>
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="lg:col-span-3 min-h-[500px] border border-slate-900 bg-slate-900/10 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-6">
            
            {/* ANNOUNCEMENTS TAB */}
            {activeTab === 'announcements' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-indigo-400" />
                    Latest Broadcasts
                  </h3>
                  {isProfessor && (
                    <button
                      onClick={() => setShowAnnModal(true)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-300 hover:to-indigo-300 rounded-xl transition-all hover:scale-102 flex items-center gap-1.5 shadow-md shadow-indigo-500/5"
                    >
                      <Plus className="h-4 w-4" /> Broadcast Notice
                    </button>
                  )}
                </div>

                {announcements.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500">
                    <Megaphone className="h-10 w-10 mb-3 text-slate-650" />
                    <p className="text-xs">No announcements broadcasted for this course yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-5 rounded-2xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/30 flex flex-col gap-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-100">{ann.title}</h4>
                          <span className="text-[10px] text-slate-500 font-semibold">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-light leading-relaxed">{ann.content}</p>
                        <div className="text-[9px] text-indigo-400 uppercase font-semibold tracking-wider pt-2 mt-1 border-t border-slate-900/50">
                          Posted by Prof. {ann.sender?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TIMETABLE TAB */}
            {activeTab === 'timetable' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    Course Lecture Slots
                  </h3>
                  {isProfessor && (
                    <button
                      onClick={() => setShowSlotModal(true)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-300 hover:to-indigo-300 rounded-xl transition-all hover:scale-102 flex items-center gap-1.5 shadow-md shadow-indigo-500/5"
                    >
                      <Plus className="h-4 w-4" /> Add Lecture
                    </button>
                  )}
                </div>

                {slots.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500">
                    <Calendar className="h-10 w-10 mb-3 text-slate-650" />
                    <p className="text-xs">No slots scheduled in the timetable yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/30 flex items-center justify-between transition-all"
                      >
                        <div className="flex flex-wrap items-center gap-6">
                          <span className="px-3 py-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 rounded-lg tracking-wider w-24 text-center">
                            {slot.dayOfWeek}
                          </span>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-indigo-400" />
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-violet-400" />
                              Room {slot.location}
                            </span>
                            <span>&bull;</span>
                            <span className="text-[10px] text-slate-500">
                              Section {slot.section?.name}
                            </span>
                          </div>
                        </div>

                        {isProfessor && (
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/5 rounded-xl transition-all"
                            title="Remove Slot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* DOUBTS TAB */}
            {activeTab === 'doubts' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-indigo-400" />
                    Doubt Solver Discussion
                  </h3>
                  {!isProfessor && (
                    <button
                      onClick={() => setShowDoubtModal(true)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-300 hover:to-indigo-300 rounded-xl transition-all hover:scale-102 flex items-center gap-1.5 shadow-md shadow-indigo-500/5"
                    >
                      <Plus className="h-4 w-4" /> Post Doubt
                    </button>
                  )}
                </div>

                {doubts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500">
                    <HelpCircle className="h-10 w-10 mb-3 text-slate-650" />
                    <p className="text-xs">No questions posted for this subject yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {doubts.map((doubt) => (
                      <Link
                        key={doubt.id}
                        href={`/dashboard/doubts/${doubt.id}`}
                        className="p-5 rounded-2xl border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-200 group-hover:text-violet-400 transition-colors truncate">{doubt.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1 leading-relaxed">{doubt.content}</p>
                          <div className="text-[10px] text-slate-500 font-semibold tracking-wider mt-2.5 flex items-center gap-2 uppercase">
                            <span>Asked by {doubt.user?.name}</span>
                            <span>&bull;</span>
                            <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="px-4 py-2 border border-slate-900 bg-slate-950 rounded-xl flex flex-col items-center justify-center text-center shrink-0 w-24">
                          <span className="text-base font-extrabold text-violet-400">{doubt._count?.answers || 0}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Answers</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-400" />
                    Course Study Notes
                  </h3>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-300 hover:to-indigo-300 rounded-xl transition-all hover:scale-102 flex items-center gap-1.5 shadow-md shadow-indigo-500/5"
                  >
                    <Plus className="h-4 w-4" /> Share Note
                  </button>
                </div>

                {notes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500">
                    <BookOpen className="h-10 w-10 mb-3 text-slate-650" />
                    <p className="text-xs">No public study notes shared for this subject yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-5 rounded-2xl border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition-all flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-slate-250">{note.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              Shared by <span className="font-semibold text-slate-400">{note.user?.name} ({note.user?.role})</span> &bull; {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {note.fileUrl && (
                            <a
                              href={note.fileUrl.startsWith('http') ? note.fileUrl : `${process.env.NEXT_PUBLIC_API_URL}${note.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              download={note.fileName}
                              onClick={() => handleDownload(note.id)}
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
                          <div className="text-xs text-slate-350 bg-slate-950 border border-slate-900/50 p-4 rounded-xl max-h-40 overflow-y-auto custom-scrollbar font-light whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 mt-1 border-t border-slate-900/50">
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags?.map(t => (
                              <span key={t.id} className="text-[9px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded-md font-mono">
                                #{t.name}
                              </span>
                            ))}
                          </div>

                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {note.downloadsCount} downloads
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* ANNOUNCEMENT BROADCAST MODAL */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowAnnModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-400" /> Broadcast Notification
            </h3>
            <p className="text-xs text-slate-550 mt-1 font-light">Send an official bulletin to all enrolled students of a course section.</p>

            <form onSubmit={handlePostAnnouncement} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Course Section</label>
                <select
                  required
                  value={annSectionId}
                  onChange={(e) => setAnnSectionId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                >
                  <option value="">Select section...</option>
                  {filteredSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} (Semester {sec.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Alteration or Quiz Notice"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Description</label>
                <textarea
                  required
                  placeholder="Write details of the alert. Include syllabus, rescheduled timings, or guidelines..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  rows="4"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 resize-none custom-scrollbar font-light"
                />
              </div>

              <button
                type="submit"
                disabled={annLoading || !annSectionId || !annTitle.trim() || !annContent.trim()}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {annLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Broadcast to Students
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LECTURE TIMETABLE SLOT MODAL */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowSlotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" /> Add Timetable slot
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure a recurring class schedule for a section.</p>

            <form onSubmit={handlePostSlot} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Day of Week</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  >
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Section</label>
                  <select
                    required
                    value={slotSectionId}
                    onChange={(e) => setSlotSectionId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  >
                    <option value="">Select section...</option>
                    {filteredSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name} (Semester {sec.semester})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classroom Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 304 or Lab 2"
                  value={slotLocation}
                  onChange={(e) => setSlotLocation(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                />
              </div>

              <button
                type="submit"
                disabled={slotLoading || !slotLocation.trim() || !slotSectionId}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {slotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Schedule Slot
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT DOUBT MODAL */}
      {showDoubtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowDoubtModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-400" /> Post Doubt
            </h3>
            <p className="text-xs text-slate-500 mt-1">Ask a question regarding topics, syllabus, or assignments for this subject.</p>

            <form onSubmit={handlePostDoubt} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Help understanding time complexity of QuickSort"
                  value={doubtTitle}
                  onChange={(e) => setDoubtTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  placeholder="Describe your doubt in detail. Mention equations, lines of code, or specific problems..."
                  value={doubtContent}
                  onChange={(e) => setDoubtContent(e.target.value)}
                  rows="5"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 resize-none custom-scrollbar font-light leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={doubtLoading || !doubtTitle.trim() || !doubtContent.trim()}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {doubtLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Doubt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHARE PUBLIC STUDY NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setShowNoteModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-400" /> Share Subject Study Note
            </h3>
            <p className="text-xs text-slate-500 mt-1">This note will be visible publicly to all students enrolled in this course.</p>

            {noteError && (
              <div className="mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-450 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {noteError}
              </div>
            )}

            <form onSubmit={handleUploadNote} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Binary Search Trees Guide"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                />
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

              <div className="grid grid-cols-2 border-b border-slate-900 p-1 bg-slate-950 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setNoteMode('write')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                    noteMode === 'write'
                      ? 'bg-slate-900 text-slate-100 border border-slate-800'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Write Content
                </button>
                <button
                  type="button"
                  onClick={() => setNoteMode('upload')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                    noteMode === 'upload'
                      ? 'bg-slate-900 text-slate-100 border border-slate-800'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Upload File
                </button>
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
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 custom-scrollbar font-mono leading-relaxed resize-none"
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
                      onChange={(e) => setNoteFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-300">
                      {noteFile ? noteFile.name : 'Select PDF, DOCX, or Image'}
                    </p>
                    <p className="text-[10px] text-slate-505 mt-1">
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
                        className="text-[10px] font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 select-none font-mono"
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
                disabled={noteLoading || !noteTitle.trim()}
                className="mt-2 w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {noteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Share Note to Dashboard
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
