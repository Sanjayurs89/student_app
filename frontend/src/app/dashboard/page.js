// app/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/utils/api';
import ClassReminderBanner from '@/components/ClassReminderBanner';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  LogOut, 
  User, 
  Building2, 
  Calendar,
  Layers,
  Loader2,
  BookMarked,
  HelpCircle,
  Megaphone,
  Bell,
  Clock,
  Plus,
  X,
  FileCheck
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timetable, setTimetable] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Faculty quick announcement states
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annClassId, setAnnClassId] = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch user profile info
        const meRes = await API.get('/auth/me');
        const currentUser = meRes.data.user;
        setUser(currentUser);

        // Redirect if not onboarded
        if (!currentUser.isOnboarded) {
          router.push('/onboarding');
          return;
        }

        // Fetch live counts
        const countRes = await API.get('/academic/live-count');
        setLiveData(countRes.data);

        // Fetch timetable schedule & announcements
        try {
          const timetableRes = await API.get('/timetable');
          setTimetable(timetableRes.data);
        } catch (e) {
          console.error('Error fetching timetable:', e);
        }

        try {
          const annRes = await API.get('/communication/announcements');
          setAnnouncements(annRes.data);
        } catch (e) {
          console.error('Error fetching announcements:', e);
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching dashboard data. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim() || !annClassId) return;

    const mapping = liveData?.classCounts?.find(c => c.mappingId === annClassId);
    if (!mapping) return;

    setAnnLoading(true);
    setAnnError('');
    try {
      const res = await API.post('/communication/announcements', {
        title: annTitle.trim(),
        content: annContent.trim(),
        subjectId: mapping.subjectId,
        sectionId: mapping.sectionId
      });
      setAnnouncements((prev) => [res.data, ...prev]);
      setShowAnnModal(false);
      setAnnTitle('');
      setAnnContent('');
      setAnnClassId('');
    } catch (err) {
      console.error(err);
      setAnnError(err.response?.data?.message || 'Error posting announcement');
    } finally {
      setAnnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Entering campus dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
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

  const isStudent = user?.role === 'STUDENT';
  const deptCode = isStudent 
    ? user?.studentProfile?.department?.code 
    : user?.professorProfile?.department?.code;
  const deptName = isStudent 
    ? user?.studentProfile?.department?.name 
    : user?.professorProfile?.department?.name;

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-violet-500" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              CampusConnect
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-slate-900 bg-slate-900/50 px-3 py-1.5 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all"
              title="Log Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10 relative z-10 flex flex-col gap-8">
        
        {/* Class Reminder Banner (auto-dismissing after 20 minutes) */}
        <ClassReminderBanner slots={timetable} />

        {/* Banner with Profile overview */}
        <section className="p-8 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">{user?.name}</h2>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-3 rounded-xl border border-slate-900 bg-slate-900/40 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-violet-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Department</div>
                <div className="text-xs font-semibold text-slate-200">{deptCode}</div>
              </div>
            </div>

            {isStudent && (
              <>
                <div className="px-4 py-3 rounded-xl border border-slate-900 bg-slate-900/40 flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Semester</div>
                    <div className="text-xs font-semibold text-slate-200">Semester {liveData?.semester}</div>
                  </div>
                </div>

                <div className="px-4 py-3 rounded-xl border border-slate-900 bg-slate-900/40 flex items-center gap-3">
                  <Layers className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Section</div>
                    <div className="text-xs font-semibold text-slate-200">Section {liveData?.sectionName}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Quick Navigation Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <Link
            href="/dashboard/assignments"
            className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-800 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Assignments</h3>
                <p className="text-xs text-slate-400 mt-1">Coursework, submissions & grades</p>
              </div>
            </div>
            <div className="text-violet-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </div>
          </Link>
          <Link
            href="/dashboard/notes"
            className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-800 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Notes Center</h3>
                <p className="text-xs text-slate-400 mt-1">Upload and study academic notes</p>
              </div>
            </div>
            <div className="text-violet-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </div>
          </Link>

          <Link
            href="/dashboard/chat"
            className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-800 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Class Chats</h3>
                <p className="text-xs text-slate-400 mt-1">Real-time room chats with classmates</p>
              </div>
            </div>
            <div className="text-indigo-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </div>
          </Link>

          <Link
            href="/dashboard/rooms"
            className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-800 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Study Rooms</h3>
                <p className="text-xs text-slate-400 mt-1">Form groups and share study files</p>
              </div>
            </div>
            <div className="text-blue-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </div>
          </Link>

          <Link
            href="/dashboard/doubts"
            className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-800 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <HelpCircle className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Doubt solver</h3>
                <p className="text-xs text-slate-400 mt-1">Post questions and get resolutions</p>
              </div>
            </div>
            <div className="text-amber-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </div>
          </Link>
        </section>

        {isStudent ? (
          /* STUDENT CONTENT */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Live Headcount Stats */}
            <div className="lg:col-span-1 p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col items-center justify-center text-center gap-4 py-10">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Users className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-4xl font-extrabold text-slate-100">{liveData?.sectionCount}</h3>
                <h4 className="text-sm font-semibold text-slate-300 mt-1">Classmates Enrolled</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                  Active students currently enrolled in CSE - Semester {liveData?.semester} - Section {liveData?.sectionName}
                </p>
              </div>
            </div>

            {/* Enrolled Subjects List */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                <BookMarked className="h-5 w-5 text-violet-400" />
                <h3 className="text-base font-bold text-slate-200">Auto-Derived Course Subjects</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                You are registered in the following courses for the current semester:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {liveData?.subjects?.map((sub) => (
                  <Link 
                    key={sub.id} 
                    href={`/dashboard/subjects/${sub.id}`}
                    className="p-4 rounded-xl border border-slate-900 bg-slate-950 hover:border-slate-800 hover:scale-[1.02] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-600/10 flex items-center justify-center text-violet-400 font-bold text-sm">
                        {sub.code.substring(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-200 group-hover:text-violet-400 transition-colors">{sub.name}</span>
                        <span className="text-[10px] text-slate-500">{sub.code}</span>
                      </div>
                    </div>
                    <span className="text-slate-700 group-hover:text-violet-400 transition-colors text-xs font-bold">&rarr;</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Today's Lectures & Announcements */}
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
              
              {/* Daily Schedule */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-200">Today's Lectures</h3>
                  </div>
                  <Link href="/dashboard/timetable" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                    Full Schedule &rarr;
                  </Link>
                </div>

                {(() => {
                  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                  let todayDay = daysOfWeek[new Date().getDay()];
                  if (todayDay === 'SATURDAY' || todayDay === 'SUNDAY') todayDay = 'MONDAY'; // fallback to Monday on weekends
                  
                  const todaySlots = timetable
                    .filter(s => s.dayOfWeek === todayDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  
                  const formatTime = (timeStr) => {
                    if (!timeStr) return '';
                    const [hours, minutes] = timeStr.split(':');
                    const hr = parseInt(hours, 10);
                    const ampm = hr >= 12 ? 'PM' : 'AM';
                    const hr12 = hr % 12 || 12;
                    return `${hr12}:${minutes} ${ampm}`;
                  };

                  if (todaySlots.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 py-6 text-center">No lectures scheduled for {todayDay.toLowerCase()}.</p>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {todaySlots.map(slot => (
                        <div key={slot.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-200">{slot.subject?.name}</div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-indigo-400" /> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                              <span>&bull;</span>
                              <span>Room {slot.location}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">{slot.professor?.user?.name.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Latest Announcements */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-violet-400" />
                    <h3 className="text-base font-bold text-slate-200">Latest Broadcasts</h3>
                  </div>
                </div>

                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No announcements posted for your section yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {announcements.slice(0, 3).map(ann => (
                      <div key={ann.id} className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-250 truncate">{ann.title}</span>
                          <span className="text-[9px] text-slate-500">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-light leading-relaxed line-clamp-2">{ann.content}</p>
                        <div className="text-[9px] text-indigo-400 mt-1 uppercase font-semibold tracking-wider">
                          {ann.subject?.code} &bull; Prof. {ann.sender?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          /* PROFESSOR CONTENT */
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <BookMarked className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-bold text-slate-200">Assigned Classes & Live Headcounts</h3>
            </div>
            
            {liveData?.classCounts?.length === 0 ? (
              <div className="p-10 rounded-2xl border border-slate-900 bg-slate-900/10 text-center text-slate-500">
                You have no subject-section assignments. Please configure onboarding again.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveData?.classCounts?.map((cl) => (
                  <Link 
                    key={cl.mappingId} 
                    href={`/dashboard/subjects/${cl.subjectId}`}
                    className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-800 hover:scale-[1.02] transition-all flex flex-col justify-between gap-6 group"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                          Semester {cl.semester}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          Section {cl.sectionName}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-200 mt-2 group-hover:text-violet-400 transition-colors">{cl.subjectName}</h4>
                      <p className="text-xs text-slate-500">{cl.subjectCode}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-400" /> Student Headcount:
                      </span>
                      <span className="text-sm font-extrabold text-slate-200 bg-slate-950 border border-slate-900 px-3 py-1 rounded-lg">
                        {cl.enrolledCount}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Professor Schedule & Post Announcements Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              
              {/* Timetable schedule */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-200">Today's Lectures</h3>
                  </div>
                  <Link href="/dashboard/timetable" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                    Manage Timetable &rarr;
                  </Link>
                </div>

                {(() => {
                  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                  let todayDay = daysOfWeek[new Date().getDay()];
                  if (todayDay === 'SATURDAY' || todayDay === 'SUNDAY') todayDay = 'MONDAY'; // fallback to Monday on weekends
                  
                  const todaySlots = timetable
                    .filter(s => s.dayOfWeek === todayDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  const formatTime = (timeStr) => {
                    if (!timeStr) return '';
                    const [hours, minutes] = timeStr.split(':');
                    const hr = parseInt(hours, 10);
                    const ampm = hr >= 12 ? 'PM' : 'AM';
                    const hr12 = hr % 12 || 12;
                    return `${hr12}:${minutes} ${ampm}`;
                  };

                  if (todaySlots.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 py-6 text-center">No lectures scheduled for {todayDay.toLowerCase()}.</p>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {todaySlots.map(slot => (
                        <div key={slot.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-250">{slot.subject?.name}</div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-indigo-400" /> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                              <span>&bull;</span>
                              <span>Room {slot.location}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-550 font-semibold uppercase">Sec {slot.section?.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Faculty Announcements posted */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-violet-400" />
                    <h3 className="text-base font-bold text-slate-200">Post Announcements</h3>
                  </div>
                  {liveData?.classCounts?.length > 0 && (
                    <button
                      onClick={() => setShowAnnModal(true)}
                      className="text-xs text-indigo-450 hover:text-indigo-400 font-bold"
                    >
                      Broadcast Notification &rarr;
                    </button>
                  )}
                </div>

                {announcements.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-555 border border-dashed border-slate-900 rounded-xl bg-slate-950/20 flex flex-col items-center justify-center">
                    <p>You haven't posted any announcements yet.</p>
                    <p className="text-[10px] text-slate-600 mt-1">Faculty can broadcast notifications inside course channels.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recently Broadcasted</div>
                    {announcements.slice(0, 3).map(ann => (
                      <div key={ann.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-250 truncate">{ann.title}</span>
                          <span className="text-[9px] text-slate-550 shrink-0">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ann.content}</p>
                        <div className="text-[8px] text-slate-500 mt-1 font-semibold">
                          Sent to {ann.subject?.code} &bull; Section {ann.section?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* FACULTY BROADCAST ANNOUNCEMENT MODAL */}
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

              {annError && (
                <div className="mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-450 text-xs font-semibold">
                  {annError}
                </div>
              )}

              <form onSubmit={handleCreateAnnouncement} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Target Course Class</label>
                  <select
                    required
                    value={annClassId}
                    onChange={(e) => setAnnClassId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  >
                    <option value="">Select class assignment...</option>
                    {liveData?.classCounts?.map((ass) => (
                      <option key={ass.mappingId} value={ass.mappingId}>
                        {ass.subjectName} ({ass.subjectCode}) &bull; Sec {ass.sectionName} (Sem {ass.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Announcement Title</label>
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
                  <label className="text-xs font-bold text-slate-460 uppercase tracking-wider">Message Description</label>
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
                  disabled={annLoading || !annClassId || !annTitle.trim() || !annContent.trim()}
                  className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {annLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Broadcast to Students
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
