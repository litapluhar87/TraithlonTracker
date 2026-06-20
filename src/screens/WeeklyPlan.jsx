import { useState } from 'react';
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

const DISCIPLINE_DEFAULTS = {
  swim:  { name: 'Swim Session',  desc: 'Focus on stroke efficiency, drills and race-pace intervals.' },
  bike:  { name: 'Bike Session',  desc: 'Steady aerobic pace. Keep HR in Zone 2.' },
  run:   { name: 'Run Session',   desc: 'Easy conversational pace or speed intervals per plan.' },
  gym:   { name: 'Gym Session',   desc: 'Strength and conditioning session.' },
  brick: { name: 'Brick Session', desc: 'Bike immediately followed by run. Practice transition.' },
  rest:  { name: 'Rest Day',      desc: '' },
};

const DEFAULT_SESSIONS = [
  { offset: 0, discipline: 'swim',  name: 'Quality Swim',        desc: 'Drills + race-pace intervals. Focus on stroke efficiency.' },
  { offset: 1, discipline: 'run',   name: 'Speed Intervals',     desc: '15min warmup + 6–8×800m or 5×1km at 5K pace.' },
  { offset: 2, discipline: 'run',   name: 'Easy Run + Gym',      desc: '45min easy conversational pace + lower body gym.', secondary: 'gym' },
  { offset: 3, discipline: 'brick', name: 'Brick Session',       desc: '45–60min bike immediately followed by 20–30min run.' },
  { offset: 4, discipline: 'swim',  name: 'Swim Speed + Gym',    desc: 'Speed intervals in water + full-body strength session.', secondary: 'gym' },
  { offset: 5, discipline: 'run',   name: 'Long Run + Recovery', desc: '21km easy (alt 14–16km) + 1hr easy recovery swim.', secondary: 'swim' },
  { offset: 6, discipline: 'bike',  name: 'Long Bike Ride',      desc: '2hr steady aerobic pace. Keep HR in Zone 2.' },
];

