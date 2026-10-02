/**
 * ExpiryCountdown
 * Shows a live countdown to a listing's availableUntil time.
 * Urgency escalates as the deadline approaches:
 *   > 2 h  → calm green info pill
 *   1–2 h  → amber warning
 *   < 1 h  → orange urgent
 *   < 15 m → red critical with pulse animation
 *   expired → red "Expired" badge
 */
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const getTimeRemaining = (until) => {
  const diff = new Date(until) - Date.now();
  if (diff <= 0) return null; // expired
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, totalSec };
};

const pad = (n) => String(n).padStart(2, '0');

/**
 * @param {string}  until     – ISO date string (timeWindow.availableUntil)
 * @param {'pill'|'banner'|'inline'} variant  – display style
 * @param {string}  className – extra Tailwind classes
 */
const ExpiryCountdown = ({ until, variant = 'pill', className = '' }) => {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(until));

  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => {
      setRemaining(getTimeRemaining(until));
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!until) return null;

  // --- Expired ---
  if (!remaining) {
    if (variant === 'inline') {
      return (
        <span className={`text-xs font-semibold ${className}`} style={{ color: '#dc2626' }}>
          Expired
        </span>
      );
    }
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}
        style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
      >
        <Clock className="w-3 h-3" />
        Expired
      </div>
    );
  }

  const { h, m, s, totalSec } = remaining;
  const timeStr = h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(s)}`;

  // Urgency level
  let level;
  if (totalSec > 7200)
    level = 'calm'; // > 2 h
  else if (totalSec > 3600)
    level = 'warn'; // 1–2 h
  else if (totalSec > 900)
    level = 'urgent'; // 15 min–1 h
  else level = 'critical'; // < 15 min

  const styles = {
    calm: { bg: 'var(--color-primary)', text: 'var(--color-solid)', border: 'transparent' },
    warn: { bg: '#fff7ed', text: '#b45309', border: 'transparent' },
    urgent: { bg: '#fff3e0', text: 'var(--color-solidOne)', border: 'transparent' },
    critical: { bg: '#fef2f2', text: '#dc2626', border: 'transparent' },
  };

  const { bg, text } = styles[level];
  const pulse = level === 'critical' ? 'animate-pulse' : '';

  const label = `Expires in ${timeStr}`;

  if (variant === 'inline') {
    return (
      <span className={`text-xs font-semibold ${pulse} ${className}`} style={{ color: text }}>
        {label}
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-4 py-3 ${pulse} ${className}`}
        style={{ backgroundColor: bg }}
      >
        <Clock className="w-4 h-4 shrink-0" style={{ color: text }} />
        <div>
          <p className="text-xs font-semibold leading-none" style={{ color: text }}>
            {level === 'critical' ? '⚠️ Grab it now!' : 'Time-sensitive deal'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: text, opacity: 0.85 }}>
            {label}
          </p>
        </div>
      </div>
    );
  }

  // default: pill
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pulse} ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      <Clock className="w-3 h-3" />
      {label}
    </div>
  );
};

export default ExpiryCountdown;
