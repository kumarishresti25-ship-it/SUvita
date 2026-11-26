import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EcoGrade } from '../shared/types';
import { GRADE_LABELS } from '../shared/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getGradeStyle(grade: EcoGrade): {
  text: string;
  bg: string;
  border: string;
  bar: string;
  label: string;
} {
  switch (grade) {
    case 'A':
      return {
        text: 'text-[#00FFAA]',
        bg: 'bg-[#00FFAA]/12',
        border: 'border-[#00FFAA]/30',
        bar: 'bg-[#00FFAA]',
        label: GRADE_LABELS.A,
      };
    case 'B':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-400/12',
        border: 'border-emerald-400/30',
        bar: 'bg-emerald-400',
        label: GRADE_LABELS.B,
      };
    case 'C':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-400/12',
        border: 'border-amber-400/30',
        bar: 'bg-amber-400',
        label: GRADE_LABELS.C,
      };
    case 'D':
      return {
        text: 'text-orange-400',
        bg: 'bg-orange-400/12',
        border: 'border-orange-400/30',
        bar: 'bg-orange-400',
        label: GRADE_LABELS.D,
      };
    case 'E':
      return {
        text: 'text-[#E05A5A]',
        bg: 'bg-[#E05A5A]/12',
        border: 'border-[#E05A5A]/30',
        bar: 'bg-[#E05A5A]',
        label: GRADE_LABELS.E,
      };
    default:
      return {
        text: 'text-[#A0AAA5]',
        bg: 'bg-white/5',
        border: 'border-white/12',
        bar: 'bg-[#A0AAA5]',
        label: GRADE_LABELS.INSUFFICIENT_DATA,
      };
  }
}

export function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatShortDate(iso);
  } catch {
    return '';
  }
}
