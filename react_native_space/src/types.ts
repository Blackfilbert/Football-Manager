export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'icon' | 'ultimate';

export type Position = 'GK' | 'LD' | 'CD' | 'RD' | 'LM' | 'CM' | 'RM' | 'ST';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  overall: number;
  rarity: Rarity;
  position: Position;
  attack: number;
  defense: number;
  income: number;
  cost: number;
  level: number;
  country?: string;
  goals?: number;
  assists?: number;
  penalties?: number;
  intercepts?: number;
  yellowCards?: number;
  redCards?: number;
  illness?: PlayerIllness | null;
}

export type TeamColor = string;

export interface UpgradeConfig {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  bonusPerLevel: number;
  maxLevel: number;
  description: string;
  type: 'power' | 'income';
  incomePerClick?: number; // fixed $/s added per level (income upgrades only)
  powerPerClick?: number; // fixed power added per level (power upgrades only)
}

export interface LeagueConfig {
  id: number;
  name: string;
  emoji: string;
  color: string;
  multiplier: number;
  unlockedRarities: Rarity[];
  teamCount: number; // total teams in the league
  totalMatches: number; // matches per season (teamCount - 1)
  matchStart: number; // legacy — used for migration only
  bonusMoney: number; // one-time promotion bonus
  bonusCrystals: number;
  /** City name for stadium locations */
  city?: string;
  /** Country flag emoji */
  flag?: string;
}

export interface SeasonCompleteInfo {
  leagueName: string;
  leagueIndex: number;
  position: number;
  teamCount: number;
  totalMatches: number;
  promoted: boolean;
  relegated: boolean;
  newLeagueIndex: number;
  rewardMoney: number;
  rewardCrystals: number;
  rewardTrophies: number;
  stadiumEarnings: number;
  playerSaleValue?: number;          // total money from selling players on promotion
  pendingPromotion?: boolean;        // true if player can promote but hasn't confirmed yet
}

/* ── Street Cup ── */
export interface StreetCupOpponent {
  name: string;
  country: string;
  power: number;
}

export interface StreetCupState {
  cupStartDate: string; // ISO date of cup day 0 (rest day before round 1)
  bracket: (StreetCupOpponent | null)[]; // 16 slots (index 0-15 = round 1 seeds)
  results: (('W' | 'L') | null)[]; // 15 match results (bracket-style: 0-7=R1, 8-11=QF, 12-13=SF, 14=F)
  scores: ([number, number] | null)[]; // 15 match scores [topScore, bottomScore]
  playerSlot: number; // 0-15 slot for player's team
  boostedRound: number | null; // legacy — kept for compat
  boostedRounds?: number[]; // array of boosted round numbers (1-4)
  lastViewedRound: number; // last round user has seen results for
}

export interface ScoutTrainingConfig {
  fromLevel: number;
  toLevel: number;
  durationHours: number;
  cost: number;
  speedUpCrystals?: number;
}

/* ── Staff System ── */
export type StaffRarity = 'rare' | 'epic' | 'legendary';
export type StaffRole = 'marketer' | 'trainer' | 'doctor';

export interface StaffCardDef {
  id: string;
  name: string;
  emoji: string;
  rarity: StaffRarity;
  role: StaffRole;
  /** Building IDs this staff can be assigned to */
  buildings: string[];
  /** Base multiplier bonus per star (e.g. 0.05 = +5%) */
  baseMult: number;
}

export interface StaffOwned {
  copies: number;  // total cards collected (dupes increase stars)
  level: number;   // upgraded with trophies (1-10)
}

/* ── Illness system ── */
export type IllnessType = 'cold' | 'fracture' | 'depression' | 'torn_ligament';
export interface PlayerIllness {
  type: IllnessType;
  effectiveness: number; // 0.7, 0.5, 0.3, 0.1
  appliedAt: number;     // timestamp when illness was applied
  healingUntil?: number; // timestamp when healing completes (if being healed)
}

