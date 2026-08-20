import { StreetCupState, StreetCupOpponent } from './types';
import {
  STREET_CUP_MATCH_HOUR, STREET_CUP_CYCLE_DAYS,
  STREET_CUP_NAMES, STREET_CUP_COUNTRIES,
  STREET_CUP_BOOST_PERCENT,
} from './constants';

/** Seed-based pseudo-random (deterministic per cup) */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/** Days elapsed since cup started (local to the player's cup) */
export function getCupDayIndex(cupStartDate: string, now: Date): number {
  const start = new Date(cupStartDate + 'T00:00:00');
  const todayStr = now.toISOString().split('T')[0] ?? '';
  const today = new Date(todayStr + 'T00:00:00');
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

/** Which round is it for this cup?
 *  Day 0 = R16 (round 1), Day 1 = QF (round 2), Day 2 = SF (round 3), Day 3 = Final (round 4),
 *  Day 4+ = rest / cup expired */
export function getCurrentRound(now: Date, cupStartDate?: string): number {
  if (!cupStartDate) return 0;
  const dayIdx = getCupDayIndex(cupStartDate, now);
  if (dayIdx < 0) return 0;
  if (dayIdx >= 4) return 0; // rest / expired
  return dayIdx + 1; // day 0→round 1, day 1→round 2, etc.
}

/** Is this cup expired (5+ days old)? */
export function isCupExpired(cupStartDate: string, now: Date): boolean {
  return getCupDayIndex(cupStartDate, now) >= STREET_CUP_CYCLE_DAYS;
}

/** Debug: override match time to exact ms timestamp */
let _debugMatchTime: number | null = null;
export function setDebugMatchTime(ms: number | null): void { _debugMatchTime = ms; }

/** Has today's match time (15:00) passed? */
export function hasMatchTimePassed(now: Date): boolean {
  if (_debugMatchTime !== null) return now.getTime() >= _debugMatchTime;
  return now.getHours() >= STREET_CUP_MATCH_HOUR;
}

/** Generate a new cup bracket. cupStartDate = today's ISO date string. */
export function generateCup(teamPower: number, cupStartDate: string): StreetCupState {
  const rand = seededRand(hashStr(cupStartDate + '_' + Date.now()));
  const playerSlot = 0; // always top of bracket so player sees themselves first

  // Shuffle names
  const names = [...STREET_CUP_NAMES].sort(() => rand() - 0.5);
  const countries = [...STREET_CUP_COUNTRIES].sort(() => rand() - 0.5);

  const bracket: (StreetCupOpponent | null)[] = [];
  for (let i = 0; i < 16; i++) {
    if (i === playerSlot) {
      bracket.push(null); // player slot
    } else {
      // Power scales by bracket proximity: closer to player = weaker
      let minP = 400, maxP = 600;
      if (Math.floor(i / 2) === Math.floor(playerSlot / 2)) {
        minP = 400; maxP = 600;   // R16 opponent
      } else if (Math.floor(i / 4) === Math.floor(playerSlot / 4)) {
        minP = 500; maxP = 700;   // potential QF opponent
      } else if (Math.floor(i / 8) === Math.floor(playerSlot / 8)) {
        minP = 600; maxP = 850;   // potential SF opponent
      } else {
        minP = 750; maxP = 1000;  // potential Final opponent
      }
      const power = Math.round(minP + rand() * (maxP - minP));
      bracket.push({
        name: names[i % names.length] ?? 'FC Unknown',
        country: countries[i % countries.length] ?? 'gb',
        power,
      });
    }
  }

  return {
    cupStartDate,
    bracket,
    results: new Array(15).fill(null),
    scores: new Array(15).fill(null),
    playerSlot,
    boostedRound: null,
    boostedRounds: [],
    lastViewedRound: 0,
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + (s.charCodeAt(i) ?? 0)) | 0;
  }
  return Math.abs(h) || 1;
}

