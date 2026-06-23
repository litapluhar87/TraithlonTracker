import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatPace, formatDuration, calcSwim, calcBike, calcRun, RACE_CONFIG } from '../utils/raceConfig';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';

const TABS = [
  { key: 'swim', label: 'Swim', color: '#38BDF8', icon: '🏊' },
  { key: 'bike', label: 'Bike', color: '#F97316', icon: '🚴' },
  { key: 'run',  label: 'Run',  color: '#4ADE80', icon: '🏃' },
];

const METRICS = [
  { key: 'pace',         label: 'Pace / Speed' },
  { key: 'volume',       label: 'Volume' },
  { key: 'extrapolated', label: 'Extrapolated' },
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
  const [metric, setMetric] = useState('pace');     // pace | volume | extrapolated
  const [chartType, setChartType] = useState('line'); // bar | line
  const activeTab = TABS.find(t => t.key === tab);

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
  const distLabel = tab === 'swim' ? 'm' : 'km';

  const formatPaceDisplay = (v) => {
    if (!v) return '--';
    if (tab === 'bike') return `${v.toFixed(1)}`;
    return formatPace(v);
  };

  // ── Chart data per metric ──────────────────────────────────────────────────
  const volumeData = sessions.map(s => ({
    name: s.label,
    value: parseFloat(s.dist_display.toFixed(1)),
  }));

  const paceData = sessions.map(s => ({
    name: s.label,
    value: tab === 'bike'
      ? (s.pace ? parseFloat(s.pace.toFixed(1)) : null)
      : (s.pace ? parseFloat((s.pace / 60).toFixed(2)) : null),
  })).filter(d => d.value !== null);

  // Extrapolated race time in minutes (easier to read on axis than raw seconds)
  const extrapData = sessions.map(s => ({
    name: s.label,
    value: s.extrapolated_s ? parseFloat((s.extrapolated_s / 60).toFixed(1)) : null,
    onTrack: s.onTrack,
  })).filter(d => d.value !== null);

  const targetPaceValue = tab === 'bike' ? config.target_speed_kmh : config.target_pace_s / 60;
  const targetExtrapValue = config.target_s / 60; // target race time in minutes

  // Pick active dataset + reference line value + unit label based on metric
  let chartData, refLineValue, unitLabel, valueColor;
  if (metric === 'volume') {
    chartData = volumeData; refLineValue = null; unitLabel = distLabel; valueColor = color;
  } else if (metric === 'extrapolated') {
    chartData = extrapData; refLineValue = targetExtrapValue; unitLabel = 'min'; valueColor = color;
  } else {
    chartData = paceData; refLineValue = targetPaceValue; unitLabel = paceLabel; valueColor = color;
  }

  // Y domain — always include reference line + data with padding
  const yDomain = useMemo(() => {
    const vals = chartData.map(d => d.value).filter(v => v !== null);
    if (refLineValue !== null) vals.push(refLineValue);
    if (!vals.length) return undefined;
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 1;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData, refLineValue]);

  const reverseAxis = metric === 'pace' && tab !== 'bike'; // lower pace = better, show improvement going up
  // For extrapolated time, lower is also better — reverse too, except keep simple: reverse for both pace and extrapolated except bike speed
  const shouldReverse = (metric === 'pace' || metric === 'extrapolated') && tab !== 'bike';

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Progress</h1>

      {/* Discipline tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${tab === t.key ? 'text-[#0D0F14]' : 'border-[#252B38] bg-[#161A23] text-[#6B7280] hover:text-[#9CA3AF]'}`}
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
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Sessions" value={sessions.length}
              sub={`${totalDist.toFixed(1)} ${distLabel} total`} color={color} />
            <StatCard label={tab === 'bike' ? 'Avg Speed' : 'Avg Pace'}
              value={formatPaceDisplay(avgPace)} sub={paceLabel} color={color} />
            <StatCard label={tab === 'bike' ? 'Best Speed' : 'Best Pace'}
              value={formatPaceDisplay(best)}
              sub={lastOnTrack === true ? '✅ On track' : lastOnTrack === false ? '⚠️ Behind' : ''}
              color={lastOnTrack === true ? '#4ADE80' : lastOnTrack === false ? '#F87171' : color} />
          </div>

          {/* Metric selector: Pace/Speed | Volume | Extrapolated */}
          <div className="flex gap-2 mb-3">
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all
                  ${metric === m.key
                    ? 'border-[#38BDF8]/40 text-[#38BDF8] bg-[#38BDF8]/10'
                    : 'border-[#252B38] text-[#6B7280] hover:text-white'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart type toggle: bar | line */}
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <button onClick={() => setChartType('bar')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${chartType === 'bar' ? 'bg-[#252B38] text-white' : 'text-[#4B5563] hover:text-[#9CA3AF]'}`}>
              <BarChart3 size={15} />
            </button>
            <button onClick={() => setChartType('line')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${chartType === 'line' ? 'bg-[#252B38] text-white' : 'text-[#4B5563] hover:text-[#9CA3AF]'}`}>
              <LineIcon size={15} />
            </button>
          </div>

          {/* Main chart card */}
          <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-[#6B7280]">
                {METRICS.find(m => m.key === metric)?.label}
                {metric === 'extrapolated' && ` · ${tab === 'swim' ? '1500m' : tab === 'bike' ? '40km' : '10km'}`}
              </p>
              {metric === 'extrapolated' && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-[#F87171] opacity-70" />
                  <p className="text-[10px] text-[#6B7280]">Target {formatDuration(targetExtrapValue * 60)}</p>
                </div>
              )}
              {metric === 'pace' && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-[#F87171] opacity-70" />
                  <p className="text-[10px] text-[#6B7280]">Target</p>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={200}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252B38" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={metric === 'volume' ? undefined : yDomain}
                    reversed={metric === 'volume' ? false : shouldReverse} />
                  <Tooltip content={<CustomTooltip unit={unitLabel} />} />
                  {refLineValue !== null && metric !== 'volume' && (
                    <ReferenceLine y={refLineValue} stroke="#F87171" strokeDasharray="4 4" strokeOpacity={0.8} strokeWidth={1.5} />
                  )}
                  <Bar dataKey="value" fill={valueColor} radius={[4,4,0,0]} fillOpacity={0.85} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252B38" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={metric === 'volume' ? undefined : yDomain}
                    reversed={metric === 'volume' ? false : shouldReverse} />
                  <Tooltip content={<CustomTooltip unit={unitLabel} />} />
                  {refLineValue !== null && metric !== 'volume' && (
                    <ReferenceLine y={refLineValue} stroke="#F87171" strokeDasharray="4 4" strokeOpacity={0.8} strokeWidth={1.5} />
                  )}
                  <Line type="monotone" dataKey="value" stroke={valueColor}
                    strokeWidth={2.5} dot={{ fill: valueColor, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

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
                      {s.onTrack ? '✅ on track' : '⚠️ behind'} · {formatDuration(s.extrapolated_s)}
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
