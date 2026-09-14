// app/onboarding/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/utils/api';
import { 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Clipboard, 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Loading & error states
  const [pageLoading, setPageLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selections from DB
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [allSubjects, setAllSubjects] = useState([]);
  const [allSections, setAllSections] = useState([]);
  
  // Student form state
  const [studentSemester, setStudentSemester] = useState('');
  const [studentSectionId, setStudentSectionId] = useState('');
  const [studentSubjects, setStudentSubjects] = useState([]);

  // Professor teaching blocks state
  // [{ id: 1, subjectId: '', sectionIds: [] }]
  const [professorBlocks, setProfessorBlocks] = useState([
    { id: Date.now(), subjectId: '', sectionIds: [] }
  ]);

  // Fetch logged in user and departments
  useEffect(() => {
    const initPage = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const userRes = await API.get('/auth/me');
        setUser(userRes.data.user);
        
        // If already onboarded, send to dashboard
        if (userRes.data.user.isOnboarded) {
          router.push('/dashboard');
          return;
        }

        const deptRes = await API.get('/academic/departments');
        setDepartments(deptRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to initialize onboarding details. Please log in again.');
      } finally {
        setPageLoading(false);
      }
    };
    initPage();
  }, [router]);

  // Fetch subjects and sections when department changes
  useEffect(() => {
    if (!selectedDeptId) {
      setAllSubjects([]);
      setAllSections([]);
      return;
    }

    const fetchAcademicData = async () => {
      try {
        const res = await API.get(`/academic/onboarding-data?departmentId=${selectedDeptId}`);
        setAllSubjects(res.data.subjects);
        setAllSections(res.data.sections);
      } catch (err) {
        console.error(err);
        setError('Error fetching department courses/sections.');
      }
    };

    fetchAcademicData();
  }, [selectedDeptId]);

  // Handle auto-populated subjects for students when department or semester changes
  useEffect(() => {
    if (user?.role === 'STUDENT' && selectedDeptId && studentSemester) {
      const semNum = parseInt(studentSemester, 10);
      const filtered = allSubjects.filter(sub => sub.semester === semNum);
      setStudentSubjects(filtered);
    } else {
      setStudentSubjects([]);
    }
  }, [user, selectedDeptId, studentSemester, allSubjects]);

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDeptId || !studentSemester || !studentSectionId) {
      setError('Please complete all selections');
      return;
    }

    setSubmitLoading(true);
    setError('');

    try {
      await API.post('/auth/onboarding', {
        departmentId: selectedDeptId,
        semester: parseInt(studentSemester, 10),
        sectionId: studentSectionId,
      });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Onboarding submission failed');
      setSubmitLoading(false);
    }
  };

  const handleProfessorSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDeptId) {
      setError('Please select a department');
      return;
    }

    // Validate professor blocks
    const validatedBlocks = [];
    for (const block of professorBlocks) {
      if (!block.subjectId || block.sectionIds.length === 0) {
        setError('Please configure both a subject and at least one section for all teaching blocks.');
        return;
      }
      validatedBlocks.push({
        subjectId: block.subjectId,
        sectionIds: block.sectionIds,
      });
    }

    setSubmitLoading(true);
    setError('');

    try {
      await API.post('/auth/onboarding', {
        departmentId: selectedDeptId,
        subjects: validatedBlocks,
      });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Onboarding submission failed');
      setSubmitLoading(false);
    }
  };

  // Professor teaching blocks helpers
  const addProfessorBlock = () => {
    setProfessorBlocks([
      ...professorBlocks,
      { id: Date.now(), subjectId: '', sectionIds: [] }
    ]);
  };

  const removeProfessorBlock = (id) => {
    if (professorBlocks.length === 1) return;
    setProfessorBlocks(professorBlocks.filter(b => b.id !== id));
  };

  const handleBlockSubjectChange = (id, val) => {
    setProfessorBlocks(professorBlocks.map(b => {
      if (b.id === id) {
        // Reset section selections if subject changes
        return { ...b, subjectId: val, sectionIds: [] };
      }
      return b;
    }));
  };

  const handleBlockSectionToggle = (id, sectionId) => {
    setProfessorBlocks(professorBlocks.map(b => {
      if (b.id === id) {
        const alreadyChecked = b.sectionIds.includes(sectionId);
        const updatedSections = alreadyChecked 
          ? b.sectionIds.filter(sid => sid !== sectionId)
          : [...b.sectionIds, sectionId];
        return { ...b, sectionIds: updatedSections };
      }
      return b;
    }));
  };

  if (pageLoading) {
    return (
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4">Loading profile settings...</p>
      </div>
    );
  }

  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl p-8 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md shadow-2xl relative z-10 flex flex-col gap-6">
        <div className="flex items-center gap-3 justify-center mb-2">
          <GraduationCap className="h-10 w-10 text-violet-500" />
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            CampusConnect Setup
          </span>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">Welcome, {user?.name}!</h2>
          <p className="text-sm text-slate-400 mt-1">
            Let's customize your profile for your {isStudent ? 'academic term' : 'teaching timetable'}.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            1. Select Your Department
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => {
              setSelectedDeptId(e.target.value);
              // Reset values on department change
              setStudentSemester('');
              setStudentSectionId('');
              setProfessorBlocks([{ id: Date.now(), subjectId: '', sectionIds: [] }]);
              if (error) setError('');
            }}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 text-sm transition-all outline-none"
          >
            <option value="" className="bg-slate-950 text-slate-100 text-sm py-2">-- Choose Department --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id} className="bg-slate-950 text-slate-100 text-sm py-2">
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        {selectedDeptId && (
          <>
            {isStudent ? (
              /* STUDENT ONBOARDING FLOW */
              <form onSubmit={handleStudentSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      2. Year / Semester
                    </label>
                    <select
                      value={studentSemester}
                      onChange={(e) => {
                        setStudentSemester(e.target.value);
                        setStudentSectionId(''); // reset section since section lists vary
                        if (error) setError('');
                      }}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 text-sm transition-all outline-none"
                    >
                      <option value="" className="bg-slate-950 text-slate-100 text-sm py-2">-- Choose Semester --</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem} className="bg-slate-950 text-slate-100 text-sm py-2">
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      3. Section
                    </label>
                    <select
                      value={studentSectionId}
                      onChange={(e) => {
                        setStudentSectionId(e.target.value);
                        if (error) setError('');
                      }}
                      disabled={!studentSemester}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 text-sm transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="" className="bg-slate-950 text-slate-100 text-sm py-2">-- Choose Section --</option>
                      {allSections
                        .filter((sec) => sec.semester === parseInt(studentSemester, 10))
                        .map((sec) => (
                          <option key={sec.id} value={sec.id} className="bg-slate-950 text-slate-100 text-sm py-2">
                            Section {sec.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Auto-populated Subjects list */}
                {studentSubjects.length > 0 && (
                  <div className="p-5 rounded-xl border border-slate-900 bg-slate-950/60 flex flex-col gap-3">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                      <BookOpen className="h-5 w-5 text-violet-400" />
                      <h4 className="text-sm font-semibold text-slate-200">Auto-Populated Subjects</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Based on your department and semester, you will be auto-enrolled in the following subjects:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                      {studentSubjects.map((sub) => (
                        <li 
                          key={sub.id} 
                          className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-2.5 rounded-lg text-xs"
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-200">{sub.name}</span>
                            <span className="text-[10px] text-slate-500">{sub.code}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitLoading || !studentSectionId}
                  className="w-full py-3.5 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Confirm & Start Using CampusConnect <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* PROFESSOR ONBOARDING FLOW */
              <form onSubmit={handleProfessorSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    2. Map Your Subjects & Sections
                  </label>
                  
                  {professorBlocks.map((block, index) => {
                    const selectedSub = allSubjects.find(s => s.id === block.subjectId);
                    
                    return (
                      <div 
                        key={block.id} 
                        className="p-5 rounded-xl border border-slate-900 bg-slate-950/40 relative flex flex-col gap-4"
                      >
                        {professorBlocks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProfessorBlock(block.id)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-900 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-slate-500">
                            Subject Block {index + 1}
                          </span>
                          <select
                            value={block.subjectId}
                            onChange={(e) => handleBlockSubjectChange(block.id, e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 text-sm transition-all outline-none mt-1"
                          >
                            <option value="">-- Choose Subject --</option>
                            {allSubjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                Semester {sub.semester} - {sub.name} ({sub.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        {block.subjectId && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-400">
                              Select Taught Section(s) for Semester {selectedSub?.semester}:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {allSections
                                .filter(sec => sec.semester === selectedSub?.semester)
                                .map((sec) => {
                                  const isChecked = block.sectionIds.includes(sec.id);
                                  return (
                                    <button
                                      type="button"
                                      key={sec.id}
                                      onClick={() => handleBlockSectionToggle(block.id, sec.id)}
                                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                        isChecked
                                          ? 'bg-violet-600/10 border-violet-500 text-violet-400 shadow-md shadow-violet-500/5'
                                          : 'bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-800 hover:text-slate-400'
                                      }`}
                                    >
                                      Section {sec.name}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addProfessorBlock}
                  className="w-full py-3.5 border border-dashed border-slate-800 bg-slate-900/10 text-slate-400 hover:text-slate-200 hover:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Another Subject
                </button>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-3.5 mt-2 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Confirm & Start Teaching <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