/** Get the match index in results array for a given round (1-4) and position within round */
export function getMatchIndex(round: number, posInRound: number): number {
  // R1: 0-7, R2(QF): 8-11, R3(SF): 12-13, R4(F): 14
  if (round === 1) return posInRound;
  if (round === 2) return 8 + posInRound;
  if (round === 3) return 12 + posInRound;
  return 14;
}

/** Get how many matches are in a round */
export function matchesInRound(round: number): number {
  if (round === 1) return 8;
  if (round === 2) return 4;
  if (round === 3) return 2;
  return 1;
}

/** Find which match slot involves the player in a given round.
 *  Returns -1 if player is eliminated. */
export function getPlayerMatchInRound(cup: StreetCupState, round: number): number {
  if (round === 1) return Math.floor(cup.playerSlot / 2);
  // For later rounds, trace the player through wins
  let slot = cup.playerSlot;
  for (let r = 1; r < round; r++) {
    const matchPos = Math.floor(slot / 2);
    const matchIdx = getMatchIndex(r, matchPos);
    const result = cup.results[matchIdx];
    if (!result) return -1; // not played yet
    // slot in pair: even=top, odd=bottom
    const isTop = slot % 2 === 0;
    const won = (isTop && result === 'W') || (!isTop && result === 'L');
    // Actually for player matches: W = player won, L = top seed won (non-player)
    // Let me simplify: for the player's match, W always means player advances
    // For non-player matches, we store result from top seed perspective
    // But we need to check if this is the player's match
    const playerMatch = getPlayerMatchInRound(cup, r);
    if (matchPos === playerMatch) {
      // This IS the player's match
      if (result !== 'W') return -1; // player lost
    }
    // Advance: winner goes to next round slot = matchPos
    slot = matchPos;
  }
  return Math.floor(slot / 2);
}

/** Simulate a match result between two powers. Returns { topWin, topScore, botScore }. */
export function simulateMatch(power1: number, power2: number, seed: number): { topWin: boolean; topScore: number; botScore: number } {
  const rand = seededRand(seed);
  const total = power1 + power2;
  const p1Chance = power1 / total;
  // Generate score: 3-5 total goals typically
  const totalGoals = 1 + Math.floor(rand() * 4); // 1-4
  let topScore = 0;
  let botScore = 0;
  for (let i = 0; i < totalGoals; i++) {
    if (rand() < p1Chance) topScore++;
    else botScore++;
  }
  // Ensure there's a winner (no draws in cup)
  if (topScore === botScore) {
    if (rand() < p1Chance) topScore++;
    else botScore++;
  }
  return { topWin: topScore > botScore, topScore, botScore };
}

/** Simulate all matches for a round.
 *  forcePlayerWin: if true, player auto-advances (used for catch-up on newly generated cups). */
export function simulateRound(
  cup: StreetCupState,
  round: number,
  teamPower: number,
  boosted: boolean,
  dateSeed: number,
  forcePlayerWin?: boolean,
): StreetCupState {
  const updated = { ...cup, results: [...cup.results], scores: [...(cup.scores ?? new Array(15).fill(null))] };
  const count = matchesInRound(round);
  const playerMatchPos = getPlayerMatchInRound(cup, round);

  for (let i = 0; i < count; i++) {
    const matchIdx = getMatchIndex(round, i);
    if (updated.results[matchIdx] != null) continue; // already played

    if (i === playerMatchPos && playerMatchPos >= 0) {
      if (forcePlayerWin) {
        const playerIsTop = isPlayerTopSeed(cup, round, i);
        updated.results[matchIdx] = playerIsTop ? 'W' : 'L';
        updated.scores[matchIdx] = playerIsTop ? [2, 0] : [0, 2];
      } else {
        const opponentPower = getOpponentPowerForMatch(cup, round, i);
        const effectivePower = boosted ? teamPower * (1 + STREET_CUP_BOOST_PERCENT / 100) : teamPower;
        const playerIsTop = isPlayerTopSeed(cup, round, i);
        const p1 = playerIsTop ? effectivePower : opponentPower;
        const p2 = playerIsTop ? opponentPower : effectivePower;
        const { topWin, topScore, botScore } = simulateMatch(p1, p2, dateSeed + matchIdx);
        updated.results[matchIdx] = topWin ? 'W' : 'L';
        updated.scores[matchIdx] = [topScore, botScore];
      }
    } else {
      const p1 = getPowerForSlot(cup, round, i, true);
      const p2 = getPowerForSlot(cup, round, i, false);
      const { topWin, topScore, botScore } = simulateMatch(p1, p2, dateSeed + matchIdx + 100);
      updated.results[matchIdx] = topWin ? 'W' : 'L';
      updated.scores[matchIdx] = [topScore, botScore];
    }
  }
  if (boosted) updated.boostedRound = round;
  return updated;
}

