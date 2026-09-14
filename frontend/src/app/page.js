// app/page.js
'use client';

import Link from 'next/link';
import { GraduationCap, BookOpen, Users, Compass } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background blobs for premium depth */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-slate-900 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-violet-500" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            CampusConnect
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-20 flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-xs text-violet-400 font-semibold mb-6 tracking-wide uppercase">
          <Compass className="h-3.5 w-3.5" /> Exclusively for Your College Ecosytem
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Bridging Academics & <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            Campus Collaboration
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
          A private, secure academic workspace tailored for students and professors. 
          Share notes, connect in real-time, coordinate coursework, and study together.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-16">
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm hover:border-slate-800 transition-all group">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-100">Smart Notes System</h3>
            <p className="text-sm text-slate-400">
              Upload, tag, and search course-specific notes. Maintain your personal library or share study resources.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm hover:border-slate-800 transition-all group">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-100">Class & Room Chats</h3>
            <p className="text-sm text-slate-400">
              Automatic course chats, student study rooms, and professor broadcast channels keep your chats organized.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm hover:border-slate-800 transition-all group">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <GraduationCap className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-100">Interactive Subject Hubs</h3>
            <p className="text-sm text-slate-400">
              A single place for announcements, assignments, doubt boards, official material, and classmate directory.
            </p>
          </div>
        </div>

        {/* Action Blocks */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register?role=STUDENT"
            className="w-full sm:w-auto px-8 py-4 font-semibold rounded-xl text-slate-950 bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-300 hover:to-indigo-300 shadow-xl shadow-indigo-500/10 transition-all hover:scale-[1.03]"
          >
            Join as Student
          </Link>
          <Link
            href="/register?role=PROFESSOR"
            className="w-full sm:w-auto px-8 py-4 font-semibold rounded-xl text-slate-100 border border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-slate-700 transition-all hover:scale-[1.03]"
          >
            Join as Faculty / Professor
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-sm text-slate-600">
        &copy; {new Date().getFullYear()} CampusConnect. All rights reserved. For academic institutional use only.
      </footer>
    </div>
  );
}
