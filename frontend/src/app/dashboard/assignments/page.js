// app/dashboard/assignments/page.js
'use client';

import React, { useState, useEffect } from 'react';
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
  Download,
  Clock,
  CheckCircle2,
  Send,
  Award,
  ExternalLink,
  UploadCloud,
  FileCheck,
  Check
} from 'lucide-react';

export default function AssignmentsPage() {
  const router = useRouter();
  
  // App States
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');
  
  // Professor onboarding metadata for modals
  const [professorSubjects, setProfessorSubjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Assignment Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [creating, setCreating] = useState(false);

  // Student Submit Modal State
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Professor Review Submissions Modal State
  const [reviewAssignment, setReviewAssignment] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [gradingId, setGradingId] = useState(null);
  const [savedSuccessId, setSavedSuccessId] = useState(null);
  const [gradeInputMap, setGradeInputMap] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const userRes = await API.get('/auth/me');
      const userData = userRes.data?.user || userRes.data;
      setCurrentUser(userData);

      const assRes = await API.get('/assignments');
      setAssignments(assRes.data);

      if (userData.role === 'PROFESSOR') {
        const countRes = await API.get('/academic/live-count');
        if (countRes.data.classCounts) {
          setProfessorSubjects(countRes.data.classCounts);
        }
      }
    } catch (err) {
      console.error('Error fetching assignments data:', err);
      setError(err.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Helper to open private signed URL
  const handleOpenPrivateFile = async (filePath) => {
    if (!filePath) return;
    try {
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        window.open(filePath, '_blank');
        return;
      }
      const res = await API.get(`/assignments/file-url?filePath=${encodeURIComponent(filePath)}`);
      if (res.data?.signedUrl) {
        window.open(res.data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to get signed URL:', err);
      alert('Failed to generate download link for this assignment file');
    }
  };

  // Create Assignment (Faculty)
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !selectedSubjectId || !selectedSectionId) {
      alert('Title, Due Date, Subject, and Section are required');
      return;
    }

    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('dueDate', dueDate);
      formData.append('subjectId', selectedSubjectId);
      formData.append('sectionId', selectedSectionId);
      if (attachmentFile) {
        formData.append('file', attachmentFile);
      }

      const res = await API.post('/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAssignments(prev => [res.data, ...prev]);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedSubjectId('');
      setSelectedSectionId('');
      setAttachmentFile(null);
    } catch (err) {
      console.error('Error creating assignment:', err);
      alert(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  // Submit Assignment (Student)
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submissionFile || !submittingAssignment) {
      alert('Please select a file to submit');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', submissionFile);

      const res = await API.post(`/assignments/${submittingAssignment.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update local state with submission
      setAssignments(prev => prev.map(a => {
        if (a.id === submittingAssignment.id) {
          return {
            ...a,
            submissions: [res.data]
          };
        }
        return a;
      }));

      setSubmittingAssignment(null);
      setSubmissionFile(null);
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Review Modal for Faculty
  const handleOpenReview = async (assignment) => {
    setReviewAssignment(assignment);
    try {
      setLoadingReview(true);
      const res = await API.get(`/assignments/${assignment.id}`);
      setReviewData(res.data);
      
      const map = {};
      if (res.data.submissions) {
        res.data.submissions.forEach(sub => {
          map[sub.id] = sub.grade || '';
        });
      }
      setGradeInputMap(map);
    } catch (err) {
      console.error('Error loading submissions review:', err);
      alert('Failed to load submissions for review');
    } finally {
      setLoadingReview(false);
    }
  };

  // Grade Submission (Faculty)
  const handleGradeSubmission = async (submissionId) => {
    const gradeVal = gradeInputMap[submissionId];
    if (!gradeVal || !gradeVal.trim()) {
      alert('Please enter a grade');
      return;
    }

    try {
      setGradingId(submissionId);
      const res = await API.post(`/assignments/submissions/${submissionId}/grade`, {
        grade: gradeVal.trim()
      });

      setReviewData(prev => ({
        ...prev,
        submissions: prev.submissions.map(s => s.id === submissionId ? { ...s, grade: res.data.grade } : s)
      }));

      setSavedSuccessId(submissionId);
      setTimeout(() => {
        setSavedSuccessId(null);
      }, 3000);
    } catch (err) {
      console.error('Error grading submission:', err);
      alert(err.response?.data?.message || 'Failed to grade submission');
    } finally {
      setGradingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
          <span className="text-sm font-medium text-slate-400">Loading assignments...</span>
        </div>
      </div>
    );
  }

  const isProfessor = currentUser?.role === 'PROFESSOR';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-800/80 p-5 flex flex-col justify-between backdrop-blur-xl">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CampusConnect
              </h1>
              <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Assignments Hub</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs font-semibold transition-all"
            >
              <Home className="h-4 w-4" /> Home Dashboard
            </Link>
            <Link 
              href="/dashboard/assignments" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-violet-300 bg-violet-500/10 border border-violet-500/20 text-xs font-semibold transition-all shadow-sm"
            >
              <FileCheck className="h-4 w-4 text-violet-400" /> Assignments
            </Link>
            <Link 
              href="/dashboard/notes" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs font-semibold transition-all"
            >
              <BookOpen className="h-4 w-4" /> Study Notes
            </Link>
            <Link 
              href="/dashboard/rooms" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs font-semibold transition-all"
            >
              <Users className="h-4 w-4" /> Study Rooms
            </Link>
            <Link 
              href="/dashboard/chat" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs font-semibold transition-all"
            >
              <Send className="h-4 w-4" /> Course Chat
            </Link>
            <Link 
              href="/dashboard/timetable" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs font-semibold transition-all"
            >
              <Calendar className="h-4 w-4" /> Schedule
            </Link>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-xs text-violet-400 shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 font-mono capitalize">{currentUser?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-all" 
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-md uppercase tracking-wider">
                Academic Coursework
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
              Assignments & Tasks
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isProfessor 
                ? 'Create assignments, track submissions, and evaluate student work with secure private file access.' 
                : 'View assigned coursework, download instructions, and submit solutions securely.'}
            </p>
          </div>

          {isProfessor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] shrink-0"
            >
              <Plus className="h-4 w-4" /> Create Assignment
            </button>
          )}
        </div>

        {error && (
          <div className="my-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ASSIGNMENTS LIST */}
        <div className="mt-8">
          {assignments.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 flex flex-col items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <FileCheck className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">No Assignments Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {isProfessor ? 'Click "Create Assignment" above to post coursework for your section.' : 'There are no active assignments posted for your section at this time.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map(item => {
                const isOverdue = new Date(item.dueDate) < new Date();
                const studentSub = item.submissions && item.submissions.length > 0 ? item.submissions[0] : null;

                const gradedCount = item.submissions?.filter(s => Boolean(s.grade)).length || 0;
                const totalSubmissions = item._count?.submissions || item.submissions?.length || 0;
                const isFullyGraded = totalSubmissions > 0 && gradedCount === totalSubmissions;
                const isPartiallyGraded = gradedCount > 0 && !isFullyGraded;

                return (
                  <div 
                    key={item.id}
                    className={`p-6 rounded-2xl border transition-all flex flex-col justify-between gap-5 relative group shadow-lg ${
                      isFullyGraded 
                        ? 'border-emerald-500/30 bg-slate-900/60' 
                        : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700/80'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded truncate">
                          {item.subject?.code || 'SUBJECT'} &bull; {item.subject?.name}
                        </span>
                        
                        {/* Status Badges */}
                        {isProfessor ? (
                          isFullyGraded ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" /> GRADED
                            </span>
                          ) : isPartiallyGraded ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <Award className="h-3 w-3" /> GRADED ({gradedCount}/{totalSubmissions})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold uppercase shrink-0">
                              Sec {item.section?.name}
                            </span>
                          )
                        ) : (
                          studentSub?.grade ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <Award className="h-3 w-3" /> GRADED ({studentSub.grade})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold uppercase shrink-0">
                              Sec {item.section?.name}
                            </span>
                          )
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Attached Document Button */}
                      {item.fileUrl && (
                        <button
                          onClick={() => handleOpenPrivateFile(item.fileUrl)}
                          className="mt-3 text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Download className="h-3.5 w-3.5" /> Download Instruction PDF ({item.fileName || 'Attachment'})
                        </button>
                      )}
                    </div>

                    {/* Footer Details & Actions */}
                    <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Due:
                        </span>
                        <span className={`font-semibold ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                          {new Date(item.dueDate).toLocaleDateString()} {new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Student Submission Controls */}
                      {!isProfessor && (
                        <div className="pt-2">
                          {studentSub ? (
                            studentSub.grade ? (
                              <div className="flex flex-col gap-2 w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                                    <CheckCircle2 className="h-4 w-4" /> COMPLETED
                                  </span>
                                  <span className="px-2.5 py-0.5 text-xs font-black text-white bg-emerald-600 rounded-md shadow-sm">
                                    Grade: {studentSub.grade}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-300 border-t border-emerald-500/20 pt-2 mt-1">
                                  <span>Your Solution File:</span>
                                  <button
                                    onClick={() => handleOpenPrivateFile(studentSub.fileUrl)}
                                    className="text-violet-300 hover:text-white font-semibold underline flex items-center gap-1"
                                  >
                                    <Download className="h-3 w-3" /> View Submitted File
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Submitted (Pending Grade)
                                </span>
                                <button
                                  onClick={() => handleOpenPrivateFile(studentSub.fileUrl)}
                                  className="text-xs font-semibold text-violet-300 hover:text-white underline flex items-center gap-1"
                                  title="View my submitted file"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> View File
                                </button>
                              </div>
                            )
                          ) : (
                            <button
                              onClick={() => setSubmittingAssignment(item)}
                              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-violet-500/10 transition-all"
                            >
                              <UploadCloud className="h-4 w-4" /> Submit Solution
                            </button>
                          )}
                        </div>
                      )}

                      {/* Professor Review Controls */}
                      {isProfessor && (
                        <div className="flex flex-col gap-2.5 pt-2">
                          {item.submissions && item.submissions.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Submitted Student(s):
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                {item.submissions.map(sub => (
                                  <span 
                                    key={sub.id} 
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border ${
                                      sub.grade 
                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                                        : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                                    }`}
                                  >
                                    <Users className="h-3 w-3" />
                                    {sub.student?.user?.name || 'Student'}
                                    {sub.grade ? ` (${sub.grade})` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-400 font-medium">
                              Submissions: <strong className="text-violet-400 font-bold">{totalSubmissions}</strong>
                            </span>
                            <button
                              onClick={() => handleOpenReview(item)}
                              className={`px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border ${
                                isFullyGraded 
                                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                              }`}
                            >
                              {isFullyGraded ? 'Review & Grade (Graded ✓)' : 'Review & Grade →'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

        {/* MODAL: CREATE ASSIGNMENT (FACULTY) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-[#0f172a] border border-slate-700 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-slate-100">Create New Assignment</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Teaching Section & Subject *
                  </label>
                  <select
                    value={selectedSubjectId ? `${selectedSubjectId}:${selectedSectionId}` : ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setSelectedSubjectId('');
                        setSelectedSectionId('');
                        return;
                      }
                      const [subId, secId] = e.target.value.split(':');
                      setSelectedSubjectId(subId);
                      setSelectedSectionId(secId);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Select a teaching class...</option>
                    {professorSubjects.map(cls => (
                      <option key={cls.mappingId} value={`${cls.subjectId}:${cls.sectionId}`}>
                        {cls.subjectCode} - {cls.subjectName} (Section {cls.sectionName}, Sem {cls.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lab Assignment #3: Graph Algorithms"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Description & Instructions
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Enter instructions, guidelines, and scoring criteria..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Due Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Attach Instruction File (Private Supabase Storage)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600/20 file:text-violet-300 hover:file:bg-violet-600/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SUBMIT ASSIGNMENT (STUDENT) */}
        {submittingAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Submit Solution</h3>
                  <p className="text-xs text-slate-400">{submittingAssignment.title}</p>
                </div>
                <button 
                  onClick={() => setSubmittingAssignment(null)}
                  className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignment} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Select Your File (PDF, DOCX, ZIP)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSubmissionFile(e.target.files[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600/20 file:text-violet-300 hover:file:bg-violet-600/30"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    🔒 Your submission will be stored in the private Supabase assignments bucket. Only you and your professor can access it.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSubmittingAssignment(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !submissionFile}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Upload & Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PROFESSOR REVIEW & GRADE SUBMISSIONS */}
        {reviewAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-3xl max-h-[85vh] bg-[#0f172a] border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative z-10">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Review Submissions</h3>
                  <p className="text-xs text-violet-400 font-semibold">{reviewAssignment.title}</p>
                </div>
                <button 
                  onClick={() => { setReviewAssignment(null); setReviewData(null); }}
                  className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {loadingReview ? (
                  <div className="py-12 flex justify-center text-violet-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !reviewData?.submissions || reviewData.submissions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No student submissions recorded for this assignment yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {reviewData.submissions.map(sub => (
                      <div key={sub.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-100">{sub.student?.user?.name}</p>
                            {sub.grade && (
                              <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded uppercase tracking-wider">
                                GRADED: {sub.grade}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{sub.student?.user?.email} &bull; Submitted {new Date(sub.submittedAt).toLocaleString()}</p>
                          <button
                            onClick={() => handleOpenPrivateFile(sub.fileUrl)}
                            className="mt-2 text-xs font-semibold text-violet-400 hover:underline flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" /> {sub.fileName || 'View Private Submission PDF'} (1-hr Signed Link)
                          </button>
                        </div>

                        {/* Grade Input Form */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Grade (e.g. A+)"
                            value={gradeInputMap[sub.id] || ''}
                            onChange={(e) => setGradeInputMap({ ...gradeInputMap, [sub.id]: e.target.value })}
                            className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                          />
                          <button
                            onClick={() => handleGradeSubmission(sub.id)}
                            disabled={gradingId === sub.id}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                              savedSuccessId === sub.id
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20'
                            }`}
                          >
                            {gradingId === sub.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : savedSuccessId === sub.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Award className="h-3.5 w-3.5" />
                            )}
                            {savedSuccessId === sub.id ? 'Saved ✓' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
