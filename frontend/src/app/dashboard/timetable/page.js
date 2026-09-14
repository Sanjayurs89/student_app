// app/dashboard/timetable/page.js
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
  Calendar, 
  MapPin, 
  User, 
  Trash2,
  Clock,
  Layers,
  BookOpen
} from 'lucide-react';

export default function TimetablePage() {
  const router = useRouter();

  // App States
  const [currentUser, setCurrentUser] = useState(null);
  const [slots, setSlots] = useState([]);
  const [assignments, setAssignments] = useState([]); // for professor slot options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form & Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('MONDAY');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected Day tab filter
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  // 1. Fetch initial schedule and profile
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

        // Fetch timetable slots & teaching assignments (if professor)
        await Promise.all([
          fetchTimetable(),
          user.role === 'PROFESSOR' ? fetchTeachingAssignments() : Promise.resolve()
        ]);

      } catch (err) {
        console.error('Error loading timetable page:', err);
        setError('Failed to fetch schedule data. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const fetchTimetable = async () => {
    try {
      const res = await API.get('/timetable');
      setSlots(res.data);
    } catch (err) {
      console.error('Error fetching timetable slots:', err);
    }
  };

  const fetchTeachingAssignments = async () => {
    try {
      const res = await API.get('/academic/live-count');
      if (res.data.classCounts) {
        setAssignments(res.data.classCounts);
      }
    } catch (err) {
      console.error('Error fetching teaching assignments:', err);
    }
  };

  // 2. Format 24h string (e.g. "09:00") to 12h formatted time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = hr % 12 || 12;
    return `${hr12}:${minutes} ${ampm}`;
  };

  // 3. Create Timetable Slot Handler (Faculty only)
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!dayOfWeek || !startTime || !endTime || !location.trim() || !selectedAssignmentId) {
      setFormError('All slot details are required');
      return;
    }

    // Find assignment corresponding to selected ID
    const assignment = assignments.find(a => a.mappingId === selectedAssignmentId);
    if (!assignment) {
      setFormError('Invalid teaching class selected');
      return;
    }

    setCreateLoading(true);
    setFormError('');

    try {
      const res = await API.post('/timetable', {
        dayOfWeek,
        startTime,
        endTime,
        location: location.trim(),
        subjectId: assignment.subjectId,
        sectionId: assignment.sectionId
      });

      // Add to list and close modal
      setSlots((prev) => [...prev, res.data]);
      setShowCreateModal(false);
      
      // Reset form
      setStartTime('');
      setEndTime('');
      setLocation('');
      setSelectedAssignmentId('');
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to schedule class slot.');
    } finally {
      setCreateLoading(false);
    }
  };

  // 4. Delete Timetable Slot Handler (Faculty only)
  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Are you sure you want to remove this class slot from the timetable?')) return;

    try {
      await API.delete(`/timetable/${slotId}`);
      setSlots((prev) => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting timetable slot');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  // Filter slots for the active day, sorted chronologically by start time
  const activeSlots = slots
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Generating academic calendars...</p>
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
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Global Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-violet-500" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            CampusConnect Schedule
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

      {/* Timetable Body Frame */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 relative z-10">
        
        {/* Banner details */}
        <section className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-200">
              {isStudent ? 'Weekly Academic Timetable' : 'My Teaching Schedule'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isStudent 
                ? `Course schedules derived for Department: ${currentUser.studentProfile?.department?.code} - Semester ${currentUser.studentProfile?.semester} - Section ${currentUser.studentProfile?.section?.name}`
                : `Faculty schedule manager for courses and lecture rooms`
              }
            </p>
          </div>

          {!isStudent && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all hover:scale-102 flex items-center gap-2 shadow-lg shadow-violet-500/10 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Schedule Class
            </button>
          )}
        </section>

        {/* Days of Week Tab selector */}
        <div className="flex border-b border-slate-900 bg-slate-950 p-1.5 rounded-xl border gap-1">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`
                flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all text-center
                ${selectedDay === day 
                  ? 'bg-slate-900 text-slate-100 border border-slate-800' 
                  : 'text-slate-500 hover:text-slate-350'}
              `}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.substring(0, 3)}</span>
            </button>
          ))}
        </div>

        {/* Timetable slots timeline layout */}
        <section className="flex-1 flex flex-col gap-4">
          {activeSlots.length === 0 ? (
            <div className="p-16 rounded-2xl border border-slate-900 bg-slate-900/10 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-850 text-slate-500 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-350">No classes scheduled</h4>
              <p className="text-xs text-slate-550 mt-1 max-w-xs leading-relaxed">
                There are no lecture mappings or schedule slots configured for {selectedDay.toLowerCase()}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 relative before:absolute before:left-[17px] before:top-8 before:bottom-8 before:w-[1px] before:bg-slate-900">
              {activeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-start gap-4 md:gap-6 group"
                >
                  {/* Left Timeline marker */}
                  <div className="h-9 w-9 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-indigo-400 shrink-0 relative z-10 group-hover:border-indigo-500/30 transition-all">
                    <Clock className="h-4.5 w-4.5" />
                  </div>

                  {/* Slot Details Card */}
                  <div className="flex-1 p-5 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm group-hover:border-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Color block */}
                      <div className="h-12 w-1.5 rounded bg-gradient-to-b from-violet-500 to-indigo-500 shrink-0 mt-0.5" />
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-200 truncate">
                            {slot.subject?.name}
                          </h4>
                          <span className="px-2 py-0.5 text-[9px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-md shrink-0 uppercase tracking-wide">
                            {slot.subject?.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap font-light">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-400" />
                            {formatTime(slot.startTime)} &ndash; {formatTime(slot.endTime)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-violet-400" />
                            {slot.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-900/50 pt-3 sm:pt-0">
                      {/* Show Professor for students, Section details for Professors */}
                      {isStudent ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Faculty</div>
                            <div className="text-xs text-slate-300 font-semibold">{slot.professor?.user?.name}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Section</div>
                            <div className="text-xs text-slate-300 font-semibold">
                              Sem {slot.section?.semester} - {slot.section?.name} ({slot.section?.department?.code})
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delete Slot shortcut (Faculty creator only) */}
                      {!isStudent && slot.professorId === currentUser?.id && (
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/5 rounded-xl transition-all"
                          title="Remove Class Slot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* CREATE SLOT DIALOG (Faculty only) */}
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
              <Plus className="h-5 w-5 text-violet-400" /> Schedule Class Slot
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure weekly lecture timeline mappings for your assigned classes.</p>

            {formError && (
              <div className="mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSlot} className="mt-5 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Lecture Course</label>
                <select
                  required
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                >
                  <option value="">Select class assignment...</option>
                  {assignments.map((ass) => (
                    <option key={ass.mappingId} value={ass.mappingId}>
                      {ass.subjectName} ({ass.subjectCode}) &bull; Sec {ass.sectionName} (Sem {ass.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Day of Week</label>
                  <select
                    required
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  >
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lecture Room/Lab</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 302"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 placeholder-slate-650"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createLoading || !selectedAssignmentId || !startTime || !endTime || !location.trim()}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-600/10 transition-all hover:scale-102 flex items-center justify-center gap-2 disabled:opacity-50 animate-pulse-once"
              >
                {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Slot to Timetable
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
