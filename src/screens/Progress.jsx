import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatPace, formatDuration, calcSwim, calcBike, calcRun, RACE_CONFIG } from '../utils/raceConfig';

const TABS = [
  { key: 'swim', label: 'Swim', color: '#38BDF8', icon: '🏊' },
  { key: 'bike', label: 'Bike', color: '#F97316', icon: '🚴' },
  { key: 'run',  label: 'Run',  color: '#4ADE80', icon: '🏃' },
];

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161A23] border border-[#252B38] rounded-xl px-3 py-2 text-xs">
      <p className="text-[#6B7280] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-semibold">
          {typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {unit}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#161A23] border border-[#252B38] rounded-xl p-4">
      <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold font-mono mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Progress() {
  const { activities } = useApp();
  const [tab, setTab] = useState('swim');
  const activeTab = TABS.find(t => t.key === tab);

  // Filter and compute metrics
  const sessionsRaw = useMemo(() =>
    activities
      .filter(a => a.type === tab)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [activities, tab]
  );

  const sessions = useMemo(() => sessionsRaw.map(a => {
    let pace = null, extrapolated = null, onTrack = false;
    if (tab === 'swim') {
      const m = calcSwim(a.distance_m, a.duration_s);
      pace = m?.pace_s; extrapolated = m?.extrapolated_s; onTrack = m?.onTrack;
    } else if (tab === 'bike') {
      const m = calcBike(a.distance_m, a.duration_s);
      pace = m?.speed_kmh; extrapolated = m?.extrapolated_s; onTrack = m?.onTrack;
    } else if (tab === 'run') {
      const m = calcRun(a.distance_m, a.duration_s);
      pace = m?.pace_s; extrapolated = m?.extrapolated_s; onTrack = m?.onTrack;
    }
    return {
      ...a,
      dist_display: tab === 'swim' ? a.distance_m : (a.distance_m / 1000),
      pace, extrapolated, onTrack,
      label: new Date(a.start_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
    };
  }), [sessionsRaw, tab]);

  const config = RACE_CONFIG[tab];
  const color = activeTab.color;

  // Stats
  const totalDist = sessions.reduce((s, a) => s + (tab === 'swim' ? a.distance_m : a.distance_m/1000), 0);
  const avgPace = sessions.length
    ? sessions.reduce((s, a) => s + (a.pace || 0), 0) / sessions.length
    : null;
  const best = sessions.length
    ? (tab === 'bike'
        ? Math.max(...sessions.map(a => a.pace || 0))
        : Math.min(...sessions.filter(a => a.pace).map(a => a.pace)))
    : null;
  const lastOnTrack = sessions.length ? sessions[sessions.length - 1]?.onTrack : null;

  const paceLabel = tab === 'swim' ? '/100m' : tab === 'bike' ? 'km/h' : '/km';
  const distLabel = tab === 'swim' ? 'm' : 'km';

  const formatPaceDisplay = (v) => {
    if (!v) return '--';
    if (tab === 'bike') return `${v.toFixed(1)}`;
    return formatPace(v);
  };

  // Chart: volume bars (distance per session)
  const volumeData = sessions.map(s => ({
    name: s.label,
    dist: parseFloat(s.dist_display.toFixed(1)),
  }));

  // Chart: pace trend line
  const paceData = sessions.map(s => ({
    name: s.label,
    pace: tab === 'bike' ? s.pace?.toFixed(1) : s.pace ? parseFloat((s.pace/60).toFixed(2)) : null,
  })).filter(d => d.pace !== null);

  // Target line on pace chart
  const targetPaceDisplay = tab === 'swim'
    ? (config.target_pace_s / 60).toFixed(2)
    : tab === 'bike'
    ? config.target_speed_kmh.toFixed(1)
    : (config.target_pace_s / 60).toFixed(2);

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Progress</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${tab === t.key
                ? 'text-[#0D0F14]'
                : 'border-[#252B38] bg-[#161A23] text-[#6B7280] hover:text-[#9CA3AF]'}`}
            style={tab === t.key ? { backgroundColor: t.color, borderColor: t.color } : {}}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">{activeTab.icon}</p>
          <p className="text-[#6B7280] text-sm">No {tab} sessions logged yet.</p>
          <p className="text-[#374151] text-xs mt-1">Log your first session to see charts.</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard
              label="Sessions"
              value={sessions.length}
              sub={`${totalDist.toFixed(1)} ${distLabel} total`}
              color={color}
            />
            <StatCard
              label={tab === 'bike' ? 'Avg Speed' : 'Avg Pace'}
              value={formatPaceDisplay(avgPace)}
              sub={paceLabel}
              color={color}
            />
            <StatCard
              label={tab === 'bike' ? 'Best Speed' : 'Best Pace'}
              value={formatPaceDisplay(best)}
              sub={lastOnTrack === true ? '✅ On track' : lastOnTrack === false ? '⚠️ Behind' : ''}
              color={lastOnTrack === true ? '#4ADE80' : lastOnTrack === false ? '#F87171' : color}
            />
          </div>

          {/* Volume chart */}
          <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
            <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-4">Distance per Session</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={volumeData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252B38" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unit={distLabel} />} />
                <Bar dataKey="dist" fill={color} radius={[4,4,0,0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pace trend chart */}
          {paceData.length >= 2 && (
            <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-widest text-[#6B7280]">
                  {tab === 'bike' ? 'Speed Trend' : 'Pace Trend'}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-[#F87171] opacity-60" />
                  <p className="text-[10px] text-[#6B7280]">Target</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={paceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252B38" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    reversed={tab !== 'bike'} />
                  <Tooltip content={<CustomTooltip unit={paceLabel} />} />
                  <ReferenceLine y={parseFloat(targetPaceDisplay)} stroke="#F87171" strokeDasharray="4 4" strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="pace" stroke={color}
                    strokeWidth={2.5} dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Session history */}
          <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-3">Session History</p>
            <div className="space-y-3">
              {[...sessions].reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#252B38] last:border-0">
                  <div>
                    <p className="text-sm text-white">{s.label}</p>
                    <p className="text-xs text-[#6B7280]">
                      {s.dist_display.toFixed(1)} {distLabel} · {formatDuration(s.duration_s)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold" style={{ color }}>
                      {formatPaceDisplay(s.pace)} <span className="text-xs text-[#6B7280]">{paceLabel}</span>
                    </p>
                    <p className={`text-xs ${s.onTrack ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                      {s.onTrack ? '✅ on track' : '⚠️ behind'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
