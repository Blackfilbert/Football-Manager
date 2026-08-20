import { Player, Rarity, Position, GameState, MatchProgressionInfo, StaffOwned, StaffCardDef } from './types';
import {
  RARITY_CONFIG, SCOUT_CHANCES, LEAGUES, UPGRADES,
  FIRST_NAMES, LAST_NAMES, COUNTRIES, OPPONENT_NAMES_BY_LEAGUE, NAMED_PLAYERS,
  OPPONENT_BASE_POWER, OPPONENT_GROWTH_RATE,
  WIN_BONUS_BASE, WIN_BONUS_GROWTH,
  MAX_MATCH,
  STAFF_CARDS, STAFF_STAR_THRESHOLDS,
} from './constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@football_manager_tycoon_state';

// ── Number Formatting ──
export function formatMoney(amount: number): string {
  if (amount == null || isNaN(amount)) return '$0';
  return '$' + formatMoneyRaw(amount);
}

/** Like formatMoney but without the $ prefix */
export function formatMoneyRaw(amount: number): string {
  if (amount == null || isNaN(amount)) return '0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs < 1000) return sign + Math.floor(abs).toString();
  if (abs < 1_000_000) {
    const v = abs / 1000;
    return sign + (v < 10 ? v.toFixed(2) : v.toFixed(1)) + 'K';
  }
  if (abs < 1_000_000_000) {
    return sign + (abs / 1_000_000).toFixed(2) + 'M';
  }
  if (abs < 1_000_000_000_000) {
    return sign + (abs / 1_000_000_000).toFixed(2) + 'B';
  }
  if (abs < 1_000_000_000_000_000) {
    return sign + (abs / 1_000_000_000_000).toFixed(2) + 'T';
  }
  return sign + (abs / 1_000_000_000_000_000).toFixed(2) + 'Q';
}

export function formatNumber(amount: number): string {
  if (amount == null || isNaN(amount)) return '0';
  const abs = Math.abs(amount);
  if (abs < 1000) return Math.floor(abs).toString();
  if (abs < 1_000_000) {
    const v = abs / 1000;
    return (v < 10 ? v.toFixed(2) : v.toFixed(1)) + 'K';
  }
  if (abs < 1_000_000_000) return (abs / 1_000_000).toFixed(2) + 'M';
  if (abs < 1_000_000_000_000) return (abs / 1_000_000_000).toFixed(2) + 'B';
  if (abs < 1_000_000_000_000_000) return (abs / 1_000_000_000_000).toFixed(2) + 'T';
  return (abs / 1_000_000_000_000_000).toFixed(2) + 'Q';
}

export function formatTime(seconds: number): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Match Progression ──

/** Legacy: compute league from global match number (for migration only) */
export function getLeagueForMatch(_match: number): number {
  return 0; // legacy — league is now stored in gameState.leagueIndex
}

export function getMatchProgression(currentMatch: number, leagueIdx: number, seasonPlayed: number): MatchProgressionInfo {
  const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
  return {
    leagueIndex: leagueIdx,
    leagueName: league?.name ?? 'League 3',
    leagueEmoji: league?.emoji ?? '🥉',
    matchInLeague: seasonPlayed + 1,
    totalMatchesInLeague: league?.totalMatches ?? 9,
    opponentPower: getOpponentPowerForLeague(leagueIdx, seasonPlayed),
    winBonus: getWinBonusForLeague(leagueIdx, seasonPlayed),
  };
}

// Opponent power scales smoothly across 30 stadiums
// Stadium 0: 250–400, Stadium 1: 320–500, Stadium 2+: exponential from base 399–600
function _leaguePowerRange(idx: number): [number, number] {
  // First 2 stadiums are easier so new players progress quickly
  if (idx === 0) return [180, 320];
  if (idx === 1) return [260, 420];
  const minBase = 399;
  const maxBase = 600;
  const minP = Math.floor(minBase * Math.pow(1.085, idx));
  const maxP = Math.floor(maxBase * Math.pow(1.085, idx));
  return [minP, maxP];
}

export function getOpponentPowerForLeague(leagueIdx: number, seasonMatchPlayed: number): number {
  const [minP, maxP] = _leaguePowerRange(leagueIdx);
  const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
  const total = (league?.totalMatches ?? 9) - 1;
  const t = total > 0 ? Math.min(seasonMatchPlayed / total, 1) : 0;
  return Math.floor(minP + (maxP - minP) * t);
}

