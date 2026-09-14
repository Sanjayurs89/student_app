// app/dashboard/doubts/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/utils/api';
import { 
  GraduationCap, 
  Home, 
  LogOut, 
  Loader2, 
  Plus, 
  X, 
  MessageSquare, 
  MessageCircle,
  Clock,
  User, 
  Send,
  ArrowLeft,
  BookOpen,
  Search,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function DoubtsPage() {
  const router = useRouter();

  // Global App States
  const [currentUser, setCurrentUser] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [subjects, setSubjects] = useState([]); // for subject tabs & select menu
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [selectedSubjectId, setSelectedSubjectId] = useState(''); // '' means All
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Doubt Details
  const [activeDoubt, setActiveDoubt] = useState(null);
  const [doubtDetails, setDoubtDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);

  // Ask Doubt Modal states
  const [showAskModal, setShowAskModal] = useState(false);
  const [doubtTitle, setDoubtTitle] = useState('');
  const [doubtContent, setDoubtContent] = useState('');
  const [askSubjectId, setAskSubjectId] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState('');

  // Mobile View state
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  // 1. Fetch initial profile, doubts, and subjects
  useEffect(() => {
    const initPage = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch user profile
        const meRes = await API.get('/auth/me');
        const user = meRes.data.user;
        setCurrentUser(user);

        if (!user.isOnboarded) {
          router.push('/onboarding');
          return;
        }

        // Fetch subjects & initial doubts
        await Promise.all([
          fetchSubjects(),
          fetchDoubts()
        ]);
      } catch (err) {
        console.error('Error loading doubt page:', err);
        setError('Failed to fetch doubts. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

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
      console.error(err);
    }
  };

  const fetchDoubts = async (subjId = '') => {
    try {
      const url = subjId ? `/communication/doubts?subjectId=${subjId}` : '/communication/doubts';
      const res = await API.get(url);
      setDoubts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Handle Doubt selection
  useEffect(() => {
    if (!activeDoubt) {
      setDoubtDetails(null);
      return;
    }

    const fetchDoubtDetails = async () => {
      setDetailsLoading(true);
      try {
        const res = await API.get(`/communication/doubts/${activeDoubt.id}`);
        setDoubtDetails(res.data);
      } catch (err) {
        console.error('Error loading doubt details:', err);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDoubtDetails();
  }, [activeDoubt]);

  // 3. Subject Filter Trigger
  const handleSubjectChange = (subjId) => {
    setSelectedSubjectId(subjId);
    fetchDoubts(subjId);
    setActiveDoubt(null);
  };

  // 4. Ask Doubt Handler (Student only)
  const handleAskDoubt = async (e) => {
    e.preventDefault();
    if (!doubtTitle.trim() || !doubtContent.trim() || !askSubjectId) {
      setAskError('All fields are required');
      return;
    }

    setAskLoading(true);
    setAskError('');
    try {
      const res = await API.post('/communication/doubts', {
        title: doubtTitle.trim(),
        content: doubtContent.trim(),
        subjectId: askSubjectId
      });

      // Add to list and select it
      setDoubts((prev) => [res.data, ...prev]);
      setActiveDoubt(res.data);
      setMobileView('detail');
      setShowAskModal(false);

      // Reset
      setDoubtTitle('');
      setDoubtContent('');
      setAskSubjectId('');
    } catch (err) {
      console.error(err);
      setAskError(err.response?.data?.message || 'Failed to post doubt.');
    } finally {
      setAskLoading(false);
    }
  };

  // 5. Submit Resolution Answer Handler
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim() || !activeDoubt) return;

    setAnswerLoading(true);
    try {
      const res = await API.post(`/communication/doubts/${activeDoubt.id}/answers`, {
        content: newAnswer.trim()
      });

      // Append answer to detail details state
      setDoubtDetails((prev) => ({
        ...prev,
        answers: [...(prev.answers || []), res.data]
      }));

      // Update answer count in main doubts list
      setDoubts((prev) => prev.map(d => d.id === activeDoubt.id 
        ? { ...d, _count: { answers: (d._count?.answers || 0) + 1 } }
        : d
      ));

      setNewAnswer('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit answer.');
    } finally {
      setAnswerLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  // Filter doubts locally by Search Query
  const filteredDoubts = doubts.filter((d) => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Entering Doubt Solve boards...</p>
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

  const isStudent = currentUser?.role === 'STUDENT';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Subtle depth lighting blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      {/* Global Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-violet-500" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            Doubt Solver Hub
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

      {/* Doubt solver Hub workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex gap-6 overflow-hidden relative z-10">
        
        {/* DOUBTS DIRECTORY / SIDEBAR */}
        <aside className={`
          flex-col w-full md:w-96 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md overflow-hidden shrink-0
          ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}
        `}>
          <div className="p-4 border-b border-slate-900 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-200">Doubts & Queries</h2>
              {isStudent && (
                <button
                  onClick={() => setShowAskModal(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-md shadow-violet-600/10 hover:scale-103 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Ask Doubt
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search doubt posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none text-slate-200 placeholder-slate-600"
              />
              <Search className="h-3.5 w-3.5 text-slate-600 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Subject Categories Tabs */}
          <div className="flex gap-1.5 overflow-x-auto p-3 border-b border-slate-900/50 custom-scrollbar shrink-0">
            <button
              onClick={() => handleSubjectChange('')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-all ${
                selectedSubjectId === ''
                  ? 'bg-slate-900 text-slate-100 border border-slate-850'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubjectChange(sub.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-all ${
                  selectedSubjectId === sub.id
                    ? 'bg-slate-900 text-slate-100 border border-slate-850'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {sub.code}
              </button>
            ))}
          </div>

          {/* Doubts List Scroller */}
          <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
            {filteredDoubts.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-550">
                No doubt queries found for the selection.
              </div>
            ) : (
              filteredDoubts.map((doubt) => {
                const isActive = activeDoubt?.id === doubt.id;
                return (
                  <button
                    key={doubt.id}
                    onClick={() => {
                      setActiveDoubt(doubt);
                      setMobileView('detail');
                    }}
                    className={`
                      w-full p-4 rounded-xl flex flex-col gap-3 text-left transition-all border
                      ${isActive 
                        ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-violet-500/30 text-slate-100 shadow-md shadow-violet-500/5' 
                        : 'border-transparent bg-slate-905/30 hover:bg-slate-900/50 hover:border-slate-900 text-slate-400 hover:text-slate-200'}
                    `}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 text-[8px] font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 rounded uppercase">
                          {doubt.subject?.code}
                        </span>
                        <span className="text-[9px] text-slate-550 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(doubt.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 mt-2 line-clamp-1">{doubt.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{doubt.content}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/50 pt-2.5">
                      <span className="text-[10px] text-slate-500">
                        By <span className="font-semibold text-slate-450">{doubt.user?.name}</span>
                      </span>
                      <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                        <MessageCircle className="h-3 w-3" /> {doubt._count?.answers || 0} solutions
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ACTIVE DOUBT BOARD RESOLUTION VIEW */}
        <main className={`
          flex-grow flex-col rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md overflow-hidden relative
          ${mobileView === 'detail' ? 'flex' : 'hidden md:flex'}
        `}>
          {activeDoubt ? (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* Back to list header */}
              <div className="p-4 border-b border-slate-900 bg-slate-900/10 backdrop-blur-sm flex items-center gap-4">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-2 rounded-lg border border-slate-900 text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-200 truncate">Doubt Resolution Thread</h3>
                  <p className="text-[10px] text-slate-550 uppercase font-semibold tracking-wider mt-0.5">{activeDoubt.subject?.name} &bull; {activeDoubt.subject?.code}</p>
                </div>
              </div>

              {/* Scroller details and answers */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 custom-scrollbar">
                {detailsLoading ? (
                  <div className="flex-grow flex flex-col items-center justify-center gap-3 py-20">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    <span className="text-xs text-slate-500">Decrypting thread resolutions...</span>
                  </div>
                ) : doubtDetails ? (
                  <>
                    {/* Primary Doubt Content Card */}
                    <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/10 flex flex-col gap-3 relative overflow-hidden">
                      <div className="absolute top-[-30px] right-[-30px] h-20 w-20 rounded-full bg-violet-500/5 blur-lg pointer-events-none" />
                      
                      <div className="flex items-start justify-between gap-4 border-b border-slate-900 pb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-100">{doubtDetails.title}</h4>
                          <span className="text-xs text-slate-550 mt-1 block">
                            Posted by <span className="font-semibold text-slate-400">{doubtDetails.user?.name}</span> &bull; {new Date(doubtDetails.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 font-light leading-relaxed whitespace-pre-wrap py-2">
                        {doubtDetails.content}
                      </p>
                    </div>

                    {/* Answers/Resolutions Feed */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                        <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />
                        <h4 className="text-sm font-bold text-slate-200">Faculty & Peer Resolutions ({doubtDetails.answers?.length || 0})</h4>
                      </div>

                      {doubtDetails.answers?.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-550 border border-dashed border-slate-900 rounded-xl bg-slate-950/20">
                          No solutions submitted yet. Help this student by typing a resolution below!
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {doubtDetails.answers.map((ans) => {
                            const isProf = ans.user?.role === 'PROFESSOR';
                            return (
                              <div
                                key={ans.id}
                                className={`
                                  p-4.5 rounded-2xl border flex flex-col gap-2.5 transition-all
                                  ${isProf 
                                    ? 'border-amber-500/20 bg-amber-500/5 shadow-md shadow-amber-500/2' 
                                    : 'border-slate-900 bg-slate-900/10'}
                                `}
                              >
                                <div className="flex items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-slate-250">{ans.user?.name}</span>
                                    <span className={`
                                      text-[8px] font-bold px-1.5 py-0.2 rounded tracking-wide uppercase
                                      ${isProf 
                                        ? 'text-amber-400 bg-amber-500/5 border border-amber-550/20' 
                                        : 'text-slate-450 bg-slate-900 border border-slate-800'}
                                    `}>
                                      {isProf ? 'FACULTY' : 'STUDENT'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-slate-550 font-medium">
                                    {new Date(ans.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-350 font-light leading-relaxed whitespace-pre-wrap">
                                  {ans.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-xs text-slate-500">Failed to load doubt details.</div>
                )}
              </div>

              {/* Submit Answer Input Footer */}
              {doubtDetails && (
                <form onSubmit={handleSubmitAnswer} className="p-4 border-t border-slate-900 bg-slate-900/10 backdrop-blur-sm sticky bottom-0 z-20 flex gap-3">
                  <input
                    type="text"
                    required
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Provide a lecture solution or doubt explanation..."
                    className="flex-grow bg-slate-950 border border-slate-900 hover:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={answerLoading || !newAnswer.trim()}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}

            </div>
          ) : (
            /* Blank state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-3xl bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-400 mb-6 shadow-xl shadow-indigo-500/5">
                <HelpCircle className="h-8 w-8 text-indigo-400 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">No Query Selected</h3>
              <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
                Click a student doubt from the sidebar directory to view explanations, answers, and faculty advice, or ask your own doubt if you are a student.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ASK DOUBT MODAL (Student only) */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowAskModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-violet-400" /> Ask a Student Doubt
            </h3>
            <p className="text-xs text-slate-500 mt-1">Post a query about formulas, programming code, or lecture slides.</p>

            {askError && (
              <div className="mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold">
                {askError}
              </div>
            )}

            <form onSubmit={handleAskDoubt} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doubt Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Why is red-black tree insertion O(log n)?"
                  value={doubtTitle}
                  onChange={(e) => setDoubtTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Subject</label>
                <select
                  required
                  value={askSubjectId}
                  onChange={(e) => setAskSubjectId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detailed Description</label>
                <textarea
                  required
                  placeholder="Elaborate your query. Mention homework questions, lecture notes, or code blocks..."
                  value={doubtContent}
                  onChange={(e) => setDoubtContent(e.target.value)}
                  rows="4"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-600 resize-none custom-scrollbar font-light"
                />
              </div>

              <button
                type="submit"
                disabled={askLoading || !doubtTitle.trim() || !doubtContent.trim() || !askSubjectId}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {askLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Post Doubt Query
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
