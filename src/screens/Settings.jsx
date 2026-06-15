import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getPlanConfig } from '../utils/raceConfig';
import { LogOut, Save, Calendar, Flag, Info } from 'lucide-react';

export default function Settings() {
  const { user, logout, setActivities } = useApp();

  const cfg = getPlanConfig();
  const [startDate, setStartDate] = useState(cfg.startStr);
  const [endDate,   setEndDate]   = useState(cfg.endStr);
  const [raceDate,  setRaceDate]  = useState(cfg.raceStr);
  const [saved, setSaved] = useState(false);

  // Live preview of calculated weeks
  const calcWeeks = () => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate + 'T00:00:00');
    const r = new Date(endDate   + 'T00:00:00');
    if (r <= s) return null;
    const diffDays = Math.ceil((r - s) / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  const startDayName = () => {
    if (!startDate) return '';
    return new Date(startDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long' });
  };

  const weeks = calcWeeks();
  const isValid = weeks !== null && weeks >= 4 && weeks <= 52 && raceDate > endDate;

  const handleSave = () => {
    if (!isValid) return;
	localStorage.setItem('tt_plan_start', startDate);
	localStorage.setItem('tt_plan_end',   endDate);
	localStorage.setItem('tt_race_date',  raceDate);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Force a re-render across app by reloading — simplest approach
    // since getPlanConfig() is called at render time in each screen
    window.location.reload();
  };

  const handleLogout = () => {
    if (window.confirm(`Log out and clear all local data for "${user?.displayName}"?\n\nNote: Any activities saved to the backend will remain in the database.`)) {
      setActivities([]);
      logout();
    }
  };

  const handleClearPlan = () => {
    if (window.confirm('Reset plan dates to default (15 Jun 2026 – 4 Oct 2026)?')) {
	  localStorage.removeItem('tt_plan_start');
	  localStorage.removeItem('tt_plan_end');
	  localStorage.removeItem('tt_race_date');
      window.location.reload();
    }
  };

  const labelClass = "block text-xs uppercase tracking-widest text-[#6B7280] mb-2";
  const inputClass = "w-full bg-[#0D0F14] border border-[#252B38] rounded-xl px-4 py-3 text-white font-mono focus:border-[#38BDF8] transition-colors";

  return (
    <div className="pb-28 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Settings</h1>
      <p className="text-sm text-[#6B7280] mb-6">Logged in as <span className="text-white">{user?.displayName}</span></p>

      {/* Plan dates */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[#38BDF8]" />
          <p className="text-sm font-semibold text-white">Training Plan Dates</p>
        </div>

        <div className="space-y-4">
          <div>
			<label className={labelClass}>Plan Start Date</label>
			<input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setSaved(false); }}
			  className={inputClass} />
			{startDate && (
			  <p className="text-xs text-[#6B7280] mt-1.5">
			    Week 1 starts on a <span className="text-[#38BDF8]">{startDayName()}</span>
				{' — that will be Day 1 of the plan'}
			  </p>
			)}
		  </div>

		  <div>
			<label className={labelClass}>Plan End Date</label>
			<input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setSaved(false); }}
			  className={inputClass} />
			<p className="text-xs text-[#6B7280] mt-1.5">
			  Last day of tracked training. Taper week follows after this.
			</p>
		  </div>

		  <div>
			<label className={labelClass}>Race Date</label>
			<input type="date" value={raceDate}
			  onChange={e => {
				const newRace = e.target.value;
				setRaceDate(newRace);
				setSaved(false);
				// Auto-set end date to 7 days before race if end date hasn't been manually pushed past that
				const autoEnd = new Date(newRace + 'T00:00:00');
				autoEnd.setDate(autoEnd.getDate() - 7);
				setEndDate(autoEnd.toISOString().split('T')[0]);
			  }}
			  className={inputClass} />
			<p className="text-xs text-[#6B7280] mt-1.5">
			  Changing Race Date auto-sets End Date to 1 week prior.
			</p>
		  </div>

          {/* Live preview */}
          {startDate && raceDate && (
            <div className={`rounded-xl p-4 border ${
              isValid
                ? 'bg-[#38BDF8]/5 border-[#38BDF8]/30'
                : 'bg-[#F87171]/5 border-[#F87171]/30'
            }`}>
              {isValid ? (
                <div className="grid grid-cols-2 gap-3 text-center">
				  <div>
					<p className="text-[10px] text-[#6B7280] uppercase tracking-wider">Training Weeks</p>
					<p className="text-2xl font-black font-mono text-[#38BDF8] mt-0.5">{weeks}</p>
				  </div>
				  <div>
				    <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">Start Day</p>
				    <p className="text-sm font-bold text-white mt-1">{startDayName()}</p>
				  </div>
				  <div>
					<p className="text-[10px] text-[#6B7280] uppercase tracking-wider">Plan Ends</p>
					<p className="text-sm font-bold text-white mt-1">
					  {new Date(endDate + 'T00:00:00').toLocaleDateString('en', { day:'numeric', month:'short' })}
					</p>
				  </div>
				  <div>
					<p className="text-[10px] text-[#6B7280] uppercase tracking-wider">Race Day</p>
					<p className="text-sm font-bold text-[#F97316] mt-1">
					  {new Date(raceDate + 'T00:00:00').toLocaleDateString('en', { day:'numeric', month:'short' })}
					</p>
				  </div>
				</div>
              ) : (
                <p className="text-[#F87171] text-sm text-center">
                  {weeks === null
                    ? 'Race date must be after start date'
                    : weeks < 4
                    ? 'Plan must be at least 4 weeks'
                    : 'Plan cannot exceed 52 weeks'}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={!isValid}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: saved ? '#4ADE80' : '#38BDF8', color: '#0D0F14' }}>
              <Save size={15} />
              {saved ? 'Saved! Reloading…' : 'Save & Apply'}
            </button>
            <button onClick={handleClearPlan}
              className="px-4 py-3 rounded-xl border border-[#252B38] text-[#6B7280] hover:text-white hover:border-[#374151] text-sm transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3">
          <Info size={15} className="text-[#6B7280] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#6B7280] space-y-1.5 leading-relaxed">
            <p>The plan week always starts on your chosen <span className="text-[#9CA3AF]">Start Date</span> — regardless of what day of the week it falls on.</p>
            <p>e.g. if you start on a Tuesday, Week 1 is Tue–Mon, Week 2 is Tue–Mon, and so on.</p>
            <p>Number of weeks is calculated automatically from the two dates.</p>
          </div>
        </div>
      </div>

      {/* Race info */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Flag size={16} className="text-[#F97316]" />
          <p className="text-sm font-semibold text-white">Race Details</p>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Race', value: 'Ojhar Bergman Olympic Triathlon' },
            { label: 'Type', value: 'Olympic Distance' },
            { label: 'Swim', value: '1500m · Target 1:00:00 · 4:00/100m' },
            { label: 'Bike', value: '40km · Target 2:05:00 · 19.2 km/h' },
            { label: 'Run',  value: '10km · Target 1:40:00 · 10:00/km' },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-3">
              <span className="text-[#6B7280] w-10 flex-shrink-0">{label}</span>
              <span className="text-[#9CA3AF]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="bg-[#161A23] border border-[#252B38] rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-3">Account</p>
        <button onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-[#F87171]/30 text-[#F87171] hover:bg-[#F87171]/10 transition-colors text-sm font-medium flex items-center justify-center gap-2">
          <LogOut size={15} />
          Log Out & Clear Local Data
        </button>
        <p className="text-[10px] text-[#374151] text-center mt-2">
          Activities saved to the backend will not be deleted
        </p>
      </div>
    </div>
  );
}