// Win bonus base: scales exponentially across stadiums (~15% per level)
const IN_SEASON_BONUS_GROWTH = 1.05;

function _leagueBaseWinBonus(idx: number): number {
  return Math.floor(1000 * Math.pow(1.15, idx));
}

export function getWinBonusForLeague(leagueIdx: number, seasonMatchPlayed: number): number {
  const baseBonus = _leagueBaseWinBonus(leagueIdx);
  const leagueMult = LEAGUES?.[leagueIdx]?.multiplier ?? 1;
  return Math.floor(baseBonus * Math.pow(IN_SEASON_BONUS_GROWTH, seasonMatchPlayed) * leagueMult);
}

/** @deprecated Use getOpponentPowerForLeague instead */
export function getOpponentPowerForMatch(match: number): number {
  return Math.floor(OPPONENT_BASE_POWER * Math.pow(OPPONENT_GROWTH_RATE, (match ?? 1) - 1));
}

/** @deprecated Use getWinBonusForLeague instead */
export function getWinBonusForMatch(match: number): number {
  return Math.floor(WIN_BONUS_BASE * Math.pow(WIN_BONUS_GROWTH, (match ?? 1) - 1));
}

/** Simple seeded PRNG (mulberry32) */
function createSeededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulateMatchByPower(
  powerA: number,
  powerB: number,
  rand: () => number,
): { result: 1 | 0 | -1; goalsA: number; goalsB: number } {
  const total = powerA + powerB;
  const chanceA = total > 0 ? powerA / total : 0.5;
  const winA = chanceA * 0.65 + 0.1;
  const winB = (1 - chanceA) * 0.65 + 0.1;
  const drawChance = Math.max(0, 1 - winA - winB);
  const r = rand();
  if (r < winA) {
    const goalsA = 1 + Math.floor(rand() * 3);
    const goalsB = Math.floor(rand() * goalsA);
    return { result: 1, goalsA, goalsB };
  } else if (r < winA + drawChance) {
    const g = Math.floor(rand() * 3);
    return { result: 0, goalsA: g, goalsB: g };
  } else {
    const goalsB = 1 + Math.floor(rand() * 3);
    const goalsA = Math.floor(rand() * goalsB);
    return { result: -1, goalsA, goalsB };
  }
}

