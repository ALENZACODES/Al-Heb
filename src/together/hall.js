// @ts-check
// Family board (R5) and Study Hall (R9): the learners on this device side by side, a weekly goal they share, and what
// each one did lately. Real people in the same house, read from their own saved data on this device. No server, no live
// presence, and nothing made up: unlike the League, there are no invented names here. No DOM.
import { readReg, writeReg } from '../shell/profile-slots.js';
import { nat } from './share.js';

export const GOAL_CHOICES = Object.freeze([0, 5, 10, 15, 20, 30]);
export const LESSON_MILESTONES = Object.freeze([1, 5, 10, 25, 50, 100]);
export const STREAK_MILESTONES = Object.freeze([3, 7, 14, 30, 60, 100]);
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };

/**
 * The board. Ranked by XP this week, then lessons this week, then streak, then name. With `calm` (Calm mode on) nobody is
 * ranked: the rows come in name order and carry no place.
 * @param {{name:string, xpWeek:number, lessonsWeek:number, streak:number}[]} rows
 */
export function board(rows, { calm = false } = {}) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (calm) return [...rows].sort(byName).map((r) => ({ ...r, place: 0 }));
  const sorted = [...rows].sort((a, b) => b.xpWeek - a.xpWeek || b.lessonsWeek - a.lessonsWeek || b.streak - a.streak || byName(a, b));
  let place = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.xpWeek !== r.xpWeek || prev.lessonsWeek !== r.lessonsWeek || prev.streak !== r.streak) place = i + 1; // equal rows share a place
    return { ...r, place };
  });
}

/** The household's weekly goal in lessons (0 = none set). Kept with the household list, so every profile sees the same one. */
export function getGoal(s = ls()) { try { const g = nat(readReg(s).hall?.goal); return GOAL_CHOICES.includes(g) ? g : 0; } catch { return 0; } }
export function setGoal(goal, s = ls()) { const reg = readReg(s); reg.hall = { ...(reg.hall || {}), goal: GOAL_CHOICES.includes(goal) ? goal : 0 }; writeReg(reg, s); return reg.hall.goal; }
/** How far the house is toward the goal this week. */
export function goalProgress(rows, goal) {
  const done = rows.reduce((a, r) => a + nat(r.lessonsWeek), 0);
  return { goal, done, left: Math.max(0, goal - done), reached: goal > 0 && done >= goal };
}

/** What each learner did lately, newest first. @param {{name:string, recent:{id:string, at:number}[]}[]} rows */
export function activity(rows, limit = 8) {
  return rows.flatMap((r) => (r.recent || []).map((x) => ({ name: r.name, id: x.id, at: x.at }))).sort((a, b) => b.at - a.at).slice(0, limit);
}

/** The milestones each learner has reached: lessons finished and the streak they are on. */
export function achievements(rows) {
  return rows.map((r) => {
    const top = (list, n) => [...list].reverse().find((m) => n >= m) || 0;
    const lessons = top(LESSON_MILESTONES, r.lessons), streak = top(STREAK_MILESTONES, r.streak);
    const lines = [];
    if (lessons) lines.push(`${lessons} ${lessons === 1 ? 'lesson' : 'lessons'} finished`);
    if (streak) lines.push(`${streak}-day streak`);
    if (r.awards) lines.push(`${r.awards} ${r.awards === 1 ? 'award' : 'awards'}`);
    return { name: r.name, lines };
  }).filter((a) => a.lines.length);
}

/** 'today', 'yesterday', '3 days ago', or a date. */
export function ago(at, now = Date.now()) {
  const day = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const n = Math.round((day(now) - day(at)) / 86400000);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? `${n} days ago` : new Date(at).toLocaleDateString('en-CA');
}
