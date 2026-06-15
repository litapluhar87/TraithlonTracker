import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { currentWeek, getPlanConfig, getWeekDates, sameDay, fullDay, formatDuration } from '../utils/raceConfig';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DISCIPLINE_COLOR = { swim: '#38BDF8', bike: '#F97316', run: '#4ADE80', gym: '#A78BFA', brick: '#FB923C', rest: '#374151' };
const DISCIPLINE_ICON  = { swim: '🏊', bike: '🚴', run: '🏃', gym: '💪', brick: '⚡', rest: '😴' };

// The weekly session template — maps to days 0-6 of each week (Day 1 = plan start day)
const WEEK_SESSIONS = [
  { offset: 0, discipline: 'swim',  session_type: 'technique', name: 'Quality Swim',        desc: 'Drills + race-pace intervals. Focus on stroke efficiency.' },
  { offset: 1, discipline: 'run',   session_type: 'intervals', name: 'Speed Intervals',     desc: '15min warmup + 6–8×800m or 5×1km at 5K pace.' },
  { offset: 2, discipline: 'run',   session_type: 'easy',      name: 'Easy Run + Gym',      desc: '45min easy conversational pace + lower body gym.', secondary: 'gym' },
  { offset: 3, discipline: 'brick', session_type: 'brick',     name: 'Brick Session',       desc: '45–60min bike immediately followed by 20–30min run.' },
  { offset: 4, discipline: 'swim',  session_type: 'speed',     name: 'Swim Speed + Gym',    desc: 'Speed intervals in water + full-body strength session.', secondary: 'gym' },
  { offset: 5, discipline: 'run',   session_type: 'long',      name: 'Long Run + Recovery', desc: '21km easy (alt 14–16km) + 1hr easy recovery swim.', secondary: 'swim' },
  { offset: 6, discipline: 'bike',  session_type: 'long',      name: 'Long Bike Ride',      desc: '2hr steady aerobic pace. Keep HR in Zone 2.' },
];

function SessionModal({ session, date, activities, onClose }) {
  if (!session) return null;
  const actForDay = activities.find(a => sameDay(new Date(a.start_date), date) && a.type === session.discipline);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-[#161A23] rounded-t-3xl p-6 pb-10 border-t border-[#252B38]"
           onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[#252B38] rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${DISCIPLINE_COLOR[session.discipline]}22` }}>
            {DISCIPLINE_ICON[session.discipline]}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{session.name}</h3>
            <p className="text-sm text-[#6B7280]">
              {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <p className="text-[#9CA3AF] text-sm mb-4 leading-relaxed">{session.desc}</p>
        {actForDay ? (
          <div className="bg-[#4ADE80]/10 border border-[#4ADE80]/30 rounded-xl p-4">
            <p className="text-[#4ADE80] font-semibold text-sm mb-1">✅ Completed</p>
            <p className="text-[#9CA3AF] text-sm">
              {actForDay.distance_m >= 1000
                ? `${(actForDay.distance_m / 1000).toFixed(1)} km`
                : `${actForDay.distance_m} m`}
              {actForDay.duration_s ? ` · ${formatDuration(actForDay.duration_s)}` : ''}
              {actForDay.notes ? ` · "${actForDay.notes}"` : ''}
            </p>
          </div>
        ) : (
          <div className="bg-[#252B38]/50 rounded-xl p-4 text-center">
            <p className="text-[#6B7280] text-sm">Not logged yet</p>
          </div>
        )}
        <button onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-[#252B38] text-white text-sm font-medium">
          Close
        </button>
      </div>
    </div>
  );
}

export default function WeeklyPlan() {
  const { activities } = useApp();
  const { totalWeeks } = getPlanConfig();
  const [week, setWeek] = useState(currentWeek());
  const [selected, setSelected] = useState(null); // { session, date }
  const today = new Date();

  // Actual calendar dates for this week
  const weekDates = getWeekDates(week);

  // Build session list with real dates attached
  const sessions = WEEK_SESSIONS.map((s, i) => ({
    ...s,
    date: weekDates[i],
  }));

  const isComplete = (date, discipline) =>
    activities.some(a => sameDay(new Date(a.start_date), date) && a.type === discipline);

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white">Weekly Plan</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeek(w => Math.max(1, w - 1))}
            className="w-8 h-8 rounded-lg bg-[#161A23] border border-[#252B38] flex items-center justify-center text-[#6B7280] hover:text-white transition-colors disabled:opacity-30"
            disabled={week <= 1}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-white w-16 text-center">Week {week}/{totalWeeks}</span>
          <button onClick={() => setWeek(w => Math.min(totalWeeks, w + 1))}
            className="w-8 h-8 rounded-lg bg-[#161A23] border border-[#252B38] flex items-center justify-center text-[#6B7280] hover:text-white transition-colors disabled:opacity-30"
            disabled={week >= totalWeeks}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week date range */}
      <p className="text-xs text-[#6B7280] mb-5">
        {weekDates[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        {' – '}
        {weekDates[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      {/* Session cards */}
      <div className="space-y-2">
        {sessions.map((session, i) => {
          const done    = isComplete(session.date, session.discipline);
          const isToday = sameDay(session.date, today);
          const isPast  = session.date < today && !isToday;
          const color   = DISCIPLINE_COLOR[session.discipline];
          const dayLabel = session.date.toLocaleDateString('en', { weekday: 'short' });

          return (
            <button key={i} onClick={() => setSelected({ session, date: session.date })}
              className={`w-full text-left bg-[#161A23] border rounded-2xl p-4 transition-all hover:border-opacity-80
                ${isToday ? 'border-[#38BDF8]' : done ? 'border-[#4ADE80]/40' : 'border-[#252B38]'}`}>
              <div className="flex items-center gap-3">
                {/* Day pill */}
                <div className={`w-12 flex-shrink-0 rounded-lg py-2 text-center
                  ${isToday ? 'bg-[#38BDF8]/10' : 'bg-[#0D0F14]'}`}>
                  <p className={`text-[10px] uppercase tracking-wider font-medium
                    ${isToday ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#6B7280]'}`}>
                    {dayLabel}
                  </p>
                  <p className={`text-xs font-bold mt-0.5
                    ${isToday ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#9CA3AF]'}`}>
                    {session.date.getDate()}
                  </p>
                </div>

                {/* Discipline icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${color}22`, opacity: isPast && !done ? 0.5 : 1 }}>
                  {DISCIPLINE_ICON[session.discipline]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm truncate ${isPast && !done ? 'text-[#4B5563]' : 'text-white'}`}>
                      {session.name}
                    </p>
                    {session.secondary && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#252B38] text-[#6B7280] flex-shrink-0">
                        +{session.secondary}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5 truncate">{session.desc}</p>
                </div>

                {/* Status */}
                <div className="flex-shrink-0 ml-1">
                  {done ? (
                    <span className="text-[#4ADE80] text-lg">✓</span>
                  ) : isToday ? (
                    <span className="text-xs font-medium text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-1 rounded-lg">Today</span>
                  ) : isPast ? (
                    <span className="text-xs text-[#4B5563]">Missed</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#252B38] block" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {selected && (
        <SessionModal
          session={selected.session}
          date={selected.date}
          activities={activities}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
