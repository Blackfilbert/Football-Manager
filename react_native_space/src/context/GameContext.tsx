import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GameState, MatchState, GoalEvent, MatchProgressionInfo, UpgradeEvent, CareerPlayer, CareerSkills, SeasonCompleteInfo, StreetCupState, Player, TrainingBoost, ActiveStrategy, StaffRole } from '../types';
import { trackEvent, trackRevenue } from '../services/analytics';
import {
  DEFAULT_GAME_STATE, UPGRADES, LEAGUES, SCOUT_TRAINING,
  MARKET_REFRESH_INTERVAL, AUTO_SAVE_INTERVAL,
  OFFLINE_EARNINGS_CAP, MATCH_DURATION, MATCH_PAUSE, MAX_MATCH,
  TROPHY_REWARDS, TROPHY_REWARDS_TABLE, SKILL_COSTS, SKILL_MAX_LEVEL,
  STREET_CUP_BOOST_COST, STREET_CUP_REWARDS,
STAFF_CARDS, STAFF_LEVEL_TROPHY_COST, STAFF_MAX_LEVEL,
  ILLNESS_CHANCE_PER_MATCH, ILLNESS_TYPES,
  STRATEGY_GEN_FIRST, STRATEGY_GEN_INTERVAL, STRATEGY_BATCH_SIZE, STRATEGY_DURATION, STRATEGY_MAX_READY,
  TRAINING_DURATION, TRAINING_COOLDOWN, TRAINING_TIERS, TRAINING_MAX_DURATION,
} from '../constants';
import {
  getCurrentRound, hasMatchTimePassed, isCupExpired,
  generateCup, simulateRound, isPlayerAlive, getPlayerMatchInRound,
  getMatchIndex, setDebugMatchTime,
} from '../streetCupHelpers';
import {
  calculateIncome, calculateTeamPower, calculateWinChance,
  getUpgradeCost, getRandomOpponentName, getScheduledOpponentName,
  generateMarket, generateStartingSquad, saveGameState, loadGameState, clearGameState,
  getMatchProgression, evaluateSeasonStandings, formatMoney,
  getStaffBonus, getStaffStars,
} from '../utils';

interface GameContextValue {
  gameState: GameState;
  matchState: MatchState;
  displayScore: { home: number; away: number };
  setDisplayScore: React.Dispatch<React.SetStateAction<{ home: number; away: number }>>;
  isLoaded: boolean;
  incomePerSecond: number;
  teamPower: number;
  winChance: number;
  lastGoalEvent: GoalEvent | null;
  lastUpgradeEvent: UpgradeEvent | null;
  matchProgression: MatchProgressionInfo;
  upgrade: (upgradeId: string) => boolean;
  buyPlayer: (playerId: string) => boolean;
  sellPlayer: (playerId: string) => void;
  swapPlayer: (startingId: string, benchId: string, targetSlotPos?: string) => { oldPower: number; newPower: number; oldIncome: number; newIncome: number } | null;
  startScoutTraining: () => boolean;
  speedUpScout: () => boolean;
  claimDailyReward: () => boolean;
  claimCareerDaily: () => number;
  claimBattlePass: (tier: number, column: 'free' | 'premium' | 'vip') => void;
  claimAllBattlePass: (column?: 'free' | 'premium' | 'vip') => void;
  buyBattlePassTier: (tier: 'premium' | 'vip') => void;
  refreshMarket: () => void;
  forceRefreshMarket: () => boolean;
  resetGame: () => Promise<void>;
  offlineEarnings: number;
  offlineSeconds: number;
  dismissOfflineEarnings: () => void;
  updateTeamName: (name: string) => void;
  updateTeamColor: (color: string) => void;
  updateTeamCountry: (code: string) => void;
  updateTeamLogo: (uri: string | null) => void;
  markMarketNotifSeen: () => void;
  markCareerModeSeen: () => void;
  initCareerPlayer: () => void;
  upgradeCareerSkill: (skill: keyof CareerSkills) => boolean;
  addTrophies: (amount: number) => void;
  addChestPlayers: (players: Player[]) => void;
  updateCareerName: (name: string) => void;
  updateCareerNumber: (num: number) => void;
  seasonCompleteInfo: SeasonCompleteInfo | null;
  dismissSeasonComplete: () => void;
  confirmPromotion: () => void;
  triggerPromotionConfirmation: () => void;
  claimMatchEvent: (moneyAmount: number, fameAmount: number) => void;
  cheatAddMoney: (amount: number) => void;
  cheatAddCrystals: (amount: number) => void;
  addKeys: (type: 'regular' | 'gold', amount: number) => void;
  markRateUsShown: () => void;
  cheatScoutUp: () => void;
  cheatResetStreetCup: () => void;
  cheatLeagueUp: () => void;
  cheatUnlockActivities: () => void;
  cheatEndSeason: () => void;
  buyPremiumPack: (pack: 'noAds' | '2xIncome' | '3xIdle' | '3xIncome' | 'bonusPack') => void;
  markLeaguePackPurchased: (packId: string) => void;
  claimFreeGems: () => boolean;
  claimFreeGold: (amount: number, step: 'free' | 'ad') => boolean;
  claimFirstPurchaseBonus: () => boolean;
  claimFreeChest: (type: 'player' | 'star') => boolean;
  addBoost2x: () => boolean;
  boostStreetCup: () => boolean;
  checkStreetCup: () => void;
  // Season Pass quests
  addQuestProgress: (questId: string, amount: number, isWeekly?: boolean) => void;
  claimQuest: (questId: string, xpReward: number, isWeekly?: boolean) => void;
  claimSpReward: (tierIdx: number, column: 'free' | 'novice' | 'champion') => void;
  claimAllSpRewards: (column: 'free' | 'novice' | 'champion') => void;
  buySpTier: (tier: 'novice' | 'champion') => void;
  // Staff system
  addStaffCard: (staffId: string) => void;
  assignStaff: (buildingId: string, staffId: string | null) => void;
  levelUpStaff: (staffId: string) => boolean;
  openStaffBox: (cost: number, currency: 'crystals' | 'trophies', boxTier?: 'normal' | 'epic' | 'legendary') => string | null;
  openStaffBoxBulk: (count: number, totalCost: number, currency: 'crystals' | 'trophies', boxTier?: 'normal' | 'epic' | 'legendary') => string[] | null;
  openFreeStaffBox: () => string | null;
  // Special buildings
  trainPlayer: (playerId: string) => boolean;
  activateStrategy: () => boolean;
  healPlayer: (playerId: string) => boolean;
  speedUpHeal: (playerId: string) => boolean;
  dismissSickPopup: () => void;
  skipTrainingCooldown: () => boolean;
  skipStrategyCooldown: () => boolean;
  skipStrategyGeneration: () => boolean;
  // Staff offers
  claimStaffBoxOffer: () => void;
  claimEpicStaffOffer: () => void;
  dismissStaffBoxOffer: () => void;
  dismissEpicStaffOffer: () => void;
  activateStaffOffers: () => void;
  // VGP pause: when true, main game tick (match + income) is paused
  vgpPaused: boolean;
  setVgpPaused: (paused: boolean) => void;
  setTutorialStep: (step: string | undefined) => void;
  // VGP reset signal: incremented when game is reset so VGP context can react
  vgpResetCount: number;
}

function hashDateSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + (s.charCodeAt(i) ?? 0)) | 0;
  }
  return Math.abs(h) || 1;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);
  const [seasonCompleteInfo, setSeasonCompleteInfo] = useState<SeasonCompleteInfo | null>(null);
  const seasonCompleteRef = useRef<SeasonCompleteInfo | null>(null);
  const [matchState, setMatchState] = useState<MatchState>({
    matchTime: 0, homeScore: 0, awayScore: 0,
    opponentPower: 400, opponentName: 'FC Unknown', result: null,
  });
  const [displayScore, setDisplayScoreRaw] = useState({ home: 0, away: 0 });
  const displayScoreRef = useRef({ home: 0, away: 0 });
  const setDisplayScore: React.Dispatch<React.SetStateAction<{ home: number; away: number }>> = useCallback((action) => {
    setDisplayScoreRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      displayScoreRef.current = next;
      return next;
    });
  }, []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [vgpPaused, setVgpPaused] = useState(false);
  const vgpPausedRef = useRef(false);
  vgpPausedRef.current = vgpPaused;
  const [vgpResetCount, setVgpResetCount] = useState(0);
  const [lastGoalEvent, setLastGoalEvent] = useState<GoalEvent | null>(null);
  const [lastUpgradeEvent, setLastUpgradeEvent] = useState<UpgradeEvent | null>(null);
  const [offlineEarnings, setOfflineEarnings] = useState(0);
  const [offlineSeconds, setOfflineSeconds] = useState(0);

  const winBonusRef = useRef(0);
  const backgroundTimeRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived values
  const incomePerSecond = useMemo(() => calculateIncome(gameState), [gameState]);
  const seasonPlayed = (gameState?.seasonWins ?? 0) + (gameState?.seasonDraws ?? 0) + (gameState?.seasonLosses ?? 0);
  const matchProgression = useMemo(
    () => getMatchProgression(gameState?.currentMatch ?? 1, gameState?.leagueIndex ?? 0, seasonPlayed),
    [gameState?.currentMatch, gameState?.leagueIndex, seasonPlayed],
  );
  const teamPower = useMemo(() => calculateTeamPower(gameState), [gameState]);
  const hasAnyLeaguePack = (gameState?.purchasedLeaguePacks ?? []).length > 0;
  const winChance = useMemo(() => calculateWinChance(teamPower, matchState?.opponentPower ?? 400, hasAnyLeaguePack), [teamPower, matchState?.opponentPower, hasAnyLeaguePack]);

  // Refs for tick access
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const teamPowerRef = useRef(teamPower);
  teamPowerRef.current = teamPower;

  // Helper: start a new match for the current match number
  const startNewMatch = useCallback((matchNum: number, leagueIdx: number, seasonMatchesPlayed: number, seed?: number) => {
    const prog = getMatchProgression(matchNum, leagueIdx, seasonMatchesPlayed);
    const seasonSeed = seed ?? stateRef.current?.seasonSeed ?? 0;
    const oppName = getScheduledOpponentName(leagueIdx, seasonSeed, seasonMatchesPlayed);
    setMatchState({
      matchTime: 0,
      homeScore: 0,
      awayScore: 0,
      opponentPower: prog.opponentPower,
      opponentName: oppName,
      result: null,
    });
  }, []);

  // ── Load game ──
  useEffect(() => {
    (async () => {
      const saved = await loadGameState();
      if (saved) {
        const now = Date.now();
        const rawElapsed = Math.floor((now - (saved?.lastSaveTime ?? now)) / 1000);
        const idleMult = saved?.idleMultiplier ?? 1;
        const offlineCap = idleMult >= 3 ? 24 * 60 * 60 : OFFLINE_EARNINGS_CAP;
        const elapsed = Math.min(rawElapsed, offlineCap);
        const income = calculateIncome(saved);
        const earned = elapsed > 5 ? Math.floor(income * elapsed * idleMult / 10) : 0;

        // Migrate: leagueIndex (old saves don't have it)
        const leagueIdx = saved?.leagueIndex ?? 0;
        // Migrate: fame (old saves don't have it)
        if (saved.fame == null) {
          saved.fame = 0;
        }
        // Migrate: seasonSeed (old saves don't have it)
        if (saved.seasonSeed == null) {
          saved.seasonSeed = Math.floor(Math.random() * 1000000);
        }
        if (!saved.seasonResults) {
          // Can't reconstruct chronological order — reset current season
          saved.seasonResults = [];
          saved.seasonWins = 0;
          saved.seasonDraws = 0;
          saved.seasonLosses = 0;
          saved.seasonSeed = Math.floor(Math.random() * 2147483647);
        }

        let market = saved?.transferMarket ?? [];
        let marketTime = saved?.transferMarketRefreshTime ?? 0;
        if (now - marketTime >= MARKET_REFRESH_INTERVAL || market.length === 0) {
          market = generateMarket(saved?.scoutLevel ?? 1, leagueIdx, false, Math.max(1, (LEAGUES[leagueIdx]?.multiplier ?? 1) - 1));
          marketTime = now;
        }

        let scoutLevel = saved?.scoutLevel ?? 1;
        let trainingStart = saved?.scoutTrainingStart;
        let trainingTarget = saved?.scoutTrainingTarget;
        if (trainingStart && trainingTarget) {
          const training = SCOUT_TRAINING?.find(t => t?.toLevel === trainingTarget);
          if (training && now - trainingStart >= (training?.durationHours ?? 1) * 3600000) {
            scoutLevel = trainingTarget;
            trainingStart = null;
            trainingTarget = null;
          }
        }

        const currentMatch = saved?.currentMatch ?? 1;

        // Migrate: assign positions to old players without them
        const positionSlots: string[] = ['GK', 'LD', 'CD', 'CD', 'RD', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST', 'CM', 'CD', 'ST'];
        if (saved?.players?.length && !saved.players[0]?.position) {
          saved.players.forEach((p, i) => {
            (p as any).position = positionSlots[i] ?? 'CM';
          });
        }

        // Migrate: if no startingIds, all players are starting (up to 11)
        let startingIds = saved?.startingIds ?? [];
        if (startingIds.length === 0 && (saved?.players ?? []).length > 0) {
          // Sort by formation slot order so 1:1 mapping works
          const posOrder = ['GK','LD','CD','RD','LM','CM','RM','ST'];
          const sorted = [...(saved.players ?? [])].sort((a, b) => {
            const ai = posOrder.indexOf(a?.position ?? 'CM');
            const bi = posOrder.indexOf(b?.position ?? 'CM');
            if (ai !== bi) return ai - bi;
            return (b?.overall ?? 0) - (a?.overall ?? 0);
          });
          startingIds = sorted.slice(0, 11).map(p => p?.id ?? '');
        }

        // Migrate: season stats (old saves → reset to 0)
        const seasonWins = saved?.seasonWins ?? 0;
        const seasonDraws = saved?.seasonDraws ?? 0;
        const seasonLosses = saved?.seasonLosses ?? 0;
        const seasonMatchesPlayed = seasonWins + seasonDraws + seasonLosses;

        // Migrate: streetCupUnlocked — auto-unlock if already in League 2+
        if (saved.streetCupUnlocked == null) {
          saved.streetCupUnlocked = (saved.leagueIndex ?? 0) >= 2;
        }

        const updatedState: GameState = {
          ...DEFAULT_GAME_STATE,
          ...saved,
          money: (saved?.money ?? 0) + earned,
          totalEarned: (saved?.totalEarned ?? 0) + earned,
          stadiumEarnings: (saved?.stadiumEarnings ?? 0) + earned,
          currentMatch,
          leagueIndex: leagueIdx,
          seasonWins,
          seasonDraws,
          seasonLosses,
          matchWins: saved?.matchWins ?? 0,
          matchLosses: saved?.matchLosses ?? 0,
          matchDraws: saved?.matchDraws ?? 0,
          recentForm: saved?.recentForm ?? [],
          startingIds,
          transferMarket: market,
          transferMarketRefreshTime: marketTime,
          scoutLevel,
          scoutTrainingStart: trainingStart ?? null,
          scoutTrainingTarget: trainingTarget ?? null,
          lastSaveTime: now,
        };
        // Backfill maxLeagueReached for existing saves
        if (updatedState.maxLeagueReached == null) {
          updatedState.maxLeagueReached = updatedState.leagueIndex ?? 0;
        }
        // Migrate hasEverBoughtPlayer for old saves
        if (updatedState.hasEverBoughtPlayer == null && (updatedState.players?.length ?? 0) > 11) {
          updatedState.hasEverBoughtPlayer = true;
        }
        // Set firstOpenDate if not present (for rate-us tracking)
        if (!updatedState.firstOpenDate) {
          updatedState.firstOpenDate = new Date().toISOString().split('T')[0] ?? '';
        }
        setGameState(updatedState);
        if (earned > 0) {
          setOfflineEarnings(earned);
          setOfflineSeconds(rawElapsed);
        }
        startNewMatch(currentMatch, leagueIdx, seasonMatchesPlayed);
      } else {
        const market = generateMarket(1, 0, true);
        const fullSquad = generateStartingSquad();
        setGameState(prev => ({
          ...prev,
          players: fullSquad,
          startingIds: fullSquad.slice(0, 11).map(p => p?.id ?? ''),
          transferMarket: market,
          transferMarketRefreshTime: Date.now(),
          lastSaveTime: Date.now(),
          firstOpenDate: new Date().toISOString().split('T')[0] ?? '',
        }));
        startNewMatch(1, 0, 0);
      }
      setIsLoaded(true);
      trackEvent('other.app_open', { league: (saved?.leagueIndex ?? 0).toString(), match: (saved?.currentMatch ?? 1).toString() });
    })();
  }, [startNewMatch]);

  // ── Game tick (1 second) ──
  useEffect(() => {
    if (!isLoaded) return;

    const tick = () => {
      // Match update (paused when VGP is active — income keeps running below)
      if (!vgpPausedRef.current) setMatchState(prev => {
        const curState = stateRef.current;
        const newMatch = { ...(prev ?? { matchTime: 0, homeScore: 0, awayScore: 0, opponentPower: 400, opponentName: 'FC Unknown', result: null }) };

        // If result already shown, count down pause then start next
        if (newMatch.result && newMatch.result !== 'playing') {
          // If season complete modal is shown, stay paused
          if (seasonCompleteRef.current) return newMatch;
          newMatch.matchTime = (newMatch.matchTime ?? 0) + 1;
          const pauseTime = newMatch.matchTime - MATCH_DURATION;
          if (pauseTime >= MATCH_PAUSE) {
            // After pause: start next match
            const curMatch = curState?.currentMatch ?? 1;
            const leagueIdx = curState?.leagueIndex ?? 0;
            const sp = (curState?.seasonWins ?? 0) + (curState?.seasonDraws ?? 0) + (curState?.seasonLosses ?? 0);
            const prog = getMatchProgression(curMatch, leagueIdx, sp);
            const seed = curState?.seasonSeed ?? 0;
            return {
              matchTime: 0,
              homeScore: 0,
              awayScore: 0,
              opponentPower: prog.opponentPower,
              opponentName: getScheduledOpponentName(leagueIdx, seed, sp),
              result: null,
            };
          }
          return newMatch;
        }

        newMatch.matchTime = (newMatch.matchTime ?? 0) + 1;

        if ((newMatch.matchTime ?? 0) <= MATCH_DURATION) {
          // Goal check ~3.5% chance per second ≈ 3 goals per match
          const wc = calculateWinChance(teamPowerRef.current, newMatch.opponentPower ?? 400, (stateRef.current?.purchasedLeaguePacks ?? []).length > 0);
          if (Math.random() < 0.035) {
            const isHome = Math.random() * 100 < wc;
            if (isHome) {
              newMatch.homeScore = (newMatch.homeScore ?? 0) + 1;
              const allPlayers = curState?.players ?? [];
              const startIds = new Set(curState?.startingIds ?? []);
              const starters = allPlayers.filter(p => startIds.has(p?.id ?? ''));
              const pool = starters.length > 0 ? starters : allPlayers;
              // Weighted pick: higher overall = more likely to score/assist, exclude GK
              const outfieldPool = pool.filter(p => p?.position !== 'GK');
              const pickPool = outfieldPool.length > 0 ? outfieldPool : pool;
              const weights = pickPool.map(p => Math.pow(p?.overall ?? 1, 2));
              const totalW = weights.reduce((a, b) => a + b, 0);
              const pickWeighted = () => {
                let r = Math.random() * totalW;
                for (let i = 0; i < pickPool.length; i++) {
                  r -= weights[i];
                  if (r <= 0) return pickPool[i];
                }
                return pickPool[pickPool.length - 1];
              };
              const scorerPlayer = pickPool.length > 0 ? pickWeighted() : null;
              const scorer = scorerPlayer?.lastName ?? 'Unknown';
              // Pick assister (different player, also weighted, no GK)
              const assistCandidates = pickPool.filter(p => p?.id !== scorerPlayer?.id);
              const aWeights = assistCandidates.map(p => Math.pow(p?.overall ?? 1, 2));
              const aTotalW = aWeights.reduce((a, b) => a + b, 0);
              const assisterPlayer = assistCandidates.length > 0 ? (() => {
                let r = Math.random() * aTotalW;
                for (let i = 0; i < assistCandidates.length; i++) {
                  r -= aWeights[i];
                  if (r <= 0) return assistCandidates[i];
                }
                return assistCandidates[assistCandidates.length - 1];
              })() : null;
              // Track goals & assists on player objects
              if (scorerPlayer || assisterPlayer) {
                setGameState(p => {
                  if (!p) return p;
                  const updPlayers = p.players.map(pl => {
                    if (scorerPlayer && pl.id === scorerPlayer.id) return { ...pl, goals: (pl.goals ?? 0) + 1 };
                    if (assisterPlayer && pl.id === assisterPlayer.id) return { ...pl, assists: (pl.assists ?? 0) + 1 };
                    return pl;
                  });
                  // Career player goals
                  const cp = p.careerPlayer;
                  const updCp = cp && scorerPlayer?.id === cp.id
                    ? { ...cp, goalsScored: (cp.goalsScored ?? 0) + 1 }
                    : cp;
                  return { ...p, players: updPlayers, careerPlayer: updCp };
                });
              }
              setLastGoalEvent({ isHome: true, bonus: 0, scorer, timestamp: Date.now() });
              // Quest: score_goal
              addQuestProgress('score_goal', 1);
              addQuestProgress('score_goal_w', 1, true);
            } else {
              newMatch.awayScore = (newMatch.awayScore ?? 0) + 1;
              setLastGoalEvent({ isHome: false, bonus: 0, scorer: '', timestamp: Date.now() });
            }
          }

          // Random match events: intercepts, yellow/red cards, penalties (~every few seconds)
          if (Math.random() < 0.02) {
            // Intercept for a random defender/midfielder
            const allP = curState?.players ?? [];
            const sIds = new Set(curState?.startingIds ?? []);
            const defenders = allP.filter(p => sIds.has(p?.id ?? '') && ['GK', 'LD', 'CD', 'RD', 'CM'].includes(p?.position ?? ''));
            if (defenders.length > 0) {
              const dp = defenders[Math.floor(Math.random() * defenders.length)];
              setGameState(p => {
                if (!p) return p;
                return { ...p, players: p.players.map(pl => pl.id === dp.id ? { ...pl, intercepts: (pl.intercepts ?? 0) + 1 } : pl) };
              });
            }
          }
          if (Math.random() < 0.008) {
            // Yellow card for a random starter
            const allP = curState?.players ?? [];
            const sIds = new Set(curState?.startingIds ?? []);
            const starters = allP.filter(p => sIds.has(p?.id ?? ''));
            if (starters.length > 0) {
              const cp = starters[Math.floor(Math.random() * starters.length)];
              setGameState(p => {
                if (!p) return p;
                return { ...p, players: p.players.map(pl => pl.id === cp.id ? { ...pl, yellowCards: (pl.yellowCards ?? 0) + 1 } : pl) };
              });
            }
          }
          if (Math.random() < 0.002) {
            // Red card (very rare)
            const allP = curState?.players ?? [];
            const sIds = new Set(curState?.startingIds ?? []);
            const starters = allP.filter(p => sIds.has(p?.id ?? ''));
            if (starters.length > 0) {
              const cp = starters[Math.floor(Math.random() * starters.length)];
              setGameState(p => {
                if (!p) return p;
                return { ...p, players: p.players.map(pl => pl.id === cp.id ? { ...pl, redCards: (pl.redCards ?? 0) + 1 } : pl) };
              });
            }
          }
          if (Math.random() < 0.005) {
            // Penalty kick scored by random forward/midfielder
            const allP = curState?.players ?? [];
            const sIds = new Set(curState?.startingIds ?? []);
            const forwards = allP.filter(p => sIds.has(p?.id ?? '') && ['ST', 'CM', 'RM', 'LM'].includes(p?.position ?? ''));
            if (forwards.length > 0) {
              const fp = forwards[Math.floor(Math.random() * forwards.length)];
              setGameState(p => {
                if (!p) return p;
                return { ...p, players: p.players.map(pl => pl.id === fp.id ? { ...pl, penalties: (pl.penalties ?? 0) + 1 } : pl) };
              });
            }
          }
        } else if (!newMatch.result) {
          // Match just ended — use the DISPLAYED score (what the user sees on the scoreboard)
          const home = displayScoreRef.current.home;
          const away = displayScoreRef.current.away;
          // Snap internal scores to match the scoreboard so everything is consistent
          newMatch.homeScore = home;
          newMatch.awayScore = away;

          const resultType: 'won' | 'lost' | 'draw' = home > away ? 'won' : home < away ? 'lost' : 'draw';
          newMatch.result = resultType;
          trackEvent('match.result', { result: resultType, home: home.toString(), away: away.toString(), league: (curState?.leagueIndex ?? 0).toString() });

          // Win bonus
          if (resultType === 'won') {
            const curMatch = curState?.currentMatch ?? 1;
            const leagueIdx = curState?.leagueIndex ?? 0;
            const sp = (curState?.seasonWins ?? 0) + (curState?.seasonDraws ?? 0) + (curState?.seasonLosses ?? 0);
            const prog = getMatchProgression(curMatch, leagueIdx, sp);
            winBonusRef.current += prog.winBonus;
          }

          // Quest progress: play_match (daily + weekly), win_match
          addQuestProgress('play_match', 1);
          addQuestProgress('play_match_w', 1, true);
          if (resultType === 'won') {
            addQuestProgress('win_match', 1);
            addQuestProgress('win_match_w', 1, true);
          }

          // All results advance the season and global match counter
          setGameState(p => {
            const seasonResultChar: 'W' | 'D' | 'L' = resultType === 'won' ? 'W' : resultType === 'draw' ? 'D' : 'L';
            const newSeasonResults = [...(p?.seasonResults ?? []), seasonResultChar];

            // Trophies are awarded only for winning the league season (1st place), not per match
            let trophyReward = 0;

            // Fame reward per match: 7 for win, 5 for loss/draw (only from stadium 2+)
            const fameReward = (p?.leagueIndex ?? 0) >= 1 ? (resultType === 'won' ? 7 : 5) : 0;

            // Career player: increment matches played on each match
            const updatedCareerPlayer = p?.careerPlayer ? {
              ...p.careerPlayer,
              matchesPlayed: (p.careerPlayer.matchesPlayed ?? 0) + 1,
            } : null;

            const newSeasonW = (p?.seasonWins ?? 0) + (resultType === 'won' ? 1 : 0);
            const newSeasonD = (p?.seasonDraws ?? 0) + (resultType === 'draw' ? 1 : 0);
            const newSeasonL = (p?.seasonLosses ?? 0) + (resultType === 'lost' ? 1 : 0);
            const newMatchW = (p?.matchWins ?? 0) + (resultType === 'won' ? 1 : 0);
            const newMatchD = (p?.matchDraws ?? 0) + (resultType === 'draw' ? 1 : 0);
            const newMatchL = (p?.matchLosses ?? 0) + (resultType === 'lost' ? 1 : 0);
            const form = [...(p?.recentForm ?? []), resultType === 'won' ? 'W' as const : resultType === 'lost' ? 'L' as const : 'D' as const].slice(-6) as ('W' | 'L' | 'D')[];

            const currentMatchNum = p?.currentMatch ?? 1;
            const nextMatch = currentMatchNum + 1;
            const leagueIdx = p?.leagueIndex ?? 0;
            const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
            const totalSeasonMatches = league?.totalMatches ?? 9;
            const seasonMatchesPlayed = newSeasonW + newSeasonD + newSeasonL;

            // Check if season is complete
            if (seasonMatchesPlayed >= totalSeasonMatches) {
              // Evaluate final standings
              const teamName = p?.teamName ?? 'My Team';
              const position = evaluateSeasonStandings(teamName, newSeasonW, newSeasonD, newSeasonL, leagueIdx, p?.seasonSeed ?? 0, newSeasonResults);
              const teamCount = league?.teamCount ?? 10;

              let newLeagueIdx = leagueIdx;
              let promoMoney = 0;
              let promoCrystals = 0;

              // Award trophies: top 3 get generous rewards, everyone else gets a small consolation
              if (position <= 3) {
                const table = TROPHY_REWARDS_TABLE[leagueIdx] ?? [8, 5, 3];
                trophyReward = table[position - 1] ?? 0;
              } else {
                // Small consolation trophies for finishing season (1-2 based on stadium)
                trophyReward = Math.max(1, Math.floor(1 + leagueIdx * 0.3));
              }

              // Top 3 → promote (unless already Champions)
              if (position <= 3 && leagueIdx < LEAGUES.length - 1) {
                newLeagueIdx = leagueIdx + 1;
                const newLeague = LEAGUES[newLeagueIdx];
                promoMoney = newLeague?.bonusMoney ?? 0;
                promoCrystals = newLeague?.bonusCrystals ?? 0;
                trackEvent('match.league_promoted', { from: leagueIdx.toString(), to: newLeagueIdx.toString(), toName: LEAGUES[newLeagueIdx]?.name ?? '', position: position.toString() });
              }
              // Champions 1st place → bonus reward (stay in Champions)
              else if (position === 1 && leagueIdx === LEAGUES.length - 1) {
                promoMoney = 5_000_000;
                promoCrystals = 30;
              }
              // No relegation — player stays at current stadium

              const canPromote = newLeagueIdx > leagueIdx;

              // Set season complete info for modal
              const scInfo: SeasonCompleteInfo = {
                leagueName: league?.name ?? 'League',
                leagueIndex: leagueIdx,
                position,
                teamCount,
                totalMatches: totalSeasonMatches,
                promoted: canPromote,
                relegated: false,
                newLeagueIndex: newLeagueIdx,
                rewardMoney: promoMoney,
                rewardCrystals: promoCrystals,
                rewardTrophies: trophyReward,
                stadiumEarnings: p?.stadiumEarnings ?? 0,
                playerSaleValue: 0,
                pendingPromotion: canPromote,
              };
              seasonCompleteRef.current = scInfo;
              setSeasonCompleteInfo(scInfo);
              addQuestProgress('finish_season', 1);
              trackEvent('match.season_complete', { league: league?.name ?? '', leagueIndex: leagueIdx.toString(), position: position.toString(), promoted: canPromote.toString(), trophies: trophyReward.toString() });

              // Season resets — but DON'T promote yet (wait for confirmation)
              return {
                ...p,
                currentMatch: nextMatch,
                // Stay at current league — promotion is pending
                pendingPromotion: canPromote,
                seasonWins: 0,
                seasonDraws: 0,
                seasonLosses: 0,
                seasonResults: [],
                seasonSeed: Math.floor(Math.random() * 1000000),
                matchWins: newMatchW,
                matchDraws: newMatchD,
                matchLosses: newMatchL,
                recentForm: form,
                fame: (p?.fame ?? 0) + fameReward,
                trophies: (p?.trophies ?? 0) + trophyReward,
                // Non-promotion rewards (crystals for champions winner)
                crystals: (p?.crystals ?? 0) + (!canPromote ? promoCrystals : 0),
                money: (p?.money ?? 0) + (!canPromote ? promoMoney : 0),
                careerPlayer: updatedCareerPlayer,
              };
            }

            // Illness chance after match — scales with stadium (starts at stadium 2)
            let updatedPlayers = [...(p?.players ?? [])];
            let newlySickId: string | null = null;
            const stIdx = p?.leagueIndex ?? 0;
            const illnessChance = stIdx >= 2 ? ILLNESS_CHANCE_PER_MATCH + (stIdx - 2) * 0.012 : 0; // 5% at stadium 2, ~8.6% at stadium 5, ~17% at stadium 12, ~38% at stadium 29
            if (illnessChance > 0 && Math.random() < illnessChance) {
              const starters = (p?.startingIds ?? []).map(id => updatedPlayers.find(pl => pl?.id === id)).filter(Boolean) as Player[];
              const healthy = starters.filter(pl => !pl.illness);
              if (healthy.length > 0) {
                const victim = healthy[Math.floor(Math.random() * healthy.length)];
                const totalWeight = ILLNESS_TYPES.reduce((s, t) => s + t.weight, 0);
                let roll = Math.random() * totalWeight;
                let chosenIllness = ILLNESS_TYPES[0];
                for (const it of ILLNESS_TYPES) {
                  roll -= it.weight;
                  if (roll <= 0) { chosenIllness = it; break; }
                }
                updatedPlayers = updatedPlayers.map(pl =>
                  pl.id === victim.id ? { ...pl, illness: { type: chosenIllness.type, effectiveness: chosenIllness.effectiveness, appliedAt: Date.now() } } : pl
                );
                newlySickId = victim.id;
              }
            }

            // Season continues
            return {
              ...p,
              players: updatedPlayers,
              currentMatch: nextMatch,
              seasonWins: newSeasonW,
              seasonDraws: newSeasonD,
              seasonLosses: newSeasonL,
              seasonResults: newSeasonResults,
              matchWins: newMatchW,
              matchDraws: newMatchD,
              matchLosses: newMatchL,
              recentForm: form,
              fame: (p?.fame ?? 0) + fameReward,
              trophies: (p?.trophies ?? 0) + trophyReward,
              careerPlayer: updatedCareerPlayer,
              ...(newlySickId ? { lastSickPlayerId: newlySickId } : {}),
            };
          });
        }
        return newMatch;
      });

      // Income + win bonus
      setGameState(prev => {
        const income = calculateIncome(prev);
        const bonus = winBonusRef.current;
        winBonusRef.current = 0;
        const total = income + bonus;
        if (total <= 0) return prev;

        const now = Date.now();
        let market = prev?.transferMarket ?? [];
        let marketTime = prev?.transferMarketRefreshTime ?? 0;
        const leagueIdx = prev?.leagueIndex ?? 0;
        if (now - marketTime >= MARKET_REFRESH_INTERVAL) {
          market = generateMarket(prev?.scoutLevel ?? 1, leagueIdx, false, Math.max(1, (LEAGUES[leagueIdx]?.multiplier ?? 1) - 1));
          marketTime = now;
        }

        let scoutLevel = prev?.scoutLevel ?? 1;
        let trainingStart = prev?.scoutTrainingStart;
        let trainingTarget = prev?.scoutTrainingTarget;
        if (trainingStart && trainingTarget) {
          const training = SCOUT_TRAINING?.find(t => t?.toLevel === trainingTarget);
          if (training && now - trainingStart >= (training?.durationHours ?? 1) * 3600000) {
            scoutLevel = trainingTarget;
            trainingStart = null;
            trainingTarget = null;
          }
        }

        const newMoney = (prev?.money ?? 0) + total;
        const shouldUnlock = !prev?.marketUnlocked && newMoney >= 1000;

        // Strategy generation (if trainer assigned to strategy_room)
        let strategiesReady = prev?.strategiesReady ?? 0;
        let strategyLastGenTime = prev?.strategyLastGenTime ?? 0;
        const hasStratTrainer = !!(prev?.staffAssigned?.['strategy_room']);
        if (hasStratTrainer && strategyLastGenTime > 0 && strategiesReady < STRATEGY_MAX_READY) {
          // First gen uses shorter interval, subsequent uses normal interval
          const isFirstGen = strategiesReady === 0 && (prev?.activeStrategies ?? []).filter(st => st.expiresAt > now).length === 0;
          const genInterval = isFirstGen ? STRATEGY_GEN_FIRST : STRATEGY_GEN_INTERVAL;
          if (now - strategyLastGenTime >= genInterval) {
            strategiesReady = Math.min(strategiesReady + STRATEGY_BATCH_SIZE, STRATEGY_MAX_READY);
            strategyLastGenTime = now;
          }
        } else if (hasStratTrainer && strategyLastGenTime === 0) {
          strategyLastGenTime = now;
        }

        // Clean expired training boosts & strategies
        const trainingBoosts = (prev?.trainingBoosts ?? []).filter(b => b.expiresAt > now);
        const activeStrategies = (prev?.activeStrategies ?? []).filter(s => s.expiresAt > now);

        // Auto-expire illnesses based on duration (doctor speeds up healing)
        let tickPlayers = prev?.players ?? [];
        // Calculate doctor healing speed multiplier
        let healSpeedMult = 1;
        const docStaffId = prev?.staffAssigned?.['infirmary'];
        if (docStaffId) {
          const docOwned = prev?.staff?.[docStaffId];
          const docDef = STAFF_CARDS.find(c => c.id === docStaffId);
          if (docDef && docOwned) {
            const docBonus = getStaffBonus(docDef, docOwned);
            healSpeedMult = 1 + docBonus; // e.g. +10% bonus → heals 1.1x faster (duration / 1.1)
          }
        }
        const anyExpiredIllness = tickPlayers.some(pl => {
          if (!pl.illness) return false;
          // Healing complete?
          if (pl.illness.healingUntil && now >= pl.illness.healingUntil) return true;
          if (!pl.illness.appliedAt) return true;
          const illType = ILLNESS_TYPES.find(t => t.type === pl.illness?.type);
          const effectiveDuration = illType ? illType.duration / healSpeedMult : Infinity;
          return illType && (now - pl.illness.appliedAt) >= effectiveDuration;
        });
        // First illness tutorial trigger
        let illnessTutStep = prev?.tutorialStep;
        if (!prev?.healTutorialShown && tickPlayers.some(pl => !!pl.illness) && !illnessTutStep && (prev?.leagueIndex ?? 0) >= 1) {
          illnessTutStep = 'heal_hint';
        }
        if (anyExpiredIllness) {
          tickPlayers = tickPlayers.map(pl => {
            if (!pl.illness) return pl;
            if (pl.illness.healingUntil && now >= pl.illness.healingUntil) return { ...pl, illness: null };
            if (!pl.illness.appliedAt) return { ...pl, illness: null };
            const illType = ILLNESS_TYPES.find(t => t.type === pl.illness?.type);
            const effectiveDuration = illType ? illType.duration / healSpeedMult : Infinity;
            if (illType && (now - pl.illness.appliedAt) >= effectiveDuration) {
              return { ...pl, illness: null };
            }
            return pl;
          });
        }

        // Auto-grant free staff open after 24h cooldown
        const FREE_STAFF_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms
        let freeStaffOpens = prev?.freeStaffOpens ?? 0;
        let lastFreeStaffClaimTime = prev?.lastFreeStaffClaimTime;
        if (freeStaffOpens === 0 && lastFreeStaffClaimTime && (now - lastFreeStaffClaimTime) >= FREE_STAFF_COOLDOWN && (prev?.leagueIndex ?? 0) >= 1) {
          freeStaffOpens = 1;
          lastFreeStaffClaimTime = undefined;
        }

        return {
          ...prev,
          players: anyExpiredIllness ? tickPlayers : prev?.players,
          money: newMoney,
          totalEarned: (prev?.totalEarned ?? 0) + total,
          stadiumEarnings: (prev?.stadiumEarnings ?? 0) + total,
          strategiesReady,
          strategyLastGenTime,
          trainingBoosts,
          activeStrategies,
          transferMarket: market,
          transferMarketRefreshTime: marketTime,
          scoutLevel,
          scoutTrainingStart: trainingStart ?? null,
          scoutTrainingTarget: trainingTarget ?? null,
          ...(shouldUnlock ? { marketUnlocked: true, tutorialStep: 'transfer_go' } : {}),
          ...(scoutLevel === 3 && (prev?.scoutLevel ?? 1) < 3 ? { tutorialStep: 'career_hint' } : {}),
          ...(income >= 200 && !prev?.incomeTutorialShown && (prev?.leagueIndex ?? 0) === 0 && !shouldUnlock && !prev?.tutorialStep ? { tutorialStep: 'income_hint', incomeTutorialShown: true } : {}),
          ...(illnessTutStep === 'heal_hint' ? { tutorialStep: 'heal_hint', healTutorialShown: true } : {}),
          freeStaffOpens,
          lastFreeStaffClaimTime,
        };
      });
    };

    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isLoaded]);

  // ── Auto-save ──
  useEffect(() => {
    if (!isLoaded) return;
    saveTimerRef.current = setInterval(() => {
      saveGameState(stateRef.current);
    }, AUTO_SAVE_INTERVAL);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [isLoaded]);

  // ── AppState: handle background/foreground (screen lock, app switch) ──
  useEffect(() => {
    if (!isLoaded) return;
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Going to background — save state and record timestamp
        backgroundTimeRef.current = Date.now();
        saveGameState(stateRef.current);
      } else if (nextState === 'active' && backgroundTimeRef.current) {
        // Returning from background — calculate offline earnings
        const now = Date.now();
        const rawElapsed = Math.floor((now - backgroundTimeRef.current) / 1000);
        backgroundTimeRef.current = null;
        if (rawElapsed > 30) {
          const cur = stateRef.current;
          const idleMult = cur?.idleMultiplier ?? 1;
          const offlineCap = idleMult >= 3 ? 24 * 60 * 60 : OFFLINE_EARNINGS_CAP;
          const elapsed = Math.min(rawElapsed, offlineCap);
          const income = calculateIncome(cur);
          const earned = Math.floor(income * elapsed * idleMult / 10);
          if (earned > 0) {
            setGameState(prev => ({
              ...prev,
              money: (prev?.money ?? 0) + earned,
              totalEarned: (prev?.totalEarned ?? 0) + earned,
              stadiumEarnings: (prev?.stadiumEarnings ?? 0) + earned,
              lastSaveTime: now,
            }));
            setOfflineEarnings(earned);
            setOfflineSeconds(rawElapsed);
          }
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [isLoaded]);

  // ── Actions ──
  const upgrade = useCallback((upgradeId: string): boolean => {
    const cur = stateRef.current;
    if (!cur) return false;
    const currentLevel = cur.upgrades?.[upgradeId] ?? 0;
    const cfg = UPGRADES?.find(u => u?.id === upgradeId);
    if (!cfg || currentLevel >= (cfg?.maxLevel ?? 30)) return false;
    const cost = getUpgradeCost(upgradeId, currentLevel);
    if ((cur.money ?? 0) < cost) return false;

    // Compute before values
    const powerBefore = calculateTeamPower(cur);
    const incomeBefore = calculateIncome(cur);

    const newState = {
      ...cur,
      money: (cur.money ?? 0) - cost,
      upgrades: { ...(cur.upgrades ?? {}), [upgradeId]: currentLevel + 1 },
    };
    setGameState(newState);

    // Compute after values
    const powerAfter = calculateTeamPower(newState);
    const incomeAfter = calculateIncome(newState);

    const upgradeType = cfg.type ?? 'power';
    const diff = upgradeType === 'power'
      ? Math.round(powerAfter - powerBefore)
      : Math.round((incomeAfter - incomeBefore) * 10) / 10;
    const total = upgradeType === 'power'
      ? Math.round(powerAfter)
      : Math.round(incomeAfter * 10) / 10;

    setLastUpgradeEvent({ type: upgradeType, total, diff, timestamp: Date.now() });
    trackEvent('team.upgrade', { id: upgradeId, level: (currentLevel + 1).toString(), cost: cost.toString(), type: upgradeType });
    return true;
  }, []);

  const buyPlayer = useCallback((playerId: string): boolean => {
    const cur = stateRef.current;
    const player = cur?.transferMarket?.find(p => p?.id === playerId);
    if (!player) return false;
    if ((cur?.money ?? 0) < (player?.cost ?? Infinity)) return false;

    setGameState(prev => {
      const startingIds = [...(prev?.startingIds ?? [])];
      // Auto-add to starting if fewer than 11
      if (startingIds.length < 11) {
        startingIds.push(player?.id ?? '');
      }
      // Otherwise goes to bench — no limit, player can sell manually

      const nextTutorial = prev?.tutorialStep === 'transfer_buy' ? 'transfer_place' : prev?.tutorialStep;
      return {
        ...prev,
        money: (prev?.money ?? 0) - (player?.cost ?? 0),
        players: [...(prev?.players ?? []), player],
        startingIds,
        transferMarket: (prev?.transferMarket ?? []).filter(p => p?.id !== playerId),
        tutorialStep: nextTutorial,
        hasEverBoughtPlayer: true,
      };
    });
    trackEvent('team.player_bought', { rarity: player?.rarity ?? 'common', cost: (player?.cost ?? 0).toString(), overall: (player?.overall ?? 0).toString() });
    addQuestProgress('buy_transfer', 1);
    return true;
  }, []);

  const sellPlayer = useCallback((playerId: string): void => {
    const cur = stateRef.current;
    const playerToSell = cur?.players?.find(p => p?.id === playerId);
    setGameState(prev => {
      const player = prev?.players?.find(p => p?.id === playerId);
      if (!player) return prev;
      // Sell price accounts for illness, training boost, and goals
      const baseCost = player.cost ?? 0;
      let mult = 1.0;
      if (player.illness) mult *= player.illness.effectiveness;
      const now = Date.now();
      const boost = (prev?.trainingBoosts ?? []).find(b => b.playerId === playerId && b.expiresAt > now);
      if (boost) mult *= boost.multiplier;
      const goalBonus = Math.min((player.goals ?? 0) * 0.02, 0.5);
      mult *= (1 + goalBonus);
      const refund = Math.floor(baseCost * 0.5 * mult);
      return {
        ...prev,
        money: (prev?.money ?? 0) + refund,
        players: (prev?.players ?? []).filter(p => p?.id !== playerId),
        startingIds: (prev?.startingIds ?? []).filter(id => id !== playerId),
      };
    });
    trackEvent('team.player_sold', { rarity: playerToSell?.rarity ?? 'common', overall: (playerToSell?.overall ?? 0).toString() });
  }, []);

  const swapPlayer = useCallback((startingId: string, benchId: string): { oldPower: number; newPower: number; oldIncome: number; newIncome: number } | null => {
    const cur = stateRef.current;
    const startingIds = cur?.startingIds ?? [];
    if (!startingIds.includes(startingId)) return null;
    if (startingIds.includes(benchId)) return null;

    const oldPower = calculateTeamPower(cur);
    const oldIncome = calculateIncome(cur);
    const newStartingIds = startingIds.map(id => id === startingId ? benchId : id);
    const newState = { ...cur, startingIds: newStartingIds };
    const newPower = calculateTeamPower(newState);
    const newIncome = calculateIncome(newState);

    setGameState(prev => {
      const nextTutorial = prev?.tutorialStep === 'transfer_place' ? 'scout_hint' : prev?.tutorialStep;
      return {
        ...prev,
        startingIds: (prev?.startingIds ?? []).map(id => id === startingId ? benchId : id),
        tutorialStep: nextTutorial,
      };
    });

    trackEvent('team.player_swapped', { powerDiff: (newPower - oldPower).toString(), incomeDiff: (newIncome - oldIncome).toFixed(1) });
    return { oldPower, newPower, oldIncome, newIncome };
  }, []);

  const startScoutTraining = useCallback((): boolean => {
    const cur = stateRef.current;
    const training = SCOUT_TRAINING?.find(t => t?.fromLevel === (cur?.scoutLevel ?? 1));
    if (!training) return false;
    const isTutorial = cur?.tutorialStep === 'scout_upgrade';
    if (!isTutorial && (cur?.money ?? 0) < (training?.cost ?? Infinity)) return false;
    if (cur?.scoutTrainingStart) return false;
    setGameState(prev => ({
      ...prev,
      money: isTutorial ? (prev?.money ?? 0) : (prev?.money ?? 0) - (training?.cost ?? 0),
      scoutTrainingStart: Date.now(),
      scoutTrainingTarget: training?.toLevel ?? ((prev?.scoutLevel ?? 1) + 1),
      tutorialStep: isTutorial ? 'scout_skip' : prev?.tutorialStep,
    }));
    trackEvent('scout.training', { toLevel: (training?.toLevel ?? 0).toString(), cost: (training?.cost ?? 0).toString() });
    addQuestProgress('scout_upgrade', 1);
    return true;
  }, []);

  const speedUpScout = useCallback((): boolean => {
    const cur = stateRef.current;
    if (!cur?.scoutTrainingStart || !cur?.scoutTrainingTarget) return false;
    const training = SCOUT_TRAINING?.find(t => t?.toLevel === cur?.scoutTrainingTarget);
    if (!training) return false;
    const isTutorial = cur?.tutorialStep === 'scout_skip';
    const elapsed = Date.now() - (cur?.scoutTrainingStart ?? Date.now());
    const remaining = Math.max(0, (training?.durationHours ?? 1) * 3600000 - elapsed);
    const hoursLeft = remaining / 3600000;
    const crystalCost = isTutorial ? 0 : (training?.speedUpCrystals ?? Math.max(1, Math.ceil(hoursLeft * 50)));
    if (!isTutorial && (cur?.crystals ?? 0) < crystalCost) return false;
    setGameState(prev => ({
      ...prev,
      crystals: (prev?.crystals ?? 0) - crystalCost,
      scoutLevel: cur?.scoutTrainingTarget ?? ((prev?.scoutLevel ?? 1) + 1),
      scoutTrainingStart: null,
      scoutTrainingTarget: null,
      tutorialStep: cur?.scoutTrainingTarget === 3 ? 'career_hint' : (isTutorial ? 'done' : prev?.tutorialStep),
    }));
    trackEvent('scout.speed_up', { toLevel: (cur?.scoutTrainingTarget ?? 0).toString(), crystals: crystalCost.toString() });
    return true;
  }, []);

  const dismissSeasonComplete = useCallback(() => {
    seasonCompleteRef.current = null;
    setSeasonCompleteInfo(null);
  }, []);

  /** Triggered from LocationsModal "Move here" — builds a SeasonCompleteInfo and shows the promotion confirmation modal */
  const triggerPromotionConfirmation = useCallback(() => {
    const p = stateRef.current;
    if (!p || !p.pendingPromotion) return;
    const leagueIdx = p.leagueIndex ?? 0;
    const newLeagueIdx = leagueIdx + 1;
    if (newLeagueIdx >= LEAGUES.length) return;
    const league = LEAGUES[leagueIdx];
    const scInfo: SeasonCompleteInfo = {
      leagueName: league?.name ?? 'League',
      leagueIndex: leagueIdx,
      position: 1, // they already earned promotion
      teamCount: league?.teamCount ?? 8,
      totalMatches: league?.totalMatches ?? 14,
      promoted: true,
      relegated: false,
      newLeagueIndex: newLeagueIdx,
      rewardMoney: 0,
      rewardCrystals: 0,
      rewardTrophies: 0,
      stadiumEarnings: p.stadiumEarnings ?? 0,
      playerSaleValue: 0,
      pendingPromotion: true,
    };
    seasonCompleteRef.current = scInfo;
    setSeasonCompleteInfo(scInfo);
  }, []);

  /** Player confirmed promotion to next stadium.
   *  Works both from SeasonCompleteModal and from LocationsModal (after modal dismissed). */
  const confirmPromotion = useCallback(() => {
    setGameState(p => {
      if (!p || !p.pendingPromotion) return p;
      const leagueIdx = p.leagueIndex ?? 0;
      const newLeagueIdx = leagueIdx + 1;
      if (newLeagueIdx >= LEAGUES.length) return p;

      const newLeague = LEAGUES[newLeagueIdx];
      const promoCrystals = newLeague?.bonusCrystals ?? 0;

      // Reset income upgrades (prestige) — players stay!
      const newUpgrades = { ...(p.upgrades ?? {}) };
      const incomeIds = (UPGRADES ?? []).filter(u => u?.type === 'income').map(u => u?.id ?? '');
      for (const id of incomeIds) { newUpgrades[id] = 0; }

      // Stadium promotion rewards (only if first time reaching this stadium)
      const isFirstTime = newLeagueIdx > (p.maxLeagueReached ?? 0);
      let bonusCrystals = 0;
      let bonusGold = 0;
      let bonusFame = 0;
      let bonusTrophies = 0;
      let bonusFreeStaffOpens = 0;
      let bonusKeys = 0;
      let bonusKeysGold = 0;

      if (isFirstTime) {
        const { STADIUM_REWARDS } = require('../components/LocationsModal');
        const reward = STADIUM_REWARDS?.[newLeagueIdx];
        if (reward) {
          switch (reward.type) {
            case 'crystals': bonusCrystals = reward.amount; break;
            case 'gold': bonusGold = reward.amount; break;
            case 'fame': bonusFame = reward.amount; break;
            case 'trophies': bonusTrophies = reward.amount; break;
            case 'staff_normal': bonusFreeStaffOpens = reward.amount; break;
            case 'staff_epic': bonusFreeStaffOpens = reward.amount; break;
            case 'box_normal': bonusKeys = reward.amount; break;
            case 'box_elite': bonusKeysGold = reward.amount; break;
            case 'keys': bonusKeys = reward.amount; break;
            case 'keys_gold': bonusKeysGold = reward.amount; break;
          }
          trackEvent('stadium.reward_claimed', { stadium: newLeagueIdx.toString(), type: reward.type, amount: reward.amount.toString() });
        }
      }

      return {
        ...p,
        leagueIndex: newLeagueIdx,
        maxLeagueReached: Math.max(newLeagueIdx, p.maxLeagueReached ?? 0),
        bestLeaguePosition: p.bestLeaguePosition ?? 99,
        streetCupUnlocked: p.streetCupUnlocked || newLeagueIdx >= 2,
        upgrades: newUpgrades,
        // Players and startingIds unchanged — no more squad wipe
        money: bonusGold,
        crystals: (p.crystals ?? 0) + promoCrystals + bonusCrystals,
        fame: (p.fame ?? 0) + bonusFame,
        trophies: (p.trophies ?? 0) + bonusTrophies,
        stadiumEarnings: 0,
        pendingPromotion: false,
        seasonWins: 0,
        seasonDraws: 0,
        seasonLosses: 0,
        seasonResults: [],
        seasonPlayed: 0,
        currentMatch: 1,
        seasonSeed: Math.floor(Math.random() * 1000000),
        freeStaffOpens: (p.freeStaffOpens ?? 0) + (newLeagueIdx >= 1 ? 2 : 0) + bonusFreeStaffOpens,
        keysRegular: (p.keysRegular ?? 0) + bonusKeys,
        keysGold: (p.keysGold ?? 0) + bonusKeysGold,
        ...(newLeagueIdx === 1 && (p.leagueIndex ?? 0) === 0 ? { tutorialStep: 'staff_hint' } : {}),
      };
    });

    seasonCompleteRef.current = null;
    setSeasonCompleteInfo(null);
  }, []);

  const claimDailyReward = useCallback((): boolean => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const prev = stateRef.current;
    if (!prev) return false;
    const claimedDates = prev.dailyClaimedDates ?? [];
    if (claimedDates.includes(today)) return false;

    const curDay = prev.dailyDay ?? 1;
    // Determine rewards for current day
    const REWARDS = [
      { type: 'crystals', amount: 10 },
      { type: 'money', amount: 50_000 },
      { type: 'cups', amount: 1 },
      { type: 'keys', amount: 5 },
      { type: 'money', amount: 100_000 },
      { type: 'crystals', amount: 30 },
      { type: 'cups', amount: 5 },
    ];
    const reward = REWARDS[(curDay - 1)] ?? REWARDS[0]!;
    const nextDay = curDay >= 7 ? 1 : curDay + 1;
    const nextClaimedDates = curDay >= 7 ? [today] : [...claimedDates, today];

    setGameState(p => {
      if (!p) return p;
      let upd = { ...p, lastLoginDate: today, dailyDay: nextDay, dailyClaimedDates: nextClaimedDates };
      if (reward.type === 'crystals') upd.crystals = (upd.crystals ?? 0) + reward.amount;
      else if (reward.type === 'money') upd.money = (upd.money ?? 0) + reward.amount;
      else if (reward.type === 'cups') upd.trophies = (upd.trophies ?? 0) + reward.amount;
      else if (reward.type === 'keys') upd.keysRegular = (upd.keysRegular ?? 0) + reward.amount;
      return upd;
    });
    trackEvent('progress.daily_reward', { day: curDay.toString() });
    return true;
  }, []);

  const claimCareerDaily = useCallback((): number => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const prev = stateRef.current;
    if (!prev?.careerPlayer) return 0;
    if (prev.careerDailyLastClaim === today) return 0;

    const lastClaim = prev.careerDailyLastClaim ?? '';
    // Check if yesterday — continue streak; otherwise reset
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] ?? '';
    const isConsecutive = lastClaim === yesterday;
    const oldStreak = prev.careerDailyStreak ?? 0;
    const newStreak = isConsecutive ? Math.min(oldStreak + 1, 7) : 1;
    // Reward = streak day (1-7)
    const reward = newStreak;

    setGameState(p => ({
      ...p,
      trophies: (p?.trophies ?? 0) + reward,
      careerDailyLastClaim: today,
      careerDailyStreak: newStreak,
    }));
    trackEvent('progress.career_daily', { day: newStreak.toString(), reward: reward.toString() });
    return reward;
  }, []);

  const BP_TIERS = [
    { power: 500,  fc: 0,  pc: 0,   vc: 0,   ft: 1,  pt: 3,  vt: 10  },
    { power: 600,  fc: 3,  pc: 15,  vc: 50,  ft: 0,  pt: 0,  vt: 0   },
    { power: 700,  fc: 0,  pc: 0,   vc: 0,   ft: 1,  pt: 4,  vt: 12  },
    { power: 800,  fc: 4,  pc: 20,  vc: 60,  ft: 0,  pt: 0,  vt: 0   },
    { power: 900,  fc: 0,  pc: 0,   vc: 0,   ft: 1,  pt: 5,  vt: 15  },
    { power: 1000, fc: 5,  pc: 25,  vc: 75,  ft: 0,  pt: 0,  vt: 0   },
    { power: 1100, fc: 0,  pc: 0,   vc: 0,   ft: 2,  pt: 6,  vt: 18  },
    { power: 1200, fc: 7,  pc: 30,  vc: 90,  ft: 0,  pt: 0,  vt: 0   },
    { power: 1300, fc: 0,  pc: 0,   vc: 0,   ft: 2,  pt: 7,  vt: 20  },
    { power: 1400, fc: 8,  pc: 40,  vc: 110, ft: 0,  pt: 0,  vt: 0   },
    { power: 1500, fc: 0,  pc: 0,   vc: 0,   ft: 3,  pt: 8,  vt: 22  },
    { power: 1600, fc: 10, pc: 50,  vc: 130, ft: 0,  pt: 0,  vt: 0   },
    { power: 1700, fc: 0,  pc: 0,   vc: 0,   ft: 3,  pt: 10, vt: 25  },
    { power: 1800, fc: 13, pc: 60,  vc: 195, ft: 0,  pt: 0,  vt: 0   },
    { power: 1900, fc: 0,  pc: 0,   vc: 0,   ft: 5,  pt: 15, vt: 52  },
  ];

  const claimBattlePass = useCallback((tier: number, column: 'free' | 'premium' | 'vip') => {
    const prev = stateRef.current;
    const reward = BP_TIERS[tier];
    if (!reward) return;
    const currentPower = teamPowerRef.current ?? 0;
    if (currentPower < reward.power) return;

    const isTrophyRow = tier % 2 === 0; // even=trophies, odd=crystals
    const amt = isTrophyRow
      ? (column === 'free' ? reward.ft : column === 'premium' ? reward.pt : reward.vt)
      : (column === 'free' ? reward.fc : column === 'premium' ? reward.pc : reward.vc);

    if (column === 'free') {
      const cl = prev?.battlePassClaimed ?? [];
      if (cl.includes(tier)) return;
      setGameState(p => ({
        ...p,
        ...(isTrophyRow ? { trophies: (p?.trophies ?? 0) + amt } : { crystals: (p?.crystals ?? 0) + amt }),
        battlePassClaimed: [...(p?.battlePassClaimed ?? []), tier],
      }));
    } else if (column === 'premium') {
      if (!prev?.bpPremiumPurchased) return;
      const cl = prev?.bpPremiumClaimed ?? [];
      if (cl.includes(tier)) return;
      setGameState(p => ({
        ...p,
        ...(isTrophyRow ? { trophies: (p?.trophies ?? 0) + amt } : { crystals: (p?.crystals ?? 0) + amt }),
        bpPremiumClaimed: [...(p?.bpPremiumClaimed ?? []), tier],
      }));
    } else {
      if (!prev?.bpVipPurchased) return;
      const cl = prev?.bpVipClaimed ?? [];
      if (cl.includes(tier)) return;
      setGameState(p => ({
        ...p,
        ...(isTrophyRow ? { trophies: (p?.trophies ?? 0) + amt } : { crystals: (p?.crystals ?? 0) + amt }),
        bpVipClaimed: [...(p?.bpVipClaimed ?? []), tier],
      }));
    }
    trackEvent('progress.bp_claimed', { tier: tier.toString(), column, power: reward.power.toString() });
  }, []);

  const claimAllBattlePass = useCallback((column: 'free' | 'premium' | 'vip' = 'free') => {
    const prev = stateRef.current;
    const currentPower = teamPowerRef.current ?? 0;

    const claimedKey = column === 'free' ? 'battlePassClaimed' : column === 'premium' ? 'bpPremiumClaimed' : 'bpVipClaimed';
    const alreadyClaimed = (prev as any)?.[claimedKey] ?? [];

    if (column === 'premium' && !prev?.bpPremiumPurchased) return;
    if (column === 'vip' && !prev?.bpVipPurchased) return;

    let totalTrophies = 0;
    let totalCrystals = 0;
    const newClaimed: number[] = [];

    BP_TIERS.forEach((t, i) => {
      if (currentPower >= t.power && !alreadyClaimed.includes(i)) {
        const isTrophyRow = i % 2 === 0;
        if (isTrophyRow) {
          totalTrophies += column === 'free' ? t.ft : column === 'premium' ? t.pt : t.vt;
        } else {
          totalCrystals += column === 'free' ? t.fc : column === 'premium' ? t.pc : t.vc;
        }
        newClaimed.push(i);
      }
    });

    if (newClaimed.length === 0) return;

    setGameState(p => ({
      ...p,
      trophies: (p?.trophies ?? 0) + totalTrophies,
      crystals: (p?.crystals ?? 0) + totalCrystals,
      [claimedKey]: [...((p as any)?.[claimedKey] ?? []), ...newClaimed],
    }));
    trackEvent('progress.bp_claim_all', { column, count: newClaimed.length.toString() });
  }, []);

  const buyBattlePassTier = useCallback((tier: 'premium' | 'vip') => {
    if (tier === 'premium') {
      setGameState(p => ({ ...p, bpPremiumPurchased: true }));
    } else {
      setGameState(p => ({ ...p, bpVipPurchased: true }));
    }
    trackEvent('purchases', { [`battle_pass_${tier}`]: '1' });
    const bpPrices: Record<string, number> = { premium: 5.99, vip: 22.99 };
    trackRevenue(bpPrices[tier] ?? 0, 'USD', `career_bp_${tier}`);
  }, []);

  const refreshMarket = useCallback((): void => {
    const leagueIdx = stateRef.current?.leagueIndex ?? 0;
    const cm = Math.max(1, (LEAGUES[leagueIdx]?.multiplier ?? 1) - 1);
    setGameState(prev => ({
      ...prev,
      transferMarket: generateMarket(prev?.scoutLevel ?? 1, leagueIdx, false, cm),
      transferMarketRefreshTime: Date.now(),
    }));
  }, []);

  const FORCE_REFRESH_COST = 10;
  const forceRefreshMarket = useCallback((): boolean => {
    const cur = stateRef.current;
    if ((cur?.crystals ?? 0) < FORCE_REFRESH_COST) return false;
    const leagueIdx = cur?.leagueIndex ?? 0;
    const cm = Math.max(1, (LEAGUES[leagueIdx]?.multiplier ?? 1) - 1);
    setGameState(prev => ({
      ...prev,
      crystals: (prev?.crystals ?? 0) - FORCE_REFRESH_COST,
      transferMarket: generateMarket(prev?.scoutLevel ?? 1, leagueIdx, false, cm),
      transferMarketRefreshTime: Date.now(),
    }));
    trackEvent('market.refresh', { crystal_cost: FORCE_REFRESH_COST.toString(), league: leagueIdx.toString() });
    return true;
  }, []);

  const resetGame = useCallback(async (): Promise<void> => {
    const cur = stateRef.current;
    trackEvent('other.game_reset', { league: (cur?.leagueIndex ?? 0).toString(), match: (cur?.currentMatch ?? 1).toString(), money: (cur?.money ?? 0).toString() });
    await clearGameState();
    // Also clear VGP state so reset is complete
    try { const AS = require('@react-native-async-storage/async-storage').default; await AS.removeItem('vgp_state'); } catch (_e) {}
    setVgpResetCount(c => c + 1);
    const market = generateMarket(1, 0, true);
    const startingSquad = generateStartingSquad();
    const freshState: GameState = {
      ...DEFAULT_GAME_STATE,
      players: startingSquad,
      startingIds: startingSquad.slice(0, 11).map(p => p?.id ?? ''),
      transferMarket: market,
      transferMarketRefreshTime: Date.now(),
      lastSaveTime: Date.now(),
      tutorialStep: 'qte_hint',
    };
    setGameState(freshState);
    startNewMatch(1, 0, 0);
    setOfflineEarnings(0);
    setLastGoalEvent(null);
    winBonusRef.current = 0;
  }, [startNewMatch]);

  const dismissOfflineEarnings = useCallback(() => {
    const cur = stateRef.current;
    trackEvent('progress.offline_earnings', { amount: offlineEarnings.toString(), seconds: offlineSeconds.toString(), multiplier: (cur?.idleMultiplier ?? 1).toString() });
    setOfflineEarnings(0); setOfflineSeconds(0);
  }, [offlineEarnings, offlineSeconds]);

  const updateTeamName = useCallback((name: string) => {
    setGameState(prev => ({ ...prev, teamName: name || 'My Team', teamNameSet: true }));
    trackEvent('other.team_settings', { action: 'name', name: name || 'My Team' });
  }, []);

  const updateTeamColor = useCallback((color: string) => {
    setGameState(prev => ({ ...prev, teamColor: color }));
    trackEvent('other.team_settings', { action: 'color', color });
  }, []);

  const updateTeamCountry = useCallback((code: string) => {
    setGameState(prev => ({ ...prev, teamCountry: code }));
    trackEvent('other.team_settings', { action: 'country', country: code });
  }, []);

  const updateTeamLogo = useCallback((uri: string | null) => {
    setGameState(prev => ({ ...prev, teamLogo: uri }));
    trackEvent('other.team_settings', { action: 'logo', has_logo: uri ? 'yes' : 'no' });
  }, []);

  const markCareerModeSeen = useCallback(() => {
    setGameState(prev => prev ? { ...prev, careerModeSeen: true } : prev);
  }, []);

  const initCareerPlayer = useCallback(() => {
    trackEvent('career.player_init', {});
    setGameState(prev => {
      if (!prev || prev.careerPlayer) return prev; // already initialized
      const cp: CareerPlayer = {
        id: 'career_' + Date.now(),
        name: 'NAME',
        number: 7,
        position: 'ST',
        level: 1,
        attack: 20,
        defense: 20,
        overall: 40,
        matchesPlayed: 0,
        goalsScored: 0,
        skills: { shot: 0, pass: 0, dribbling: 0, speed: 0, stamina: 0, tactics: 0 },
      };
      // Also add as a bench player
      const benchPlayer = {
        id: cp.id,
        firstName: cp.name,
        lastName: '',
        overall: cp.overall,
        rarity: 'rare' as const,
        position: cp.position,
        attack: cp.attack,
        defense: cp.defense,
        income: 10,
        cost: 0,
        level: 1,
        country: prev.teamCountry || 'br',
      };
      return { ...prev, careerPlayer: cp, players: [...prev.players, benchPlayer] };
    });
  }, []);

  const upgradeCareerSkill = useCallback((skill: keyof CareerSkills): boolean => {
    trackEvent('career.skill_upgrade', { skill });
    let success = false;
    setGameState(prev => {
      if (!prev?.careerPlayer) return prev;
      const currentLevel = prev.careerPlayer.skills[skill] ?? 0;
      const cost = currentLevel < SKILL_COSTS.length
        ? SKILL_COSTS[currentLevel]
        : Math.floor(5 + (currentLevel - SKILL_COSTS.length + 1) * 2);
      if ((prev.trophies ?? 0) < cost) return prev;

      const newSkills = { ...prev.careerPlayer.skills, [skill]: currentLevel + 1 };
      // Recalculate stats from skills
      // Attack skills: shot, dribbling, speed
      // Defense skills: pass, stamina, tactics
      const atkFromSkills = newSkills.shot + newSkills.dribbling + newSkills.speed;
      const defFromSkills = newSkills.pass + newSkills.stamina + newSkills.tactics;
      const baseAtk = 20;
      const baseDef = 20;
      const newAtk = baseAtk + atkFromSkills;
      const newDef = baseDef + defFromSkills;
      const newOverall = newAtk + newDef;
      const totalSkillLevels = Object.values(newSkills).reduce((a, b) => a + b, 0);
      const newLevel = Math.floor(totalSkillLevels / 3) + 1; // every 3 skill levels = 1 player level

      const updatedCP: CareerPlayer = {
        ...prev.careerPlayer,
        skills: newSkills,
        attack: newAtk,
        defense: newDef,
        overall: newOverall,
        level: newLevel,
      };

      // Also update the bench player
      const updatedPlayers = prev.players.map(p =>
        p.id === updatedCP.id ? { ...p, attack: newAtk, defense: newDef, overall: newOverall, level: newLevel } : p
      );

      success = true;
      return { ...prev, trophies: (prev.trophies ?? 0) - cost, careerPlayer: updatedCP, players: updatedPlayers };
    });
    if (success) addQuestProgress('career_upgrade', 1);
    return success;
  }, []);

  const updateCareerName = useCallback((name: string) => {
    setGameState(prev => {
      if (!prev?.careerPlayer) return prev;
      const updated = { ...prev.careerPlayer, name };
      const players = prev.players.map(p => p.id === updated.id ? { ...p, firstName: name } : p);
      return { ...prev, careerPlayer: updated, players };
    });
  }, []);

  const updateCareerNumber = useCallback((num: number) => {
    setGameState(prev => {
      if (!prev?.careerPlayer) return prev;
      return { ...prev, careerPlayer: { ...prev.careerPlayer, number: num } };
    });
  }, []);

  const addTrophies = useCallback((amount: number) => {
    setGameState(prev => prev ? { ...prev, trophies: (prev.trophies ?? 0) + amount } : prev);
  }, []);

  const addChestPlayers = useCallback((newPlayers: Player[]) => {
    setGameState(prev => {
      if (!prev) return prev;
      const startingIds = [...(prev.startingIds ?? [])];
      for (const p of newPlayers) {
        if (startingIds.length < 11) startingIds.push(p.id);
      }
      return { ...prev, players: [...(prev.players ?? []), ...newPlayers], startingIds };
    });
  }, []);

  // ── Season Pass / Quest helpers ──
  const getMonday = (d: Date): string => {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    return dt.toISOString().split('T')[0] ?? '';
  };

  const ensureQuestDates = useCallback((prev: GameState): GameState => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const monday = getMonday(new Date());
    let next = { ...prev };
    if (next.questDailyDate !== today) {
      next = { ...next, questDailyDate: today, questDailyProgress: {}, questDailyClaimed: [] };
    }
    if (next.questWeeklyStart !== monday) {
      next = { ...next, questWeeklyStart: monday, questWeeklyProgress: {}, questWeeklyClaimed: [] };
    }
    return next;
  }, []);

  const addQuestProgress = useCallback((questId: string, amount: number, isWeekly?: boolean) => {
    setGameState(prev => {
      let next = ensureQuestDates(prev);
      if (isWeekly) {
        const wp = { ...next.questWeeklyProgress };
        wp[questId] = (wp[questId] ?? 0) + amount;
        next = { ...next, questWeeklyProgress: wp };
      } else {
        const dp = { ...next.questDailyProgress };
        dp[questId] = (dp[questId] ?? 0) + amount;
        next = { ...next, questDailyProgress: dp };
      }
      return next;
    });
  }, [ensureQuestDates]);

  const SP_XP_PER_LEVEL = 30;

  const claimQuest = useCallback((questId: string, xpReward: number, isWeekly?: boolean) => {
    trackEvent('progress.quest_claimed', { quest_id: questId, xp: xpReward.toString(), weekly: isWeekly ? '1' : '0' });
    setGameState(prev => {
      let next = ensureQuestDates(prev);
      if (isWeekly) {
        if (next.questWeeklyClaimed.includes(questId)) return prev;
        next = { ...next, questWeeklyClaimed: [...next.questWeeklyClaimed, questId] };
      } else {
        if (next.questDailyClaimed.includes(questId)) return prev;
        next = { ...next, questDailyClaimed: [...next.questDailyClaimed, questId] };
      }
      const newXp = (next.spXp ?? 0) + xpReward;
      const newLevel = Math.floor(newXp / SP_XP_PER_LEVEL) + 1;
      return { ...next, spXp: newXp, spLevel: newLevel };
    });
  }, [ensureQuestDates]);

  // SP tier reward data (must match SeasonPassModal)
  const SP_REWARD_TIERS: { type: 'crystals' | 'money' | 'keys'; f: number; n: number; c: number }[] = [
    { type: 'crystals', f: 2, n: 5, c: 22 },      // 1
    { type: 'money',    f: 10_000, n: 50_000, c: 400_000 },  // 2
    { type: 'keys',     f: 1, n: 3, c: 3 },        // 3
    { type: 'crystals', f: 2, n: 5, c: 22 },       // 4
    { type: 'money',    f: 10_000, n: 50_000, c: 500_000 },  // 5
    { type: 'keys',     f: 1, n: 3, c: 3 },        // 6
    { type: 'crystals', f: 2, n: 5, c: 25 },       // 7
    { type: 'money',    f: 10_000, n: 50_000, c: 500_000 },  // 8
    { type: 'keys',     f: 1, n: 3, c: 3 },        // 9
    { type: 'crystals', f: 2, n: 5, c: 25 },       // 10
    { type: 'money',    f: 10_000, n: 60_000, c: 600_000 },  // 11
    { type: 'keys',     f: 1, n: 4, c: 4 },        // 12
    { type: 'crystals', f: 2, n: 5, c: 25 },       // 13
    { type: 'money',    f: 15_000, n: 60_000, c: 600_000 },  // 14
    { type: 'keys',     f: 1, n: 4, c: 4 },        // 15
    { type: 'crystals', f: 2, n: 5, c: 28 },       // 16
    { type: 'money',    f: 15_000, n: 70_000, c: 700_000 },  // 17
    { type: 'keys',     f: 1, n: 4, c: 4 },        // 18
    { type: 'crystals', f: 2, n: 5, c: 28 },       // 19
    { type: 'money',    f: 15_000, n: 80_000, c: 800_000 },  // 20
    { type: 'keys',     f: 2, n: 4, c: 4 },        // 21
    { type: 'crystals', f: 2, n: 5, c: 28 },       // 22
    { type: 'money',    f: 15_000, n: 80_000, c: 900_000 },  // 23
    { type: 'keys',     f: 2, n: 5, c: 5 },        // 24
    { type: 'crystals', f: 2, n: 5, c: 32 },       // 25
  ];

  const applySpReward = (prev: GameState, tierIdx: number, column: 'free' | 'novice' | 'champion'): GameState => {
    const t = SP_REWARD_TIERS[tierIdx];
    if (!t) return prev;
    const amt = column === 'free' ? t.f : column === 'novice' ? t.n : t.c;
    if (t.type === 'crystals') {
      return { ...prev, crystals: (prev.crystals ?? 0) + amt };
    } else if (t.type === 'money') {
      return { ...prev, money: (prev.money ?? 0) + amt };
    } else {
      // keys: champion gets gold, others get regular
      const keyType = column === 'champion' ? 'keysGold' : 'keysRegular';
      return { ...prev, [keyType]: (prev[keyType] ?? 0) + amt };
    }
  };

  const claimSpReward = useCallback((tierIdx: number, column: 'free' | 'novice' | 'champion') => {
    setGameState(prev => {
      const key = column === 'free' ? 'spFreeClaimed' : column === 'novice' ? 'spNoviceClaimed' : 'spChampionClaimed';
      const arr = prev[key] ?? [];
      if (arr.includes(tierIdx)) return prev;
      let next = { ...prev, [key]: [...arr, tierIdx] };
      next = applySpReward(next, tierIdx, column);
      return next;
    });
  }, []);

  const claimAllSpRewards = useCallback((column: 'free' | 'novice' | 'champion') => {
    setGameState(prev => {
      const key = column === 'free' ? 'spFreeClaimed' : column === 'novice' ? 'spNoviceClaimed' : 'spChampionClaimed';
      const locked = column === 'novice' ? !prev.spNovicePurchased : column === 'champion' ? !prev.spChampionPurchased : false;
      if (locked) return prev;
      const curLevel = prev.spLevel ?? 1;
      const claimed = prev[key] ?? [];
      let next = { ...prev };
      const newClaimed = [...claimed];
      for (let i = 0; i < curLevel && i < SP_REWARD_TIERS.length; i++) {
        if (!newClaimed.includes(i)) {
          newClaimed.push(i);
          next = applySpReward(next, i, column);
        }
      }
      next[key] = newClaimed;
      return next;
    });
  }, []);

  const buySpTier = useCallback((tier: 'novice' | 'champion') => {
    setGameState(prev => {
      if (tier === 'novice') return { ...prev, spNovicePurchased: true };
      return { ...prev, spChampionPurchased: true };
    });
    trackEvent('purchases', { [`season_pass_${tier}`]: '1' });
    const spPrices: Record<string, number> = { novice: 5.99, champion: 14.99 };
    trackRevenue(spPrices[tier] ?? 0, 'USD', `season_pass_${tier}`);
  }, []);

  const claimMatchEvent = useCallback((moneyAmount: number, fameAmount: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      // Fame only earned from stadium 2+ (leagueIndex >= 1)
      const actualFame = (prev.leagueIndex ?? 0) >= 1 ? fameAmount : 0;
      return { ...prev, money: (prev.money ?? 0) + moneyAmount, fame: (prev.fame ?? 0) + actualFame, stadiumEarnings: (prev.stadiumEarnings ?? 0) + moneyAmount };
    });
    addQuestProgress('collect_qte', 1);
  }, []);

  const cheatAddMoney = useCallback((amount: number) => {
    setGameState(prev => prev ? { ...prev, money: (prev.money ?? 0) + amount } : prev);
  }, []);

  const cheatAddCrystals = useCallback((amount: number) => {
    setGameState(prev => prev ? { ...prev, crystals: (prev.crystals ?? 0) + amount } : prev);
    if (amount < 0) {
      const spent = Math.abs(amount);
      addQuestProgress('spend_crystals', spent);
      addQuestProgress('spend_crystals_w', spent, true);
    }
  }, [addQuestProgress]);

  const markRateUsShown = useCallback(() => {
    setGameState(prev => prev ? { ...prev, rateUsShown: true } : prev);
  }, []);

  const addKeys = useCallback((type: 'regular' | 'gold', amount: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      if (type === 'regular') return { ...prev, keysRegular: Math.max(0, (prev.keysRegular ?? 0) + amount) };
      return { ...prev, keysGold: Math.max(0, (prev.keysGold ?? 0) + amount) };
    });
  }, []);

  const cheatScoutUp = useCallback(() => {
    setGameState(prev => prev ? { ...prev, scoutLevel: Math.min((prev.scoutLevel ?? 1) + 1, 15), scoutTrainingStart: null, scoutTrainingTarget: null } : prev);
  }, []);

  const cheatResetStreetCup = useCallback(() => {
    // Set debug match time to 1 minute from now so the cup match fires quickly
    setDebugMatchTime(Date.now() + 60_000);
    setGameState(prev => prev ? { ...prev, streetCup: null, streetCupUnlocked: true } : prev);
  }, []);

  const cheatUnlockActivities = useCallback(() => {
    setGameState(prev => prev ? {
      ...prev,
      scoutLevel: Math.max(prev.scoutLevel ?? 1, 3),
      streetCupUnlocked: true,
      maxLeagueReached: Math.max(prev.maxLeagueReached ?? 0, LEAGUES.length - 1),
    } : prev);
  }, []);

  const cheatLeagueUp = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const newIdx = Math.min((prev.leagueIndex ?? 0) + 1, LEAGUES.length - 1);
      const careerPlayerId = prev.careerPlayer?.id;
      const careerPlayer = (prev.players ?? []).find(pl => pl?.id === careerPlayerId);
      const ultimates = (prev.players ?? []).filter(pl => pl?.rarity === 'ultimate' && pl?.id !== careerPlayerId);
      const keptPlayers = [careerPlayer, ...ultimates].filter(Boolean) as Player[];
      const freshSquad = generateStartingSquad();
      const SQUAD_POS = ['GK', 'LD', 'CD', 'CD', 'RD', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];
      const starting = freshSquad.slice(0, 11);
      const usedSlots = new Set<number>();
      for (const kp of keptPlayers) {
        let slotIdx = -1;
        for (let i = 0; i < SQUAD_POS.length; i++) { if (SQUAD_POS[i] === (kp.position ?? 'ST') && !usedSlots.has(i)) { slotIdx = i; break; } }
        if (slotIdx < 0) { for (let i = 0; i < SQUAD_POS.length; i++) { if (!usedSlots.has(i)) { slotIdx = i; break; } } }
        if (slotIdx >= 0) { starting[slotIdx] = kp; usedSlots.add(slotIdx); }
      }
      const newPlayers = [...starting, ...freshSquad.slice(11)];
      const newStartingIds = newPlayers.slice(0, 11).map(pl => pl.id);
      const newUpgrades = { ...(prev.upgrades ?? {}) };
      const incomeIds = (UPGRADES ?? []).filter(u => u?.type === 'income').map(u => u?.id ?? '');
      for (const id of incomeIds) { newUpgrades[id] = 0; }
      return { ...prev, leagueIndex: newIdx, streetCupUnlocked: newIdx >= 2 || prev.streetCupUnlocked, currentMatch: 1, seasonWins: 0, seasonDraws: 0, seasonLosses: 0, seasonResults: [], seasonPlayed: 0, players: newPlayers, startingIds: newStartingIds, upgrades: newUpgrades, money: 0, pendingPromotion: false, freeStaffOpens: (prev.freeStaffOpens ?? 0) + (newIdx >= 1 ? 2 : 0) };
    });
  }, []);

  const cheatEndSeason = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const leagueIdx = prev.leagueIndex ?? 0;
      const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
      const teamCount = league?.teamCount ?? 10;
      const totalMatches = league?.totalMatches ?? 9;
      const position = 1;

      let newLeagueIdx = leagueIdx;
      let promoMoney = 0;
      let promoCrystals = 0;
      const base = TROPHY_REWARDS[leagueIdx] ?? 5;
      const trophyReward = base;

      if (leagueIdx < LEAGUES.length - 1) {
        newLeagueIdx = leagueIdx + 1;
        const newLeague = LEAGUES[newLeagueIdx];
        promoMoney = newLeague?.bonusMoney ?? 0;
        promoCrystals = newLeague?.bonusCrystals ?? 0;
      }
      const canPromote = newLeagueIdx > leagueIdx;

      const scInfo: SeasonCompleteInfo = {
        leagueName: league?.name ?? 'League',
        leagueIndex: leagueIdx,
        position,
        teamCount,
        totalMatches,
        promoted: canPromote,
        relegated: false,
        newLeagueIndex: newLeagueIdx,
        rewardMoney: promoMoney,
        rewardCrystals: promoCrystals,
        rewardTrophies: trophyReward,
        stadiumEarnings: prev?.stadiumEarnings ?? 0,
        playerSaleValue: 0,
        pendingPromotion: canPromote,
      };
      seasonCompleteRef.current = scInfo;
      setSeasonCompleteInfo(scInfo);

      return {
        ...prev,
        pendingPromotion: canPromote,
        currentMatch: 1,
        seasonWins: 0,
        seasonDraws: 0,
        seasonLosses: 0,
        seasonResults: [],
        seasonSeed: Math.floor(Math.random() * 1000000),
        fame: (prev.fame ?? 0) + ((prev.leagueIndex ?? 0) >= 1 ? totalMatches * 7 : 0),
        trophies: (prev.trophies ?? 0) + trophyReward,
      };
    });
  }, []);

  const markLeaguePackPurchased = useCallback((packId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const existing = prev.purchasedLeaguePacks ?? [];
      if (existing.includes(packId)) return prev;
      return { ...prev, purchasedLeaguePacks: [...existing, packId] };
    });
    trackEvent('purchases', { [`league_pack_${packId}`]: '1' });
  }, []);

  const buyPremiumPack = useCallback((pack: 'noAds' | '2xIncome' | '3xIdle' | '3xIncome' | 'bonusPack') => {
    setGameState(prev => {
      if (!prev) return prev;
      switch (pack) {
        case 'noAds': return { ...prev, noAds: true };
        case '2xIncome': return { ...prev, incomeMultiplier: 2 };
        case '3xIncome': return { ...prev, incomeMultiplier: 3 };
        case '3xIdle': return { ...prev, idleMultiplier: 3 };
        case 'bonusPack': return { ...prev, bonusPack: true, crystals: (prev.crystals ?? 0) + 100, money: (prev.money ?? 0) + 500_000, totalEarned: (prev.totalEarned ?? 0) + 500_000 };
        default: return prev;
      }
    });
    trackEvent('purchases', { [`premium_${pack}`]: '1' });
    const premiumPrices: Record<string, number> = { noAds: 11.99, '2xIncome': 9.99, '3xIncome': 29.99, '3xIdle': 4.99, bonusPack: 9.99 };
    trackRevenue(premiumPrices[pack] ?? 0, 'USD', `premium_${pack}`);
  }, []);

  const markMarketNotifSeen = useCallback(() => {
    setGameState(prev => ({ ...prev, marketNotifSeen: true }));
  }, []);

  // (Season Pass functions moved above cheatAddCrystals)

  // ── Street Cup logic ──
  const checkStreetCup = useCallback(() => {
    const cur = stateRef.current;
    if (!cur?.streetCupUnlocked) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0] ?? '';
    const passed = hasMatchTimePassed(now);

    setGameState(prev => {
      let cup = prev.streetCup;
      let bonusMoney = 0;
      let bonusCrystals = 0;
      let bonusTrophies = 0;

      // Generate new cup if none exists or previous cup expired (5+ days)
      if (!cup || isCupExpired(cup.cupStartDate, now)) {
        cup = generateCup(calculateTeamPower(prev), today);
        // Fresh cup — round 1 is today at 15:00, no simulation yet
        return { ...prev, streetCup: cup };
      }

      // Determine current round based on cup's own start date
      const round = getCurrentRound(now, cup.cupStartDate);

      // Auto-simulate past rounds that the player missed
      const dateSeed = hashDateSeed(cup.cupStartDate);
      for (let r = 1; r <= 4; r++) {
        if (r > round) break;
        if (r === round && !passed) break; // today's round, not yet 15:00

        const count = r === 1 ? 8 : r === 2 ? 4 : r === 3 ? 2 : 1;
        const startIdx = r === 1 ? 0 : r === 2 ? 8 : r === 3 ? 12 : 14;
        const allPlayed = Array.from({ length: count }, (_, i) => cup!.results[startIdx + i]).every(v => v != null);
        if (allPlayed) continue;

        const playerWasAlive = isPlayerAlive(cup!, r - 1);
        const boostedArr = cup!.boostedRounds ?? (cup!.boostedRound != null ? [cup!.boostedRound] : []);
        const boosted = boostedArr.includes(r);
        cup = simulateRound(cup!, r, calculateTeamPower(prev), boosted, dateSeed + r);

        // Award rewards
        if (playerWasAlive) {
          const playerPos = getPlayerMatchInRound(cup!, r);
          if (playerPos >= 0) {
            const midx = getMatchIndex(r, playerPos);
            const res = cup!.results[midx];
            const rew = STREET_CUP_REWARDS[r - 1];
            if (rew) {
              if (res === 'W') {
                bonusMoney += rew.winMoney;
                bonusCrystals += rew.winCrystals;
                bonusTrophies += rew.winTrophies;
              } else {
                bonusMoney += rew.loseMoney;
                bonusCrystals += rew.loseCrystals;
                bonusTrophies += rew.loseTrophies;
              }
            }
          }
        }
      }

      if (cup === prev.streetCup && bonusMoney === 0 && bonusCrystals === 0 && bonusTrophies === 0) return prev;
      return {
        ...prev,
        streetCup: cup,
        money: (prev.money ?? 0) + bonusMoney,
        crystals: (prev.crystals ?? 0) + bonusCrystals,
        trophies: (prev.trophies ?? 0) + bonusTrophies,
      };
    });
  }, []);

  const addBoost2x = useCallback((): boolean => {
    const cur = stateRef.current;
    const now = Date.now();
    const currentEnd = cur?.boost2xEndTime ?? 0;
    const base = currentEnd > now ? currentEnd : now;
    const maxEnd = now + 3600_000; // max 1 hour from now
    const newEnd = Math.min(base + 900_000, maxEnd); // +15 min, cap at 1h
    if (currentEnd >= maxEnd) return false; // already at max
    setGameState(prev => ({ ...prev, boost2xEndTime: newEnd }));
    trackEvent('rewards', { boost_2x: '1' });
    return true;
  }, []);

  const claimFreeChest = useCallback((type: 'player' | 'star'): boolean => {
    const cur = stateRef.current;
    const today = new Date().toISOString().split('T')[0] ?? '';
    const isToday = cur?.freeChestClaimDate === today;
    const alreadyClaimed = isToday && (type === 'player' ? cur?.freeChestPlayerClaimed : cur?.freeChestStarClaimed);
    if (alreadyClaimed) return false;
    setGameState(prev => ({
      ...prev,
      freeChestClaimDate: today,
      freeChestPlayerClaimed: type === 'player' ? true : (isToday ? prev.freeChestPlayerClaimed : false),
      freeChestStarClaimed: type === 'star' ? true : (isToday ? prev.freeChestStarClaimed : false),
    }));
    trackEvent('rewards', { [`free_chest_${type}`]: '1' });
    return true;
  }, []);

  const claimFreeGold = useCallback((amount: number, step: 'free' | 'ad'): boolean => {
    const cur = stateRef.current;
    const FOUR_H = 4 * 60 * 60 * 1000;
    const rawStep = cur?.freeMoneyShopStep ?? 0;
    const lastClaim = cur?.lastFreeMoneyShopClaim ?? 0;
    // If cooldown expired, treat as step 0
    const curStep = rawStep === 2 && Date.now() >= (lastClaim + FOUR_H) ? 0 : rawStep;
    if (step === 'free' && curStep !== 0) return false;
    if (step === 'ad' && curStep !== 1) return false;
    const nextStep = step === 'free' ? 1 : 2; // free→ad available, ad→cooldown
    setGameState(prev => ({
      ...prev,
      money: (prev?.money ?? 0) + amount,
      freeMoneyShopStep: nextStep as 0 | 1 | 2,
      lastFreeMoneyShopClaim: step === 'ad' ? Date.now() : (prev?.lastFreeMoneyShopClaim ?? 0),
    }));
    trackEvent('rewards', { free_gold: step });
    return true;
  }, []);

  const claimFirstPurchaseBonus = useCallback((): boolean => {
    const cur = stateRef.current;
    if (cur?.firstPurchaseClaimed) return false;
    setGameState(prev => ({
      ...prev,
      firstPurchaseClaimed: true,
      crystals: (prev?.crystals ?? 0) + 100,
      money: (prev?.money ?? 0) + 100_000,
      fame: (prev?.fame ?? 0) + 200,
    }));
    trackEvent('rewards', { first_purchase_bonus: '1' });
    return true;
  }, []);

  const claimFreeGems = useCallback((): boolean => {
    const cur = stateRef.current;
    const today = new Date().toISOString().split('T')[0] ?? '';
    const claimDate = cur?.freeGemClaimDate ?? '';
    const claims = claimDate === today ? (cur?.freeGemClaimsToday ?? 0) : 0;
    if (claims >= 3) return false;
    setGameState(prev => ({
      ...prev,
      crystals: (prev?.crystals ?? 0) + 3,
      freeGemClaimDate: today,
      freeGemClaimsToday: claims + 1,
    }));
    trackEvent('rewards', { free_gems: '1' });
    return true;
  }, []);

  const boostStreetCup = useCallback((): boolean => {
    const cur = stateRef.current;
    if (!cur?.streetCup) return false;
    const now = new Date();
    const round = getCurrentRound(now, cur.streetCup.cupStartDate);
    if (round < 1 || round > 4) return false;
    if (hasMatchTimePassed(now)) return false;
    if (!isPlayerAlive(cur.streetCup, round - 1)) return false;
    const already = cur.streetCup.boostedRounds ?? (cur.streetCup.boostedRound != null ? [cur.streetCup.boostedRound] : []);
    if (already.includes(round)) return false;

    setGameState(prev => {
      if (!prev.streetCup) return prev;
      const prev_boosted = prev.streetCup.boostedRounds ?? (prev.streetCup.boostedRound != null ? [prev.streetCup.boostedRound] : []);
      return {
        ...prev,
        streetCup: { ...prev.streetCup, boostedRound: round, boostedRounds: [...prev_boosted, round] },
      };
    });
    trackEvent('rewards', { street_cup_boost: '1' });
    return true;
  }, []);

  // ── Staff system ──
  const addStaffCard = useCallback((staffId: string) => {
    setGameState(p => {
      if (!p) return p;
      const cur = p.staff?.[staffId] ?? { copies: 0, level: 1 };
      return { ...p, staff: { ...p.staff, [staffId]: { ...cur, copies: cur.copies + 1 } } };
    });
  }, []);

  const assignStaff = useCallback((buildingId: string, staffId: string | null) => {
    trackEvent('staff.assigned', { building: buildingId, staff_id: staffId ?? 'none' });
    setGameState(p => {
      if (!p) return p;
      const newAssigned = { ...p.staffAssigned };
      // Unassign this staff from any other building first
      if (staffId) {
        for (const k of Object.keys(newAssigned)) {
          if (newAssigned[k] === staffId) delete newAssigned[k];
        }
      }
      if (staffId) newAssigned[buildingId] = staffId;
      else delete newAssigned[buildingId];
      const nextTut = staffId && p.tutorialStep === 'staff_assign' ? 'staff_done' : p.tutorialStep;
      return { ...p, staffAssigned: newAssigned, tutorialStep: nextTut };
    });
  }, []);

  const levelUpStaff = useCallback((staffId: string): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    const owned = gs.staff?.[staffId];
    if (!owned || owned.level >= STAFF_MAX_LEVEL) return false;
    const cost = STAFF_LEVEL_TROPHY_COST(owned.level);
    if ((gs.fame ?? 0) < cost) return false;
    trackEvent('staff.level_up', { staff_id: staffId, to_level: (owned.level + 1).toString(), cost: cost.toString() });
    setGameState(p => {
      if (!p) return p;
      const o = p.staff?.[staffId];
      if (!o) return p;
      return {
        ...p,
        fame: (p.fame ?? 0) - cost,
        staff: { ...p.staff, [staffId]: { ...o, level: o.level + 1 } },
      };
    });
    addQuestProgress('staff_levelup', 1);
    return true;
  }, []);

  /** Pick a staff card with optional guaranteed role for first 4 opens */
  const _pickStaffCard = (totalUsed: number, guaranteedRole?: StaffRole, boxTier: 'normal' | 'epic' | 'legendary' = 'normal'): typeof STAFF_CARDS[number] => {
    let pool: typeof STAFF_CARDS;
    // Guarantee order: open 0 = marketer, 1 = doctor, 2 = trainer, 3 = epic trainer
    const GUARANTEE_ROLES: StaffRole[] = ['marketer', 'doctor', 'trainer', 'trainer'];
    const forcedRole = totalUsed < 4 ? GUARANTEE_ROLES[totalUsed] : guaranteedRole;
    let rarity: 'rare' | 'epic' | 'legendary';

    if (totalUsed < 4) {
      // 4th open (index 3) = guaranteed epic trainer
      if (totalUsed === 3) {
        rarity = 'epic';
      } else if (totalUsed === 2) {
        rarity = 'rare'; // 3rd open = guaranteed rare trainer
      } else {
        rarity = 'rare';
      }
    } else if (boxTier === 'legendary') {
      // Legendary box: 50% epic, 50% legendary
      rarity = Math.random() < 0.5 ? 'epic' : 'legendary';
    } else if (boxTier === 'epic') {
      // Epic box: 50% rare, 45% epic, 5% legendary
      const roll = Math.random();
      rarity = roll < 0.50 ? 'rare' : roll < 0.95 ? 'epic' : 'legendary';
    } else {
      // Normal box: rare 89%, epic 10%, legendary 0.5%, (rest common→rare)
      const roll = Math.random();
      rarity = roll < 0.89 ? 'rare' : roll < 0.995 ? 'epic' : 'legendary';
    }
    if (forcedRole) {
      pool = STAFF_CARDS.filter(c => c.rarity === rarity && c.role === forcedRole);
      if (pool.length === 0) pool = STAFF_CARDS.filter(c => c.role === forcedRole);
    } else {
      pool = STAFF_CARDS.filter(c => c.rarity === rarity);
    }
    return pool[Math.floor(Math.random() * pool.length)] ?? STAFF_CARDS[0];
  };

  const openStaffBox = useCallback((cost: number, currency: 'crystals' | 'trophies', boxTier: 'normal' | 'epic' | 'legendary' = 'normal'): string | null => {
    const gs = stateRef.current;
    if (!gs) return null;
    const balance = currency === 'crystals' ? (gs.crystals ?? 0) : (gs.trophies ?? 0);
    if (balance < cost) return null;
    const card = _pickStaffCard(gs.totalStaffOpensUsed ?? 0, undefined, boxTier);
    if (!card) return null;
    // Legendary staff offer trigger: fires on the 2nd staff chest open (any type)
    const totalUsed = gs.totalStaffOpensUsed ?? 0;
    const shouldTriggerLegendaryOffer = totalUsed >= 1 && !gs.staffBoxOfferShown;
    setGameState(p => {
      if (!p) return p;
      const cur = p.staff?.[card.id] ?? { copies: 0, level: 1 };
      const offerFields: Partial<typeof p> = {};
      if (shouldTriggerLegendaryOffer) {
        offerFields.staffBoxOfferShown = true;
        offerFields.staffBoxOfferExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
      }
      return {
        ...p,
        ...offerFields,
        [currency]: (p[currency] ?? 0) - cost,
        staff: { ...p.staff, [card.id]: { ...cur, copies: cur.copies + 1 } },
        totalStaffOpensUsed: (p.totalStaffOpensUsed ?? 0) + 1,
      };
    });
    addQuestProgress('open_staff_box', 1);
    trackEvent('staff.box_opened', { tier: boxTier, currency, cost: cost.toString(), card_id: card.id });
    return card.id;
  }, []);

  /** Open multiple staff boxes at once (single state update) — returns ALL card ids */
  const openStaffBoxBulk = useCallback((count: number, totalCost: number, currency: 'crystals' | 'trophies', boxTier: 'normal' | 'epic' | 'legendary' = 'normal'): string[] | null => {
    const gs = stateRef.current;
    if (!gs) return null;
    const balance = currency === 'crystals' ? (gs.crystals ?? 0) : (gs.trophies ?? 0);
    if (balance < totalCost) return null;
    // Pre-pick all cards
    const cards: typeof STAFF_CARDS[number][] = [];
    let used = gs.totalStaffOpensUsed ?? 0;
    for (let i = 0; i < count; i++) {
      const c = _pickStaffCard(used + i, undefined, boxTier);
      if (c) cards.push(c);
    }
    if (cards.length === 0) return null;
    const shouldTriggerLegendaryOffer = used < 2 && (used + count) >= 2 && !gs.staffBoxOfferShown;
    setGameState(p => {
      if (!p) return p;
      const updatedStaff = { ...p.staff };
      for (const c of cards) {
        const cur = updatedStaff[c.id] ?? { copies: 0, level: 1 };
        updatedStaff[c.id] = { ...cur, copies: cur.copies + 1 };
      }
      const offerFields: Partial<typeof p> = {};
      if (shouldTriggerLegendaryOffer) {
        offerFields.staffBoxOfferShown = true;
        offerFields.staffBoxOfferExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
      }
      return {
        ...p,
        ...offerFields,
        [currency]: (p[currency] ?? 0) - totalCost,
        staff: updatedStaff,
        totalStaffOpensUsed: (p.totalStaffOpensUsed ?? 0) + count,
      };
    });
    addQuestProgress('open_staff_box', count);
    trackEvent('staff.box_bulk', { tier: boxTier, currency, count: count.toString(), cost: totalCost.toString() });
    return cards.map(c => c.id);
  }, []);

  const openFreeStaffBox = useCallback((): string | null => {
    const gs = stateRef.current;
    if (!gs || (gs.freeStaffOpens ?? 0) <= 0) return null;
    const totalUsed = gs.totalStaffOpensUsed ?? 0;
    const card = _pickStaffCard(totalUsed);
    if (!card) return null;
    // After the doctor open (totalUsed===1 → 2nd open), inflict illness on a random non-career starter
    const shouldInflictIllness = totalUsed === 1; // doctor is given on 2nd open
    // Legendary staff offer trigger: fires on the 2nd staff chest open (any type)
    const triggerBoxOffer = totalUsed >= 1 && !gs.staffBoxOfferShown;
    // Offer 2 trigger: after 4th free open = epic trainer (totalUsed goes from 3→4) — immediate
    const triggerEpicOffer = totalUsed === 3 && !gs.epicStaffOfferShown;
    setGameState(p => {
      if (!p) return p;
      const cur = p.staff?.[card.id] ?? { copies: 0, level: 1 };
      let updatedPlayers = p.players;
      if (shouldInflictIllness) {
        const cpId = p.careerPlayer?.id;
        const stIds = new Set(p.startingIds ?? []);
        const candidates = (p.players ?? []).filter(pl => pl.id !== cpId && stIds.has(pl.id) && !pl.illness);
        if (candidates.length > 0) {
          const victim = candidates[Math.floor(Math.random() * candidates.length)];
          const totalWeight = ILLNESS_TYPES.reduce((s, t) => s + t.weight, 0);
          let roll = Math.random() * totalWeight;
          let chosenIllness = ILLNESS_TYPES[0];
          for (const t of ILLNESS_TYPES) { roll -= t.weight; if (roll <= 0) { chosenIllness = t; break; } }
          updatedPlayers = (p.players ?? []).map(pl =>
            pl.id === victim.id ? { ...pl, illness: { type: chosenIllness.type, effectiveness: chosenIllness.effectiveness, appliedAt: Date.now() } } : pl
          );
        }
      }
      const nextTut = p.tutorialStep === 'staff_open' ? 'staff_assign' : p.tutorialStep;
      const offerFields: Partial<typeof p> = {};
      if (triggerBoxOffer) {
        offerFields.staffBoxOfferShown = true;
        offerFields.staffBoxOfferExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
      }
      if (triggerEpicOffer) {
        offerFields.epicStaffOfferShown = true;
        offerFields.epicStaffOfferCardId = card.id;
      }
      return {
        ...p,
        ...offerFields,
        players: updatedPlayers,
        freeStaffOpens: (p.freeStaffOpens ?? 0) - 1,
        lastFreeStaffClaimTime: Date.now(),
        staff: { ...p.staff, [card.id]: { ...cur, copies: cur.copies + 1 } },
        totalStaffOpensUsed: (p.totalStaffOpensUsed ?? 0) + 1,
        tutorialStep: nextTut,
      };
    });
    addQuestProgress('open_staff_box', 1);
    trackEvent('staff.free_box_opened', { card_id: card.id });
    return card.id;
  }, []);

  // ── Train Player ──
  const trainPlayer = useCallback((playerId: string): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    const trainerId = gs.staffAssigned?.['training_hall'];
    if (!trainerId) return false;
    const trainerDef = STAFF_CARDS.find(c => c.id === trainerId);
    const trainerOwned = gs.staff?.[trainerId];
    if (!trainerDef || !trainerOwned) return false;
    const now = Date.now();
    if ((gs.trainingCooldown ?? 0) > now) return false;
    const player = gs.players.find(p => p.id === playerId);
    if (!player) return false;
    const activeBoosts = (gs.trainingBoosts ?? []).filter(b => b.expiresAt > now);
    if (activeBoosts.some(b => b.playerId === playerId)) return false;

    // Pick random tier based on trainer stars (higher stars → better chance of rare buff)
    const stars = getStaffStars(trainerOwned.copies);
    // Base weights: 10%→60, 20%→30, 30%→10. Each star shifts weight toward rarer
    const w10 = Math.max(10, 60 - stars * 8);
    const w20 = 30 + stars * 2;
    const w30 = 10 + stars * 6;
    const total = w10 + w20 + w30;
    const roll = Math.random() * total;
    const tierIdx = roll < w10 ? 0 : roll < w10 + w20 ? 1 : 2;
    const tier = TRAINING_TIERS[tierIdx];

    // Trainer level extends buff duration (base 2min, max 5min)
    const bonus = getStaffBonus(trainerDef, trainerOwned);
    const buffDuration = Math.min(TRAINING_MAX_DURATION, Math.round(tier.baseDuration * (1 + bonus)));
    const mult = 1 + tier.pct / 100;
    const newBoost: TrainingBoost = { playerId, multiplier: mult, expiresAt: now + buffDuration };
    trackEvent('staff.train_player', { player_id: playerId, multiplier: mult.toFixed(2), duration_ms: buffDuration.toString() });
    setGameState(p => p ? {
      ...p,
      trainingBoosts: [...activeBoosts, newBoost],
      trainingCooldown: now + tier.cooldown,
      trainingCooldownTotal: tier.cooldown,
    } : p);
    addQuestProgress('train_player', 1);
    return true;
  }, []);

  // ── Activate Strategy ──
  // Strategy tiers: team-wide but proportionally less than single-player training
  const STRATEGY_TIERS = [
    { pct: 3, cooldown: 5 * 60_000 },   // +3% team power → 5min cooldown
    { pct: 5, cooldown: 10 * 60_000 },   // +5% team power → 10min cooldown
    { pct: 8, cooldown: 15 * 60_000 },   // +8% team power → 15min cooldown
  ];
  const activateStrategy = useCallback((): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    if ((gs.strategiesReady ?? 0) <= 0) return false;
    if ((gs.strategyCooldown ?? 0) > Date.now()) return false;
    const trainerId = gs.staffAssigned?.['strategy_room'];
    if (!trainerId) return false;
    const trainerDef = STAFF_CARDS.find(c => c.id === trainerId);
    const trainerOwned = gs.staff?.[trainerId];
    if (!trainerDef || !trainerOwned) return false;
    const now = Date.now();
    // Pick random tier based on trainer stars
    const stars = getStaffStars(trainerOwned.copies);
    const w1 = Math.max(10, 60 - stars * 8);
    const w2 = 30 + stars * 2;
    const w3 = 10 + stars * 6;
    const tot = w1 + w2 + w3;
    const roll = Math.random() * tot;
    const tierIdx = roll < w1 ? 0 : roll < w1 + w2 ? 1 : 2;
    const tier = STRATEGY_TIERS[tierIdx];
    // Trainer level extends strategy duration (base 2min, max 5min)
    const bonus = getStaffBonus(trainerDef, trainerOwned);
    const buffDuration = Math.min(TRAINING_MAX_DURATION, Math.round(STRATEGY_DURATION * (1 + bonus)));
    const strat: ActiveStrategy = {
      id: `strat_${now}`,
      boostPct: tier.pct,
      expiresAt: now + buffDuration,
    };
    const existing = (gs.activeStrategies ?? []).filter(s => s.expiresAt > now);
    trackEvent('staff.strategy_activated', { boost_pct: tier.pct.toString(), duration_ms: buffDuration.toString() });
    setGameState(p => p ? {
      ...p,
      strategiesReady: Math.max((p.strategiesReady ?? 0) - 1, 0),
      activeStrategies: [...existing, strat],
      strategyCooldown: now + tier.cooldown,
    } : p);
    return true;
  }, []);

  // ── Heal Player ──
  const healPlayer = useCallback((playerId: string): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    const docId = gs.staffAssigned?.['infirmary'];
    if (!docId) return false;
    const docDef = STAFF_CARDS.find(c => c.id === docId);
    const docOwned = gs.staff?.[docId];
    if (!docDef || !docOwned) return false;
    const player = gs.players.find(p => p.id === playerId);
    if (!player?.illness || player.illness.healingUntil) return false; // already healing
    const illType = ILLNESS_TYPES.find(t => t.type === player.illness?.type);
    if (!illType) return false;
    // Doctor bonus reduces heal time
    const bonus = getStaffBonus(docDef, docOwned);
    const healDuration = Math.max(30_000, Math.round(illType.healTime / (1 + bonus)));
    const now = Date.now();
    trackEvent('staff.heal_player', { player_id: playerId, illness: player.illness.type, duration_ms: healDuration.toString() });
    setGameState(p => {
      if (!p) return p;
      return {
        ...p,
        players: p.players.map(pl => pl.id === playerId
          ? { ...pl, illness: { ...pl.illness!, healingUntil: now + healDuration } }
          : pl),
        // Player stays in lineup but shows healing status
      };
    });
    addQuestProgress('heal_player', 1);
    return true;
  }, []);

  // ── Speed Up Heal (crystals) ──
  const speedUpHeal = useCallback((playerId: string): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    const player = gs.players.find(p => p.id === playerId);
    if (!player?.illness?.healingUntil) return false;
    const remaining = Math.max(0, player.illness.healingUntil - Date.now());
    const crystalCost = Math.max(1, Math.ceil(remaining / 60_000)); // 1 crystal per minute
    if ((gs.crystals ?? 0) < crystalCost) return false;
    trackEvent('staff.speed_up_heal', { player_id: playerId, crystals: crystalCost.toString() });
    setGameState(p => p ? {
      ...p,
      crystals: (p.crystals ?? 0) - crystalCost,
      players: p.players.map(pl => pl.id === playerId ? { ...pl, illness: null } : pl),
    } : p);
    return true;
  }, []);

  // ── Dismiss Sick Popup ──
  const dismissSickPopup = useCallback(() => {
    setGameState(p => p ? { ...p, lastSickPlayerId: null } : p);
  }, []);

  // ── Skip Training Cooldown (crystals) ──
  const skipTrainingCooldown = useCallback((): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    const remaining = Math.max(0, (gs.trainingCooldown ?? 0) - Date.now());
    if (remaining <= 0) return false;
    const cost = Math.max(1, Math.ceil(remaining / 60_000));
    if ((gs.crystals ?? 0) < cost) return false;
    trackEvent('skip.training_cooldown', { crystals: cost.toString() });
    setGameState(p => p ? { ...p, crystals: (p.crystals ?? 0) - cost, trainingCooldown: 0 } : p);
    return true;
  }, []);

  // ── Skip Strategy Cooldown (crystals) ──
  const skipStrategyCooldown = useCallback((): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    const remaining = Math.max(0, (gs.strategyCooldown ?? 0) - Date.now());
    if (remaining <= 0) return false;
    const cost = Math.max(1, Math.ceil(remaining / 60_000));
    if ((gs.crystals ?? 0) < cost) return false;
    trackEvent('skip.strategy_cooldown', { crystals: cost.toString() });
    setGameState(p => p ? { ...p, crystals: (p.crystals ?? 0) - cost, strategyCooldown: 0 } : p);
    return true;
  }, []);

  // ── Skip Strategy Generation wait (crystals) ──
  const skipStrategyGeneration = useCallback((): boolean => {
    const gs = stateRef.current;
    if (!gs) return false;
    if ((gs.strategiesReady ?? 0) >= STRATEGY_MAX_READY) return false;
    const genTime = gs.strategyLastGenTime ?? 0;
    if (genTime <= 0) return false;
    const now = Date.now();
    const isFirstGen = (gs.strategiesReady ?? 0) === 0 && (gs.activeStrategies ?? []).filter(st => st.expiresAt > now).length === 0;
    const interval = isFirstGen ? STRATEGY_GEN_FIRST : STRATEGY_GEN_INTERVAL;
    const remaining = Math.max(0, genTime + interval - now);
    if (remaining <= 0) return false;
    const cost = Math.max(1, Math.ceil(remaining / 60_000));
    if ((gs.crystals ?? 0) < cost) return false;
    trackEvent('skip.strategy_generation', { crystals: cost.toString() });
    setGameState(p => p ? {
      ...p,
      crystals: (p.crystals ?? 0) - cost,
      strategiesReady: Math.min((p.strategiesReady ?? 0) + 1, STRATEGY_MAX_READY),
      strategyLastGenTime: now,
    } : p);
    return true;
  }, []);

  // ── Staff Offers ──
  // Offer 1: Staff Boxes bundle ($7.99) — 5 legendary marketer cards + 10 normal boxes + 5 epic boxes
  const claimStaffBoxOffer = useCallback(() => {
    setGameState(p => {
      if (!p) return p;
      // Pick a random legendary marketer
      const legMarketers = STAFF_CARDS.filter(c => c.rarity === 'legendary' && c.role === 'marketer');
      const legCard = legMarketers[Math.floor(Math.random() * legMarketers.length)] ?? legMarketers[0];
      const updatedStaff = { ...p.staff };
      // Add 5 copies of legendary marketer
      const curLeg = updatedStaff[legCard.id] ?? { copies: 0, level: 1 };
      updatedStaff[legCard.id] = { ...curLeg, copies: curLeg.copies + 5 };
      // Open 10 normal boxes + 5 epic boxes (just add cards directly)
      for (let i = 0; i < 10; i++) {
        const c = _pickStaffCard(999, undefined, 'normal');
        const cur = updatedStaff[c.id] ?? { copies: 0, level: 1 };
        updatedStaff[c.id] = { ...cur, copies: cur.copies + 1 };
      }
      for (let i = 0; i < 5; i++) {
        const c = _pickStaffCard(999, undefined, 'epic');
        const cur = updatedStaff[c.id] ?? { copies: 0, level: 1 };
        updatedStaff[c.id] = { ...cur, copies: cur.copies + 1 };
      }
      return { ...p, staff: updatedStaff, staffBoxOfferClaimed: true };
    });
    trackEvent('staff.box_offer_claimed', { type: 'legendary_bundle' });
  }, []);

  const dismissStaffBoxOffer = useCallback(() => {
    // No-op — dismiss just hides the popup for this session (handled by local state in UI)
    // Offer stays available in Shop banner until purchased
  }, []);

  // Offer 2: Epic Staff bundle ($4.99) — 8 copies of specific epic card + 3 epic boxes
  const claimEpicStaffOffer = useCallback(() => {
    setGameState(p => {
      if (!p || !p.epicStaffOfferCardId) return p;
      const updatedStaff = { ...p.staff };
      const cardId = p.epicStaffOfferCardId;
      const cur = updatedStaff[cardId] ?? { copies: 0, level: 1 };
      updatedStaff[cardId] = { ...cur, copies: cur.copies + 8 };
      // 3 epic boxes
      for (let i = 0; i < 3; i++) {
        const c = _pickStaffCard(999, undefined, 'epic');
        const curC = updatedStaff[c.id] ?? { copies: 0, level: 1 };
        updatedStaff[c.id] = { ...curC, copies: curC.copies + 1 };
      }
      return { ...p, staff: updatedStaff, epicStaffOfferClaimed: true, fame: (p.fame ?? 0) + 500 };
    });
    trackEvent('staff.epic_offer_claimed', { type: 'epic_bundle' });
  }, []);

  const dismissEpicStaffOffer = useCallback(() => {
    // No-op for dismiss (offer is permanent, just close modal)
  }, []);

  /** Activate pending staff offers — legacy migration for old saves */
  const activateStaffOffers = useCallback(() => {
    setGameState(p => {
      if (!p) return p;
      const updates: Partial<typeof p> = {};
      // Legacy: migrate old pending flags
      if (p.pendingStaffBoxOffer && !p.staffBoxOfferShown) {
        updates.staffBoxOfferShown = true;
        updates.staffBoxOfferExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
        updates.pendingStaffBoxOffer = false;
      }
      if (p.pendingEpicStaffOffer && !p.epicStaffOfferShown) {
        updates.epicStaffOfferShown = true;
        updates.pendingEpicStaffOffer = false;
      }
      if (Object.keys(updates).length === 0) return p;
      return { ...p, ...updates };
    });
  }, []);

  const setTutorialStep = useCallback((step: string | undefined) => {
    setGameState(prev => prev ? { ...prev, tutorialStep: step } : prev);
  }, []);

  const value = useMemo(() => ({
    gameState,
    matchState,
    displayScore,
    setDisplayScore,
    isLoaded,
    incomePerSecond,
    teamPower,
    winChance,
    lastGoalEvent,
    lastUpgradeEvent,
    matchProgression,
    upgrade,
    buyPlayer,
    sellPlayer,
    swapPlayer,
    startScoutTraining,
    speedUpScout,
    claimDailyReward,
    claimCareerDaily,
    claimBattlePass,
    claimAllBattlePass,
    buyBattlePassTier,
    refreshMarket,
    forceRefreshMarket,
    resetGame,
    offlineEarnings,
    offlineSeconds,
    dismissOfflineEarnings,
    updateTeamName,
    updateTeamColor,
    updateTeamCountry,
    updateTeamLogo,
    markMarketNotifSeen,
    markCareerModeSeen,
    initCareerPlayer,
    upgradeCareerSkill,
    addTrophies,
    addChestPlayers,
    updateCareerName,
    updateCareerNumber,
    seasonCompleteInfo,
    dismissSeasonComplete,
    confirmPromotion,
    triggerPromotionConfirmation,
    claimMatchEvent,
    cheatAddMoney,
    cheatAddCrystals,
    addKeys,
    markRateUsShown,
    cheatScoutUp,
    cheatResetStreetCup,
    cheatLeagueUp,
    cheatUnlockActivities,
    cheatEndSeason,
    buyPremiumPack,
    markLeaguePackPurchased,
    claimFreeGems,
    claimFreeGold,
    claimFirstPurchaseBonus,
    claimFreeChest,
    addBoost2x,
    boostStreetCup,
    checkStreetCup,
    addQuestProgress,
    claimQuest,
    claimSpReward,
    claimAllSpRewards,
    buySpTier,
    addStaffCard,
    assignStaff,
    levelUpStaff,
    openStaffBox,
    openStaffBoxBulk,
    openFreeStaffBox,
    trainPlayer,
    activateStrategy,
    healPlayer,
    speedUpHeal,
    dismissSickPopup,
    skipTrainingCooldown,
    skipStrategyCooldown,
    skipStrategyGeneration,
    claimStaffBoxOffer,
    claimEpicStaffOffer,
    dismissStaffBoxOffer,
    dismissEpicStaffOffer,
    activateStaffOffers,
    vgpPaused,
    setVgpPaused,
    setTutorialStep,
    vgpResetCount,
  }), [gameState, matchState, displayScore, isLoaded, incomePerSecond, teamPower, winChance, lastGoalEvent, lastUpgradeEvent, matchProgression, offlineEarnings, offlineSeconds, upgrade, buyPlayer, sellPlayer, swapPlayer, startScoutTraining, speedUpScout, claimDailyReward, claimCareerDaily, claimBattlePass, claimAllBattlePass, buyBattlePassTier, refreshMarket, forceRefreshMarket, resetGame, dismissOfflineEarnings, updateTeamName, updateTeamColor, updateTeamCountry, updateTeamLogo, markMarketNotifSeen, markCareerModeSeen, initCareerPlayer, upgradeCareerSkill, addTrophies, addChestPlayers, updateCareerName, updateCareerNumber, seasonCompleteInfo, dismissSeasonComplete, confirmPromotion, triggerPromotionConfirmation, claimMatchEvent, cheatAddMoney, cheatAddCrystals, addKeys, markRateUsShown, cheatScoutUp, cheatResetStreetCup, cheatLeagueUp, cheatUnlockActivities, cheatEndSeason, buyPremiumPack, markLeaguePackPurchased, claimFreeGems, claimFreeGold, claimFirstPurchaseBonus, claimFreeChest, addBoost2x, boostStreetCup, checkStreetCup, addQuestProgress, claimQuest, claimSpReward, claimAllSpRewards, buySpTier, addStaffCard, assignStaff, levelUpStaff, openStaffBox, openStaffBoxBulk, openFreeStaffBox, trainPlayer, activateStrategy, healPlayer, speedUpHeal, dismissSickPopup, skipTrainingCooldown, skipStrategyCooldown, skipStrategyGeneration, claimStaffBoxOffer, claimEpicStaffOffer, dismissStaffBoxOffer, dismissEpicStaffOffer, activateStaffOffers, vgpPaused, setVgpPaused, setTutorialStep, vgpResetCount]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