/* ── Training boost ── */
export interface TrainingBoost {
  playerId: string;
  multiplier: number; // e.g. 1.15 = +15%
  expiresAt: number;  // timestamp
}

/* ── Strategy ── */
export interface ActiveStrategy {
  id: string;
  boostPct: number;   // e.g. 10 = +10% team power
  expiresAt: number;  // timestamp
}

export interface GameState {
  money: number;
  crystals: number;
  fame: number;
  keysRegular: number;
  keysGold: number;
  noAds?: boolean;
  bonusPack?: boolean;
  incomeMultiplier?: number;
  idleMultiplier?: number;
  purchasedLeaguePacks?: string[];
  maxLeagueReached?: number;
  bestLeaguePosition?: number; // best position in maxLeagueReached
  firstOpenDate?: string;
  rateUsShown?: boolean;
  totalEarned: number;
  players: Player[];
  startingIds: string[]; // IDs of 11 starting players (on the pitch)
  upgrades: Record<string, number>;
  currentMatch: number; // 1-based global match number (for opponent power scaling)
  leagueIndex: number; // current league (0-4)
  seasonWins: number; // wins in current season
  seasonDraws: number; // draws in current season
  seasonLosses: number; // losses in current season
  seasonResults: ('W' | 'D' | 'L')[]; // chronological match results this season
  seasonSeed: number; // fixed random seed for this season (set once at season start)
  matchWins: number; // total career wins
  matchLosses: number; // total career losses
  matchDraws: number; // total career draws
  recentForm: ('W' | 'L' | 'D')[]; // last N match results
  scoutLevel: number;
  scoutTrainingStart: number | null;
  scoutTrainingTarget: number | null;
  lastLoginDate: string;
  dailyDay?: number; // 1-7 current day in cycle
  dailyClaimedDates?: string[]; // dates already claimed in current cycle
  freeGemClaimsToday?: number; // how many free gem rewards claimed today
  freeGemClaimDate?: string; // date string of last free gem claim
  freeChestClaimDate?: string; // date of last free chest claims
  freeChestPlayerClaimed?: boolean; // claimed free player chest today
  freeChestStarClaimed?: boolean; // claimed free star chest today
  freeGoldClaimsToday?: number; // how many free gold rewards claimed today
  freeGoldClaimDate?: string; // date string of last free gold claim
  lastFreeMoneyShopClaim?: number; // timestamp of last free money shop claim (4h cooldown)
  freeMoneyShopStep?: 0 | 1 | 2; // 0=free available, 1=ad available, 2=cooldown
  firstPurchaseClaimed?: boolean; // whether the first-purchase bonus has been claimed
  boost2xEndTime?: number; // timestamp when temporary 2x boost expires
  careerDailyLastClaim: string;
  careerDailyStreak: number;
  battlePassClaimed?: number[]; // indices of claimed free battle pass tiers
  bpPremiumClaimed?: number[]; // indices of claimed premium BP tiers
  bpVipClaimed?: number[]; // indices of claimed VIP BP tiers
  bpPremiumPurchased?: boolean; // premium BP purchased
  bpVipPurchased?: boolean; // VIP BP purchased
  lastSaveTime: number;
  tutorialComplete: boolean;
  tutorialStep?: string; // current tutorial step (null/undefined = no active tutorial)
  hasEverBoughtPlayer?: boolean;
  incomeTutorialShown?: boolean;
  transferMarket: Player[];
  transferMarketRefreshTime: number;
  teamName: string;
  marketUnlocked: boolean;
  marketNotifSeen: boolean;
  teamNameSet: boolean;
  teamColor: string;
  teamCountry: string;
  teamLogo: string | null;
  careerModeSeen: boolean;
  trophies: number;
  careerPlayer: CareerPlayer | null;
  streetCupUnlocked: boolean;
  streetCup: StreetCupState | null;
  // Season Pass (quest-based)
  spXp: number; // season pass XP from quests
  spLevel: number; // current SP level
  spFreeClaimed: number[]; // claimed free reward indices
  spNoviceClaimed: number[]; // claimed novice reward indices
  spChampionClaimed: number[]; // claimed champion reward indices
  spNovicePurchased: boolean;
  spChampionPurchased: boolean;
  spSeasonStart: number; // timestamp of season start
  // Quest progress (daily resets)
  questDailyDate: string; // date of current daily progress
  questDailyProgress: Record<string, number>; // quest_id -> progress
  questDailyClaimed: string[]; // claimed quest ids
  questWeeklyStart: string; // monday date of current week
  questWeeklyProgress: Record<string, number>;
  questWeeklyClaimed: string[];
  // Staff system
  staff: Record<string, StaffOwned>;       // staffId -> owned data
  staffAssigned: Record<string, string>;    // buildingId -> staffId (income + special)
  stadiumEarnings: number;                  // money earned during current stadium stay
  // Training & Strategy & Illness
  trainingBoosts: TrainingBoost[];
  activeStrategies: ActiveStrategy[];
  strategiesReady: number;                  // queued strategies available to activate
  strategyLastGenTime: number;              // timestamp of last strategy batch generation
  trainingCooldown: number;                 // timestamp when next training available
  trainingCooldownTotal?: number;           // total cooldown duration in ms (for progress bar)
  strategyCooldown?: number;                // timestamp when next strategy available
  lastSickPlayerId?: string | null;         // id of last player who got sick (for popup)
  healTutorialShown?: boolean;              // first illness tutorial shown
  freeStaffOpens: number;                   // pending free staff box openings
  lastFreeStaffClaimTime?: number;           // timestamp of last free staff use (for 24h cooldown)
  totalStaffOpensUsed: number;              // total staff boxes ever opened (for guarantees)
  pendingPromotion?: boolean;               // player qualified but hasn't confirmed promotion yet
  // Staff offers
  staffBoxOfferShown?: boolean;             // whether the staff-boxes offer was shown (trigger: 2 staff obtained)
  staffBoxOfferExpiresAt?: number;          // expiry timestamp (12h after trigger)
  staffBoxOfferClaimed?: boolean;           // whether purchased
  epicStaffOfferShown?: boolean;            // whether the specific-epic-staff offer was shown (trigger: 4th free open)
  epicStaffOfferCardId?: string;            // the epic trainer card id for the offer
  epicStaffOfferClaimed?: boolean;          // whether purchased
  pendingStaffBoxOffer?: boolean;           // deferred box offer — show in shop after OK/home
  pendingEpicStaffOffer?: boolean;          // deferred epic offer — show in shop after OK/home
}

export interface CareerPlayer {
  id: string;
  name: string;
  number: number;
  position: Position;
  level: number;
  attack: number;
  defense: number;
  overall: number;
  matchesPlayed: number;
  goalsScored: number;
  skills: CareerSkills;
}

export interface CareerSkills {
  shot: number;
  pass: number;
  dribbling: number;
  speed: number;
  stamina: number;
  tactics: number;
}

export interface MatchState {
  matchTime: number;
  homeScore: number;
  awayScore: number;
  opponentPower: number;
  opponentName: string;
  result: 'playing' | 'won' | 'lost' | 'draw' | null;
}

export interface UpgradeEvent {
  type: 'power' | 'income';
  total: number; // new total value
  diff: number; // change amount
  timestamp: number;
}

export interface GoalEvent {
  isHome: boolean;
  bonus: number;
  scorer: string;
  timestamp: number;
}

export interface MatchProgressionInfo {
  leagueIndex: number;
  leagueName: string;
  leagueEmoji: string;
  matchInLeague: number;
  totalMatchesInLeague: number;
  opponentPower: number;
  winBonus: number;
}
