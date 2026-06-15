import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { daysToRace, currentWeek, getPlanConfig, getWeekDates, RACE_CONFIG, formatPace, formatDuration, calcSwim, calcBike, calcRun } from '../utils/raceConfig';
import { LogOut } from 'lucide-react';

const DISCIPLINE_COLOR = { swim: '#38BDF8', bike: '#F97316', run: '#4ADE80', gym: '#A78BFA', brick: '#FB923C' };
const DISCIPLINE_ICON  = { swim: '🏊', bike: '🚴', run: '🏃', gym: '💪', brick: '⚡' };

const WEEK_PLAN = [
  { day: 'Mon', disciplines: ['swim', 'rest'], label: 'Quality Swim' },
  { day: 'Tue', disciplines: ['run'],          label: 'Speed Intervals' },
  { day: 'Wed', disciplines: ['run', 'gym'],   label: 'Easy Run + Gym' },
  { day: 'Thu', disciplines: ['brick'],        label: 'Brick Session' },
  { day: 'Fri', disciplines: ['swim', 'gym'],  label: 'Swim Speed + Gym' },
  { day: 'Sat', disciplines: ['run', 'swim'],  label: 'Long Run + Swim' },
  { day: 'Sun', disciplines: ['bike'],         label: 'Long Bike' },
];

function RingChart({ value, max, color, size = 72 }) {
  const pct = Math.min(value / max, 1);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#252B38" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
}

