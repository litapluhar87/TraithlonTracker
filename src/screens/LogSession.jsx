import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  calcSwim, calcBike, calcRun,
  parseDuration, formatPace, formatDuration,
  RACE_CONFIG
} from '../utils/raceConfig';
import { api } from '../utils/api';

// ── Discipline config ─────────────────────────────────────────────────────────
const DISCIPLINES = [
  {
    key: 'swim', label: 'Swim', icon: '🏊',
    color: '#22C3FF', colorDeep: '#0B6E9C',
    glow: 'rgba(34,195,255,0.15)',
  },
  {
    key: 'bike', label: 'Bike', icon: '🚴',
    color: '#FFB020', colorDeep: '#B4741A',
    glow: 'rgba(255,176,32,0.15)',
  },
  {
    key: 'run', label: 'Run', icon: '🏃',
    color: '#FF3D71', colorDeep: '#B01E4C',
    glow: 'rgba(255,61,113,0.15)',
  },
];

const FEEL_EMOJI = ['😓', '😐', '🙂', '😊', '🔥'];

// ── Duration input ────────────────────────────────────────────────────────────
function DurationInput({ value, onChange, accentColor }) {
  const parse = (v) => {
    if (!v) return { h: '', m: '', s: '' };
    const parts = v.split(':').map(p => p.replace(/^0+/, '') || '');
    if (parts.length === 3) return { h: parts[0], m: parts[1], s: parts[2] };
    if (parts.length === 2) return { h: '', m: parts[0], s: parts[1] };
    return { h: '', m: '', s: '' };
  };

  const init = parse(value);
  const [h, setH] = useState(init.h);
  const [m, setM] = useState(init.m);
  const [s, setS] = useState(init.s);

  const emit = (hv, mv, sv) => {
    const hh = parseInt(hv) || 0;
    const mm = parseInt(mv) || 0;
    const ss = parseInt(sv) || 0;
    if (hh === 0 && mm === 0 && ss === 0) { onChange(''); return; }
    onChange(`${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);
  };

  const durFieldClass = "w-full bg-[#131A2C] border border-[#242E48] rounded-xl text-center font-mono text-xl font-bold text-[#F3F5FC] py-3 px-2 outline-none transition-all";

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5C6688] mb-2">
        Duration
      </label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: h, set: setH, placeholder: '0',  label: 'HH', min: 0, max: 23 },
          { val: m, set: setM, placeholder: '00', label: 'MM', min: 0, max: 59 },
          { val: s, set: setS, placeholder: '00', label: 'SS', min: 0, max: 59 },
        ].map(({ val, set, placeholder, label, min, max }, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <input
              type="number" inputMode="numeric"
              min={min} max={max}
              value={val} placeholder={placeholder}
              onChange={e => {
                set(e.target.value);
                const vals = [h, m, s];
                vals[i] = e.target.value;
                emit(vals[0], vals[1], vals[2]);
              }}
              className={durFieldClass}
              style={{ '--tw-ring-color': accentColor }}
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5C6688]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metrics card ──────────────────────────────────────────────────────────────
function MetricsCard({ discipline, distanceM, durationS, accentColor }) {
  if (!distanceM || !durationS || durationS < 10) return null;

  let metrics = null;
  let paceLabel = '';
  let paceValue = '';
  let extraLabel = '';

  if (discipline === 'swim') {
    metrics = calcSwim(distanceM, durationS);
    paceLabel = 'Pace'; paceValue = `${formatPace(metrics?.pace_s)} /100m`;
    extraLabel = 'Projected 1500m';
  } else if (discipline === 'bike') {
    metrics = calcBike(distanceM, durationS);
    paceLabel = 'Speed'; paceValue = `${metrics?.speed_kmh?.toFixed(1)} km/h`;
    extraLabel = 'Projected 40km';
  } else if (discipline === 'run') {
    metrics = calcRun(distanceM, durationS);
    paceLabel = 'Pace'; paceValue = `${formatPace(metrics?.pace_s)} /km`;
    extraLabel = 'Projected 10km';
  }
  if (!metrics) return null;

  const deltaAbs = Math.abs(metrics.delta_s);
  const deltaStr = `${metrics.onTrack ? '-' : '+'}${formatDuration(deltaAbs)} vs target`;
  const isOk = metrics.onTrack;

  return (
    <div
      className="rounded-2xl border p-4 mt-2"
      style={{
        background: isOk ? 'rgba(51,225,163,0.06)' : 'rgba(255,92,114,0.06)',
        borderColor: isOk ? 'rgba(51,225,163,0.25)' : 'rgba(255,92,114,0.25)',
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5C6688]">{paceLabel}</p>
          <p className="text-base font-bold font-mono text-[#F3F5FC] mt-1">{paceValue}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5C6688]">{extraLabel}</p>
          <p className="text-base font-bold font-mono text-[#F3F5FC] mt-1">{formatDuration(metrics.extrapolated_s)}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5C6688]">Status</p>
          <p className={`text-sm font-bold mt-1 ${isOk ? 'text-[#33E1A3]' : 'text-[#FF5C72]'}`}>
            {isOk ? '✅ On Track' : '⚠️ Behind'}
          </p>
          <p className="text-[9px] text-[#5C6688] mt-0.5">{deltaStr}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LogSession() {
  const { user, addActivity } = useApp();
  const navigate = useNavigate();

  const [discipline, setDiscipline] = useState('swim');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [feel, setFeel] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Swim
  const [swimType, setSwimType] = useState('pool');
  const [swimDist, setSwimDist] = useState('');
  const [swimDur, setSwimDur] = useState('');

  // Bike
  const [bikeType, setBikeType] = useState('outdoor');
  const [bikeDist, setBikeDist] = useState('');
  const [bikeDur, setBikeDur] = useState('');
  const [bikeElev, setBikeElev] = useState('');

  // Run
  const [runType, setRunType] = useState('outdoor');
  const [runDist, setRunDist] = useState('');
  const [runDur, setRunDur] = useState('');

  const activeDisc = DISCIPLINES.find(d => d.key === discipline);
  const accentColor = activeDisc?.color || '#22C3FF';
  const accentDeep  = activeDisc?.colorDeep || '#0B6E9C';
  const activeIndex = DISCIPLINES.findIndex(d => d.key === discipline);

  const getDistM = () => {
    if (discipline === 'swim') return parseFloat(swimDist) || 0;
    if (discipline === 'bike') return (parseFloat(bikeDist) || 0) * 1000;
    if (discipline === 'run')  return (parseFloat(runDist) || 0) * 1000;
    return 0;
  };
  const getDurS = () => {
    if (discipline === 'swim') return parseDuration(swimDur);
    if (discipline === 'bike') return parseDuration(bikeDur);
    if (discipline === 'run')  return parseDuration(runDur);
    return 0;
  };

  const canSave = () => {
    if (discipline === 'swim') return swimDist && swimDur;
    if (discipline === 'bike') return bikeDist && bikeDur;
    if (discipline === 'run')  return runDist && runDur;
    return false;
  };

  const buildActivity = () => {
    const base = {
      user_id: user.user_id,
      start_date: date,
      feel_rating: feel,
      notes: notes.trim() || null,
      data_source: 'manual',
    };
    if (discipline === 'swim') return {
      ...base, type: 'swim',
      name: `${swimType === 'pool' ? 'Pool' : 'Open Water'} Swim`,
      distance_m: parseFloat(swimDist),
      duration_s: parseDuration(swimDur),
      swim_type: swimType,
    };
    if (discipline === 'bike') return {
      ...base, type: 'bike',
      name: `${bikeType === 'indoor' ? 'Indoor' : 'Outdoor'} Bike`,
      distance_m: parseFloat(bikeDist) * 1000,
      duration_s: parseDuration(bikeDur),
      elevation_m: bikeElev ? parseFloat(bikeElev) : null,
      bike_type: bikeType,
    };
    if (discipline === 'run') return {
      ...base, type: 'run',
      name: `${runType === 'treadmill' ? 'Treadmill' : 'Outdoor'} Run`,
      distance_m: parseFloat(runDist) * 1000,
      duration_s: parseDuration(runDur),
      run_type: runType,
    };
  };

  const handleSave = async () => {
    if (!canSave()) return;
    setSaving(true);
    const activity = buildActivity();
    try {
      const res = await api.logActivity(activity);
      addActivity(res.activity);
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate('/progress'); }, 1200);
    } catch (e) {
      console.error('Save failed:', e);
      alert('Failed to save session. Check your connection and try again.');
    }
    setSaving(false);
  };

  // ── Reusable styled input ──
  const inp = "w-full bg-[#131A2C] border border-[#242E48] rounded-xl px-4 py-3 text-[#F3F5FC] font-mono text-sm placeholder-[#5C6688] outline-none transition-all";
  const lbl = "block text-[10px] font-bold uppercase tracking-widest text-[#5C6688] mb-2";

  // ── Type toggle ──
  const TypeToggle = ({ value, onChange, opts }) => (
    <div className="grid gap-1 bg-[#131A2C] border border-[#242E48] rounded-xl p-1"
      style={{ gridTemplateColumns: `repeat(${opts.length}, 1fr)` }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className="py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
          style={value === o.v ? {
            background: '#202A44',
            color: '#F3F5FC',
            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.5)',
          } : {
            color: '#5C6688',
          }}>
          {o.l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#03050B' }}>

      {/* ── Sliding capsule tab selector ── */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: '#03050B', borderBottom: '1px solid #242E48' }}>
        <div className="relative grid grid-cols-3 rounded-full p-1"
          style={{ background: '#131A2C', border: '1px solid #242E48' }}>

          {/* Sliding highlight */}
          <div
            className="absolute top-1 bottom-1 rounded-full transition-all duration-300"
            style={{
              left: `calc(${activeIndex} * 33.333% + 4px)`,
              width: 'calc(33.333% - 8px)',
              background: `linear-gradient(120deg, ${accentDeep}, ${accentColor})`,
              boxShadow: `0 4px 14px -4px ${accentColor}66`,
            }}
          />

          {DISCIPLINES.map((d, i) => (
            <button
              key={d.key}
              onClick={() => setDiscipline(d.key)}
              className="relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-full transition-all"
              style={{
                color: discipline === d.key ? '#fff' : '#5C6688',
                fontWeight: discipline === d.key ? 700 : 500,
                fontSize: 13,
              }}
            >
              <span style={{
                fontSize: 15,
                filter: discipline === d.key ? 'none' : 'grayscale(1) opacity(0.4)',
                transition: 'filter 0.3s',
              }}>
                {d.icon}
              </span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable form ── */}
      <div className="px-4 pt-4 pb-36 max-w-lg mx-auto space-y-4">

        {/* Date + Distance row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={inp} style={{ colorScheme: 'dark' }} />
          </div>
          <div>
            <label className={lbl}>
              {discipline === 'swim' ? 'Distance (m)' : 'Distance (km)'}
            </label>
            <input type="number"
              value={discipline === 'swim' ? swimDist : discipline === 'bike' ? bikeDist : runDist}
              onChange={e => {
                if (discipline === 'swim') setSwimDist(e.target.value);
                else if (discipline === 'bike') setBikeDist(e.target.value);
                else setRunDist(e.target.value);
              }}
              placeholder={discipline === 'swim' ? 'e.g. 1500' : discipline === 'bike' ? 'e.g. 40' : 'e.g. 10'}
              step={discipline === 'swim' ? '1' : '0.1'}
              className={inp}
            />
          </div>
        </div>

        {/* Duration */}
        <DurationInput
          value={discipline === 'swim' ? swimDur : discipline === 'bike' ? bikeDur : runDur}
          onChange={discipline === 'swim' ? setSwimDur : discipline === 'bike' ? setBikeDur : setRunDur}
          accentColor={accentColor}
        />

        {/* Type toggle */}
        <div>
          <label className={lbl}>Type</label>
          {discipline === 'swim' && (
            <TypeToggle value={swimType} onChange={setSwimType}
              opts={[{ v: 'pool', l: '🏊 Pool' }, { v: 'open', l: '🌊 Open Water' }]} />
          )}
          {discipline === 'bike' && (
            <TypeToggle value={bikeType} onChange={setBikeType}
              opts={[{ v: 'outdoor', l: '🚴 Outdoor' }, { v: 'indoor', l: '🏠 Indoor' }]} />
          )}
          {discipline === 'run' && (
            <TypeToggle value={runType} onChange={setRunType}
              opts={[{ v: 'outdoor', l: '🏃 Outdoor' }, { v: 'treadmill', l: '⚙️ Treadmill' }]} />
          )}
        </div>

        {/* Elevation — bike only */}
        {discipline === 'bike' && (
          <div>
            <label className={lbl}>Elevation (m) — Optional</label>
            <input type="number" value={bikeElev} onChange={e => setBikeElev(e.target.value)}
              placeholder="e.g. 250" className={inp} />
          </div>
        )}

        {/* Live metrics card */}
        <MetricsCard
          discipline={discipline}
          distanceM={getDistM()}
          durationS={getDurS()}
          accentColor={accentColor}
        />

        {/* How did it feel */}
        <div>
          <label className={lbl}>How did it feel?</label>
          <div className="grid grid-cols-5 gap-2">
            {FEEL_EMOJI.map((emoji, i) => (
              <button key={i} onClick={() => setFeel(i + 1)}
                className="rounded-xl text-2xl flex items-center justify-center transition-all"
                style={{
                  aspectRatio: '1',
                  background: feel === i + 1 ? `color-mix(in srgb, ${accentColor} 12%, #131A2C)` : '#131A2C',
                  border: feel === i + 1 ? `1.5px solid ${accentColor}` : '1.5px solid #242E48',
                  boxShadow: feel === i + 1 ? `0 0 0 3px ${accentColor}22` : 'none',
                  transform: feel === i + 1 ? 'scale(1.05)' : 'scale(1)',
                }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="How was the session? Any issues?"
            rows={2}
            className="w-full bg-[#131A2C] border border-[#242E48] rounded-xl px-4 py-3 text-[#F3F5FC] placeholder-[#5C6688] outline-none transition-all resize-none text-sm"
          />
        </div>

      </div>

      {/* ── Fixed save button ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 max-w-lg mx-auto"
        style={{ background: 'linear-gradient(to top, #03050B 60%, transparent)' }}>
        <button
          onClick={handleSave}
          disabled={!canSave() || saving}
          className="w-full py-4 rounded-full font-bold text-base tracking-wide transition-all"
          style={{
            background: saved
              ? 'linear-gradient(120deg, #1a8a62, #33E1A3)'
              : canSave()
              ? `linear-gradient(120deg, ${accentDeep}, ${accentColor})`
              : '#1A2338',
            color: canSave() || saved ? (discipline === 'bike' && !saved ? '#1a0e00' : '#fff') : '#5C6688',
            opacity: (!canSave() && !saved) ? 0.5 : 1,
            boxShadow: canSave() && !saving ? `0 8px 24px -8px ${accentColor}66` : 'none',
          }}
        >
          {saved ? '✅ Saved!' : saving ? 'Saving…' : 'Save Session'}
        </button>
      </div>

    </div>
  );
}
