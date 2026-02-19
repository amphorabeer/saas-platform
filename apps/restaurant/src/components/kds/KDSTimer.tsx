'use client';

import { useState, useEffect, useRef } from 'react';
import { playSound } from './KDSSoundManager';

/** Elapsed time from createdAt (or startedAt when PREPARING). Updates every second. */
export function KDSTimer({
  createdAt,
  startedAt,
  status,
  soundOn,
}: {
  createdAt: string;
  startedAt: string | null;
  status: string;
  soundOn?: boolean;
}) {
  const from = status === 'PREPARING' && startedAt ? new Date(startedAt).getTime() : new Date(createdAt).getTime();
  const [elapsedSec, setElapsedSec] = useState(() => Math.floor((Date.now() - from) / 1000));
  const alertPlayedRef = useRef(false);
  const delayThreshold = status === 'NEW' ? 10 * 60 : status === 'PREPARING' ? 10 * 60 : Infinity;

  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - from) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [from]);

  useEffect(() => {
    if (soundOn && elapsedSec >= delayThreshold && !alertPlayedRef.current) {
      alertPlayedRef.current = true;
      playSound('alert');
    }
  }, [elapsedSec, delayThreshold, soundOn]);

  const min = Math.floor(elapsedSec / 60);
  const sec = elapsedSec % 60;
  const text = `${min}:${sec.toString().padStart(2, '0')}`;
  const isWarning = elapsedSec >= 5 * 60 && elapsedSec < 10 * 60;
  const isDelayed = elapsedSec >= 10 * 60;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-sm font-medium ${
        isDelayed ? 'text-red-400 pulse-delayed' : isWarning ? 'text-amber-400' : 'text-emerald-400'
      }`}
    >
      ⏱️ {text}
    </span>
  );
}
