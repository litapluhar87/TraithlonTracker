import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  currentWeek, getPlanConfig, getWeekDates, sameDay, formatDuration,
  getPlanOverrides, savePlanOverride, resetPlanOverride, resolveSession
} from '../utils/raceConfig';
import { ChevronLeft, ChevronRight, Pencil, RotateCcw } from 'lucide-react';

const DISCIPLINE_COLOR = {
  swim: '#38BDF8', bike: '#F97316', run: '#4ADE80',
  gym: '#A78BFA', brick: '#FB923C', rest: '#374151'
};
const DISCIPLINE_ICON = {
  swim: '🏊', bike: '🚴', run: '🏃',
  gym: '💪', brick: '⚡', rest: '😴'
};
const DISCIPLINES = ['swim', 'bike', 'run', 'gym', 'brick', 'rest'];

// Default weekly template — offsets 0-6 from plan start day
const DEFAULT_SESSIONS = [
  { offset: 0, discipline: 'swim',  name: 'Quality Swim',        desc: 'Drills + race-pace intervals. Focus on stroke efficiency.' },
  { offset: 1, discipline: 'run',   name: 'Speed Intervals',     desc: '15min warmup + 6–8×800m or 5×1km at 5K pace.' },
  { offset: 2, discipline: 'run',   name: 'Easy Run + Gym',      desc: '45min easy conversational pace + lower body gym.', secondary: 'gym' },
  { offset: 3, discipline: 'brick', name: 'Brick Session',       desc: '45–60min bike immediately followed by 20–30min run.' },
  { offset: 4, discipline: 'swim',  name: 'Swim Speed + Gym',    desc: 'Speed intervals in water + full-body strength session.', secondary: 'gym' },
  { offset: 5, discipline: 'run',   name: 'Long Run + Recovery', desc: '21km easy (alt 14–16km) + 1hr easy recovery swim.', secondary: 'swim' },
  { offset: 6, discipline: 'bike',  name: 'Long Bike Ride',      desc: '2hr steady aerobic pace. Keep HR in Zone 2.' },
];

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ session, weekNum, onSave, onClose }) {
  const [discipline, setDiscipline] = useState(session.discipline);
  const [name,       setName]       = useState(session.name);
  const [desc,       setDesc]       = useState(session.desc || '');

  const hasOverride = (() => {
    const ovs = getPlanOverrides();
    return !!ovs[session.offset];
  })();

  const handleSave = () => {
    savePlanOverride(session.offset, weekNum, { discipline, name, desc });
    onSave();
    onClose();
  };

  const handleReset = () => {
    resetPlanOverride(session.offset);
    onSave();
    onClose();
  };

  const inputClass = "w-full bg-[#0D0F14] border border-[#252B38] rounded-xl px-4 py-3 text-white text-sm focus:border-[#38BDF8] transition-colors";
  const labelClass = "block text-xs uppercase tracking-widest text-[#6B7280] mb-2";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-[#161A23] rounded-t-3xl p-6 pb-10 border-t border-[#252B38]"
           onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[#252B38] rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-lg">Edit Session</h3>
          {hasOverride && (
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#F87171] transition-colors">
              <RotateCcw size={12} />
              Reset to default
            </button>
          )}
        </div>

        <p className="text-xs text-[#6B7280] mb-5 bg-[#0D0F14] rounded-xl px-4 py-3">
          Changes apply from <span className="text-[#38BDF8]">Week {weekNum}</span> onwards.
          Earlier weeks are unchanged.
        </p>

        {/* Discipline picker */}
        <div className="mb-4">
          <label className={labelClass}>Discipline</label>
          <div className="grid grid-cols-3 gap-2">
            {DISCIPLINES.map(d => (
              <button key={d} onClick={() => {
                  setDiscipline(d);
                  if (d === 'rest') { setName('Rest Day'); setDesc(''); }
                }}
                className={`py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${discipline === d
                    ? 'text-[#0D0F14]'
                    : 'border-[#252B38] bg-[#0D0F14] text-[#6B7280] hover:text-white'}`}
                style={discipline === d
                  ? { backgroundColor: DISCIPLINE_COLOR[d], borderColor: DISCIPLINE_COLOR[d] }
                  : {}}>
                <span>{DISCIPLINE_ICON[d]}</span>
                <span className="capitalize">{d}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        {discipline !== 'rest' && (
          <div className="mb-4">
            <label className={labelClass}>Session Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Long Bike Ride"
              className={inputClass} />
          </div>
        )}

        {/* Description */}
        {discipline !== 'rest' && (
          <div className="mb-5">
            <label className={labelClass}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Session details, targets, notes…"
              rows={3}
              className={`${inputClass} resize-none`} />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#252B38] text-white text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-[#0D0F14] text-sm font-semibold bg-[#38BDF8] hover:bg-[#7DD3FC] transition-colors">
            Save from Week {weekNum}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal (tap session to view) ──────────────────────────────────────
function DetailModal({ session, date, activities, onClose }) {
  const actForDay = activities.find(a =>
    sameDay(new Date(a.start_date), date) && a.type === session.discipline
  );

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
              {date.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })}
            </p>
          </div>
        </div>
        {session.desc && (
          <p className="text-[#9CA3AF] text-sm mb-4 leading-relaxed">{session.desc}</p>
        )}
        {actForDay ? (
          <div className="bg-[#4ADE80]/10 border border-[#4ADE80]/30 rounded-xl p-4">
            <p className="text-[#4ADE80] font-semibold text-sm mb-1">✅ Completed</p>
            <p className="text-[#9CA3AF] text-sm">
              {actForDay.distance_m >= 1000
                ? `${(actForDay.distance_m / 1000).toFixed(1)} km`
                : actForDay.distance_m > 0 ? `${actForDay.distance_m} m` : ''}
              {actForDay.duration_s ? ` · ${formatDuration(actForDay.duration_s)}` : ''}
              {actForDay.notes ? ` · "${actForDay.notes}"` : ''}
            </p>
          </div>
        ) : (
          <div className="bg-[#252B38]/50 rounded-xl p-4 text-center">
            <p className="text-[#6B7280] text-sm">
              {session.discipline === 'rest' ? 'Rest day — no session required' : 'Not logged yet'}
            </p>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WeeklyPlan() {
  const { activities } = useApp();
  const { totalWeeks } = getPlanConfig();
  const [week,       setWeek]       = useState(currentWeek());
  const [detail,     setDetail]     = useState(null); // { session, date }
  const [editing,    setEditing]    = useState(null); // session being edited
  const [, forceUpdate]             = useState(0);    // trigger re-render after save
  const today = new Date();

  const weekDates = getWeekDates(week);

  // Resolve sessions with overrides applied
  const sessions = DEFAULT_SESSIONS.map((s, i) => ({
    ...resolveSession(s, week),
    date: weekDates[i],
  }));

  const isComplete = (date, discipline) => {
    if (discipline === 'rest') return false;
    return activities.some(a => sameDay(new Date(a.start_date), date) && a.type === discipline);
  };

  const overrides = getPlanOverrides();

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
          <span className="text-sm font-semibold text-white w-16 text-center">
            Week {week}/{totalWeeks}
          </span>
          <button onClick={() => setWeek(w => Math.min(totalWeeks, w + 1))}
            className="w-8 h-8 rounded-lg bg-[#161A23] border border-[#252B38] flex items-center justify-center text-[#6B7280] hover:text-white transition-colors disabled:opacity-30"
            disabled={week >= totalWeeks}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week date range */}
      <p className="text-xs text-[#6B7280] mb-5">
        {weekDates[0].toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
        {' – '}
        {weekDates[6].toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
      </p>

      {/* Session cards */}
      <div className="space-y-2">
        {sessions.map((session, i) => {
          const done    = isComplete(session.date, session.discipline);
          const isToday = sameDay(session.date, today);
          const isPast  = session.date < today && !isToday;
          const isRest  = session.discipline === 'rest';
          const color   = DISCIPLINE_COLOR[session.discipline];
          const hasOv   = !!overrides[session.offset] && week >= overrides[session.offset].fromWeek;

          return (
            <div key={i}
              className={`bg-[#161A23] border rounded-2xl p-4 transition-all
                ${isToday ? 'border-[#38BDF8]' : done ? 'border-[#4ADE80]/40' : isRest ? 'border-[#252B38] opacity-60' : 'border-[#252B38]'}`}>
              <div className="flex items-center gap-3">
                {/* Day pill */}
                <div className={`w-12 flex-shrink-0 rounded-lg py-2 text-center
                  ${isToday ? 'bg-[#38BDF8]/10' : 'bg-[#0D0F14]'}`}>
                  <p className={`text-[10px] uppercase tracking-wider font-medium
                    ${isToday ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#6B7280]'}`}>
                    {session.date.toLocaleDateString('en', { weekday:'short' })}
                  </p>
                  <p className={`text-xs font-bold mt-0.5
                    ${isToday ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#9CA3AF]'}`}>
                    {session.date.getDate()}
                  </p>
                </div>

                {/* Discipline icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${color}22`, opacity: isPast && !done && !isRest ? 0.5 : 1 }}>
                  {DISCIPLINE_ICON[session.discipline]}
                </div>

                {/* Info — tappable */}
                <button className="flex-1 min-w-0 text-left"
                  onClick={() => !isRest && setDetail({ session, date: session.date })}>
                  <div className="flex items-center gap-1.5">
                    <p className={`font-semibold text-sm truncate
                      ${isPast && !done && !isRest ? 'text-[#4B5563]' : 'text-white'}`}>
                      {session.name}
                    </p>
                    {hasOv && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] flex-shrink-0">
                        edited
                      </span>
                    )}
                  </div>
                  {session.desc && !isRest && (
                    <p className="text-xs text-[#6B7280] mt-0.5 truncate">{session.desc}</p>
                  )}
                </button>

                {/* Status + edit button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status */}
                  {done ? (
                    <span className="text-[#4ADE80] text-lg">✓</span>
                  ) : isToday ? (
                    <span className="text-xs font-medium text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-1 rounded-lg">Today</span>
                  ) : isPast && !isRest ? (
                    <span className="text-xs text-[#4B5563]">Missed</span>
                  ) : null}

                  {/* Edit button */}
                  <button
                    onClick={() => setEditing(session)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4B5563] hover:text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {detail && (
        <DetailModal
          session={detail.session}
          date={detail.date}
          activities={activities}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          session={editing}
          weekNum={week}
          onSave={() => forceUpdate(n => n + 1)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
