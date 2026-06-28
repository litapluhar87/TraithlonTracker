import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { Gauge, Pencil, Ruler } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { formatPace, formatDuration, calcSwim, calcBike, calcRun, RACE_CONFIG } from '../utils/raceConfig';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';
import { Sparkles, ChevronDown } from 'lucide-react';

const TABS = [
  { key: 'swim', label: 'Swim', color: '#0284C7', icon: '🏊' },
  { key: 'bike', label: 'Bike', color: '#EA580C', icon: '🚴' },
  { key: 'run',  label: 'Run',  color: '#16A34A', icon: '🏃' },
];

const PACE_MODES = [
  { key: 'actual',       label: 'Actual' },
  { key: 'extrapolated', label: 'Extrapolated' },
];

function CustomTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#FFFCF4] border border-[#E6D8BF] rounded-xl px-3 py-2 text-xs shadow-sm">
      <p className="text-[#7A6B5B] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-semibold">
          {formatValue ? formatValue(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-xl p-4">
      <p className="text-[10px] text-[#7A6B5B] uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold font-mono mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#7A6B5B] mt-0.5">{sub}</p>}
    </div>
  );
}

function EditSessionModal({ session, onClose, onSaved }) {
  const [type, setType] = useState(session.type);
  const [distance, setDistance] = useState(
    session.type === 'swim' ? session.distance_m : session.distance_m / 1000
  );
  const [duration, setDuration] = useState(formatDuration(session.duration_s));
  const [date, setDate] = useState(session.start_date.split('T')[0]);
  const [saving, setSaving] = useState(false);

  const DISCIPLINES = ['swim', 'bike', 'run'];
  const DISCIPLINE_ICON = { swim: '🏊', bike: '🚴', run: '🏃' };

  const parseDur = (str) => {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const distance_m = type === 'swim' ? parseFloat(distance) : parseFloat(distance) * 1000;
      const duration_s = parseDur(duration);
      const updated = await api.updateActivity(session.id, {
        type, distance_m, duration_s, start_date: date,
      });
      onSaved(updated.activity);
      onClose();
    } catch (e) {
      alert('Failed to update session.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#201A14]/50" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#FFFCF4] rounded-t-3xl p-6 pb-8 border-t border-[#E6D8BF] shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[#D7C4A5] rounded-full mx-auto mb-5" />
        <h3 className="font-bold text-[#201A14] text-lg mb-4">Edit Session</h3>

        <label className="block text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">Discipline</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {DISCIPLINES.map(d => (
            <button key={d} onClick={() => setType(d)}
              className={`py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5
                ${type === d ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7]' : 'border-[#E6D8BF] text-[#7A6B5B]'}`}>
              {DISCIPLINE_ICON[d]} <span className="capitalize">{d}</span>
            </button>
          ))}
        </div>

        <label className="block text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">
          Distance ({type === 'swim' ? 'm' : 'km'})
        </label>
        <input type="number" value={distance} onChange={e => setDistance(e.target.value)}
          className="w-full bg-[#FFF8EA] border border-[#E6D8BF] rounded-xl px-4 py-3 text-[#201A14] font-mono mb-4" />

        <label className="block text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">Duration (hh:mm:ss)</label>
        <input type="text" value={duration} onChange={e => setDuration(e.target.value)}
          placeholder="0:45:30"
          className="w-full bg-[#FFF8EA] border border-[#E6D8BF] rounded-xl px-4 py-3 text-[#201A14] font-mono mb-4" />

        <label className="block text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-[#FFF8EA] border border-[#E6D8BF] rounded-xl px-4 py-3 text-[#201A14] font-mono mb-5" />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#EFE2CB] text-[#201A14] text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#0284C7] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Progress() {
  const { activities, setActivities } = useApp();
  const [editingSession, setEditingSession] = useState(null);
  const [tab, setTab] = useState('swim');
  const [metric, setMetric] = useState('pace');       // pace | distance
  const [paceMode, setPaceMode] = useState('actual'); // actual | extrapolated (only relevant when metric === 'pace')
  const [chartType, setChartType] = useState('line'); // bar | line
  const [expandedId, setExpandedId] = useState(null);
  const activeTab = TABS.find(t => t.key === tab);

  const overviewData = useMemo(() => {
    const capScore = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));

    const calcByType = {
      swim: calcSwim,
      bike: calcBike,
      run: calcRun,
    };

    const scoredSessions = activities
      .filter(a => calcByType[a.type])
      .map(a => {
        const metrics = calcByType[a.type](a.distance_m, a.duration_s);
        return { ...a, metrics };
      })
      .filter(a => a.metrics);

    const bestFor = (type) => {
      const typeSessions = scoredSessions.filter(a => a.type === type);
      if (!typeSessions.length) return 0;

      const config = RACE_CONFIG[type];
      if (type === 'bike') {
        const bestSpeed = Math.max(...typeSessions.map(a => a.metrics.speed_kmh || 0));
        return capScore((bestSpeed / config.target_speed_kmh) * 100);
      }

      const paces = typeSessions.map(a => a.metrics.pace_s).filter(Boolean);
      if (!paces.length) return 0;
      const bestPace = Math.min(...paces);
      return capScore((config.target_pace_s / bestPace) * 100);
    };

    return [
      { metric: 'Swim Pace', score: bestFor('swim') },
      { metric: 'Bike Speed', score: bestFor('bike') },
      { metric: 'Run Pace', score: bestFor('run') },
    ];
  }, [activities]);

  const sessionsRaw = useMemo(() =>
    activities
      .filter(a => a.type === tab)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [activities, tab]
  );

  const sessions = useMemo(() => sessionsRaw.map(a => {
    let pace = null, extrapolated_s = null, onTrack = false;
    if (tab === 'swim') {
      const m = calcSwim(a.distance_m, a.duration_s);
      pace = m?.pace_s; extrapolated_s = m?.extrapolated_s; onTrack = m?.onTrack;
    } else if (tab === 'bike') {
      const m = calcBike(a.distance_m, a.duration_s);
      pace = m?.speed_kmh; extrapolated_s = m?.extrapolated_s; onTrack = m?.onTrack;
    } else if (tab === 'run') {
      const m = calcRun(a.distance_m, a.duration_s);
      pace = m?.pace_s; extrapolated_s = m?.extrapolated_s; onTrack = m?.onTrack;
    }
    return {
      ...a,
      dist_display: tab === 'swim' ? a.distance_m : (a.distance_m / 1000),
      pace, extrapolated_s, onTrack,
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
  const paceWord = tab === 'bike' ? 'Speed' : 'Pace';
  const distLabel = tab === 'swim' ? 'm' : 'km';

  const formatPaceDisplay = (v) => {
    if (!v) return '--';
    if (tab === 'bike') return `${v.toFixed(1)}`;
    return formatPace(v);
  };

  const formatChartValue = (v) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
    const value = Number(v);

    if (metric === 'pace' && paceMode === 'actual') {
      return value.toFixed(1);
    }

    if (metric === 'pace' && paceMode === 'extrapolated') {
      const totalMinutes = Math.round(value);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

    if (tab === 'swim') {
      return `${Math.round(value)}`;
    }

    return value.toFixed(1);
  };

  // ── Chart data per metric ──────────────────────────────────────────────────
  const distanceData = sessions.map(s => ({
    name: s.label,
    value: parseFloat(s.dist_display.toFixed(1)),
  }));

  const actualPaceData = sessions.map(s => ({
    name: s.label,
    value: tab === 'bike'
      ? (s.pace ? Math.round(s.pace * 10) / 10 : null)
      : (s.pace ? Math.round((s.pace / 60) * 100) / 100 : null),
  })).filter(d => d.value !== null);

  const extrapPaceData = sessions.map(s => ({
    name: s.label,
    value: s.extrapolated_s ? Math.round((s.extrapolated_s / 60) * 10) / 10 : null,
  })).filter(d => d.value !== null);

  const targetPaceValue = tab === 'bike' ? config.target_speed_kmh : config.target_pace_s / 60;
  const bestPaceValue = tab === 'bike'
    ? (config.distance_m / 1000) / (config.best_s / 3600)
    : config.best_s / config.distance_m * (tab === 'swim' ? 100 : 1000) / 60;

  const targetExtrapValue = config.target_s / 60;
  const bestExtrapValue = config.best_s / 60;

  // Pick dataset + reference lines based on metric + paceMode
  let chartData, refLineValue, bestLineValue;
  if (metric === 'distance') {
    chartData = distanceData; refLineValue = null; bestLineValue = null;
  } else if (paceMode === 'extrapolated') {
    chartData = extrapPaceData; refLineValue = targetExtrapValue; bestLineValue = bestExtrapValue;
  } else {
    chartData = actualPaceData; refLineValue = targetPaceValue; bestLineValue = bestPaceValue;
  }

  const valueColor = color;
  
  const yDomain = useMemo(() => {
    const vals = chartData.map(d => d.value).filter(v => v !== null);
    if (refLineValue !== null) vals.push(refLineValue);
    if (bestLineValue !== null) vals.push(bestLineValue);
    if (!vals.length) return undefined;
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 1;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData, refLineValue]);

  const reverseAxis = metric === 'pace' && tab !== 'bike'; // lower pace = better, show improvement going up
  // For extrapolated time, lower is also better — reverse too, except keep simple: reverse for both pace and extrapolated except bike speed
  const shouldReverse = metric === 'pace' && tab !== 'bike';

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#201A14] mb-6">Progress</h1>

      {/* Overview */}
      <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-[#7A6B5B]">Overview</p>
          <p className="text-[10px] text-[#7A6B5B]">% of target achieved</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={overviewData} outerRadius={78}>
            <PolarGrid stroke="#E6D8BF" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#7A6B5B', fontSize: 11 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#7A6B5B', fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Radar
              dataKey="score"
              stroke="#0284C7"
              fill="#0284C7"
              fillOpacity={0.18}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip formatValue={(v) => `${Math.round(Number(v) || 0)}%`} />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Discipline tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${tab === t.key ? 'text-white' : 'border-[#E6D8BF] bg-[#FFFCF4] text-[#7A6B5B] hover:text-[#4F463B]'}`}
            style={tab === t.key ? { backgroundColor: t.color, borderColor: t.color } : {}}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">{activeTab.icon}</p>
          <p className="text-[#7A6B5B] text-sm">No {tab} sessions logged yet.</p>
          <p className="text-[#9A8A76] text-xs mt-1">Log your first session to see charts.</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Sessions" value={sessions.length}
              sub={`${totalDist.toFixed(1)} ${distLabel} total`} color={color} />
            <StatCard label={tab === 'bike' ? 'Avg Speed' : 'Avg Pace'}
              value={formatPaceDisplay(avgPace)} sub={paceLabel} color={color} />
            <StatCard label={tab === 'bike' ? 'Best Speed' : 'Best Pace'}
              value={formatPaceDisplay(best)}
              sub={lastOnTrack === true ? '✅ On track' : lastOnTrack === false ? '⚠️ Behind' : ''}
              color={lastOnTrack === true ? '#16A34A' : lastOnTrack === false ? '#F87171' : color} />
          </div>

          {/* Metric selector */}
          <div className="mb-3 rounded-2xl border border-[#E6D8BF] bg-[#FFFCF4] p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMetric('pace')}
                className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${metric === 'pace'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-[#7A6B5B] hover:bg-[#FFF8EA] hover:text-[#201A14]'}`}>
                <Gauge size={16} />
                <span>{paceWord}</span>
              </button>
              <button onClick={() => setMetric('distance')}
                className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${metric === 'distance'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-[#7A6B5B] hover:bg-[#FFF8EA] hover:text-[#201A14]'}`}>
                <Ruler size={16} />
                <span>Distance</span>
              </button>
            </div>

            {metric === 'pace' && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#FFF8EA] border border-[#E6D8BF] px-2 py-2">
                <span className="pl-2 text-[11px] font-semibold uppercase tracking-widest text-[#7A6B5B]">
                  View
                </span>
                <div className="flex rounded-lg bg-[#EFE2CB] p-1">
                  {PACE_MODES.map(m => (
                    <button key={m.key} onClick={() => setPaceMode(m.key)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all
                        ${paceMode === m.key
                          ? 'bg-[#FFFCF4] text-[#201A14] shadow-sm'
                          : 'text-[#7A6B5B] hover:text-[#201A14]'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart type toggle: bar | line */}
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <button onClick={() => setChartType('bar')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${chartType === 'bar' ? 'bg-[#EFE2CB] text-[#201A14]' : 'text-[#9A8A76] hover:text-[#4F463B]'}`}>
              <BarChart3 size={15} />
            </button>
            <button onClick={() => setChartType('line')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${chartType === 'line' ? 'bg-[#EFE2CB] text-[#201A14]' : 'text-[#9A8A76] hover:text-[#4F463B]'}`}>
              <LineIcon size={15} />
            </button>
          </div>

          {/* Main chart card */}
          <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-4 mb-4">
			<div className="flex items-center justify-between mb-4">
			  <p className="text-xs uppercase tracking-widest text-[#7A6B5B]">
				{metric === 'distance' ? 'Distance' : `${paceWord} · ${paceMode === 'extrapolated' ? 'Extrapolated' : 'Actual'}`}
				{metric === 'pace' && paceMode === 'extrapolated' && ` (${tab === 'swim' ? '1500m' : tab === 'bike' ? '40km' : '10km'})`}
			  </p>
			  {metric === 'pace' && (
				<div className="flex items-center gap-3">
				  <div className="flex items-center gap-1.5">
					<div className="w-3 h-0.5 bg-[#F87171] opacity-70" />
					<p className="text-[10px] text-[#7A6B5B]">
					  Target {paceMode === 'extrapolated' ? formatDuration(targetExtrapValue * 60) : formatPaceDisplay(targetPaceValue * (tab === 'bike' ? 1 : 60))}
					</p>
				  </div>
				  <div className="flex items-center gap-1.5">
					<div className="w-3 h-0.5 bg-[#16A34A] opacity-70" />
					<p className="text-[10px] text-[#7A6B5B]">
					  Best {paceMode === 'extrapolated' ? formatDuration(bestExtrapValue * 60) : formatPaceDisplay(bestPaceValue * (tab === 'bike' ? 1 : 60))}
					</p>
				  </div>
				</div>
			  )}
			</div>

            <ResponsiveContainer width="100%" height={200}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6D8BF" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#7A6B5B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7A6B5B', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={metric === 'distance' ? undefined : yDomain}
                    reversed={metric === 'distance' ? false : shouldReverse} 
					tickFormatter={formatChartValue} />
                  <Tooltip content={<CustomTooltip formatValue={formatChartValue} />} />
                  {refLineValue !== null && metric === 'pace' && (
					<ReferenceLine y={refLineValue} stroke="#F87171" strokeDasharray="4 4" strokeOpacity={0.8} strokeWidth={1.5} />
				  )}
				  {bestLineValue !== null && metric === 'pace' && (
				    <ReferenceLine y={bestLineValue} stroke="#16A34A" strokeDasharray="2 2" strokeOpacity={0.7} strokeWidth={1.5} />
				  )}
                  <Bar dataKey="value" fill={valueColor} radius={[4,4,0,0]} fillOpacity={0.85} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6D8BF" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#7A6B5B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7A6B5B', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={metric === 'distance' ? undefined : yDomain}
                    reversed={metric === 'distance' ? false : shouldReverse} 
					tickFormatter={formatChartValue} />
                  <Tooltip content={<CustomTooltip formatValue={formatChartValue} />} />
                  {refLineValue !== null && metric === 'pace' && (
					<ReferenceLine y={refLineValue} stroke="#F87171" strokeDasharray="4 4" strokeOpacity={0.8} strokeWidth={1.5} />
				  )}
				  {bestLineValue !== null && metric === 'pace' && (
				    <ReferenceLine y={bestLineValue} stroke="#16A34A" strokeDasharray="2 2" strokeOpacity={0.7} strokeWidth={1.5} />
				  )}
                  <Line type="monotone" dataKey="value" stroke={valueColor}
                    strokeWidth={2.5} dot={{ fill: valueColor, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Session history */}
          <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-[#7A6B5B] mb-3">Session History</p>
            <div className="space-y-3">
			  {[...sessions].reverse().map((s, i) => (
			    <div key={i} className="border-b border-[#E6D8BF] last:border-0">
				  <button
				    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
				    className="w-full flex items-center justify-between py-2 text-left"
				  >
				    <div>
					  <div className="flex items-center gap-1.5">
					    <p className="text-sm text-[#201A14]">{s.label}</p>
					    {s.ai_summary && (
						  <Sparkles size={11} className="text-[#0284C7] opacity-70" />
					    )}
					  </div>
					  <p className="text-xs text-[#7A6B5B]">
					    {s.dist_display.toFixed(1)} {distLabel} · {formatDuration(s.duration_s)}
					  </p>
				    </div>
				    <div className="flex items-center gap-2">
					  <div className="text-right">
					    <p className="text-sm font-mono font-semibold" style={{ color }}>
						  {formatPaceDisplay(s.pace)} <span className="text-xs text-[#7A6B5B]">{paceLabel}</span>
					    </p>
					    <p className={`text-xs ${s.onTrack ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
						  {s.onTrack ? '✅ on track' : '⚠️ behind'} · {formatDuration(s.extrapolated_s)}
					    </p>
					  </div>
					  {s.ai_summary && (
					    <ChevronDown
						  size={14}
						  className={`text-[#7A6B5B] transition-transform ${expandedId === s.id ? 'rotate-180' : ''}`}
					    />
					  )}
					  <button
					    onClick={(e) => {
						  e.stopPropagation();
						  setEditingSession(s);
					    }}
					    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9C8B73] hover:text-[#0284C7] hover:bg-[#0284C7]/10 transition-colors"
					  >
					    <Pencil size={13} />
					  </button>
				    </div>
				  </button>

				  {expandedId === s.id && s.ai_summary && (
				    <div className="bg-[#FAF3E7] border border-[#E6D8BF] rounded-xl p-3 mb-3 -mt-1">
					  <div className="flex items-center gap-1.5 mb-1.5">
					    <Sparkles size={11} className="text-[#0284C7]" />
					    <p className="text-[10px] uppercase tracking-wider text-[#0284C7]">AI Insight</p>
					  </div>
					  <p className="text-xs text-[#5C4F3F] leading-relaxed">{s.ai_summary}</p>
				    </div>
				  )}
			    </div>
			  ))}
            </div>
          </div>
        </>
      )}
	  {editingSession && (
		<EditSessionModal
		  session={editingSession}
		  onClose={() => setEditingSession(null)}
		  onSaved={(updated) => {
			setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
		  }}
		/>
	  )}
    </div>
  );
}
