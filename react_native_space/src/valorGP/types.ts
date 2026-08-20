/* ── Valor Grand Prix Types ── */

export interface VGPMatchEvent {
  type: 'goal' | 'shot_miss' | 'tackle' | 'pass' | 'save';
  team: 'home' | 'away'; // home = player's team
  playerIndex: number; // 0-4
  gameMinute: number;
  timestamp: number;
}

export interface VGPMatchState {
  status: 'idle' | 'playing' | 'sudden_death' | 'won' | 'lost';
  homeScore: number;
  awayScore: number;
  elapsedSec: number; // real seconds elapsed (max 30 for regular)
  gameMinute: number; // 0-45 (or 45+ for sudden death)
  events: VGPMatchEvent[];
  ballHolder: { team: 'home' | 'away'; playerIndex: number };
}

export interface VGPMilestone {
  winsRequired: number;
  reward: { money?: number; crystals?: number; trophies?: number; keys?: number; playerChestSkips?: number; starChestSkips?: number; trainingSkips?: number };
}

export interface VGPLeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  country: string;
}

export interface ValorGPState {
  // Tournament cycle
  tournamentStartTime: number;
  tournamentEndTime: number;

  // Attempts
  attempts: number; // 0-3
  lastRefillDate: string; // YYYY-MM-DD for daily refill

  // Current run
  isInRun: boolean;
  currentDifficulty: number; // starts at 1
  runWins: number; // wins in current run
  runScore: number;
  runClaimedMilestones: number[]; // milestones claimed in current run (reverted on abandon)

  // Totals for this tournament
  totalScore: number;
  bestWinStreak: number;

  // Milestones
  claimedMilestones: number[];

  // Valor Pass
  vpXp: number;
  vpLevel: number;
  vpFreeClaimed: number[];
  vpGrandClaimed: number[];
  vpGoldClaimed: number[];
  vpGrandPurchased: boolean;
  vpGoldPurchased: boolean;
  // Legacy (migration compat)
  vpPremiumClaimed?: number[];
  vpPremiumPurchased?: boolean;

  // Season (1-based, Season 2 unlocks after clearing Season 1)
  season: number;

  // Leaderboard seed (for generating fake opponents)
  leaderboardSeed: number;

  // VGP Squad — 5 player IDs [GK, CD, LM, RM, ST]
  squadIds: string[];
}

export const DEFAULT_VGP_STATE: ValorGPState = {
  tournamentStartTime: 0,
  tournamentEndTime: 0,
  attempts: 3,
  lastRefillDate: '',
  isInRun: false,
  currentDifficulty: 1,
  runWins: 0,
  runScore: 0,
  runClaimedMilestones: [],
  totalScore: 0,
  bestWinStreak: 0,
  claimedMilestones: [],
  season: 1,
  vpXp: 0,
  vpLevel: 0,
  vpFreeClaimed: [],
  vpGrandClaimed: [],
  vpGoldClaimed: [],
  vpGrandPurchased: false,
  vpGoldPurchased: false,
  leaderboardSeed: 0,
  squadIds: [],
};