/** Check if the player is the top seed in a match */
function isPlayerTopSeed(cup: StreetCupState, round: number, posInRound: number): boolean {
  if (round === 1) {
    return cup.playerSlot % 2 === 0 && Math.floor(cup.playerSlot / 2) === posInRound;
  }
  let slot = cup.playerSlot;
  for (let r = 1; r < round; r++) {
    slot = Math.floor(slot / 2);
  }
  return slot % 2 === 0;
}

/** Get power for a slot in a match (top or bottom) */
function getPowerForSlot(cup: StreetCupState, round: number, posInRound: number, isTop: boolean): number {
  if (round === 1) {
    const slotIdx = posInRound * 2 + (isTop ? 0 : 1);
    const opp = cup.bracket[slotIdx];
    return opp?.power ?? 500;
  }
  // Trace back winner from previous round
  const prevRound = round - 1;
  const prevPos = posInRound * 2 + (isTop ? 0 : 1);
  const prevMatchIdx = getMatchIndex(prevRound, prevPos);
  const prevResult = cup.results[prevMatchIdx];
  if (!prevResult) return 500;
  // Winner of prev match advances
  // W = top won, L = bottom won
  const winnerIsTop = prevResult === 'W';
  return getPowerForSlot(cup, prevRound, prevPos, winnerIsTop);
}

/** Get opponent power for the player's match in a given round */
export function getOpponentPowerForMatch(cup: StreetCupState, round: number, posInRound: number): number {
  // Player is one side, opponent is the other
  // Determine which side is the player
  if (round === 1) {
    const playerSide = cup.playerSlot % 2 === 0; // true = top
    const oppSlotIdx = posInRound * 2 + (playerSide ? 1 : 0);
    return cup.bracket[oppSlotIdx]?.power ?? 500;
  }
  // For later rounds, the opponent is the winner from the other branch
  // Simplified: just get the non-player side power
  let playerIsTop = true;
  let traceSlot = cup.playerSlot;
  for (let r = 1; r < round; r++) {
    traceSlot = Math.floor(traceSlot / 2);
  }
  playerIsTop = traceSlot % 2 === 0;
  return getPowerForSlot(cup, round, posInRound, !playerIsTop);
}

/** Get time until next match (ms) */
export function getTimeUntilMatch(now: Date): number {
  if (_debugMatchTime !== null) return Math.max(0, _debugMatchTime - now.getTime());
  const target = new Date(now);
  target.setHours(STREET_CUP_MATCH_HOUR, 0, 0, 0);
  if (now >= target) {
    // Next day
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

/** Check if player is still in the tournament */
export function isPlayerAlive(cup: StreetCupState, upToRound: number): boolean {
  for (let r = 1; r <= upToRound; r++) {
    const pos = getPlayerMatchInRound(cup, r);
    if (pos < 0) return false;
    const matchIdx = getMatchIndex(r, pos);
    const result = cup.results[matchIdx];
    if (result === 'L') return false;
    if (result == null) return true; // not played yet, still alive
  }
  return true;
}

/** Get the round label */
export function getRoundLabel(round: number): string {
  if (round === 1) return 'Round of 16';
  if (round === 2) return 'Quarter-Finals';
  if (round === 3) return 'Semi-Finals';
  return 'Final';
}
