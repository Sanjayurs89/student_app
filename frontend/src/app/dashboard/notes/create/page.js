// app/dashboard/notes/create/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/utils/api';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Upload, 
  Plus, 
  X, 
  Eye, 
  Loader2, 
  CheckCircle,
  Tag as TagIcon
} from 'lucide-react';

export default function CreateNote() {
  const router = useRouter();
  
  // App states
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [mode, setMode] = useState('upload'); // default to 'upload' for PDF/DOCX
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);

  // Tag states
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [existingTags, setExistingTags] = useState([]); // from DB for autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch student's enrolled subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await API.get('/academic/live-count');
        if (res.data.subjects) {
          setSubjects(res.data.subjects);
        } else if (res.data.classCounts) {
          // If professor, get their mapped subjects
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
        setError('Failed to fetch subjects. Please ensure you are logged in.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch existing tags for the selected subject
  useEffect(() => {
    if (!subjectId) {
      setExistingTags([]);
      return;
    }
    const fetchTags = async () => {
      try {
        const res = await API.get(`/notes/tags?subjectId=${subjectId}`);
        setExistingTags(res.data);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, [subjectId]);

  // Handle adding a tag
  const addTag = (tagName) => {
    const cleanTag = tagName.trim().toLowerCase();
    if (!cleanTag) return;
    if (tags.includes(cleanTag)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 5) {
      setError('You can add a maximum of 5 tags');
      return;
    }
    setTags([...tags, cleanTag]);
    setTagInput('');
    setError('');
    setShowSuggestions(false);
  };

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Note title is required.');
      return;
    }
    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }
    if (mode === 'write' && !content.trim()) {
      setError('Please write some content for your note.');
      return;
    }
    if (mode === 'upload' && !file) {
      setError('Please select a file to upload.');
      return;
    }

    setSubmitLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subjectId', subjectId);
    formData.append('visibility', visibility);
    formData.append('description', description);
    formData.append('tags', JSON.stringify(tags));
    
    if (mode === 'write') {
      formData.append('content', content);
    } else {
      formData.append('file', file);
    }

    try {
      await API.post('/notes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/notes');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload note.');
      setSubmitLoading(false);
    }
  };

  // Autocomplete filtering
  const filteredSuggestions = existingTags.filter(
    t => t.name.includes(tagInput.toLowerCase()) && !tags.includes(t.name)
  );

  const selectedSubject = subjects.find(s => s.id === subjectId);

  if (loading) {
    return (
      <div className="flex-grow bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm mt-4 font-light">Loading upload panel...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-slate-950 text-slate-100 p-6 min-h-screen relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col gap-6 relative z-10">
        
        {/* Header link */}
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Upload Study Material
          </h1>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            Note uploaded successfully! Redirecting...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Editor block - 7 cols */}
          <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-400" />
                {mode === 'upload' ? 'Upload PDF / Document File' : 'Write Text Note'}
              </h2>

              {/* Mode Toggle Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    mode === 'upload'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" /> PDF / File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMode('write')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    mode === 'write'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Text Note
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Binary Search Tree Insertion and Deletion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitLoading}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none"
                />
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Course Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setTags([]); // clear tags on subject change
                    if (error) setError('');
                  }}
                  disabled={submitLoading}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 text-sm transition-all outline-none"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Note Content Editor / File Uploader */}
              {mode === 'write' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Note Body (Text Content)
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Write your study notes here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={submitLoading}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none font-mono resize-y"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Select File (PDF, PNG, JPG, JPEG, DOCX)
                  </label>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 rounded-xl p-8 flex flex-col items-center justify-center gap-3 relative transition-all group">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      onChange={handleFileChange}
                      disabled={submitLoading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="h-12 w-12 rounded-xl bg-violet-600/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Upload className="h-6 w-6 text-violet-400" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-semibold text-slate-200">
                        {file ? file.name : 'Choose a file to upload'}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Max file size 10MB'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Description / Topic Overview (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Brief summary of the class notes from unit 2..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitLoading}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none resize-none"
                />
              </div>

              {/* Visibility and Tags Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={submitLoading}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 text-sm transition-all outline-none"
                  >
                    <option value="PUBLIC">Public to College</option>
                    <option value="PRIVATE">Private (Only Me)</option>
                    <option value="ROOM">Shared with Room</option>
                  </select>
                </div>

                {/* Tags autocomplete */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tags (Press Enter to Add)
                  </label>
                  <div className="relative">
                    <TagIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. midsem"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      disabled={submitLoading || !subjectId}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Autocomplete Suggestions dropdown */}
                  {showSuggestions && tagInput && subjectId && filteredSuggestions.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 mt-14 bg-slate-950 border border-slate-900 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                      {filteredSuggestions.map((sug) => (
                        <li key={sug.id}>
                          <button
                            type="button"
                            onClick={() => addTag(sug.name)}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all font-medium"
                          >
                            #{sug.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Display added tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((tag, idx) => (
                    <span 
                      key={tag} 
                      className="px-2.5 py-1 text-[11px] font-semibold bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-lg flex items-center gap-1.5"
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

              <button
                type="submit"
                disabled={submitLoading || success}
                className="w-full py-4 mt-4 font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
              >
                {submitLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Publish Note <Plus className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Preview block - 5 cols */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Eye className="h-4 w-4" /> Live Card Preview
            </h3>

            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-sm flex flex-col justify-between min-h-[350px] relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-[200px] h-[200px] rounded-full bg-violet-600/5 blur-[50px] pointer-events-none" />
              
              <div className="flex flex-col gap-4">
                {/* Subject Badge */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                    {selectedSubject ? selectedSubject.name : 'Choose Subject'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    {visibility}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-lg font-bold text-slate-100 line-clamp-2">
                  {title || 'Untited Study Guide'}
                </h4>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-3">
                  {description || 'No description provided. Summary of note overview goes here.'}
                </p>

                {/* Content snippet */}
                {mode === 'write' ? (
                  <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-lg text-xs font-mono text-slate-500 max-h-32 overflow-hidden overflow-ellipsis line-clamp-4">
                    {content || 'Your notes content will preview here...'}
                  </div>
                ) : (
                  file && (
                    <div className="p-3.5 bg-slate-950/60 border border-slate-900 rounded-lg flex items-center gap-3">
                      <div className="h-9 w-9 rounded bg-indigo-500/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-semibold text-slate-300 truncate">{file.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Tags & stats */}
              <div className="pt-4 border-t border-slate-900 flex flex-col gap-3 mt-4">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold text-violet-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>Uploaded by: You</span>
                  <span>Just now</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
