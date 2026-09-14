// components/ClassReminderBanner.js
'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, MapPin, X, Sparkles } from 'lucide-react';

export default function ClassReminderBanner({ slots = [] }) {
  const [activeReminder, setActiveReminder] = useState(null);
  const [dismissedSlotIds, setDismissedSlotIds] = useState([]);
  const [minutesRemaining, setMinutesRemaining] = useState(20);

  useEffect(() => {
    checkTimetableReminder();
    const interval = setInterval(checkTimetableReminder, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [slots, dismissedSlotIds]);

  const checkTimetableReminder = () => {
    if (!slots || slots.length === 0) {
      setActiveReminder(null);
      return;
    }

    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()];

    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const currentTotalMins = currentHours * 60 + currentMins;

    for (const slot of slots) {
      if (slot.dayOfWeek !== currentDay) continue;
      if (dismissedSlotIds.includes(slot.id)) continue;

      if (!slot.startTime) continue;
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const startTotalMins = startH * 60 + startM;

      // Check if current time is within [startTime, startTime + 20 minutes]
      const diffMins = currentTotalMins - startTotalMins;
      if (diffMins >= 0 && diffMins < 20) {
        setActiveReminder(slot);
        setMinutesRemaining(20 - diffMins);
        return;
      }
    }

    setActiveReminder(null);
  };

  const handleDismiss = () => {
    if (activeReminder) {
      setDismissedSlotIds(prev => [...prev, activeReminder.id]);
      setActiveReminder(null);
    }
  };

  if (!activeReminder) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-900/90 via-indigo-900/90 to-purple-900/90 border border-violet-500/30 text-white shadow-xl shadow-violet-500/10 backdrop-blur-md animate-in slide-in-from-top duration-300 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center shrink-0 animate-pulse">
          <Bell className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-violet-400/20 border border-violet-300/30 rounded text-violet-200">
              Class Starting Now
            </span>
            <span className="text-[10px] text-violet-300/80 font-mono">
              Auto-dismisses in {minutesRemaining} min{minutesRemaining > 1 ? 's' : ''}
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white mt-1">
            {activeReminder.subject?.name || 'Scheduled Class'}
          </h4>
          <div className="flex items-center gap-3 text-xs text-violet-200/90 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-violet-300" /> {activeReminder.startTime} - {activeReminder.endTime}
            </span>
            {activeReminder.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-violet-300" /> {activeReminder.location}
              </span>
            )}
            {activeReminder.section?.name && (
              <span className="text-[11px] text-violet-300 font-semibold">
                (Section {activeReminder.section.name})
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="p-2 text-violet-300 hover:text-white hover:bg-violet-800/40 rounded-xl transition-all shrink-0"
        title="Dismiss reminder"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
