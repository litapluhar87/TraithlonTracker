import { useState, useEffect, useMemo } from 'react';
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
import { Sparkles, ChevronDown, Trash2 } from 'lucide-react';

const TABS = [
  { key: 'combined', label: 'Total', color: '#7C3AED', icon: '🏁' },
  { key: 'swim',     label: 'Swim',     color: '#0284C7', icon: '🏊' },
  { key: 'bike',     label: 'Bike',     color: '#EA580C', icon: '🚴' },
  { key: 'run',      label: 'Run',      color: '#16A34A', icon: '🏃' },
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
    <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-xl p-3">
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
        <div className="grid grid-cols-3 gap-2 mb-3">
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
  const { activities, setActivities, user } = useApp();
  const [editingSession, setEditingSession] = useState(null);
  const handleDelete = async (session) => {
    if (!window.confirm(`Delete this ${session.type} session from ${session.label}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteActivity(session.id);
      setActivities(prev => prev.filter(a => a.id !== session.id));
    } catch (e) {
      alert('Failed to delete session. Please try again.');
    }
  };
  const [tab, setTab] = useState('combined');
  const [metric, setMetric] = useState('pace');       // pace | distance
  const [paceMode, setPaceMode] = useState('actual'); // actual | extrapolated (only relevant when metric === 'pace')
  const [chartType, setChartType] = useState('line'); // bar | line
  const [expandedId, setExpandedId] = useState(null);
  const [overallExpanded, setOverallExpanded] = useState(false);
  const [disciplineExpanded, setDisciplineExpanded] = useState(false);
  const [radarMode, setRadarMode] = useState('target');    // target | ideal
  const [sessionFilter, setSessionFilter] = useState('all'); // all | last3 | top3 | avg
  const [combinedFilter, setCombinedFilter] = useState('last3');
  
  const [cumulativeSummaries, setCumulativeSummaries] = useState({});

  useEffect(() => {
    if (!user?.user_id) return;
    api.getAiSummaries(user.user_id)
      .then(res => {
        console.log('AI summaries response:', res);   // ADD THIS LINE
        setCumulativeSummaries(res.summaries || {});
      })
      .catch(err => console.error('Failed to load cumulative summaries:', err));
  }, [user?.user_id, activities.length]);

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
      const isBike = type === 'bike';

      // Filter sessions per combinedFilter
      let filtered;
      if (combinedFilter === 'last3') {
        filtered = [...typeSessions]
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
          .slice(0, 3);
      } else if (combinedFilter === 'top3') {
        filtered = [...typeSessions]
          .sort((a, b) => isBike
            ? (b.metrics.speed_kmh || 0) - (a.metrics.speed_kmh || 0)
            : (a.metrics.pace_s || Infinity) - (b.metrics.pace_s || Infinity))
          .slice(0, 3);
      } else {
        filtered = typeSessions;
      }
      if (!filtered.length) return 0;

      // Aggregate: 'all' & 'last3' → peak (best); 'top3' & 'avg' → average
      const useAvg = true;

      if (isBike) {
        const speeds = filtered.map(a => a.metrics.speed_kmh || 0).filter(v => v > 0);
        if (!speeds.length) return 0;
        const aggSpeed = useAvg
          ? speeds.reduce((s, v) => s + v, 0) / speeds.length
          : Math.max(...speeds);
        const benchmarkSpeed = radarMode === 'ideal'
          ? (config.distance_m / 1000) / (config.best_s / 3600)
          : config.target_speed_kmh;
        return capScore((aggSpeed / benchmarkSpeed) * 100);
      }

      const paces = filtered.map(a => a.metrics.pace_s).filter(Boolean);
      if (!paces.length) return 0;
      const aggPace = useAvg
        ? paces.reduce((s, v) => s + v, 0) / paces.length
        : Math.min(...paces);
      const benchmarkPace = radarMode === 'ideal'
        ? (type === 'swim'
            ? (config.best_s / config.distance_m) * 100
            : config.best_s / (config.distance_m / 1000))
        : config.target_pace_s;
      return capScore((benchmarkPace / aggPace) * 100);
    };

    return [
      { metric: 'Swim Pace', score: bestFor('swim') },
      { metric: 'Bike Speed', score: bestFor('bike') },
      { metric: 'Run Pace', score: bestFor('run') },
    ];
  }, [activities, radarMode, combinedFilter]);

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
  
  const combinedStats = useMemo(() => {
    if (tab !== 'combined') return null;

    const RACE_DISTANCES = { swim: 1500, bike: 40000, run: 10000 };
    const RACE_TARGETS_S = { swim: 3600, bike: 7500, run: 6000 };
    const RACE_BEST_S    = { swim: 3300, bike: 6300, run: 4800 };

    const getExtrapForDisc = (discipline) => {
      const disc_sessions = activities
        .filter(a => a.type === discipline && a.distance_m && a.duration_s)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

      if (!disc_sessions.length) return null;

      const raceDist = RACE_DISTANCES[discipline];

      // Calculate extrapolated time for each session
      const withExtrap = disc_sessions.map(a => ({
        ...a,
        extrap_s: (a.duration_s / a.distance_m) * raceDist,
      }));

      let filtered;
      if (combinedFilter === 'last3') {
        filtered = withExtrap.slice(0, 3); // already sorted newest first
      } else if (combinedFilter === 'top3') {
        filtered = [...withExtrap]
          .sort((a, b) => a.extrap_s - b.extrap_s) // fastest first
          .slice(0, 3);
      } else {
        filtered = withExtrap; // all
      }

      const avgExtrap = filtered.reduce((s, a) => s + a.extrap_s, 0) / filtered.length;
      const targetS   = RACE_TARGETS_S[discipline];
      const bestS     = RACE_BEST_S[discipline];
      const onTrack   = avgExtrap <= targetS;

      return {
        discipline,
        avgExtrap_s: avgExtrap,
        targetS,
        bestS,
        onTrack,
        sessionCount: filtered.length,
      };
    };

    const swim = getExtrapForDisc('swim');
    const bike = getExtrapForDisc('bike');
    const run  = getExtrapForDisc('run');

    const allAvailable = swim && bike && run;
    const totalExtrap_s = allAvailable ? swim.avgExtrap_s + bike.avgExtrap_s + run.avgExtrap_s : null;
    const totalTarget_s = 3600 + 7500 + 6000; // 5:45:00
    const totalBest_s   = 3300 + 6300 + 4800; // 4:40:00
    const totalOnTrack  = totalExtrap_s !== null ? totalExtrap_s <= totalTarget_s : null;

    return { swim, bike, run, totalExtrap_s, totalTarget_s, totalBest_s, totalOnTrack };
  }, [activities, tab, combinedFilter]);

  const config = RACE_CONFIG[tab] || {};
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
  const shouldReverse = metric === 'pace' && (paceMode === 'extrapolated' || tab !== 'bike');

  return (
    <div className="pb-24 px-4 pt-0 max-w-lg mx-auto">
 
      {/* Discipline tabs */}
	  {/* Discipline tabs — RACL style top nav */}
	  <div className="flex mb-4 bg-white border-b border-[#E6D8BF] -mx-4 px-0">
	    {TABS.map(t => (
		  <button
		    key={t.key}
		    onClick={() => { setTab(t.key); setDisciplineExpanded(false); }}
		    className="flex-1 flex flex-col items-center pt-1.5 pb-1 gap-0.5 transition-all"
		    style={{
			  borderTop:    tab === t.key ? `3px solid ${t.color}` : '3px solid transparent',
			  borderLeft:   tab === t.key ? '0.5px solid #E6D8BF'  : '0.5px solid transparent',
			  borderRight:  tab === t.key ? '0.5px solid #E6D8BF'  : '0.5px solid transparent',
			  borderBottom: tab === t.key ? '2px solid #FFFCF4'    : 'none',
			  background:   tab === t.key ? '#FFFCF4' : '#F5EFE3',
			  marginBottom: tab === t.key ? -1 : 0,
		    }}>
		    <span style={{ fontSize: 15, opacity: tab === t.key ? 1 : 0.4 }}>{t.icon}</span>
		    <span style={{
			  fontSize: 14,
			  fontWeight: tab === t.key ? 600 : 400,
			  color: tab === t.key ? t.color : '#aaa',
			  letterSpacing: 0.2,
		    }}>
			  {t.label}
		    </span>
		  </button>
	    ))}
	  </div>
	  
	  {cumulativeSummaries[tab] && (
	    <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-3 mb-3">
		  <button
		    onClick={() => setDisciplineExpanded(!disciplineExpanded)}
		    className="w-full flex items-center justify-between"
		  >
		    <div className="flex items-center gap-1.5">
			  <Sparkles size={12} className="text-[#0284C7]" />
			  <p className="text-[10px] uppercase tracking-wider text-[#0284C7]">
			    {TABS.find(t => t.key === tab)?.label} Progress Summary
			  </p>
		    </div>
		    <ChevronDown
			  size={13}
			  className={`text-[#0284C7] transition-transform ${disciplineExpanded ? 'rotate-180' : ''}`}
		    />
		  </button>
		  {disciplineExpanded && (
		    <p className="text-xs text-[#5C4F3F] leading-relaxed mt-2">
			  {cumulativeSummaries[tab]}
		    </p>
		  )}
	    </div>
	  )}
	  
	  {/* Combined Tab */}
	  {tab === 'combined' && (
	    <div>
		  {cumulativeSummaries.overall && (
			<div className="bg-[#FFFCF4] border-2 border-[#0284C7]/30 shadow-sm rounded-2xl p-3 mb-3">
			  <button
				onClick={() => setOverallExpanded(!overallExpanded)}
				className="w-full flex items-center justify-between"
			  >
				<div className="flex items-center gap-1.5">
				  <Sparkles size={13} className="text-[#0284C7]" />
				  <p className="text-[10px] uppercase tracking-wider text-[#0284C7] font-semibold">
					Overall Race Readiness
				  </p>
				</div>
				<ChevronDown
				  size={14}
				  className={`text-[#0284C7] transition-transform ${overallExpanded ? 'rotate-180' : ''}`}
				/>
			  </button>
			  {overallExpanded && (
				<p className="text-sm text-[#3D332A] leading-relaxed mt-3">
				  {cumulativeSummaries.overall}
				</p>
			  )}
			</div>
		  )}  
		  {/* Filter toggle */}
		  <div className="flex gap-2 mb-2">
		    {[
			  { key: 'last3',   label: 'Last 3' },
			  { key: 'top3',    label: 'Top 3' },
			  { key: 'average', label: 'Average' },
		    ].map(opt => (
			  <button key={opt.key} onClick={() => setCombinedFilter(opt.key)}
			    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors
				  ${combinedFilter === opt.key
				    ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
				    : 'border-[#E6D8BF] text-[#7A6B5B] bg-transparent'}`}>
			    {opt.label}
			  </button>
		    ))}
		  </div>

		  {combinedStats ? (
		    <>
			  {/* Total time card */}
			  <div className="bg-[#FFFCF4] border border-[#E6D8BF] rounded-2xl p-4 mb-4">
			    <p className="text-[10px] uppercase tracking-widest text-[#7A6B5B] mb-2">
				  Projected Total Race Time
			    </p>
			    <div className="flex items-center gap-4">
				  {/* Left — Target + Ideal stacked */}
				  <div className="flex flex-col gap-1.5">
				    <div>
					  <p className="text-[9px] uppercase tracking-wider text-[#7A6B5B]">Target</p>
					  <p className="text-sm font-bold font-mono text-[#DC2626]">
					    {formatDuration(combinedStats.totalTarget_s)}
					  </p>
				    </div>
				    <div>
					  <p className="text-[9px] uppercase tracking-wider text-[#7A6B5B]">Ideal</p>
					  <p className="text-sm font-bold font-mono text-[#16A34A]">
					    {formatDuration(combinedStats.totalBest_s)}
					  </p>
				    </div>
				  </div>

				  {/* Right — Actual projected time, large */}
				  <div className="flex-1 text-right">
				    <p className="text-[9px] uppercase tracking-wider text-[#7A6B5B]">Projected</p>
				    <p className="text-4xl font-black font-mono text-[#7C3AED] leading-none mt-0.5">
					  {combinedStats.totalExtrap_s
					    ? formatDuration(combinedStats.totalExtrap_s)
					    : '--:--:--'}
				    </p>
				  </div>
			    </div>

			    {/* On track status */}
			    {combinedStats.totalExtrap_s !== null && (() => {
				  const vsTarget = combinedStats.totalExtrap_s - combinedStats.totalTarget_s;
				  const vsIdeal  = combinedStats.totalExtrap_s - combinedStats.totalBest_s;
				  return (
				    <div className="mt-3 space-y-1 pt-3 border-t border-[#E6D8BF]">
					  <p className={`text-xs font-semibold ${vsTarget <= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
					    {vsTarget <= 0
						  ? `✅ On track for target · ${formatDuration(Math.abs(vsTarget))} ahead`
						  : `⚠️ Behind target · ${formatDuration(Math.abs(vsTarget))} to close`}
					  </p>
					  <p className={`text-xs font-semibold ${vsIdeal <= 0 ? 'text-[#16A34A]' : 'text-[#7A6B5B]'}`}>
					    {vsIdeal <= 0
						  ? `✅ On track for ideal · ${formatDuration(Math.abs(vsIdeal))} ahead`
						  : `🎯 ${formatDuration(Math.abs(vsIdeal))} away from ideal`}
					  </p>
				    </div>
				  );
			    })()}
			  </div>

			  {/* Overview */}
			  <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-3 mb-3">
				<div className="flex items-center justify-between mb-2 gap-2">
				  <p className="text-xs uppercase tracking-widest text-[#7A6B5B]">Overview</p>
				  <div className="flex items-center gap-2">
					<p className="text-[10px] text-[#7A6B5B]">
					  % of {radarMode === 'ideal' ? 'ideal' : 'target'} achieved
					</p>
					<div className="flex gap-1">
					  <button
						onClick={() => setRadarMode('target')}
						className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors
						  ${radarMode === 'target'
							? 'bg-[#0284C7] text-white'
							: 'bg-[#EFE2CB] text-[#7A6B5B]'}`}
					  >
						Target
					  </button>
					  <button
						onClick={() => setRadarMode('ideal')}
						className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors
						  ${radarMode === 'ideal'
							? 'bg-[#0284C7] text-white'
							: 'bg-[#EFE2CB] text-[#7A6B5B]'}`}
					  >
						Ideal
					  </button>
					</div>
				  </div>
				</div>

				<ResponsiveContainer width="100%" height={170}>
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
			  

			  {/* Per-discipline breakdown */}
			  <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-3 mb-3">
			    <p className="text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">Breakdown</p>
			    <div className="space-y-3">
				  {[
				    { key: 'swim', label: 'Swim 1500m', icon: '🏊', color: '#0284C7', data: combinedStats.swim },
				    { key: 'bike', label: 'Bike 40km',  icon: '🚴', color: '#EA580C', data: combinedStats.bike },
				    { key: 'run',  label: 'Run 10km',   icon: '🏃', color: '#16A34A', data: combinedStats.run },
				  ].map(({ key, label, icon, color: dColor, data }) => (
				    <div key={key} className="flex items-center justify-between py-2 border-b border-[#E6D8BF] last:border-0">
					  <div className="flex items-center gap-2">
					    <span className="text-base">{icon}</span>
					    <div>
						  <p className="text-sm text-[#201A14]">{label}</p>
						  <p className="text-[10px] text-[#7A6B5B]">
						    {data ? `${data.sessionCount} session${data.sessionCount !== 1 ? 's' : ''}` : 'No data'}
						  </p>
					    </div>
					  </div>
					  <div className="text-right">
					    {data ? (
						  <>
						    <p className="text-sm font-mono font-bold" style={{ color: dColor }}>
							  {formatDuration(data.avgExtrap_s)}
						    </p>
						    <p className={`text-[10px] ${data.onTrack ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
							  {data.onTrack ? '✅ on track' : '⚠️ behind'}
							  {' · target '}{formatDuration(data.targetS)}
						    </p>
						  </>
					    ) : (
						  <p className="text-xs text-[#7A6B5B]">No sessions yet</p>
					    )}
					  </div>
				    </div>
				  ))}
			    </div>
			  </div>
			  
			  
		    </>
		  ) : (
		    <div className="text-center py-20">
			  <p className="text-4xl mb-4">🏁</p>
			  <p className="text-[#7A6B5B] text-sm">Log sessions in all three disciplines</p>
			  <p className="text-[#9A8A76] text-xs mt-1">to see your combined race projection.</p>
		    </div>
		  )}
	    </div>
	  )}	  

      {tab !== 'combined' && (sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">{activeTab.icon}</p>
          <p className="text-[#7A6B5B] text-sm">No {tab} sessions logged yet.</p>
          <p className="text-[#9A8A76] text-xs mt-1">Log your first session to see charts.</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-3">
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
                className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${metric === 'pace'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-[#7A6B5B] hover:bg-[#FFF8EA] hover:text-[#201A14]'}`}>
                <Gauge size={16} />
                <span>{paceWord}</span>
              </button>
              <button onClick={() => setMetric('distance')}
                className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${metric === 'distance'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-[#7A6B5B] hover:bg-[#FFF8EA] hover:text-[#201A14]'}`}>
                <Ruler size={16} />
                <span>Distance</span>
              </button>
            </div>

            {metric === 'pace' && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#FFF8EA] border border-[#E6D8BF] px-2 py-1">
                <span className="pl-2 text-[11px] font-semibold uppercase tracking-widest text-[#7A6B5B]">
                </span>
                <div className="flex rounded-lg bg-[#EFE2CB] p-1">
                  {PACE_MODES.map(m => (
                    <button key={m.key} onClick={() => setPaceMode(m.key)}
                      className={`px-3 py-0.7 rounded-md text-[11px] font-semibold transition-all
                        ${paceMode === m.key
                          ? 'bg-[#FFFCF4] text-[#201A14] shadow-sm'
                          : 'text-[#7A6B5B] hover:text-[#201A14]'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
				<div className="flex items-center gap-1 ml-auto">
				  <button onClick={() => setChartType('bar')}
					className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'bar' ? 'bg-[#E6D8BF] text-[#201A14]' : 'text-[#C5B49A] hover:text-[#7A6B5B]'}`}>
					<BarChart3 size={13} />
				  </button>
				  <button onClick={() => setChartType('line')}
					className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'line' ? 'bg-[#E6D8BF] text-[#201A14]' : 'text-[#C5B49A] hover:text-[#7A6B5B]'}`}>
					<LineIcon size={13} />
				  </button>
				</div>
              </div>
            )}

			{metric === 'distance' && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#FFF8EA] border border-[#E6D8BF] px-2 py-1">
                <span className="pl-2 text-[11px] font-semibold uppercase tracking-widest text-[#7A6B5B]">
                </span>
			    <div className="flex items-center justify-end gap-1 ml-auto">
				  <button onClick={() => setChartType('bar')}
				    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'bar' ? 'bg-[#E6D8BF] text-[#201A14]' : 'text-[#C5B49A] hover:text-[#7A6B5B]'}`}>
				    <BarChart3 size={13} />
				  </button>
				  <button onClick={() => setChartType('line')}
				    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'line' ? 'bg-[#E6D8BF] text-[#201A14]' : 'text-[#C5B49A] hover:text-[#7A6B5B]'}`}>
				    <LineIcon size={13} />
				  </button>
			    </div>
			  </div>
			)}

          </div>

          {/* Main chart card */}
          <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-3 mb-3">
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
					  Ideal {paceMode === 'extrapolated' ? formatDuration(bestExtrapValue * 60) : formatPaceDisplay(bestPaceValue * (tab === 'bike' ? 1 : 60))}
					</p>
				  </div>
				</div>
			  )}
			</div>

            <ResponsiveContainer width="100%" height={170}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid stroke="transparent" vertical={false} horizontal={false} />
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
                  <CartesianGrid stroke="transparent" vertical={false} horizontal={false} />
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
          <div className="bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-xs uppercase tracking-widest text-[#7A6B5B]">Session History</p>
              <div className="flex gap-1.5">
                {[
                  { key: 'all',   label: 'All' },
                  { key: 'last3', label: 'Last 3' },
                  { key: 'top3',  label: 'Top 3' },
                  { key: 'avg',   label: 'Avg' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSessionFilter(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border
                      ${sessionFilter === opt.key
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'border-[#E6D8BF] text-[#7A6B5B] bg-transparent'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {sessionFilter === 'avg' && sessions.length > 0 && (() => {
              const withPace = sessions.filter(x => x.pace != null);
              const avgPaceVal = withPace.length
                ? withPace.reduce((sum, x) => sum + x.pace, 0) / withPace.length
                : null;
              const avgDist = sessions.reduce(
                (sum, x) => sum + (tab === 'swim' ? x.distance_m : x.distance_m / 1000),
                0,
              ) / sessions.length;
              const avgDur = sessions.reduce((sum, x) => sum + (x.duration_s || 0), 0) / sessions.length;
              return (
                <div className="bg-[#EFE2CB] rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#7A6B5B] font-semibold">
                        Average · {sessions.length} sessions
                      </p>
                      <p className="text-xs text-[#5C4F3F] mt-0.5">
                        {avgDist.toFixed(1)} {distLabel} · {formatDuration(avgDur)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold" style={{ color }}>
                        {formatPaceDisplay(avgPaceVal)}{' '}
                        <span className="text-xs text-[#7A6B5B]">{paceLabel}</span>
                      </p>
                      <p className="text-[10px] text-[#7A6B5B]">
                        avg {tab === 'bike' ? 'speed' : 'pace'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3">
			  {(() => {
			    const reversed = [...sessions].reverse();
			    if (sessionFilter === 'last3') return reversed.slice(0, 3);
			    if (sessionFilter === 'top3') {
			      const withPace = sessions.filter(x => x.pace != null);
			      const sorted = [...withPace].sort((a, b) =>
			        tab === 'bike' ? (b.pace - a.pace) : (a.pace - b.pace)
			      );
			      return sorted.slice(0, 3);
			    }
			    return reversed;
			  })().map((s, i) => (
			    <div key={i} className="border-b border-[#E6D8BF] last:border-0">
				  <div
					onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
					className="w-full flex items-center justify-between py-2 text-left cursor-pointer"
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
					  <div className="flex flex-col gap-1">
					    <button
						  onClick={(e) => {
						    e.stopPropagation();
						    setEditingSession(s);
						  }}
						  className="w-6 h-6 rounded-md flex items-center justify-center text-[#9C8B73] hover:text-[#0284C7] hover:bg-[#0284C7]/10 transition-colors"
					    >
						  <Pencil size={11} />
					    </button>
					    <button
						  onClick={(e) => {
						    e.stopPropagation();
						    handleDelete(s);
						  }}
						  className="w-6 h-6 rounded-md flex items-center justify-center text-[#9C8B73] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
					    >
						  <Trash2 size={11} />
					    </button>
					  </div>
				    </div>
				  </div>

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
      ))}
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
