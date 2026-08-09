import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { Bike as BikeIcon, Footprints, Gauge, Pencil, Ruler, Trophy, Waves } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { formatPace, formatDuration, calcSwim, calcBike, calcRun, RACE_CONFIG } from '../utils/raceConfig';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';
import { Sparkles, ChevronDown, Trash2 } from 'lucide-react';

const TABS = [
  { key: 'combined', label: 'Total', color: '#8B7CFF', icon: Trophy },
  { key: 'swim',     label: 'Swim',     color: '#22C3FF', icon: Waves },
  { key: 'bike',     label: 'Bike',     color: '#FFB020', icon: BikeIcon },
  { key: 'run',      label: 'Run',      color: '#FF3D71', icon: Footprints },
];

const PACE_MODES = [
  { key: 'actual',       label: 'Actual' },
  { key: 'extrapolated', label: 'Extrapolated' },
];

const VISUALS = {
  combined: { color: '#8B7CFF', gradient: 'linear-gradient(135deg, #8B7CFF 0%, #B4A8FF 100%)', icon: Trophy },
  swim: { color: '#22C3FF', gradient: 'linear-gradient(135deg, #22C3FF 0%, #38E7FF 100%)', icon: Waves },
  bike: { color: '#FFB020', gradient: 'linear-gradient(135deg, #FFB020 0%, #FFD166 100%)', icon: BikeIcon },
  run: { color: '#FF3D71', gradient: 'linear-gradient(135deg, #FF3D71 0%, #FF7A9C 100%)', icon: Footprints },
};

const TAB_INDEX = { combined: 0, swim: 1, bike: 2, run: 3 };

function CustomTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A2338] border border-[#242E48] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-[#9BA6C4] mb-1">{label}</p>
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
    <div className="bg-[#131A2C] border border-[#242E48] shadow-[0_12px_30px_rgba(0,0,0,0.22)] rounded-xl p-3">
      <p className="text-[10px] text-[#9BA6C4] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold font-mono mt-1 leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#5C6688] mt-1.5">{sub}</p>}
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
    <div className="fixed inset-0 z-50 bg-[#03050B]/75" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#131A2C] rounded-t-3xl p-6 pb-8 border-t border-[#242E48] shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[#242E48] rounded-full mx-auto mb-5" />
        <h3 className="font-bold text-[#F3F5FC] text-lg mb-4">Edit Session</h3>

        <label className="block text-xs uppercase tracking-widest text-[#9BA6C4] mb-2">Discipline</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {DISCIPLINES.map(d => (
            <button key={d} onClick={() => setType(d)}
              className={`py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5
                ${type === d ? 'border-[#22C3FF] bg-[#22C3FF]/10 text-[#22C3FF]' : 'border-[#242E48] text-[#9BA6C4]'}`}>
              {DISCIPLINE_ICON[d]} <span className="capitalize">{d}</span>
            </button>
          ))}
        </div>

        <label className="block text-xs uppercase tracking-widest text-[#9BA6C4] mb-2">
          Distance ({type === 'swim' ? 'm' : 'km'})
        </label>
        <input type="number" value={distance} onChange={e => setDistance(e.target.value)}
          className="w-full bg-[#090D18] border border-[#242E48] rounded-xl px-4 py-3 text-[#F3F5FC] font-mono mb-4" />

        <label className="block text-xs uppercase tracking-widest text-[#9BA6C4] mb-2">Duration (hh:mm:ss)</label>
        <input type="text" value={duration} onChange={e => setDuration(e.target.value)}
          placeholder="0:45:30"
          className="w-full bg-[#090D18] border border-[#242E48] rounded-xl px-4 py-3 text-[#F3F5FC] font-mono mb-4" />

        <label className="block text-xs uppercase tracking-widest text-[#9BA6C4] mb-2">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-[#090D18] border border-[#242E48] rounded-xl px-4 py-3 text-[#F3F5FC] font-mono mb-5" />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#1A2338] text-[#F3F5FC] text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#22C3FF] text-[#03050B] text-sm font-semibold disabled:opacity-50">
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
  const [bikeFilter, setBikeFilter] = useState('outdoor'); // outdoor | indoor
  const [swimFilter, setSwimFilter] = useState('pool'); //pool | openwater
  
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

  const sessionsRaw = useMemo(() => {
    let filtered = activities.filter(a => a.type === tab);

    // Apply indoor/outdoor filter for bike tab
	if (tab === 'bike') {
	  filtered = filtered.filter(a => {
		const bt = a.strava_data?.bike_type;
		if (bikeFilter === 'indoor') return bt === 'indoor';
		// Outdoor: include explicitly tagged outdoor, OR older sessions with no tag (default to outdoor)
		return bt === 'outdoor' || bt === null || bt === undefined;
	  });
	}

	if (tab === 'swim') {
	  filtered = filtered.filter(a => {
		const st = a.strava_data?.swim_type;
		if (swimFilter === 'open') return st === 'open';
		// Pool: include sessions explicitly tagged pool, OR older sessions with no tag (default to pool)
		return st === 'pool' || st === null || st === undefined;
	  });
	}
	
    return filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [activities, tab, bikeFilter, swimFilter]);

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
	    .filter(a => {
		  if (a.type !== discipline || !a.distance_m || !a.duration_s) return false;
		  if (discipline === 'bike' && a.strava_data?.bike_type === 'indoor') return false;
		  if (discipline === 'swim' && a.strava_data?.swim_type === 'open') return false;
          return true;
        })
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
  const color = VISUALS[tab]?.color || activeTab.color;

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
    <div className="min-h-screen bg-[#03050B] pb-24 px-4 pt-3 max-w-lg mx-auto text-[#F3F5FC]">
 
	  {/* Discipline tabs */}
	  <div className="relative grid grid-cols-4 mb-4 rounded-full bg-[#090D18] border border-[#242E48] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden">

	    {/* Active pill */}
	    <div className="absolute inset-1 grid grid-cols-4 pointer-events-none">
		  <div
		    className="rounded-full shadow-[0_0_22px_rgba(139,124,255,0.24)] transition-all duration-300 ease-out"
		    style={{
			  gridColumn: TAB_INDEX[tab] + 1,
			  background: VISUALS[tab]?.gradient,
		    }}
		  />
	    </div>

	    {/* Tab buttons */}
	    {TABS.map(t => (
		  <button
		    key={t.key}
		    onClick={() => {
			  setTab(t.key);
			  setDisciplineExpanded(false);
			  setBikeFilter('outdoor');
			  setSwimFilter('pool');
		    }}
		    className={`relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold transition-colors
			  ${tab === t.key
			    ? 'text-[#03050B]'
			    : 'text-[#9BA6C4]'
			  }`}
		  >
		    {(() => {
			  const Icon = VISUALS[t.key]?.icon;
			  return Icon ? <Icon size={15} strokeWidth={2.4} /> : null;
		    })()}

		    <span>{t.label}</span>
		  </button>
	    ))}
	  </div>
	  
	  {tab === 'bike' && (
	    <div className="flex gap-1.5 mb-3 rounded-full bg-[#090D18] border border-[#242E48] p-1">
		  <button onClick={() => setBikeFilter('outdoor')}
		    className={`flex-1 py-1.5 rounded-full border text-[11px] font-semibold transition-all
			  ${bikeFilter === 'outdoor' || bikeFilter === 'all'
			    ? 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020] shadow-[0_0_18px_rgba(255,176,32,0.18)]'
			    : 'border-transparent text-[#9BA6C4] bg-transparent'}`}>
		    ☀️ Outdoor
		  </button>
		  <button onClick={() => setBikeFilter('indoor')}
		    className={`flex-1 py-1.5 rounded-full border text-[11px] font-semibold transition-all
			  ${bikeFilter === 'indoor'
			    ? 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020] shadow-[0_0_18px_rgba(255,176,32,0.18)]'
			    : 'border-transparent text-[#9BA6C4] bg-transparent'}`}>
		    🏠 Indoor
		  </button>
	    </div>
	  )}	  
	  
	  {tab === 'swim' && (
	    <div className="flex gap-1.5 mb-3 rounded-full bg-[#090D18] border border-[#242E48] p-1">
		  <button onClick={() => setSwimFilter('pool')}
		    className={`flex-1 py-1.5 rounded-full border text-[11px] font-semibold transition-all
			  ${swimFilter === 'pool'
			    ? 'border-[#22C3FF] text-[#22C3FF] bg-[#22C3FF]/15 shadow-[0_0_18px_rgba(34,195,255,0.18)]'
			    : 'border-transparent text-[#9BA6C4] bg-transparent'}`}
		    style={{}}>
		    🏊 Pool
		  </button>
		  <button onClick={() => setSwimFilter('open')}
		    className={`flex-1 py-1.5 rounded-full border text-[11px] font-semibold transition-all
			  ${swimFilter === 'open'
			    ? 'border-[#22C3FF] text-[#22C3FF] bg-[#22C3FF]/15 shadow-[0_0_18px_rgba(34,195,255,0.18)]'
			    : 'border-transparent text-[#9BA6C4] bg-transparent'}`}
		    style={{}}>
		    🌊 Open Water
		  </button>
	    </div>
	  )}	  
	  
	  {cumulativeSummaries[tab] && (
	    <div className="bg-[#1A2338] border border-[#242E48] shadow-[0_10px_28px_rgba(0,0,0,0.22)] rounded-full px-4 py-3 mb-3">
		  <button
		    onClick={() => setDisciplineExpanded(!disciplineExpanded)}
		    className="w-full flex items-center justify-between"
		  >
		    <div className="flex items-center gap-1.5">
			  <Sparkles size={13} style={{ color }} />
			  <p className="text-[10px] uppercase tracking-wider text-[#9BA6C4] font-semibold">
			    AI Insight
			  </p>
		    </div>
		    <ChevronDown
			  size={13}
			  className={`text-[#9BA6C4] transition-transform ${disciplineExpanded ? 'rotate-180' : ''}`}
		    />
		  </button>
		  {disciplineExpanded && (
		    <p className="text-xs text-[#9BA6C4] leading-relaxed mt-3">
			  {cumulativeSummaries[tab]}
		    </p>
		  )}
	    </div>
	  )}
	  
	  {/* Combined Tab */}
	  {tab === 'combined' && (
	    <div>
		  {cumulativeSummaries.overall && (
			<div className="bg-[#1A2338] border border-[#242E48] shadow-[0_10px_28px_rgba(0,0,0,0.22)] rounded-full px-4 py-3 mb-3">
			  <button
				onClick={() => setOverallExpanded(!overallExpanded)}
				className="w-full flex items-center justify-between"
			  >
				<div className="flex items-center gap-1.5">
				  <Sparkles size={13} className="text-[#8B7CFF]" />
				  <p className="text-[10px] uppercase tracking-wider text-[#9BA6C4] font-semibold">
					AI Insight
				  </p>
				</div>
				<ChevronDown
				  size={14}
				  className={`text-[#9BA6C4] transition-transform ${overallExpanded ? 'rotate-180' : ''}`}
				/>
			  </button>
			  {overallExpanded && (
				<p className="text-sm text-[#9BA6C4] leading-relaxed mt-3">
				  {cumulativeSummaries.overall}
				</p>
			  )}
			</div>
		  )}  
		  {/* Filter toggle */}
		  <div className="flex gap-2 mb-3">
		    {[
			  { key: 'last3',   label: 'Last 3' },
			  { key: 'top3',    label: 'Top 3' },
			  { key: 'average', label: 'Average' },
		    ].map(opt => (
			  <button key={opt.key} onClick={() => setCombinedFilter(opt.key)}
			    className={`flex-1 py-2 rounded-full border text-xs font-semibold transition-all
				  ${combinedFilter === opt.key
				    ? 'bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF] shadow-[0_0_18px_rgba(139,124,255,0.18)]'
				    : 'border-[#242E48] text-[#9BA6C4] bg-[#090D18]'}`}>
			    {opt.label}
			  </button>
		    ))}
		  </div>

		  {combinedStats ? (
		    <>
			  {/* Total time card */}
			  <div className="bg-[#131A2C] border border-[#242E48] rounded-2xl p-4 mb-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
			    <p className="text-[10px] uppercase tracking-widest text-[#9BA6C4] mb-2">
				  Projected Total Race Time
			    </p>
			    <div className="flex items-center gap-4">
				  {/* Left — Target + Ideal stacked */}
				  <div className="flex flex-col gap-1.5">
				    <div>
					  <p className="text-[9px] uppercase tracking-wider text-[#5C6688]">Target</p>
					  <p className="text-sm font-bold font-mono text-[#FF5C72]">
					    {formatDuration(combinedStats.totalTarget_s)}
					  </p>
				    </div>
				    <div>
					  <p className="text-[9px] uppercase tracking-wider text-[#5C6688]">Ideal</p>
					  <p className="text-sm font-bold font-mono text-[#33E1A3]">
					    {formatDuration(combinedStats.totalBest_s)}
					  </p>
				    </div>
				  </div>

				  {/* Right — Actual projected time, large */}
				  <div className="flex-1 text-right">
				    <p className="text-[9px] uppercase tracking-wider text-[#5C6688]">Projected</p>
				    <p className="text-4xl font-black font-mono text-[#8B7CFF] leading-none mt-0.5">
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
				    <div className="mt-3 space-y-1 pt-3 border-t border-[#242E48]">
					  <p className={`text-xs font-semibold ${vsTarget <= 0 ? 'text-[#33E1A3]' : 'text-[#FF5C72]'}`}>
					    {vsTarget <= 0
						  ? `✅ On track for target · ${formatDuration(Math.abs(vsTarget))} ahead`
						  : `⚠️ Behind target · ${formatDuration(Math.abs(vsTarget))} to close`}
					  </p>
					  <p className={`text-xs font-semibold ${vsIdeal <= 0 ? 'text-[#33E1A3]' : 'text-[#9BA6C4]'}`}>
					    {vsIdeal <= 0
						  ? `✅ On track for ideal · ${formatDuration(Math.abs(vsIdeal))} ahead`
						  : `🎯 ${formatDuration(Math.abs(vsIdeal))} away from ideal`}
					  </p>
				    </div>
				  );
			    })()}
			  </div>

			{/* Overview + Breakdown */}
			<div className="bg-[#131A2C] border border-[#242E48] shadow-[0_12px_30px_rgba(0,0,0,0.22)] rounded-2xl p-3 mb-3">
			  {/* Header with Target/Ideal toggle */}
			  <div className="flex items-center justify-between mb-2">
				<p className="text-xs uppercase tracking-widest text-[#9BA6C4]">Overview</p>
				<div className="flex gap-1">
				  <button onClick={() => setRadarMode('target')}
				    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors
					  ${radarMode === 'target' ? 'bg-[#8B7CFF] text-[#03050B]' : 'bg-[#090D18] text-[#9BA6C4]'}`}>
				    Target
				  </button>
				  <button onClick={() => setRadarMode('ideal')}
				    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors
					  ${radarMode === 'ideal' ? 'bg-[#8B7CFF] text-[#03050B]' : 'bg-[#090D18] text-[#9BA6C4]'}`}>
				    Ideal
				  </button>
				</div>
			  </div>

			  {/* Breakdown with progress bars — full width, no side-by-side */}
			  {[
				{ key: 'swim', label: 'Swim', icon: '🏊', color: '#22C3FF', data: combinedStats.swim },
				{ key: 'bike', label: 'Bike', icon: '🚴', color: '#FFB020', data: combinedStats.bike },
				{ key: 'run',  label: 'Run',  icon: '🏃', color: '#FF3D71', data: combinedStats.run },
			  ].map(({ key, label, icon, color: dColor, data }) => {
				const benchmarkS     = data ? (radarMode === 'ideal' ? data.bestS : data.targetS) : null;
				const pct            = data && benchmarkS ? Math.min(100, Math.round((benchmarkS / data.avgExtrap_s) * 100)) : 0;
				const isOnTrack      = data ? data.avgExtrap_s <= benchmarkS : false;
				const benchmarkLabel = radarMode === 'ideal' ? 'Ideal' : 'Target';

				return (
					<div key={key} className="py-2">
                      <div className="flex items-start gap-3">
                        {/* Left — discipline pill */}
                        <div className="flex flex-col items-center justify-center rounded-xl px-2 py-2 flex-shrink-0"
                          style={{ backgroundColor: `${dColor}18`, border: '1px solid #242E48', minWidth: '60px' }}>
                          <span className="text-base leading-none">{icon}</span>
                          <p className="text-[11px] font-semibold mt-0.5" style={{ color: dColor }}>{label}</p>
                        </div>

                        {/* Right — time, %, slider, benchmark */}
                        <div className="flex-1 pt-0.5">
                          {data ? (
                            <>
                              {/* Time + % on same line */}
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-mono font-bold text-[#F3F5FC]">
                                  {formatDuration(data.avgExtrap_s)}
                                </p>
                                <p className={`text-[11px] font-semibold ${isOnTrack ? 'text-[#33E1A3]' : 'text-[#FF5C72]'}`}>
                                  {pct}%
                                </p>
                              </div>

                              {/* Benchmark*/}
                              <p className={`text-[10px] mt-0.5 mb-1 ${isOnTrack ? 'text-[#33E1A3]' : 'text-[#FF5C72]'}`}>
                                {isOnTrack ? '✅' : '⚠️'} {benchmarkLabel} {formatDuration(benchmarkS)}
                              </p>
							  
                              {/* Slider */}
                              <div className="relative h-0.5 rounded-full bg-[#090D18] overflow-hidden">
                                <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: '#8B7CFF' }} />
                                <div className="absolute right-0 top-0 h-full w-0.5"
                                  style={{ backgroundColor: isOnTrack ? '#33E1A3' : '#FF5C72' }} />
                              </div>

                            </>
                          ) : (
                            <p className="text-[10px] text-[#9BA6C4] pt-1">No data</p>
                          )}
                        </div>
                      </div>

                      {/* {key !== 'run' && <div className="mt-2 border-b border-[#E6D8BF]" />} */}
                    </div>
				);
			  })}
			</div>
			  
			  
		    </>
		  ) : (
		    <div className="text-center py-20">
			  <p className="text-4xl mb-4">🏁</p>
			  <p className="text-[#9BA6C4] text-sm">Log sessions in all three disciplines</p>
			  <p className="text-[#5C6688] text-xs mt-1">to see your combined race projection.</p>
		    </div>
		  )}
	    </div>
	  )}	  

      {tab !== 'combined' && (sessions.length === 0 ? (
        <div className="text-center py-20">
          {(() => {
            const Icon = VISUALS[tab]?.icon;
            return Icon ? <Icon size={42} className="mx-auto mb-4" style={{ color }} /> : null;
          })()}
          <p className="text-[#9BA6C4] text-sm">No {tab} sessions logged yet.</p>
          <p className="text-[#5C6688] text-xs mt-1">Log your first session to see charts.</p>
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
              color={lastOnTrack === true ? '#33E1A3' : lastOnTrack === false ? '#FF5C72' : color} />
          </div>

          {/* Metric selector */}
          <div className="mb-3 rounded-2xl border border-[#242E48] bg-[#131A2C] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
            <div className="relative grid grid-cols-2 rounded-full bg-[#090D18] border border-[#242E48] p-1 overflow-hidden">
              <div
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.5rem)] rounded-full transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${metric === 'pace' ? 0 : 100}%)`,
                  background: VISUALS[tab]?.gradient,
                }}
              />
              <button onClick={() => setMetric('pace')}
                className={`relative z-10 min-h-10 rounded-full px-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${metric === 'pace'
                    ? 'text-[#03050B]'
                    : 'text-[#9BA6C4] hover:text-[#F3F5FC]'}`}>
                <Gauge size={16} />
                <span>{paceWord}</span>
              </button>
              <button onClick={() => setMetric('distance')}
                className={`relative z-10 min-h-10 rounded-full px-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${metric === 'distance'
                    ? 'text-[#03050B]'
                    : 'text-[#9BA6C4] hover:text-[#F3F5FC]'}`}>
                <Ruler size={16} />
                <span>Distance</span>
              </button>
            </div>

            {metric === 'pace' && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-full bg-[#090D18] border border-[#242E48] px-2 py-1">
                <span className="pl-2 text-[11px] font-semibold uppercase tracking-widest text-[#5C6688]">
                </span>
                <div className="flex rounded-full bg-[#131A2C] p-1">
                  {PACE_MODES.map(m => (
                    <button key={m.key} onClick={() => setPaceMode(m.key)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all
                        ${paceMode === m.key
                          ? 'text-[#03050B] shadow-sm'
                          : 'text-[#9BA6C4] hover:text-[#F3F5FC]'}`}
                      style={paceMode === m.key ? { background: VISUALS[tab]?.gradient } : {}}>
                      {m.label}
                    </button>
                  ))}
                </div>
				<div className="flex items-center gap-1 ml-auto">
				  <button onClick={() => setChartType('bar')}
					className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'bar' ? 'bg-[#242E48] text-[#F3F5FC]' : 'text-[#5C6688] hover:text-[#9BA6C4]'}`}>
					<BarChart3 size={13} />
				  </button>
				  <button onClick={() => setChartType('line')}
					className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'line' ? 'bg-[#242E48] text-[#F3F5FC]' : 'text-[#5C6688] hover:text-[#9BA6C4]'}`}>
					<LineIcon size={13} />
				  </button>
				</div>
              </div>
            )}

			{metric === 'distance' && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-full bg-[#090D18] border border-[#242E48] px-2 py-1">
                <span className="pl-2 text-[11px] font-semibold uppercase tracking-widest text-[#5C6688]">
                </span>
			    <div className="flex items-center justify-end gap-1 ml-auto">
				  <button onClick={() => setChartType('bar')}
				    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'bar' ? 'bg-[#242E48] text-[#F3F5FC]' : 'text-[#5C6688] hover:text-[#9BA6C4]'}`}>
				    <BarChart3 size={13} />
				  </button>
				  <button onClick={() => setChartType('line')}
				    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
					  ${chartType === 'line' ? 'bg-[#242E48] text-[#F3F5FC]' : 'text-[#5C6688] hover:text-[#9BA6C4]'}`}>
				    <LineIcon size={13} />
				  </button>
			    </div>
			  </div>
			)}

          </div>

          {/* Main chart card */}
          <div className="bg-[#131A2C] border border-[#242E48] shadow-[0_12px_30px_rgba(0,0,0,0.22)] rounded-2xl p-3 mb-3">
			<div className="flex items-center justify-between mb-4">
			  <p className="text-xs uppercase tracking-widest text-[#9BA6C4]">
				{metric === 'distance' ? 'Distance' : `${paceWord} · ${paceMode === 'extrapolated' ? 'Extrapolated' : 'Actual'}`}
				{metric === 'pace' && paceMode === 'extrapolated' && ` (${tab === 'swim' ? '1500m' : tab === 'bike' ? '40km' : '10km'})`}
			  </p>
			  {metric === 'pace' && (
				<div className="flex items-center gap-3">
				  <div className="flex items-center gap-1.5">
					<div className="w-3 h-0.5 bg-[#FF5C72] opacity-70" />
					<p className="text-[10px] text-[#9BA6C4]">
					  Target {paceMode === 'extrapolated' ? formatDuration(targetExtrapValue * 60) : formatPaceDisplay(targetPaceValue * (tab === 'bike' ? 1 : 60))}
					</p>
				  </div>
				  <div className="flex items-center gap-1.5">
					<div className="w-3 h-0.5 bg-[#33E1A3] opacity-70" />
					<p className="text-[10px] text-[#9BA6C4]">
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
                  <XAxis dataKey="name" tick={{ fill: '#5C6688', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5C6688', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={metric === 'distance' ? undefined : yDomain}
                    reversed={metric === 'distance' ? false : shouldReverse} 
					tickFormatter={formatChartValue} />
                  <Tooltip content={<CustomTooltip formatValue={formatChartValue} />} />
                  {refLineValue !== null && metric === 'pace' && (
					<ReferenceLine y={refLineValue} stroke="#FF5C72" strokeDasharray="4 4" strokeOpacity={0.85} strokeWidth={1.5} />
				  )}
				  {bestLineValue !== null && metric === 'pace' && (
				    <ReferenceLine y={bestLineValue} stroke="#33E1A3" strokeDasharray="4 4" strokeOpacity={0.75} strokeWidth={1.5} />
				  )}
                  <Bar dataKey="value" fill={valueColor} radius={[5,5,0,0]} fillOpacity={0.9} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid stroke="transparent" vertical={false} horizontal={false} />
                  <XAxis dataKey="name" tick={{ fill: '#5C6688', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5C6688', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={metric === 'distance' ? undefined : yDomain}
                    reversed={metric === 'distance' ? false : shouldReverse} 
					tickFormatter={formatChartValue} />
                  <Tooltip content={<CustomTooltip formatValue={formatChartValue} />} />
                  {refLineValue !== null && metric === 'pace' && (
					<ReferenceLine y={refLineValue} stroke="#FF5C72" strokeDasharray="4 4" strokeOpacity={0.85} strokeWidth={1.5} />
				  )}
				  {bestLineValue !== null && metric === 'pace' && (
				    <ReferenceLine y={bestLineValue} stroke="#33E1A3" strokeDasharray="4 4" strokeOpacity={0.75} strokeWidth={1.5} />
				  )}
                  <Line type="monotone" dataKey="value" stroke={valueColor}
                    strokeWidth={2.5} dot={{ fill: valueColor, r: 2, stroke: '#03050B', strokeWidth: 1 }} activeDot={{ r: 4.5, stroke: '#03050B', strokeWidth: 2 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Session history */}
          <div className="bg-[#131A2C] border border-[#242E48] shadow-[0_12px_30px_rgba(0,0,0,0.22)] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-xs uppercase tracking-widest text-[#9BA6C4]">Session History</p>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                      ${sessionFilter === opt.key
                        ? 'border-current'
                        : 'border-[#242E48] text-[#9BA6C4] bg-[#090D18]'}`}
                    style={sessionFilter === opt.key ? {
                      borderColor: color,
                      backgroundColor: `${color}24`,
                      boxShadow: `0 0 18px ${color}2E`,
                      color,
                    } : {}}
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
                <div className="bg-[#1A2338] border border-[#242E48] rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#9BA6C4] font-semibold">
                        Average · {sessions.length} sessions
                      </p>
                      <p className="text-xs text-[#5C6688] mt-0.5">
                        {avgDist.toFixed(1)} {distLabel} · {formatDuration(avgDur)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold" style={{ color }}>
                        {formatPaceDisplay(avgPaceVal)}{' '}
                        <span className="text-xs text-[#9BA6C4]">{paceLabel}</span>
                      </p>
                      <p className="text-[10px] text-[#5C6688]">
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
			    <div key={i} className="bg-[#090D18] border border-[#242E48] rounded-xl p-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
				  <div
				    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
				    className="w-full cursor-pointer text-left"
				  >
				    {/* Row 1 — Date gets maximum width */}
				    <div className="flex items-center justify-between gap-2">
					  <div className="min-w-0 flex items-center gap-1.5">
					    <p className="text-sm text-[#F3F5FC] font-semibold truncate">
						  {s.label}
					    </p>

					    {s.ai_summary && (
						  <Sparkles size={11} style={{ color, opacity: 0.8 }} />
					    )}
					  </div>

					  <div className="flex flex-col gap-1 flex-shrink-0">
					    <button
						  onClick={(e) => {
						    e.stopPropagation();
						    setEditingSession(s);
						  }}
						  className="w-6 h-6 rounded-md flex items-center justify-center text-[#5C6688] hover:text-[#22C3FF] hover:bg-[#22C3FF]/10 transition-colors"
					    >
						  <Pencil size={11} />
					    </button>

					    <button
						  onClick={(e) => {
						    e.stopPropagation();
						    handleDelete(s);
						  }}
						  className="w-6 h-6 rounded-md flex items-center justify-center text-[#5C6688] hover:text-[#FF5C72] hover:bg-[#FF5C72]/10 transition-colors"
					    >
						  <Trash2 size={11} />
					    </button>
					  </div>
				    </div>

				    {/* Row 2 + Row 3 */}
				    <div className="flex items-center gap-2 mt-2">

					  {/* Discipline icon starts from Row 2 */}
					  <div
					    className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
					    style={{ backgroundColor: `${color}1A`, color }}
					  >
					    {(() => {
						  const Icon = VISUALS[tab]?.icon;
						  return Icon ? <Icon size={16} strokeWidth={2.4} /> : null;
					    })()}
					  </div>

					  <div className="min-w-0 flex-1">
					    {/* Row 2 */}
					    <p className="text-xs text-[#9BA6C4]">
						  {s.dist_display.toFixed(1)} {distLabel} · {formatDuration(s.duration_s)}
					    </p>

					    {/* Row 3 */}
					    <div className="flex items-center justify-between gap-2 mt-1">
						  <p className="text-sm font-mono font-semibold truncate" style={{ color }}>
						    {formatPaceDisplay(s.pace)}
						    <span className="text-xs text-[#5C6688] ml-1">
							  {paceLabel}
						    </span>
						  </p>

						  <p
						    className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold
							  ${s.onTrack
							    ? 'bg-[#33E1A3]/10 text-[#33E1A3]'
							    : 'bg-[#FF5C72]/10 text-[#FF5C72]'
							  }`}
						  >
						    {s.onTrack ? '✅ on track' : '⚠️ behind'} · {formatDuration(s.extrapolated_s)}
						  </p>
					    </div>
					  </div>

					  {s.ai_summary && (
					    <ChevronDown
						  size={14}
						  className={`text-[#9BA6C4] flex-shrink-0 transition-transform
						    ${expandedId === s.id ? 'rotate-180' : ''}`}
					    />
					  )}
				    </div>
				  </div>

				  {expandedId === s.id && s.ai_summary && (
				    <div className="bg-[#1A2338] border border-[#242E48] rounded-xl p-3 mt-2">
					  <div className="flex items-center gap-1.5 mb-1.5">
					    <Sparkles size={11} style={{ color }} />
					    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>AI Insight</p>
					  </div>
					  <p className="text-xs text-[#9BA6C4] leading-relaxed">{s.ai_summary}</p>
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