// ─── Edit Week Modal ──────────────────────────────────────────────────────────
function EditWeekModal({ sessions, weekNum, weekDates, onSave, onClose }) {
  const [rows, setRows] = useState(
    sessions.map(s => ({
      offset:     s.offset,
      discipline: s.discipline,
      customName: s.name !== (DISCIPLINE_DEFAULTS[s.discipline]?.name || '') ? s.name : '',
    }))
  );

  const updateRow = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: value };
      // Switching discipline resets to that discipline's default name
      if (field === 'discipline') {
        updated.customName = '';
      }
      return updated;
    }));
  };

  const handleSave = () => {
    rows.forEach(row => {
      const defaultName = DISCIPLINE_DEFAULTS[row.discipline]?.name || '';
      savePlanOverride(row.offset, weekNum, {
        discipline: row.discipline,
        name: row.customName.trim() || defaultName,
        customName: row.customName.trim(),
      });
    });
    onSave(); onClose();
  };

  const handleResetAll = () => {
    DEFAULT_SESSIONS.forEach(s => resetPlanOverride(s.offset));
    onSave(); onClose();
  };

  const hasAnyOverride = DEFAULT_SESSIONS.some(s => !!getPlanOverrides()[s.offset]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#161A23] rounded-t-3xl border-t border-[#252B38]"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header with buttons */}
        <div className="px-4 pt-4 pb-3 border-b border-[#252B38] sticky top-0 bg-[#161A23] z-10">
          <div className="w-10 h-1 bg-[#252B38] rounded-full mx-auto mb-3" />
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[#252B38] text-white text-xs font-medium">
              Cancel
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-white">Edit Plan</p>
              <p className="text-[10px] text-[#6B7280]">Week {weekNum} onwards</p>
            </div>
            {hasAnyOverride && (
              <button onClick={handleResetAll}
                className="px-3 py-1.5 rounded-lg bg-[#252B38] text-[#F87171] text-xs font-medium">
                Reset
              </button>
            )}
            <button onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#0D0F14] text-xs font-semibold">
              Save
            </button>
          </div>
          <p className="text-[10px] text-[#38BDF8] mt-2 text-center">
            Changes apply from Week {weekNum} onwards · earlier weeks unchanged
          </p>
        </div>

        {/* Scrollable rows — fixed height so footer is always visible */}
        <div style={{ height: '50vh', overflowY: 'auto' }} className="px-6">
          <div className="space-y-3 pb-2">
            {rows.map((row, i) => {
              const isRest = row.discipline === 'rest';
              return (
                <div key={i} className="bg-[#0D0F14] border border-[#252B38] rounded-2xl p-4">
                  {/* Day label */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                      style={{ backgroundColor: `${DISCIPLINE_COLOR[row.discipline]}22` }}>
                      {DISCIPLINE_ICON[row.discipline]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {weekDates[i].toLocaleDateString('en', { weekday: 'long' })}
                      </p>
                      <p className="text-[10px] text-[#6B7280]">
                        {weekDates[i].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  {/* Discipline pills */}
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {DISCIPLINES.map(d => (
                      <button key={d} onClick={() => updateRow(i, 'discipline', d)}
                        className={`py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1
                          ${row.discipline === d ? 'text-[#0D0F14]' : 'border-[#252B38] text-[#6B7280] hover:text-white'}`}
                        style={row.discipline === d
                          ? { backgroundColor: DISCIPLINE_COLOR[d], borderColor: DISCIPLINE_COLOR[d] }
                          : {}}>
                        {DISCIPLINE_ICON[d]}
                        <span className="capitalize">{d}</span>
                      </button>
                    ))}
                  </div>
                  {/* Optional custom name — defaults to discipline name if left blank */}
                  {!isRest && (
                    <input type="text" value={row.customName}
                      onChange={e => updateRow(i, 'customName', e.target.value)}
                      placeholder={DISCIPLINE_DEFAULTS[row.discipline]?.name || 'Session name'}
                      className="w-full bg-[#161A23] border border-[#252B38] rounded-lg px-3 py-2 text-white text-sm focus:border-[#38BDF8] transition-colors" />
                  )}
                  {!isRest && (
                    <p className="text-[10px] text-[#6B7280] mt-1.5 px-1">
                      {DISCIPLINE_DEFAULTS[row.discipline]?.desc}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom padding */}
        <div className="h-6" />
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ session, date, activities, onClose }) {
  const actForDay = activities.find(a =>
    sameDay(new Date(a.start_date), date) && a.type === session.discipline
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#161A23] rounded-t-3xl p-6 pb-8 border-t border-[#252B38]"
           onClick={e => e.stopPropagation()}>
        {/* X close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#252B38] flex items-center justify-center text-[#F87171] hover:bg-[#F87171]/20 transition-colors">
          ✕
        </button>
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
        {session.desc && session.discipline !== 'rest' && (
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
          <p className="text-[#6B7280] text-sm text-center py-4">
            {session.discipline === 'rest' ? 'Rest day — no session required' : 'Not logged yet'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WeeklyPlan() {
  const { activities } = useApp();
  const { totalWeeks } = getPlanConfig();
  const [week,        setWeek]        = useState(currentWeek());
  const [detail,      setDetail]      = useState(null);
  const [editingWeek, setEditingWeek] = useState(false);
  const [overrideVersion, setOverrideVersion] = useState(0);
  const today = new Date();
  const weekDates = getWeekDates(week);
  // Re-read overrides fresh every render — overrideVersion bump guarantees re-render
  const overrides = getPlanOverrides();

  const sessions = DEFAULT_SESSIONS.map((s, i) => {
    const resolved = resolveSession(s, week);
    const wasOverridden = resolved.discipline !== s.discipline; // discipline changed via Edit Plan
    const defaults = DISCIPLINE_DEFAULTS[resolved.discipline] || { name: '', desc: '' };
    return {
      ...resolved,
      // Only fall back to generic discipline name/desc when the discipline itself was changed.
      // Untouched days keep their curated plan name + description.
      name: wasOverridden ? ((resolved.customName && resolved.customName.trim()) || defaults.name) : resolved.name,
      desc: wasOverridden ? defaults.desc : resolved.desc,
      date: weekDates[i],
    };
  });

  const isComplete = (date, discipline) => {
    if (discipline === 'rest') return false;
    return activities.some(a => sameDay(new Date(a.start_date), date) && a.type === discipline);
  };

  const hasWeekOverride = DEFAULT_SESSIONS.some(
    s => !!overrides[s.offset] && week >= overrides[s.offset].fromWeek
  );

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

      {/* Date range + edit button */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-[#6B7280]">
          {weekDates[0].toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
          {' – '}
          {weekDates[6].toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </p>
        <button onClick={() => setEditingWeek(true)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
            ${hasWeekOverride
              ? 'border-[#38BDF8]/40 text-[#38BDF8] bg-[#38BDF8]/10'
              : 'border-[#252B38] text-[#6B7280] hover:text-white hover:border-[#374151]'}`}>
          <Pencil size={11} />
          {hasWeekOverride ? 'Edit Plan' : 'Edit Plan'}
        </button>
      </div>

      {/* Session cards */}
      <div className="space-y-2">
        {sessions.map((session, i) => {
          const done    = isComplete(session.date, session.discipline);
          const isToday = sameDay(session.date, today);
          const isPast  = session.date < today && !isToday;
          const isRest  = session.discipline === 'rest';
          const color   = DISCIPLINE_COLOR[session.discipline];

          return (
            <button key={i}
              onClick={() => !isRest && setDetail({ session, date: session.date })}
              className={`w-full text-left bg-[#161A23] border rounded-2xl p-4 transition-all
                ${isRest ? 'opacity-50 cursor-default' : 'hover:border-opacity-60'}
                ${isToday ? 'border-[#38BDF8]' : done ? 'border-[#4ADE80]/40' : 'border-[#252B38]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 flex-shrink-0 rounded-lg py-2 text-center
                  ${isToday ? 'bg-[#38BDF8]/10' : 'bg-[#0D0F14]'}`}>
                  <p className={`text-[10px] uppercase tracking-wider font-medium
                    ${isToday ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#6B7280]'}`}>
                    {session.date.toLocaleDateString('en', { weekday: 'short' })}
                  </p>
                  <p className={`text-xs font-bold mt-0.5
                    ${isToday ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#9CA3AF]'}`}>
                    {session.date.getDate()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${color}22`, opacity: isPast && !done && !isRest ? 0.5 : 1 }}>
                  {DISCIPLINE_ICON[session.discipline]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate
                    ${isPast && !done && !isRest ? 'text-[#4B5563]' : 'text-white'}`}>
                    {session.name}
                  </p>
                  {session.desc && !isRest && (
                    <p className="text-xs text-[#6B7280] mt-0.5 truncate">{session.desc}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {done ? (
                    <span className="text-[#4ADE80] text-lg">✓</span>
                  ) : isToday ? (
                    <span className="text-xs font-medium text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-1 rounded-lg">Today</span>
                  ) : isPast && !isRest ? (
                    <span className="text-xs text-[#4B5563]">Missed</span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {detail && (
        <DetailModal
          session={detail.session}
          date={detail.date}
          activities={activities}
          onClose={() => setDetail(null)}
        />
      )}

      {editingWeek && (
        <EditWeekModal
          sessions={sessions}
          weekNum={week}
          weekDates={weekDates}
          onSave={() => setOverrideVersion(v => v + 1)}
          onClose={() => setEditingWeek(false)}
        />
      )}
    </div>
  );
}