export default function Dashboard() {
  const { user, activities, logout, setActivities } = useApp();

  const handleLogout = () => {
    if (window.confirm(`Log out and clear all data for "${user?.displayName}"?`)) {
      setActivities([]);
      logout();
    }
  };
  const navigate = useNavigate();
  const days = daysToRace();
  const week = currentWeek();
  const { totalWeeks } = getPlanConfig();
  const today = new Date();

  // This week's actual dates (plan-relative, not calendar Mon-Sun)
  const weekDates = getWeekDates(week);
  const wkStart = new Date(weekDates[0]); wkStart.setHours(0,0,0,0);
  const wkEnd   = new Date(weekDates[6]); wkEnd.setHours(23,59,59,999);
  const thisWeekActs = activities.filter(a => {
    const d = new Date(a.start_date);
    return d >= wkStart && d <= wkEnd;
  });

  // Which slot index is today in the current week (0-6), -1 if not this week
  const planIdx = weekDates.findIndex(d => d.toDateString() === today.toDateString());

  // Completion counts per discipline this week
  const counts = { swim: 0, bike: 0, run: 0, gym: 0 };
  thisWeekActs.forEach(a => { if (counts[a.type] !== undefined) counts[a.type]++; });

  // Targets per week from plan
  const targets = { swim: 2, bike: 1, run: 3, gym: 2 };
  const totalTarget = Object.values(targets).reduce((s, v) => s + v, 0);
  const totalDone   = Object.values(counts).reduce((s, v) => s + v, 0);

  // Last activity
  const lastAct = activities[0];
  const getLastMetric = (a) => {
    if (!a) return null;
    if (a.type === 'swim') return calcSwim(a.distance_m, a.duration_s);
    if (a.type === 'bike') return calcBike(a.distance_m, a.duration_s);
    if (a.type === 'run')  return calcRun(a.distance_m, a.duration_s);
    return null;
  };
  const lastMetric = getLastMetric(lastAct);

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[#6B7280] text-sm">Hey, {user?.firstname} 👋</p>
          <h1 className="text-xl font-bold text-white mt-0.5">Week {week} of {totalWeeks}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#161A23] border border-[#252B38] rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-black font-mono text-[#38BDF8] leading-none">{days}</p>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">days to race</p>
          </div>
          <button onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-[#161A23] border border-[#252B38] flex items-center justify-center text-[#6B7280] hover:text-[#F87171] hover:border-[#F87171]/40 transition-colors"
            title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* 7-day strip */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-3">This Week</p>
        <div className="grid grid-cols-7 gap-1">
          {WEEK_PLAN.map((slot, i) => {
            const isToday = i === planIdx;
            const color = DISCIPLINE_COLOR[slot.disciplines[0]] || '#6B7280';
            const icon  = DISCIPLINE_ICON[slot.disciplines[0]] || '•';
            const done  = thisWeekActs.some(a => {
              const d = new Date(a.start_date);
              const dayOfWeek = d.getDay();
              const slotDay = (i + 1) % 7; // Mon=1 ... Sun=0
              return dayOfWeek === slotDay;
            });
            return (
              <div key={i}
                className={`flex flex-col items-center rounded-xl py-2 transition-all
                  ${isToday ? 'ring-2 ring-[#38BDF8] bg-[#38BDF8]/10' : ''}`}>
                <p className={`text-[10px] mb-1.5 ${isToday ? 'text-[#38BDF8] font-semibold' : 'text-[#6B7280]'}`}>
                  {slot.day}
                </p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm
                  ${done ? 'bg-[#252B38]' : 'bg-[#0D0F14]'}`}
                  style={done ? { boxShadow: `0 0 0 1.5px ${color}` } : {}}>
                  {done ? '✓' : icon}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion rings */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-[#6B7280]">Weekly Compliance</p>
          <span className="text-sm font-semibold text-white">{totalDone}/{totalTarget} sessions</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'swim', label: 'Swim', target: targets.swim },
            { key: 'bike', label: 'Bike', target: targets.bike },
            { key: 'run',  label: 'Run',  target: targets.run },
            { key: 'gym',  label: 'Gym',  target: targets.gym },
          ].map(({ key, label, target }) => (
            <div key={key} className="flex flex-col items-center">
              <div className="relative">
                <RingChart value={counts[key]} max={target} color={DISCIPLINE_COLOR[key]} size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{counts[key]}/{target}</span>
                </div>
              </div>
              <p className="text-[10px] text-[#6B7280] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Last activity */}
      {lastAct && (
        <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
          <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-3">Last Activity</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${DISCIPLINE_COLOR[lastAct.type]}22` }}>
              {DISCIPLINE_ICON[lastAct.type]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white capitalize">{lastAct.name || lastAct.type}</p>
              <p className="text-[#6B7280] text-xs">
                {new Date(lastAct.start_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                {' · '}
                {lastAct.distance_m >= 1000
                  ? `${(lastAct.distance_m / 1000).toFixed(1)} km`
                  : `${lastAct.distance_m} m`}
                {' · '}{formatDuration(lastAct.duration_s)}
              </p>
            </div>
            {lastMetric && (
              <div className="text-right">
                <p className={`text-sm font-bold ${lastMetric.onTrack ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                  {lastMetric.onTrack ? '✅ On Track' : '⚠️ Behind'}
                </p>
                <p className="text-[10px] text-[#6B7280]">vs target</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Race targets quick ref */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-3">Race Targets</p>
        <div className="space-y-2">
          {[
            { key: 'swim', label: 'Swim 1500m', target: '1:00:00', pace: '4:00/100m' },
            { key: 'bike', label: 'Bike 40km',  target: '2:05:00', pace: '19.2 km/h' },
            { key: 'run',  label: 'Run 10km',   target: '1:40:00', pace: '10:00/km' },
          ].map(({ key, label, target, pace }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DISCIPLINE_COLOR[key] }} />
                <span className="text-sm text-[#9CA3AF]">{label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-semibold text-white">{target}</span>
                <span className="text-xs text-[#6B7280] ml-2">{pace}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick log CTA */}
      {activities.length === 0 && (
        <button onClick={() => navigate('/log')}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-[#252B38] text-[#6B7280] hover:border-[#38BDF8] hover:text-[#38BDF8] transition-all text-sm">
          + Log your first session
        </button>
      )}
    </div>
  );
}
