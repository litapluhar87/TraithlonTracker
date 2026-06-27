import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { daysToRace } from '../utils/raceConfig';

export default function Login() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!name.trim()) return;
    setLoading(true);
    // Generate a stable user_id from name (simple hash for v1 no-password auth)
    const userId = btoa(name.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
    const userData = {
      user_id: userId,
      firstname: name.trim().split(' ')[0],
      lastname: name.trim().split(' ').slice(1).join(' ') || '',
      displayName: name.trim(),
    };
    login(userData);
    setLoading(false);
    navigate('/log');
  };

  const days = daysToRace();

  return (
    <div className="min-h-screen bg-[#FFF8EA] flex flex-col items-center justify-center px-6">
      {/* Logo area */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-3xl">🏊</span>
          <span className="text-3xl">🚴</span>
          <span className="text-3xl">🏃</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#201A14]">TriTracker</h1>
        <p className="text-[#7A6B5B] text-sm mt-1">Ojhar Bergman Olympic Triathlon · 4 Oct 2026</p>
      </div>

      {/* Countdown teaser */}
      <div className="mb-10 bg-[#FFFCF4] border border-[#E6D8BF] shadow-sm rounded-2xl px-8 py-5 text-center">
        <p className="text-[#7A6B5B] text-xs uppercase tracking-widest mb-1">Race day in</p>
        <p className="text-5xl font-black font-mono text-[#0284C7]">{days}</p>
        <p className="text-[#7A6B5B] text-sm mt-1">days</p>
      </div>

      {/* Name input */}
      <div className="w-full max-w-sm">
        <label className="block text-xs uppercase tracking-widest text-[#7A6B5B] mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          placeholder="e.g. Priya Sharma"
          className="w-full bg-[#FFFCF4] border border-[#E6D8BF] rounded-xl px-4 py-3 text-[#201A14] placeholder-[#B8AA96] text-base focus:border-[#0284C7] transition-colors"
          autoFocus
        />
        <button
          onClick={handleStart}
          disabled={!name.trim() || loading}
          className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-base"
        >
          {loading ? 'Starting…' : "Let's Train →"}
        </button>
        <p className="text-center text-[#9A8A76] text-xs mt-4">No password needed · Your data stays on your device</p>
      </div>
    </div>
  );
}
