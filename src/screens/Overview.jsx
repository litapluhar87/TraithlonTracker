import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getPlanConfig, getWeekDates, sameDay, shortDay, currentWeek, formatDuration } from '../utils/raceConfig';

const DISCIPLINE_COLOR = { swim: '#38BDF8', bike: '#F97316', run: '#4ADE80', gym: '#A78BFA', brick: '#FB923C' };
const DISCIPLINE_ICON  = { swim: '🏊', bike: '🚴', run: '🏃', gym: '💪', brick: '⚡' };

export default function Overview() {
  const { activities } = useApp();
  const today = new Date();
  const [selectedWeek, setSelectedWeek] = useState(null);

  const { totalWeeks, raceStr } = getPlanConfig();
  const curWeek = currentWeek();

  // Day headers — derived from Week 1 dates (so they reflect actual start day)
  const week1Dates = getWeekDates(1);
  const dayHeaders = week1Dates.map(d => shortDay(d).slice(0, 2));

  // For each week × day, find activities
  const heatmapData = useMemo(() => {
    return Array.from({ length: totalWeeks }, (_, wi) => {
      const weekDays = getWeekDates(wi + 1);
      return weekDays.map(date => {
        const dayActs = activities.filter(a => sameDay(new Date(a.start_date), date));
        return { date, activities: dayActs };
      });
    });
  }, [activities, totalWeeks]);

  const weekStats = useMemo(() => {
    return heatmapData.map((week) => {
      const allActs = week.flatMap(d => d.activities);
      const totalDist = allActs.reduce((s, a) => s + (a.distance_m || 0), 0);
      const types = [...new Set(allActs.map(a => a.type))];
      return { count: allActs.length, totalDist, types };
    });
  }, [heatmapData]);

  const getCellColor = (dayData) => {
    if (!dayData.activities.length) return '#161A23';
    return DISCIPLINE_COLOR[dayData.activities[0].type] || '#6B7280';
  };

  const getCellOpacity = (dayData) => {
    if (!dayData.activities.length) return 1;
    const totalDist = dayData.activities.reduce((s, a) => s + (a.distance_m || 0), 0);
    if (totalDist > 20000) return 1;
    if (totalDist > 10000) return 0.75;
    if (totalDist > 5000)  return 0.55;
    return 0.4;
  };

  const isPastWeek = (wi) => {
    const lastDay = getWeekDates(wi + 1)[6];
    return lastDay < today;
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-2">{totalWeeks}-Week Overview</h1>
      <p className="text-sm text-[#6B7280] mb-5">Tap a week to see details</p>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        {Object.entries(DISCIPLINE_ICON).map(([key, icon]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: DISCIPLINE_COLOR[key] }} />
            <span className="text-[11px] text-[#6B7280] capitalize">{key}</span>
          </div>
        ))}
      </div>

      {/* Day headers — dynamic based on start date */}
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-1 mb-1">
        <div />
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-[10px] text-[#6B7280] text-center">{d}</div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="space-y-1">
        {heatmapData.map((week, wi) => {
          const isCurrent = wi + 1 === curWeek;
          const isPast    = isPastWeek(wi);
          const stats     = weekStats[wi];

          return (
            <div key={wi}>
              <button
                onClick={() => setSelectedWeek(selectedWeek === wi ? null : wi)}
                className={`w-full grid grid-cols-[40px_repeat(7,1fr)] gap-1 items-center rounded-xl p-1 transition-all
                  ${isCurrent ? 'bg-[#38BDF8]/5 ring-1 ring-[#38BDF8]/40' : 'hover:bg-[#161A23]'}`}>

                {/* Week label */}
                <div className="text-left pl-1">
                  <p className={`text-xs font-semibold
                    ${isCurrent ? 'text-[#38BDF8]' : isPast ? 'text-[#4B5563]' : 'text-[#6B7280]'}`}>
                    W{wi + 1}
                  </p>
                </div>

                {/* Day cells */}
                {week.map((dayData, di) => {
                  const isToday = sameDay(dayData.date, today);
                  const hasAct  = dayData.activities.length > 0;
                  const color   = getCellColor(dayData);
                  const opacity = getCellOpacity(dayData);

                  return (
                    <div key={di}
                      className={`h-8 rounded-md flex items-center justify-center relative transition-all
                        ${isToday ? 'ring-2 ring-white/40' : ''}`}
                      style={{
                        backgroundColor: hasAct ? color : '#161A23',
                        opacity: hasAct ? opacity : (isPast && !isToday ? 0.4 : 1),
                      }}>
                      {hasAct && dayData.activities.length > 1 && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/60" />
                      )}
                      {isToday && !hasAct && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                      )}
                    </div>
                  );
                })}
              </button>

              {/* Expanded week detail */}
              {selectedWeek === wi && (
                <div className="mt-1 mb-2 bg-[#161A23] border border-[#252B38] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Week {wi + 1}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {getWeekDates(wi + 1)[0].toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                        {' – '}
                        {getWeekDates(wi + 1)[6].toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {stats.types.map(t => (
                        <span key={t} style={{ color: DISCIPLINE_COLOR[t] }} className="text-base">
                          {DISCIPLINE_ICON[t]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-[#6B7280]">Sessions</p>
                      <p className="font-bold text-white">{stats.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Volume</p>
                      <p className="font-bold text-white">
                        {stats.totalDist >= 1000
                          ? `${(stats.totalDist / 1000).toFixed(1)} km`
                          : `${stats.totalDist} m`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Disciplines</p>
                      <p className="font-bold text-white">{stats.types.length}</p>
                    </div>
                  </div>
                  {stats.count === 0 && (
                    <p className="text-center text-[#4B5563] text-xs mt-3">
                      {isPast ? 'No sessions logged this week' : 'Nothing logged yet'}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Race day marker */}
      <div className="mt-4 bg-[#F97316]/10 border border-[#F97316]/30 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">🏁</span>
        <div>
          <p className="font-semibold text-white text-sm">Race Day</p>
          <p className="text-xs text-[#6B7280]">
            {new Date(raceStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            {' · '}Ojhar Bergman Olympic Triathlon
          </p>
        </div>
      </div>
    </div>
  );
}
