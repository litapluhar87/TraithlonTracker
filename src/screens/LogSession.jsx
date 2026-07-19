import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  calcSwim, calcBike, calcRun,
  parseDuration, formatPace, formatDuration,
  RACE_CONFIG
} from '../utils/raceConfig';
import { api } from '../utils/api';

const DISCIPLINES = [
  { key: 'swim',  label: 'Swim',  icon: '🏊', color: '#0284C7' },
  { key: 'bike',  label: 'Bike',  icon: '🚴', color: '#EA580C' },
  { key: 'run',   label: 'Run',   icon: '🏃', color: '#16A34A' },
];

const FEEL_EMOJI = ['😓', '😐', '🙂', '😊', '🔥'];

// Duration input — separate HH MM SS fields, mobile-friendly numeric pad
function DurationInput({ label, value, onChange }) {
  // Parse incoming hh:mm:ss or mm:ss string into parts
  const parse = (v) => {
    if (!v) return { h: '', m: '', s: '' };
    const parts = v.split(':').map(p => p.replace(/^0+/, '') || '');
    if (parts.length === 3) return { h: parts[0], m: parts[1], s: parts[2] };
    if (parts.length === 2) return { h: '',       m: parts[0], s: parts[1] };
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
    onChange(`${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
  };

  const fieldClass = "w-full bg-[#FFFCF4] border border-[#C5B49A] rounded-xl px-2 py-2 text-[#201A14] font-mono text-center text-base placeholder-[#C5B49A] focus:border-[#0284C7] transition-colors";

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">{label}</label>
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="text-center">
          <input type="number" inputMode="numeric" min="0" max="23"
            value={h} placeholder="0"
            onChange={e => { setH(e.target.value); emit(e.target.value, m, s); }}
            className={fieldClass} />
          <p className="text-[10px] text-[#7A6B5B] mt-0.5">HH</p>
        </div>
        <div className="text-center">
          <input type="number" inputMode="numeric" min="0" max="59"
            value={m} placeholder="00"
            onChange={e => { setM(e.target.value); emit(h, e.target.value, s); }}
            className={fieldClass} />
          <p className="text-[10px] text-[#7A6B5B] mt-0.5">MM</p>
        </div>
        <div className="text-center">
          <input type="number" inputMode="numeric" min="0" max="59"
            value={s} placeholder="00"
            onChange={e => { setS(e.target.value); emit(h, m, e.target.value); }}
            className={fieldClass} />
          <p className="text-[10px] text-[#7A6B5B] mt-0.5">SS</p>
        </div>
      </div>
    </div>
  );
}

// Live metrics card shown after valid input
function MetricsCard({ discipline, distanceM, durationS }) {
  if (!distanceM || !durationS || durationS < 10) return null;
  let metrics = null;
  let paceLabel = '';
  let paceValue = '';
  let extraLabel = '';

  if (discipline === 'swim') {
    metrics = calcSwim(distanceM, durationS);
    paceLabel = 'Pace'; paceValue = `${formatPace(metrics?.pace_s)} /100m`;
    extraLabel = 'Extrapolated 1500m';
  } else if (discipline === 'bike') {
    metrics = calcBike(distanceM, durationS);
    paceLabel = 'Speed'; paceValue = `${metrics?.speed_kmh?.toFixed(1)} km/h`;
    extraLabel = 'Extrapolated 40km';
  } else if (discipline === 'run') {
    metrics = calcRun(distanceM, durationS);
    paceLabel = 'Pace'; paceValue = `${formatPace(metrics?.pace_s)} /km`;
    extraLabel = 'Extrapolated 10km';
  }
  if (!metrics) return null;

  const deltaAbs = Math.abs(metrics.delta_s);
  const deltaStr = `${metrics.onTrack ? '-' : '+'}${formatDuration(deltaAbs)} vs target`;

  return (
    <div className={`rounded-xl border p-4 mt-4
      ${metrics.onTrack
        ? 'bg-[#16A34A]/5 border-[#16A34A]/30'
        : 'bg-[#F87171]/5 border-[#F87171]/30'}`}>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-[#7A6B5B] uppercase tracking-wider">{paceLabel}</p>
          <p className="text-lg font-bold font-mono text-[#201A14] mt-0.5">{paceValue}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#7A6B5B] uppercase tracking-wider">{extraLabel}</p>
          <p className="text-lg font-bold font-mono text-[#201A14] mt-0.5">{formatDuration(metrics.extrapolated_s)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#7A6B5B] uppercase tracking-wider">Status</p>
          <p className={`text-sm font-bold mt-0.5 ${metrics.onTrack ? 'text-[#16A34A]' : 'text-[#F87171]'}`}>
            {metrics.onTrack ? '✅ On Track' : '⚠️ Behind'}
          </p>
          <p className="text-[10px] text-[#7A6B5B]">{deltaStr}</p>
        </div>
      </div>
    </div>
  );
}

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

  const activeColor = DISCIPLINES.find(d => d.key === discipline)?.color || '#0284C7';

  // Compute distance_m and duration_s for metrics card
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

  const Toggle = ({ value, onChange, opts }) => (
    <div className="flex bg-[#FFF8EA] border border-[#E6D8BF] rounded-xl p-1">
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
            ${value === o.v ? 'bg-[#FFFCF4] text-[#201A14] shadow-sm' : 'text-[#7A6B5B] hover:text-[#4F463B]'}`}>
          {o.l}
        </button>
      ))}
    </div>
  );

  const inputClass = "w-full bg-[#FFFCF4] border border-[#C5B49A] rounded-xl px-4 py-2.5 text-[#201A14] font-mono placeholder-[#C5B49A] focus:border-[#0284C7] transition-colors";
  const labelClass = "block text-xs uppercase tracking-widest text-[#7A6B5B] mb-1.5";

  return (
    <div className="pb-24 px-4 pt-0 max-w-lg mx-auto">
	  {/* Discipline tabs — RACL style */}
	  <div className="flex bg-white border-b border-[#E6D8BF] -mx-4 mb-4">
	    {DISCIPLINES.filter(d => d.key !== 'brick' && d.key !== 'gym').map(d => (
		  <button
		    key={d.key}
		    onClick={() => setDiscipline(d.key)}
		    className="flex-1 flex flex-col items-center pt-1.5 pb-1 gap-0.5 transition-all"
		    style={{
			  borderTop:    discipline === d.key ? `3px solid ${d.color}` : '3px solid transparent',
			  borderLeft:   discipline === d.key ? '0.5px solid #E6D8BF'  : '0.5px solid transparent',
			  borderRight:  discipline === d.key ? '0.5px solid #E6D8BF'  : '0.5px solid transparent',
			  borderBottom: discipline === d.key ? '2px solid #FFFCF4'    : 'none',
			  background:   discipline === d.key ? '#FFFCF4' : '#F5EFE3',
			  marginBottom: discipline === d.key ? -1 : 0,
		    }}>
		    <span style={{ fontSize: 15, opacity: discipline === d.key ? 1 : 0.4 }}>{d.icon}</span>
		    <span style={{
			  fontSize: 14,
			  fontWeight: discipline === d.key ? 600 : 400,
			  color: discipline === d.key ? d.color : '#aaa',
			  letterSpacing: 0.2,
		    }}>
			  {d.label}
		    </span>
		  </button>
	    ))}
	  </div>

      {/* Swim form */}
      {discipline === 'swim' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Distance (metres)</label>
              <input type="number" value={swimDist} onChange={e => setSwimDist(e.target.value)}
                placeholder="e.g. 1500" className={inputClass} />
            </div>
          </div>
          <DurationInput label="Duration" value={swimDur} onChange={setSwimDur} />
          <div>
            <label className={labelClass}>Type</label>
            <Toggle value={swimType} onChange={setSwimType}
              opts={[{v:'pool',l:'🏊 Pool'},{v:'open',l:'🌊 Open Water'}]} />
          </div>
          <MetricsCard discipline="swim" distanceM={parseFloat(swimDist)||0} durationS={parseDuration(swimDur)} />
        </div>
      )}

      {/* Bike form */}
      {discipline === 'bike' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Distance (km)</label>
              <input type="number" step="0.1" value={bikeDist} onChange={e => setBikeDist(e.target.value)}
                placeholder="e.g. 40" className={inputClass} />
            </div>
          </div>
          <DurationInput label="Duration" value={bikeDur} onChange={setBikeDur} />
          <div>
            <label className={labelClass}>Type</label>
            <Toggle value={bikeType} onChange={setBikeType}
              opts={[{v:'outdoor',l:'🚴 Outdoor'},{v:'indoor',l:'🏠 Indoor'}]} />
          </div>
          <div>
            <label className={labelClass}>Elevation (m) — optional</label>
            <input type="number" value={bikeElev} onChange={e => setBikeElev(e.target.value)}
              placeholder="e.g. 250" className={inputClass} />
          </div>
          <MetricsCard discipline="bike" distanceM={(parseFloat(bikeDist)||0)*1000} durationS={parseDuration(bikeDur)} />
        </div>
      )}

      {/* Run form */}
      {discipline === 'run' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Distance (km)</label>
              <input type="number" step="0.1" value={runDist} onChange={e => setRunDist(e.target.value)}
                placeholder="e.g. 10" className={inputClass} />
            </div>
          </div>
          <DurationInput label="Duration" value={runDur} onChange={setRunDur} />
          <div>
            <label className={labelClass}>Type</label>
            <Toggle value={runType} onChange={setRunType}
              opts={[{v:'outdoor',l:'🏃 Outdoor'},{v:'treadmill',l:'⚙️ Treadmill'}]} />
          </div>
          <MetricsCard discipline="run" distanceM={(parseFloat(runDist)||0)*1000} durationS={parseDuration(runDur)} />
        </div>
      )}

      {/* How it felt */}
      <div className="mt-3">
        <label className={labelClass}>How did it feel?</label>
        <div className="flex gap-2">
          {FEEL_EMOJI.map((emoji, i) => (
            <button key={i} onClick={() => setFeel(i + 1)}
              className={`flex-1 py-2 rounded-xl text-xl transition-all border
                ${feel === i+1
                  ? 'border-[#0284C7] bg-[#0284C7]/10'
                  : 'border-[#E6D8BF] bg-[#FFFCF4] opacity-60 hover:opacity-90'}`}>
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <label className={labelClass}>Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="How was the session? Any issues?"
          rows={2}
          className="w-full bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-xl px-4 py-3 text-[#201A14] placeholder-[#B8AA96] focus:border-[#0284C7] transition-colors resize-none text-sm" />
      </div>

      {/* Save button */}
      <button onClick={handleSave}
        disabled={!canSave() || saving}
        className="w-full mt-3 py-3 rounded-2xl font-bold text-white transition-all text-base disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: saved ? '#16A34A' : canSave() ? activeColor : '#D7C4A5' }}>
        {saved ? '✅ Saved!' : saving ? 'Saving…' : 'Save Session'}
      </button>
    </div>
  );
}