/** Generate round-robin schedule (circle method). Each team plays once per matchday. */
function generateRoundRobin(n: number, rand: () => number): [number, number][][] {
  const useN = n % 2 === 0 ? n : n + 1;
  const teams = Array.from({ length: useN }, (_, i) => i);
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  const rounds: [number, number][][] = [];
  const fixed = teams[0];
  const rotating = teams.slice(1);
  for (let r = 0; r < useN - 1; r++) {
    const matchday: [number, number][] = [];
    const a = fixed;
    const b = rotating[0];
    if (a < n && b < n) matchday.push([a, b]);
    for (let i = 1; i < rotating.length; i++) {
      const x = rotating[i];
      const y = rotating[rotating.length - i];
      if (i < rotating.length - i && x < n && y < n) matchday.push([x, y]);
    }
    rounds.push(matchday);
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

/**
 * Evaluate final season standings using the same round-robin + power logic as Header.
 * Called at end of season — all matchdays played.
 */
export function evaluateSeasonStandings(
  _teamName: string,
  wins: number,
  draws: number,
  losses: number,
  leagueIdx: number,
  seasonSeed: number,
  seasonResults?: ('W' | 'D' | 'L')[],
): number {
  const rand = createSeededRandom(seasonSeed);

  const names = OPPONENT_NAMES_BY_LEAGUE?.[leagueIdx] ?? OPPONENT_NAMES_BY_LEAGUE?.[0] ?? [];
  const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
  const teamCount = league?.teamCount ?? 10;
  const aiCount = Math.min(teamCount - 1, names.length);
  const totalTeams = aiCount + 1;

  const [pMin, pMax] = _leaguePowerRange(leagueIdx);
  const avgPower = (pMin + pMax) / 2;
  const aiPowers: number[] = [];
  for (let i = 0; i < aiCount; i++) {
    aiPowers.push(Math.round(avgPower * (0.6 + rand() * 0.8)));
  }

  const matchdays = generateRoundRobin(totalTeams, rand);
  const stats = Array.from({ length: totalTeams }, () => ({ w: 0, d: 0, l: 0, gf: 0, ga: 0 }));

  // Pre-simulate all matchdays
  const matchRand = createSeededRandom(seasonSeed + 999999);
  type MR = { a: number; b: number; goalsA: number; goalsB: number; res: 1 | 0 | -1 };
  const allResults: MR[][] = [];
  for (const md of matchdays) {
    const dayRes: MR[] = [];
    for (const [a, b] of md) {
      const pA = a === 0 ? 0 : aiPowers[a - 1];
      const pB = b === 0 ? 0 : aiPowers[b - 1];
      if (a === 0 || b === 0) {
        matchRand(); matchRand(); matchRand();
        dayRes.push({ a, b, goalsA: 0, goalsB: 0, res: 0 });
      } else {
        const sim = simulateMatchByPower(pA, pB, matchRand);
        dayRes.push({ a, b, goalsA: sim.goalsA, goalsB: sim.goalsB, res: sim.result });
      }
    }
    allResults.push(dayRes);
  }

  const ourPlayed = wins + draws + losses;
  const ourResultsList: ('w' | 'd' | 'l')[] = seasonResults
    ? seasonResults.map(r => r.toLowerCase() as 'w' | 'd' | 'l')
    : (() => {
        const list: ('w' | 'd' | 'l')[] = [];
        for (let i = 0; i < wins; i++) list.push('w');
        for (let i = 0; i < draws; i++) list.push('d');
        for (let i = 0; i < losses; i++) list.push('l');
        return list;
      })();

  let ourMatchIdx = 0;
  const goalRand = createSeededRandom(seasonSeed + 777777);

  for (let day = 0; day < matchdays.length; day++) {
    const dayPlayed = day < ourPlayed;
    for (const mr of allResults[day]) {
      const isOurs = mr.a === 0 || mr.b === 0;
      if (isOurs) {
        if (!dayPlayed) continue;
        const opp = mr.a === 0 ? mr.b : mr.a;
        const result = ourResultsList[ourMatchIdx] ?? 'l';
        ourMatchIdx++;
        if (result === 'w') {
          const gf = 1 + Math.floor(goalRand() * 3); const ga = Math.floor(goalRand() * gf);
          stats[0].w++; stats[0].gf += gf; stats[0].ga += ga;
          stats[opp].l++; stats[opp].gf += ga; stats[opp].ga += gf;
        } else if (result === 'd') {
          const g = Math.floor(goalRand() * 3);
          stats[0].d++; stats[0].gf += g; stats[0].ga += g;
          stats[opp].d++; stats[opp].gf += g; stats[opp].ga += g;
        } else {
          const ga = 1 + Math.floor(goalRand() * 3); const gf = Math.floor(goalRand() * ga);
          stats[0].l++; stats[0].gf += gf; stats[0].ga += ga;
          stats[opp].w++; stats[opp].gf += ga; stats[opp].ga += gf;
        }
      } else {
        if (!dayPlayed) continue;
        stats[mr.a].gf += mr.goalsA; stats[mr.a].ga += mr.goalsB;
        stats[mr.b].gf += mr.goalsB; stats[mr.b].ga += mr.goalsA;
        if (mr.res === 1) { stats[mr.a].w++; stats[mr.b].l++; }
        else if (mr.res === -1) { stats[mr.b].w++; stats[mr.a].l++; }
        else { stats[mr.a].d++; stats[mr.b].d++; }
      }
    }
  }

  const teams = stats.map((st, i) => ({
    pts: st.w * 3 + st.d,
    gd: st.gf - st.ga,
    w: st.w,
    isUs: i === 0,
  }));

  teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.w - a.w);
  return teams.findIndex(t => t.isUs) + 1;
}

// ── Game Calculations ──
/** Upgrade bonus with +20% growth per level (arithmetic progression) */
export function getUpgradeBonus(upgradeId: string, level: number): number {
  const cfg = UPGRADES?.find(u => u?.id === upgradeId);
  if (!cfg || (level ?? 0) <= 0) return 0;
  const n = level ?? 0;
  const base = cfg?.bonusPerLevel ?? 0;
  const growth = base * 0.2; // each subsequent level gives 20% more than base
  // Sum: base*n + growth * n*(n-1)/2
  return base * n + growth * n * (n - 1) / 2;
}

/** Polynomial cost curve normalized so cost(0) = baseCost */
const POLY_BASE = 110920 / 13680; // ~8.1082 — value at n=0
export function getUpgradeCost(upgradeId: string, level: number): number {
  const cfg = UPGRADES?.find(u => u?.id === upgradeId);
  if (!cfg) return Infinity;
  const n = level ?? 0;
  const raw = (2947 * n * n * n - 14941 * n * n + 119954 * n + 110920) / 13680;
  let cost = Math.floor((cfg?.baseCost ?? 100) * (raw / POLY_BASE));
  // Early levels (before first ×2 threshold at level 10) are much cheaper
  if (n < 10) {
    const discount = 0.15 + 0.85 * (n / 10); // 15% at lvl 0 → 100% at lvl 10
    cost = Math.max(1, Math.floor(cost * discount));
  }
  return cost;
}

export function getStartingPlayers(state: GameState): Player[] {
  const ids = new Set(state?.startingIds ?? []);
  if (ids.size === 0) return state?.players ?? []; // backward compat: all players are starting
  return (state?.players ?? []).filter(p => ids.has(p?.id ?? ''));
}

/** Income threshold multipliers: at these levels the building's total income gets multiplied */
export const INCOME_THRESHOLDS = [10, 30, 50, 80, 120] as const;
export const INCOME_THRESHOLD_MULTS = [2, 2, 1.5, 1.5, 1.5] as const;

/** Get total income contribution from a single income building */
export function getBuildingIncome(incomePerClick: number, level: number): number {
  let total = incomePerClick * level;
  for (let i = 0; i < INCOME_THRESHOLDS.length; i++) {
    if (level >= INCOME_THRESHOLDS[i]) total *= INCOME_THRESHOLD_MULTS[i];
  }
  return Math.floor(total);
}

/** Get the next upcoming threshold for a building at given level, or null if past all */
export function getNextThreshold(level: number): { level: number; mult: number } | null {
  for (let i = 0; i < INCOME_THRESHOLDS.length; i++) {
    if (level < INCOME_THRESHOLDS[i]) return { level: INCOME_THRESHOLDS[i], mult: INCOME_THRESHOLD_MULTS[i] };
  }
  return null;
}

export function calculateIncome(state: GameState): number {
  const BASE_PASSIVE_INCOME = 5; // fixed 5$/s, players no longer contribute
  let upgradeIncome = 0;
  for (const u of UPGRADES ?? []) {
    if (u?.type !== 'income') continue;
    const lvl = state?.upgrades?.[u?.id ?? ''] ?? 0;
    const buildingBase = getBuildingIncome(u?.incomePerClick ?? 1, lvl);
    // Apply staff multiplier for this building
    const staffMult = _getStaffBuildingMultInline(u?.id ?? '', state);
    upgradeIncome += buildingBase * staffMult;
  }
  const leagueIdx = state?.leagueIndex ?? 0;
  const leagueMult = LEAGUES?.[leagueIdx]?.multiplier ?? 1;
  const incomeMult = state?.incomeMultiplier ?? 1;
  const boost2x = (state?.boost2xEndTime ?? 0) > Date.now() ? 2 : 1;
  return Math.max((BASE_PASSIVE_INCOME + upgradeIncome) * leagueMult * incomeMult * boost2x, 0);
}

/** Inline staff mult to avoid circular import (STAFF_CARDS imported at bottom) */
function _getStaffBuildingMultInline(buildingId: string, state: GameState): number {
  const staffId = state?.staffAssigned?.[buildingId];
  if (!staffId) return 1;
  const owned = state?.staff?.[staffId];
  if (!owned) return 1;
  // lazy import to avoid circular
  try {
    const { STAFF_CARDS: SC, STAFF_STAR_THRESHOLDS: ST } = require('./constants');
    const def = SC?.find((c: any) => c?.id === staffId);
    if (!def) return 1;
    let stars = 0;
    for (const t of ST) { if (owned.copies >= t) stars++; }
    stars = Math.max(stars, 1);
    // Only marketers give income bonus
    if (def.role !== 'marketer') return 1;
    return 1 + def.baseMult * (1 + 0.2 * stars) * owned.level;
  } catch { return 1; }
}

// Formation slots for 4-4-2
const FORMATION_POSITIONS: string[] = ['GK', 'LD', 'CD', 'CD', 'RD', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];

/** Check if a player is in a matching position slot */
export function getPositionMatchMap(players: Player[]): Map<string, boolean> {
  const result = new Map<string, boolean>();
  const slots = FORMATION_POSITIONS.map(pos => ({ pos, assigned: false }));
  const matched = new Set<string>();

  // First pass: exact match
  for (const slot of slots) {
    if (slot.assigned) continue;
    const p = players.find(pl => !matched.has(pl?.id ?? '') && pl?.position === slot.pos);
    if (p) {
      slot.assigned = true;
      matched.add(p.id);
      result.set(p.id, true);
    }
  }

  // Second pass: unmatched players
  for (const p of players) {
    if (!matched.has(p?.id ?? '')) {
      result.set(p.id, false);
    }
  }

  return result;
}

/** Sum of arithmetic progression: 10 + 12 + 14 + ... for n levels = n*10 + n*(n-1) */
export function upgradeProgressionSum(levels: number): number {
  if (levels <= 0) return 0;
  // Each level i (1-based) gives: 10 + (i-1)*2 = 8 + 2i
  // Sum = levels*8 + 2*(1+2+...+levels) = levels*8 + levels*(levels+1)
  return levels * 8 + levels * (levels + 1);
}

export function calculateTeamPower(state: GameState): number {
  const starting = getStartingPlayers(state);
  const posMap = getPositionMatchMap(starting);
  const now = Date.now();
  const boosts = (state?.trainingBoosts ?? []).filter(b => b.expiresAt > now);
  const boostMap = new Map(boosts.map(b => [b.playerId, b.multiplier]));

  const playerPower = starting.reduce((sum, p) => {
    const inPos = posMap.get(p?.id ?? '') ?? false;
    let eff = p?.overall ?? 0;
    // Illness reduces effectiveness
    if (p?.illness) eff = Math.floor(eff * p.illness.effectiveness);
    // Training boost increases effectiveness
    const tBoost = boostMap.get(p?.id ?? '');
    if (tBoost) eff = Math.floor(eff * tBoost);
    return sum + Math.floor(eff * (inPos ? 1 : 0.5));
  }, 0);

  let upgradePower = 0;
  for (const u of UPGRADES ?? []) {
    if (u?.type !== 'power') continue;
    const lvl = state?.upgrades?.[u?.id ?? ''] ?? 0;
    upgradePower += (u?.powerPerClick ?? 1) * lvl;
  }

  let basePower = playerPower + upgradePower;

  // Active strategy boost
  const activeStrats = (state?.activeStrategies ?? []).filter(s => s.expiresAt > now);
  for (const strat of activeStrats) {
    basePower = Math.floor(basePower * (1 + strat.boostPct / 100));
  }

  return Math.max(basePower, 10);
}

export function calculateWinChance(teamPower: number, opponentPower: number, hasLeaguePack?: boolean): number {
  const tp = teamPower ?? 10;
  const op = opponentPower ?? 100;
  if (tp + op <= 0) return 50;
  const exp = 2.5;
  const tpAdj = Math.pow(tp, exp);
  const opAdj = Math.pow(op, exp);
  return Math.round((tpAdj / (tpAdj + opAdj)) * 100);
}

export function getRandomOpponentName(leagueIndex?: number): string {
  const idx = leagueIndex ?? 0;
  const names = OPPONENT_NAMES_BY_LEAGUE?.[idx] ?? OPPONENT_NAMES_BY_LEAGUE?.[0] ?? ['Unknown'];
  return names[Math.floor(Math.random() * names.length)] ?? 'Unknown';
}

/**
 * Get the scheduled opponent name for a specific matchday from the round-robin schedule.
 * Uses the same seasonSeed → same schedule as the standings table.
 */
export function getScheduledOpponentName(
  leagueIdx: number,
  seasonSeed: number,
  matchdayIndex: number, // 0-based: which matchday we're on
): string {
  const rand = createSeededRandom(seasonSeed);

  const names = OPPONENT_NAMES_BY_LEAGUE?.[leagueIdx] ?? OPPONENT_NAMES_BY_LEAGUE?.[0] ?? [];
  const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
  const teamCount = league?.teamCount ?? 10;
  const aiCount = Math.min(teamCount - 1, names.length);
  const totalTeams = aiCount + 1;

  // Consume rand for AI powers (must match Header's generateStandings)
  for (let i = 0; i < aiCount; i++) rand();

  // Generate round-robin schedule (same as Header)
  const matchdays = generateRoundRobinUtil(totalTeams, rand);

  // Find our match in the given matchday
  if (matchdayIndex >= 0 && matchdayIndex < matchdays.length) {
    const md = matchdays[matchdayIndex];
    for (const [a, b] of md) {
      if (a === 0) return names[b - 1] ?? 'Unknown';
      if (b === 0) return names[a - 1] ?? 'Unknown';
    }
  }

  // Fallback
  return names[matchdayIndex % names.length] ?? 'Unknown';
}

/** Round-robin schedule generation (circle method) — shared with Header */
function generateRoundRobinUtil(n: number, rand: () => number): [number, number][][] {
  const useN = n % 2 === 0 ? n : n + 1;
  const teams = Array.from({ length: useN }, (_, i) => i);
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  const rounds: [number, number][][] = [];
  const fixed = teams[0];
  const rotating = teams.slice(1);
  for (let r = 0; r < useN - 1; r++) {
    const matchday: [number, number][] = [];
    const a = fixed;
    const b = rotating[0];
    if (a < n && b < n) matchday.push([a, b]);
    for (let i = 1; i < rotating.length; i++) {
      const x = rotating[i];
      const y = rotating[rotating.length - i];
      if (i < rotating.length - i && x < n && y < n) matchday.push([x, y]);
    }
    rounds.push(matchday);
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

// ── Player Generation ──
let playerIdCounter = Date.now();

function generateId(): string {
  playerIdCounter += 1;
  return 'p_' + playerIdCounter.toString(36);
}

function rollRarity(scoutLevel: number, _league: number): Rarity {
  const chances = SCOUT_CHANCES?.[scoutLevel ?? 1] ?? SCOUT_CHANCES[1];
  const allRarities: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon', 'ultimate'];
  let totalWeight = 0;
  const weights: { rarity: Rarity; weight: number }[] = [];
  for (const r of allRarities) {
    const w = chances?.[r] ?? 0;
    if (w > 0) {
      weights.push({ rarity: r, weight: w });
      totalWeight += w;
    }
  }
  if (totalWeight <= 0) return 'common';
  let roll = Math.random() * totalWeight;
  for (const { rarity, weight } of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return weights?.[0]?.rarity ?? 'common';
}

const ALL_POSITIONS: Position[] = ['GK', 'LD', 'CD', 'RD', 'LM', 'CM', 'RM', 'ST'];
function randomPosition(): Position {
  return ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)] ?? 'CM';
}

/** Pick a random named player for high-tier rarities; returns null for lower tiers */
function pickNamedPlayer(rarity: Rarity): { firstName: string; lastName: string; country: string; position: Position } | null {
  if (rarity !== 'legendary' && rarity !== 'icon' && rarity !== 'ultimate') return null;
  const pool = NAMED_PLAYERS[rarity];
  if (!pool || pool.length === 0) return null;
  const p = pool[Math.floor(Math.random() * pool.length)]!;
  return { firstName: p.firstName, lastName: p.lastName, country: p.country, position: p.position };
}

export function generatePackPlayer(position: Position, overall: number): Player {
  const rarity: Rarity = overall >= 100 ? 'ultimate' : overall >= 80 ? 'icon' : overall >= 70 ? 'legendary' : overall >= 60 ? 'epic' : overall >= 50 ? 'rare' : 'common';
  const cfg = RARITY_CONFIG?.[rarity] ?? RARITY_CONFIG.common;
  const attackRatio = 0.35 + Math.random() * 0.30;
  const attack = Math.max(1, Math.floor(overall * attackRatio));
  const defense = Math.max(1, overall - attack);
  const named = pickNamedPlayer(rarity);
  const firstName = named?.firstName ?? FIRST_NAMES?.[Math.floor(Math.random() * (FIRST_NAMES?.length ?? 1))] ?? 'Unknown';
  const lastName = named?.lastName ?? LAST_NAMES?.[Math.floor(Math.random() * (LAST_NAMES?.length ?? 1))] ?? 'Player';
  const country = named?.country ?? COUNTRIES?.[Math.floor(Math.random() * (COUNTRIES?.length ?? 1))]?.code ?? 'BR';
  const pos = named?.position ?? position;
  return {
    id: generateId(),
    firstName, lastName, overall: attack + defense, rarity, position: pos,
    attack, defense,
    income: cfg?.income ?? 5,
    cost: Math.floor((cfg?.costMin ?? 3000) + Math.random() * ((cfg?.costMax ?? 5000) - (cfg?.costMin ?? 3000))),
    level: 1, country,
  };
}

export function generateChestPlayer(chestType: 'player' | 'star', league: number = 0): Player {
  const chances: Record<Rarity, number> = chestType === 'player'
    ? { common: 60, rare: 30, epic: 9.85, legendary: 0.1, icon: 0.05, ultimate: 0 }
    : { common: 60, rare: 30, epic: 8.50, legendary: 1.34, icon: 0.14, ultimate: 0.02 };
  const allRarities: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon', 'ultimate'];
  let roll = Math.random() * 100;
  let rarity: Rarity = 'common';
  for (const r of allRarities) {
    roll -= chances[r];
    if (roll <= 0) { rarity = r; break; }
  }
  const cfg = RARITY_CONFIG?.[rarity] ?? RARITY_CONFIG.common;
  // Scale stats with league like transfer market players
  const growth = Math.floor((STAT_GROWTH_PER_STADIUM[rarity] ?? 5) * league);
  const baseMin = cfg.overallMin + growth;
  const baseMax = (cfg?.overallMax ?? cfg.overallMin) + growth;
  const targetOverall = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
  const attackRatio = 0.35 + Math.random() * 0.30;
  const attack = Math.max(1, Math.floor(targetOverall * attackRatio));
  const defense = Math.max(1, targetOverall - attack);
  const overall = attack + defense;
  const named = pickNamedPlayer(rarity);
  const firstName = named?.firstName ?? FIRST_NAMES?.[Math.floor(Math.random() * (FIRST_NAMES?.length ?? 1))] ?? 'Unknown';
  const lastName = named?.lastName ?? LAST_NAMES?.[Math.floor(Math.random() * (LAST_NAMES?.length ?? 1))] ?? 'Player';
  const country = named?.country ?? COUNTRIES?.[Math.floor(Math.random() * (COUNTRIES?.length ?? 1))]?.code ?? 'BR';
  const baseCost = (cfg?.costMin ?? 3000) + Math.random() * ((cfg?.costMax ?? 5000) - (cfg?.costMin ?? 3000));
  const costMult = Math.max(1, league);
  return {
    id: generateId(),
    firstName, lastName, overall, rarity,
    position: named?.position ?? randomPosition(),
    attack, defense,
    income: cfg?.income ?? 5,
    cost: Math.floor(baseCost * costMult),
    level: 1, country,
  };
}

// Per-stadium stat growth by rarity (slow for common, slightly faster for higher rarities)
const STAT_GROWTH_PER_STADIUM: Record<Rarity, number> = {
  common: 5.5, rare: 6, epic: 7, legendary: 8, icon: 9, ultimate: 10,
};

/** costMult: league-based cost multiplier = MAX(1, leagueMult - 1) */
export function generatePlayer(scoutLevel: number, league: number, costMult: number = 1): Player {
  const rarity = rollRarity(scoutLevel, league);
  const cfg = RARITY_CONFIG?.[rarity] ?? RARITY_CONFIG.common;
  const growth = Math.floor((STAT_GROWTH_PER_STADIUM[rarity] ?? 5) * league);
  const baseMin = cfg.overallMin + growth;
  const baseMax = (cfg?.overallMax ?? cfg.overallMin) + growth;
  const targetOverall = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
  const attackRatio = 0.35 + Math.random() * 0.30;
  const attack = Math.max(1, Math.floor(targetOverall * attackRatio));
  const defense = Math.max(1, targetOverall - attack);
  const overall = attack + defense;
  const named = pickNamedPlayer(rarity);
  const firstName = named?.firstName ?? FIRST_NAMES?.[Math.floor(Math.random() * (FIRST_NAMES?.length ?? 1))] ?? 'Unknown';
  const lastName = named?.lastName ?? LAST_NAMES?.[Math.floor(Math.random() * (LAST_NAMES?.length ?? 1))] ?? 'Player';
  const country = named?.country ?? COUNTRIES?.[Math.floor(Math.random() * (COUNTRIES?.length ?? 1))]?.code ?? 'BR';
  const baseCost = (cfg?.costMin ?? 3000) + Math.random() * ((cfg?.costMax ?? 5000) - (cfg?.costMin ?? 3000));
  return {
    id: generateId(),
    firstName, lastName, overall, rarity,
    position: named?.position ?? randomPosition(),
    attack, defense,
    income: cfg?.income ?? 5,
    cost: Math.floor(baseCost * Math.max(1, costMult)),
    level: 1, country,
  };
}

export function generateMarket(scoutLevel: number, league: number, guaranteeCheap?: boolean, costMult: number = 1): Player[] {
  const count = 8 + Math.floor(Math.random() * 5); // 8-12
  const players: Player[] = [];
  // Guarantee a $1000 player at the front for tutorial
  if (guaranteeCheap) {
    const firstName = FIRST_NAMES?.[Math.floor(Math.random() * (FIRST_NAMES?.length ?? 1))] ?? 'Unknown';
    const lastName = LAST_NAMES?.[Math.floor(Math.random() * (LAST_NAMES?.length ?? 1))] ?? 'Player';
    players.push({
      id: generateId(), firstName, lastName, overall: 45, rarity: 'common',
      position: 'ST', attack: 25, defense: 20, income: 5, cost: 1000, level: 1,
    });
  }
  for (let i = players.length; i < count; i++) {
    players.push(generatePlayer(scoutLevel, league, costMult));
  }
  return players;
}

// 4-4-2 formation positions by slot
const SQUAD_POSITIONS: Position[] = ['GK', 'LD', 'CD', 'CD', 'RD', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];

const BENCH_POSITIONS: Position[] = ['CM', 'CD', 'ST'];

/** Generate a starting squad of 11 starters (no bench).
 *  These are intentionally terrible (15-20 overall → ~180 team power) so the
 *  player MUST buy common transfers (35-49) to start winning. */
export function generateStartingSquad(): Player[] {
  const squad: Player[] = [];
  const totalPositions = [...SQUAD_POSITIONS]; // 11 starters only
  for (let i = 0; i < 11; i++) {
    const targetOverall = 15 + Math.floor(Math.random() * 6); // 15-20 → ~180 team power
    const attackRatio = 0.35 + Math.random() * 0.30;
    const attack = Math.max(1, Math.floor(targetOverall * attackRatio));
    const defense = Math.max(1, targetOverall - attack);
    const overall = attack + defense;
    const firstName = FIRST_NAMES?.[Math.floor(Math.random() * (FIRST_NAMES?.length ?? 1))] ?? 'Unknown';
    const lastName = LAST_NAMES?.[Math.floor(Math.random() * (LAST_NAMES?.length ?? 1))] ?? 'Player';
    squad.push({
      id: generateId(),
      firstName,
      lastName,
      overall,
      rarity: 'common',
      position: totalPositions[i] ?? 'CM',
      attack,
      defense,
      income: 1,
      cost: 10, // almost worthless youth players
      level: 1,
    });
  }
  return squad;
}

// ── Storage ──
export async function saveGameState(state: GameState): Promise<void> {
  try {
    const json = JSON.stringify({ ...(state ?? {}), lastSaveTime: Date.now() });
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

export async function loadGameState(): Promise<GameState | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as GameState;
  } catch (e) {
    console.warn('Failed to load game state:', e);
    return null;
  }
}

export async function clearGameState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear game state:', e);
  }
}

// ── Staff helpers ──

/** Get star level (1-5) from copy count */
export function getStaffStars(copies: number): number {
  let stars = 0;
  for (const t of STAFF_STAR_THRESHOLDS) {
    if (copies >= t) stars++;
  }
  return Math.max(stars, 1);
}

/** Effective multiplier bonus for a staff member: baseMult × (1 + 0.2×stars) × level */
export function getStaffBonus(def: StaffCardDef, owned: StaffOwned): number {
  const stars = getStaffStars(owned.copies);
  return def.baseMult * (1 + 0.2 * stars) * owned.level;
}

/** Get total staff multiplier for a specific building (1 + sum of assigned bonuses). Only marketers boost income. */
export function getStaffBuildingMult(buildingId: string, staffState: Record<string, StaffOwned>, assigned: Record<string, string>): number {
  const staffId = assigned[buildingId];
  if (!staffId) return 1;
  const owned = staffState[staffId];
  if (!owned) return 1;
  const def = STAFF_CARDS.find(c => c.id === staffId);
  if (!def || def.role !== 'marketer') return 1;
  return 1 + getStaffBonus(def, owned);
}
