/* ── Valor Grand Prix Context ── */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent } from '../services/analytics';
import { ValorGPState, DEFAULT_VGP_STATE, VGPMatchState } from './types';
import {
  VGP_MAX_ATTEMPTS, VGP_TOURNAMENT_DAYS,
  VGP_SCORE_PER_WIN_BASE, VGP_SCORE_PER_WIN_SCALE,
  VGP_VP_XP_PER_WIN, VGP_VP_XP_PER_DIFFICULTY, getVpLevelInfo,
  VGP_BASE_OPPONENT_POWER, VGP_MAX_OPPONENT_POWER, VGP_POWER_SCALE_PER_DIFF,
  VGP_OPPONENT_NAMES, VGP_MILESTONES,
  VGP_LEADERBOARD_NAMES, VGP_LEADERBOARD_COUNTRIES,
} from './constants';
import { createInitialMatchState, tickMatch, calcVGPWinChance, getOpponentPower } from './matchEngine';

const STORAGE_KEY = 'vgp_state';

function todayStr(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface VGPSquadPlayer {
  id: string;
  lastName: string;
  position: string; // slot position (GK, CD, LM, RM, ST)
}

export interface ValorGPContextValue {
  state: ValorGPState;
  isLoaded: boolean;
  matchState: VGPMatchState | null;
  isMatchActive: boolean;
  opponentName: string;
  opponentPower: number;
  vgpPower: number;
  squadPlayers: VGPSquadPlayer[]; // 5 players in slot order [GK, CD, LM, RM, ST]
  // Actions
  startRun: () => boolean;
  startMatch: (overrideDifficulty?: number) => void;
  endRun: () => void;
  abandonRun: () => void;
  claimMilestone: (index: number) => void;
  getLeaderboard: () => { rank: number; name: string; score: number; country: string; power: number; isPlayer?: boolean }[];
  leaderboardId: string;
  getTimeRemaining: () => { days: number; hours: number; minutes: number; seconds: number };
  getOpponentPowerForDifficulty: (diff: number) => number;
  // For match screen to read
  tickRef: React.MutableRefObject<(() => void) | null>;
  // Squad
  setSquadIds: (ids: string[]) => void;
  // Buy extra attempt
  buyAttempt: () => boolean;
  // Valor Pass
  claimVpReward: (level: number, tier: 'free' | 'grand' | 'gold') => void;
  claimAllVpRewards: (tier: 'free' | 'grand' | 'gold') => void;
  buyVpTier: (tier: 'grand' | 'gold') => void;
  // Reset (cheat)
  resetVGP: () => void;
}

const ValorGPContext = createContext<ValorGPContextValue | null>(null);

interface ProviderPlayer { id: string; firstName: string; lastName: string; overall: number; position: string }
const VGP_SLOT_POSITIONS = ['GK', 'CD', 'LM', 'RM', 'ST'];

export const VGP_ATTEMPT_COST = 15; // crystals per extra attempt

export function ValorGPProvider({ children, teamPower, allPlayers = [], upgradePower = 0, crystals = 0, onSpendCrystals, onAddKeys, resetSignal = 0 }: { children: React.ReactNode; teamPower: number; allPlayers?: ProviderPlayer[]; upgradePower?: number; crystals?: number; onSpendCrystals?: (amount: number) => void; onAddKeys?: (type: 'regular' | 'gold', amount: number) => void; resetSignal?: number }) {
  const [state, setState] = useState<ValorGPState>(DEFAULT_VGP_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [matchState, setMatchState] = useState<VGPMatchState | null>(null);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [opponentPower, setOpponentPower] = useState(VGP_BASE_OPPONENT_POWER);
  const teamPowerRef = useRef(teamPower);
  teamPowerRef.current = teamPower;
  const stateRef = useRef(state);
  stateRef.current = state;
  const tickRef = useRef<(() => void) | null>(null);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ValorGPState;
          // Check tournament expiry
          const now = Date.now();
          if (parsed.tournamentEndTime && now > parsed.tournamentEndTime) {
            // Tournament expired — advance season, reset run but keep VP progress & purchases
            const fresh = { ...DEFAULT_VGP_STATE };
            fresh.season = (parsed.season ?? 1) + 1;
            fresh.vpXp = parsed.vpXp ?? 0;
            fresh.vpLevel = parsed.vpLevel ?? 0;
            fresh.vpFreeClaimed = parsed.vpFreeClaimed ?? [];
            fresh.vpGrandClaimed = parsed.vpGrandClaimed ?? [];
            fresh.vpGoldClaimed = parsed.vpGoldClaimed ?? [];
            fresh.vpGrandPurchased = parsed.vpGrandPurchased ?? false;
            fresh.vpGoldPurchased = parsed.vpGoldPurchased ?? false;
            initTournament(fresh);
            setState(fresh);
          } else {
            // Refill attempts if new day
            const today = todayStr();
            if (parsed.lastRefillDate !== today) {
              parsed.attempts = VGP_MAX_ATTEMPTS;
              parsed.lastRefillDate = today;
            }
            if (!parsed.tournamentStartTime) {
              initTournament(parsed);
            }
            setState(parsed);
          }
        } else {
          const fresh = { ...DEFAULT_VGP_STATE };
          initTournament(fresh);
          setState(fresh);
        }
      } catch {
        const fresh = { ...DEFAULT_VGP_STATE };
        initTournament(fresh);
        setState(fresh);
      }
      setIsLoaded(true);
    })();
  }, []);

  // React to external reset signal (from game reset cheat)
  const resetSignalRef = useRef(resetSignal);
  useEffect(() => {
    if (resetSignal !== resetSignalRef.current) {
      resetSignalRef.current = resetSignal;
      const fresh = { ...DEFAULT_VGP_STATE };
      initTournament(fresh);
      setState(fresh);
      setMatchState(null);
      tickRef.current = null;
    }
  }, [resetSignal]);

  // Save on state change
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, isLoaded]);

  function initTournament(s: ValorGPState) {
    const now = Date.now();
    s.tournamentStartTime = now;
    s.tournamentEndTime = now + VGP_TOURNAMENT_DAYS * 24 * 60 * 60 * 1000;
    s.totalScore = 0;
    s.bestWinStreak = 0;
    s.claimedMilestones = [];
    s.attempts = VGP_MAX_ATTEMPTS;
    s.lastRefillDate = todayStr();
    s.leaderboardSeed = Math.floor(Math.random() * 1000000) + 1;
    s.isInRun = false;
    s.runWins = 0;
    s.runScore = 0;
    s.currentDifficulty = 1;
  }

  const startRun = useCallback((): boolean => {
    const cur = stateRef.current;
    if (cur.attempts <= 0) return false;
    if (cur.isInRun) return false;
    trackEvent('vgp.run_start', { season: (cur.season ?? 1).toString(), attempts_left: (cur.attempts - 1).toString() });
    setState(p => ({
      ...p,
      attempts: p.attempts - 1,
      isInRun: true,
      currentDifficulty: 1,
      runWins: 0,
      runScore: 0,
      runClaimedMilestones: [],
    }));
    return true;
  }, []);

  const startMatch = useCallback((overrideDifficulty?: number) => {
    const cur = stateRef.current;
    const diff = overrideDifficulty ?? cur.currentDifficulty; // 1-based, increases each win

    // Power scales linearly from BASE (diff=1) toward MAX (diff=18)
    // Each season after the first adds +10% to opponent power
    const seasonMultiplier = 1 + 0.1 * (Math.max(1, cur.season ?? 1) - 1);
    const maxDiff = 18;
    const t = Math.min((diff - 1) / (maxDiff - 1), 1);
    const rawPwr = VGP_BASE_OPPONENT_POWER + t * (VGP_MAX_OPPONENT_POWER - VGP_BASE_OPPONENT_POWER);
    const scaledPwr = Math.round(rawPwr * seasonMultiplier);
    // Add small random variance ±5%
    const variance = scaledPwr * (0.95 + Math.random() * 0.10);
    const oppPwr = Math.round(Math.max(VGP_BASE_OPPONENT_POWER, variance));

    // Pick opponent name — cycle through list by difficulty with random offset
    const nameIdx = (diff - 1 + Math.floor(Math.random() * 5)) % VGP_OPPONENT_NAMES.length;
    const rndName = VGP_OPPONENT_NAMES[nameIdx] ?? 'Opponent';

    setOpponentName(rndName);
    setOpponentPower(oppPwr);

    setMatchState(createInitialMatchState());
    tickRef.current = () => {
      setMatchState(prev => {
        if (!prev || prev.status === 'won' || prev.status === 'lost') return prev;
        const myPwr = vgpPowerRef.current;
        const ratio = myPwr / (myPwr + oppPwr);
        const wc = Math.round(ratio * 100);
        return tickMatch(prev, wc);
      });
    };
  }, []);

  // Handle match result
  useEffect(() => {
    if (!matchState) return;
    if (matchState.status === 'won') {
      const cur = stateRef.current;
      const vpXpGain = VGP_VP_XP_PER_WIN + VGP_VP_XP_PER_DIFFICULTY * cur.currentDifficulty;
      trackEvent('vgp.match_result', {
        result: 'win', difficulty: cur.currentDifficulty.toString(),
        score_home: (matchState.homeScore ?? 0).toString(), score_away: (matchState.awayScore ?? 0).toString(),
        vp_xp_gained: vpXpGain.toString(), season: (cur.season ?? 1).toString(),
      });
      setState(p => {
        const newWins = p.runWins + 1;
        const scoreGain = VGP_SCORE_PER_WIN_BASE + VGP_SCORE_PER_WIN_SCALE * p.currentDifficulty;
        const newVpXp = p.vpXp + vpXpGain;
        const newVpLevel = getVpLevelInfo(newVpXp).level;
        return {
          ...p,
          runWins: newWins,
          runScore: p.runScore + scoreGain,
          currentDifficulty: p.currentDifficulty + 1,
          totalScore: p.totalScore + scoreGain,
          bestWinStreak: Math.max(p.bestWinStreak, newWins),
          vpXp: newVpXp,
          vpLevel: newVpLevel,
        };
      });
    } else if (matchState.status === 'lost') {
      const cur = stateRef.current;
      trackEvent('vgp.match_result', {
        result: 'loss', difficulty: cur.currentDifficulty.toString(),
        score_home: (matchState.homeScore ?? 0).toString(), score_away: (matchState.awayScore ?? 0).toString(),
        wins_in_run: cur.runWins.toString(), season: (cur.season ?? 1).toString(),
      });
      setState(p => ({ ...p, isInRun: false, currentDifficulty: 1, runWins: 0, runScore: 0, runClaimedMilestones: [] }));
    }
  }, [matchState?.status]);

  const endRun = useCallback(() => {
    const cur = stateRef.current;
    trackEvent('vgp.run_end', { wins: cur.runWins.toString(), score: cur.runScore.toString(), season: (cur.season ?? 1).toString() });
    setMatchState(null);
    tickRef.current = null;
    setState(p => ({ ...p, isInRun: false, currentDifficulty: 1, runWins: 0, runScore: 0, runClaimedMilestones: [] }));
  }, []);

  /** Abandon the current run mid-match — reverts this run's score & milestones, counts as loss */
  const abandonRun = useCallback(() => {
    const cur = stateRef.current;
    trackEvent('vgp.run_abandon', { wins: cur.runWins.toString(), score: cur.runScore.toString(), difficulty: cur.currentDifficulty.toString() });
    // Revoke keys that were granted from milestones claimed during this run
    const runClaimed = cur.runClaimedMilestones ?? [];
    for (const idx of runClaimed) {
      const m = VGP_MILESTONES[idx];
      if (!m) continue;
      const r = m.reward;
      if (r.playerChestSkips) onAddKeys?.('regular', -r.playerChestSkips);
      if (r.starChestSkips) onAddKeys?.('gold', -r.starChestSkips);
    }
    setMatchState(null);
    tickRef.current = null;
    setState(p => ({
      ...p,
      isInRun: false,
      totalScore: Math.max(0, p.totalScore - p.runScore),
      bestWinStreak: p.bestWinStreak <= p.runWins ? 0 : p.bestWinStreak,
      // Un-claim milestones from this run
      claimedMilestones: p.claimedMilestones.filter(i => !(p.runClaimedMilestones ?? []).includes(i)),
      currentDifficulty: 1,
      runWins: 0,
      runScore: 0,
      runClaimedMilestones: [],
    }));
  }, [onAddKeys]);

  const claimMilestone = useCallback((index: number) => {
    const cur = stateRef.current;
    if (cur.claimedMilestones.includes(index)) return;
    const milestone = VGP_MILESTONES[index];
    if (milestone) {
      trackEvent('vgp.milestone_claimed', { index: index.toString(), wins_req: milestone.winsRequired.toString() });
      const r = milestone.reward;
      // Grant player chest skips as regular keys
      if (r.playerChestSkips) onAddKeys?.('regular', r.playerChestSkips);
      // Grant star chest skips as gold keys
      if (r.starChestSkips) onAddKeys?.('gold', r.starChestSkips);
      // trainingSkips — future feature, no logic yet
    }
    setState(p => {
      if (p.claimedMilestones.includes(index)) return p;
      return {
        ...p,
        claimedMilestones: [...p.claimedMilestones, index],
        runClaimedMilestones: [...(p.runClaimedMilestones ?? []), index],
      };
    });
  }, [onAddKeys]);

  const getLeaderboard = useCallback(() => {
    const cur = stateRef.current;
    const rng = seededRandom(cur.leaderboardSeed);
    const entries: { rank: number; name: string; score: number; country: string; power: number; isPlayer?: boolean }[] = [];
    const usedNames = new Set<string>();
    const totalFake = 120;
    for (let i = 0; i < totalFake; i++) {
      // Score distribution aligned with tier thresholds:
      // 1-20: 300K-500K, 21-50: 150K-300K, 51-100: 50K-150K, 101+: 0-50K
      let score: number;
      if (i < 20) {
        score = Math.floor(300000 + rng() * 200000);
      } else if (i < 50) {
        score = Math.floor(150000 + rng() * 150000);
      } else if (i < 100) {
        score = Math.floor(50000 + rng() * 100000);
      } else {
        score = Math.floor(rng() * 50000);
      }
      let nameIdx = Math.floor(rng() * VGP_LEADERBOARD_NAMES.length);
      let name = VGP_LEADERBOARD_NAMES[nameIdx] ?? 'Player' + i;
      let tries = 0;
      while (usedNames.has(name) && tries < 20) {
        nameIdx = (nameIdx + 1) % VGP_LEADERBOARD_NAMES.length;
        name = VGP_LEADERBOARD_NAMES[nameIdx] ?? 'Player' + i;
        tries++;
      }
      if (usedNames.has(name)) name = name + (i + 1);
      usedNames.add(name);
      const countryIdx = Math.floor(rng() * VGP_LEADERBOARD_COUNTRIES.length);
      // Power scales with rank: top players ~2000-2600, mid ~800-1600, bottom ~200-800
      const rankT = 1 - (i / (totalFake - 1)); // 1.0 for first, 0.0 for last
      const basePwr = 200 + rankT * 2200; // 200..2400
      const power = Math.floor(basePwr + rng() * 200); // small variance
      entries.push({
        rank: 0,
        name,
        score,
        country: VGP_LEADERBOARD_COUNTRIES[countryIdx] ?? 'US',
        power,
      });
    }
    // Sort by score desc
    entries.sort((a, b) => b.score - a.score);
    // Insert player
    entries.push({
      rank: 0, name: 'YOU', score: cur.totalScore, country: '', power: vgpPowerRef.current, isPlayer: true,
    });
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => { e.rank = i + 1; });
    return entries;
  }, []);

  const getTimeRemaining = useCallback(() => {
    const cur = stateRef.current;
    const diff = Math.max(0, cur.tournamentEndTime - Date.now());
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diff % (60 * 1000)) / 1000);
    return { days, hours, minutes, seconds };
  }, []);

  const getOpponentPowerForDifficulty = useCallback((diff: number) => {
    return getOpponentPower(diff, VGP_BASE_OPPONENT_POWER, VGP_POWER_SCALE_PER_DIFF);
  }, []);

  const setSquadIds = useCallback((ids: string[]) => {
    setState(p => ({ ...p, squadIds: ids }));
  }, []);

  const buyAttempt = useCallback(() => {
    if (crystals < VGP_ATTEMPT_COST) return false;
    trackEvent('vgp.buy_attempt', { cost: VGP_ATTEMPT_COST.toString(), crystals_before: crystals.toString() });
    onSpendCrystals?.(VGP_ATTEMPT_COST);
    setState(p => ({ ...p, attempts: p.attempts + 1 }));
    return true;
  }, [crystals, onSpendCrystals]);

  // ── Valor Pass actions ──
  const claimVpReward = useCallback((level: number, tier: 'free' | 'grand' | 'gold') => {
    trackEvent('vgp.vp_reward_claimed', { level: (level + 1).toString(), tier });
    setState(p => {
      const key = tier === 'free' ? 'vpFreeClaimed' : tier === 'grand' ? 'vpGrandClaimed' : 'vpGoldClaimed';
      const arr = p[key] ?? [];
      if (arr.includes(level)) return p;
      if (level >= p.vpLevel) return p; // not reached yet
      if (tier === 'grand' && !p.vpGrandPurchased) return p;
      if (tier === 'gold' && !p.vpGoldPurchased) return p;
      return { ...p, [key]: [...arr, level] };
    });
  }, []);

  const claimAllVpRewards = useCallback((tier: 'free' | 'grand' | 'gold') => {
    trackEvent('vgp.vp_claim_all', { tier });
    setState(p => {
      const key = tier === 'free' ? 'vpFreeClaimed' : tier === 'grand' ? 'vpGrandClaimed' : 'vpGoldClaimed';
      const arr = p[key] ?? [];
      if (tier === 'grand' && !p.vpGrandPurchased) return p;
      if (tier === 'gold' && !p.vpGoldPurchased) return p;
      const newClaimed = [...arr];
      for (let i = 0; i < p.vpLevel; i++) {
        if (!newClaimed.includes(i)) newClaimed.push(i);
      }
      return { ...p, [key]: newClaimed };
    });
  }, []);

  const buyVpTier = useCallback((tier: 'grand' | 'gold') => {
    trackEvent('vgp.vp_tier_purchased', { tier, cost: tier === 'grand' ? '150_crystals' : 'iap_14.99' });
    if (tier === 'grand') {
      // Costs 150 crystals
      if (crystals < 150) return;
      onSpendCrystals?.(150);
      setState(p => ({ ...p, vpGrandPurchased: true }));
    } else {
      // Gold is IAP — handled externally, this just marks it
      setState(p => ({ ...p, vpGoldPurchased: true }));
    }
  }, [crystals, onSpendCrystals]);

  const resetVGP = useCallback(() => {
    const fresh = { ...DEFAULT_VGP_STATE };
    initTournament(fresh);
    setState(fresh);
    setMatchState(null);
    tickRef.current = null;
  }, []);

  // Build effective squad (same auto-fill logic as VGPPlayersScreen)
  const playerMap = React.useMemo(() => {
    const m = new Map<string, ProviderPlayer>();
    allPlayers.forEach(p => { if (p?.id) m.set(p.id, p); });
    return m;
  }, [allPlayers]);

  const { squadPlayers, vgpPower } = React.useMemo(() => {
    const ids = (state.squadIds ?? []).slice(0, 5);
    while (ids.length < 5) ids.push('');
    // validate
    const valid = ids.map(id => playerMap.has(id) ? id : '');
    const used = new Set(valid.filter(Boolean));
    // auto-fill empties
    for (let i = 0; i < 5; i++) {
      if (valid[i]) continue;
      const slotPos = VGP_SLOT_POSITIONS[i];
      const match = allPlayers
        .filter(p => !used.has(p.id) && p.position === slotPos)
        .sort((a, b) => b.overall - a.overall)[0];
      if (match) { valid[i] = match.id; used.add(match.id); }
    }
    for (let i = 0; i < 5; i++) {
      if (valid[i]) continue;
      const best = allPlayers
        .filter(p => !used.has(p.id))
        .sort((a, b) => b.overall - a.overall)[0];
      if (best) { valid[i] = best.id; used.add(best.id); }
    }
    let power = 0;
    const players: VGPSquadPlayer[] = valid.map((id, i) => {
      const p = playerMap.get(id);
      if (!p) return { id: '', lastName: '?', position: VGP_SLOT_POSITIONS[i] ?? 'GK' };
      const inPos = p.position === VGP_SLOT_POSITIONS[i];
      power += Math.floor(p.overall * (inPos ? 1 : 0.5));
      return { id: p.id, lastName: p.lastName || p.firstName || '?', position: VGP_SLOT_POSITIONS[i] ?? 'GK' };
    });
    return { squadPlayers: players, vgpPower: Math.max(power + upgradePower, 10) };
  }, [state.squadIds, playerMap, allPlayers, upgradePower]);

  // Keep vgpPower in a ref for match engine
  const vgpPowerRef = useRef(vgpPower);
  vgpPowerRef.current = vgpPower;

  // Generate a stable leaderboard ID from the seed
  const leaderboardId = React.useMemo(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const r = seededRandom(state.leaderboardSeed + 7777);
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(r() * chars.length)];
    return id;
  }, [state.leaderboardSeed]);

  const value: ValorGPContextValue = {
    state,
    isLoaded,
    matchState,
    isMatchActive: matchState != null && (matchState.status === 'playing' || matchState.status === 'sudden_death'),
    opponentName,
    opponentPower,
    vgpPower,
    squadPlayers,
    startRun,
    startMatch,
    endRun,
    abandonRun,
    claimMilestone,
    getLeaderboard,
    leaderboardId,
    getTimeRemaining,
    getOpponentPowerForDifficulty,
    tickRef,
    setSquadIds,
    buyAttempt,
    claimVpReward,
    claimAllVpRewards,
    buyVpTier,
    resetVGP,
  };

  return <ValorGPContext.Provider value={value}>{children}</ValorGPContext.Provider>;
}

export function useValorGP(): ValorGPContextValue {
  const ctx = useContext(ValorGPContext);
  if (!ctx) throw new Error('useValorGP must be used within ValorGPProvider');
  return ctx;
}
