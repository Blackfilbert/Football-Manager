import { VGPMilestone } from './types';

export const VGP_MATCH_DURATION = 30; // seconds real time
export const VGP_GAME_MINUTES = 45; // football minutes per match
export const VGP_MAX_ATTEMPTS = 3;
export const VGP_TOURNAMENT_DAYS = 7;

// Opponent power range (random per match)
export const VGP_BASE_OPPONENT_POWER = 200;
export const VGP_MAX_OPPONENT_POWER = 800;
export const VGP_POWER_SCALE_PER_DIFF = 0.18; // +18% per difficulty level

// All opponent team names pooled from all leagues
export const VGP_OPPONENT_NAMES: string[] = [
  'Villar ESP', 'Lazio ITA', 'Corin BRA', 'Feyenoo NLD', 'Jagi POL',
  'Ind del ECU', 'Rayo ESP', 'Int BRA', 'Alaju CRI',
  'Bucar COL', 'Cerro Por PRY', 'Al-Nas SAU', 'Gremi BRA', 'AEK Larn CYP',
  'Al-Ah EGY', 'Alian PER', 'Real Soc ESP', 'Velez ARG', 'Lille FRA',
  'BATE BLR', 'Zeni RUS',
  'Olym GRC', 'Cruze BRA', 'Man Utd GBR', 'Cope DNK', 'Celt GBR',
  'Penar URY', 'Cruz Az MEX', 'Notting For GBR', 'Bodo Gli NOR', 'Fiore ITA',
  'Ameri COL', 'Shak UKR', 'Celj SVN', 'Eint Fra DEU',
  'Ludo BGR', 'Genk BEL', 'Spar Pra CZE', 'FCSB ROU', 'Monac FRA', 'Panat GRC',
  'PSV Ein NLD', 'Frei DEU', 'Brag PRT', 'Sao Pau BRA', 'Midt DNK',
  'Napo ITA', 'Ferc HUN', 'Union BEL', 'Lanu ARG', 'AC Mi ITA', 'Al-Ahl SAU',
  'Vikt Plz CZE', 'Celt Vigo ESP', 'Rive ARG', 'Pyra EGY', 'Bahi BRA',
  'Once Cal COL', 'Athl Bil ESP', 'Qara AZE',
  'Brug BEL', 'Sport CP PRT', 'Bolog ITA', 'Botaf BRA', 'Al-Hil SAU',
  'Stutt DEU', 'Bayer Lev DEU', 'Porto PRT', 'Fener TUR', 'Lyon FRA',
  'Galatas TUR', 'Cryst Pal GBR', 'AZ Alk NLD', 'Raci ARG', 'Atal ITA',
  'Newc Utd GBR', 'Pafos CYP', 'LDU Qui ECU', 'Atle Min BRA',
  'Atle Nac COL', 'Red Star SRB', 'LAFC USA',
  'ParisSG FRA', 'Chels GBR', 'Baye Mun DEU', 'Real Mad ESP', 'Inte Mil ITA',
  'Barce ESP', 'Flamen BRA', 'Arsnl GBR', 'Palmr BRA', 'Dortm DEU',
  'Manch Cit GBR', 'Aston Vil GBR', 'Atle Mad ESP', 'Juven ITA',
  'Flumin BRA', 'Benfi PRT', 'Real Bet ESP', 'Tottnh GBR', 'Rome ITA', 'Liver GBR',
  'Inter Mia USA',
];

// Score per win increases with difficulty
export const VGP_SCORE_PER_WIN_BASE = 100;
export const VGP_SCORE_PER_WIN_SCALE = 50; // +50 per difficulty

// Milestones: every 2 wins, 2→18, then Clear bonus
export const VGP_MILESTONES: VGPMilestone[] = [
  { winsRequired: 2,  reward: { playerChestSkips: 1 } },
  { winsRequired: 4,  reward: { playerChestSkips: 1 } },
  { winsRequired: 6,  reward: { playerChestSkips: 1 } },
  { winsRequired: 8,  reward: { playerChestSkips: 1 } },
  { winsRequired: 10, reward: { playerChestSkips: 2 } },
  { winsRequired: 12, reward: { trainingSkips: 1 } },
  { winsRequired: 14, reward: { playerChestSkips: 1 } },
  { winsRequired: 16, reward: { playerChestSkips: 1 } },
  { winsRequired: 18, reward: { trainingSkips: 1 } },
];

// Clear reward (after completing all milestones / 18 wins)
export const VGP_CLEAR_REWARD = { starChestSkips: 2 };

// VP (Valor Pass) XP per win
export const VGP_VP_XP_PER_WIN = 20;
export const VGP_VP_XP_PER_DIFFICULTY = 5; // bonus per difficulty level

// Cumulative XP thresholds for each VP level (25 levels)
// First reward at 50 (= 2 wins). Full pass in ~3 weeks for casual player.
// Weak player: 165 XP/day → 3465 in 3 weeks → clears all 25
// Average player: 270 XP/day → clears in ~12 days
export const VP_XP_THRESHOLDS: number[] = [
    50,  100,  160,  230,  310,  // 1-5
   400,  500,  600,  710,  830,  // 6-10
   950, 1080, 1210, 1350, 1500,  // 11-15
  1650, 1810, 1970, 2140, 2320,  // 16-20
  2500, 2690, 2880, 3080, 3300,  // 21-25
];
/** Returns { level, xpInLevel, xpForNext } for given total XP */
export function getVpLevelInfo(totalXp: number): { level: number; xpInLevel: number; xpForNext: number } {
  let level = 0;
  for (let i = 0; i < VP_XP_THRESHOLDS.length; i++) {
    if (totalXp >= VP_XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const prevThreshold = level > 0 ? VP_XP_THRESHOLDS[level - 1] : 0;
  const nextThreshold = level < VP_XP_THRESHOLDS.length ? VP_XP_THRESHOLDS[level] : VP_XP_THRESHOLDS[VP_XP_THRESHOLDS.length - 1];
  const xpInLevel = totalXp - prevThreshold;
  const xpForNext = nextThreshold - prevThreshold;
  return { level, xpInLevel, xpForNext };
}

export const VGP_VP_GRAND_COST = 150; // crystals

// Valor Pass reward tiers (25 levels)
// Cycle: trainingSkips → money → keys, repeat
// f = free, g = grand, d = gold (diamond)
export interface VPTier {
  type: 'trainingSkips' | 'money' | 'keys';
  f: number; g: number; d: number;
}
export const VP_TIERS: VPTier[] = [
  { type: 'trainingSkips', f: 1,      g: 1,       d: 2       },  // 1
  { type: 'money',         f: 10_000, g: 50_000,  d: 400_000 },  // 2
  { type: 'keys',          f: 1,      g: 3,       d: 3       },  // 3
  { type: 'trainingSkips', f: 0,      g: 1,       d: 2       },  // 4
  { type: 'money',         f: 10_000, g: 50_000,  d: 500_000 },  // 5
  { type: 'keys',          f: 1,      g: 3,       d: 3       },  // 6
  { type: 'trainingSkips', f: 0,      g: 1,       d: 2       },  // 7
  { type: 'money',         f: 10_000, g: 50_000,  d: 500_000 },  // 8
  { type: 'keys',          f: 1,      g: 3,       d: 3       },  // 9
  { type: 'trainingSkips', f: 1,      g: 1,       d: 2       },  // 10
  { type: 'money',         f: 10_000, g: 60_000,  d: 600_000 },  // 11
  { type: 'keys',          f: 1,      g: 4,       d: 4       },  // 12
  { type: 'trainingSkips', f: 0,      g: 1,       d: 2       },  // 13
  { type: 'money',         f: 15_000, g: 60_000,  d: 600_000 },  // 14
  { type: 'keys',          f: 1,      g: 4,       d: 4       },  // 15
  { type: 'trainingSkips', f: 1,      g: 1,       d: 2       },  // 16
  { type: 'money',         f: 15_000, g: 70_000,  d: 700_000 },  // 17
  { type: 'keys',          f: 1,      g: 4,       d: 4       },  // 18
  { type: 'trainingSkips', f: 0,      g: 1,       d: 2       },  // 19
  { type: 'money',         f: 15_000, g: 80_000,  d: 800_000 },  // 20
  { type: 'keys',          f: 2,      g: 4,       d: 4       },  // 21
  { type: 'trainingSkips', f: 1,      g: 2,       d: 4       },  // 22
  { type: 'money',         f: 15_000, g: 80_000,  d: 900_000 },  // 23
  { type: 'keys',          f: 2,      g: 5,       d: 5       },  // 24
  { type: 'trainingSkips', f: 1,      g: 2,       d: 4       },  // 25
];

// Fake leaderboard usernames (gaming-style)
export const VGP_LEADERBOARD_NAMES = [
  'killamike', 'UserTN4R3', 'Hookahgms', 'xXDarkLordXx', 'ProSniper99',
  'ShadowFox', 'BlitzKrieg', 'NeonViper', 'TurboKick', 'GoalMachine',
  'PixelBeast', 'StormBreaker', 'IcePhoenix', 'ZeroCool', 'MaverickFC',
  'CyberWolf', 'GhostStriker', 'ThunderBolt', 'ViperKing', 'AlphaElite',
  'NovaFlame', 'IronClad42', 'RapidFire', 'SilentAssn', 'BlazeRunner',
  'OmegaShot', 'NightHawk', 'DarkPhoenix', 'FrostBite', 'RedDragon',
  'SteelNerve', 'RocketMan', 'AcePilot', 'WildCard', 'DeathMatch',
  'CrushKing', 'VenomStrike', 'HyperNova', 'MegaForce', 'UltraGoal',
  'TitanFC', 'CosmicDust', 'EliteSnipe', 'PhantomAce', 'BulletProof',
  'StealthMode', 'WarMachine', 'LightningX', 'BossLevel', 'MaxPower',
  'DynaMight', 'FlashPoint', 'IronWill', 'SkyRider', 'BurnNotice',
  'NinjaStar', 'BladeEdge', 'FireStorm', 'IceBreaker', 'SharpShot',
  'DarkKnight', 'StormRage', 'SwiftKill', 'LaserBeam', 'PowerPlay',
  'ThunderGod', 'VortexFC', 'SolarFlare', 'AtomicFC', 'NeonDream',
  'CryptoKick', 'QuantumFC', 'MatrixFC', 'PixelFC', 'RogueAgent',
  'SpeedDemon', 'TurboFC', 'VoltageFC', 'ZenithFC', 'ApexPredator',
  'ChronoFC', 'DeltaForce', 'EchoStrike', 'FuryFC', 'GravityFC',
  'HorizonFC', 'InfernoFC', 'JuggernautFC', 'KryptonFC', 'LegionFC',
  'MercuryFC', 'NebulFC', 'OdysseyFC', 'PrimeFC', 'ReaperFC',
  'SaberFC', 'TempestFC', 'UnitedForce', 'ValorFC', 'WraithFC',
];

export const VGP_LEADERBOARD_COUNTRIES = [
  'BR', 'DE', 'ES', 'FR', 'GB', 'IT', 'AR', 'NL',
  'PT', 'MX', 'US', 'JP', 'KR', 'TR', 'RU', 'PL',
  'CO', 'CL', 'SE', 'NO', 'UA', 'AU', 'CA', 'EG',
  'SA', 'IN', 'CN', 'ID', 'TH', 'VN',
];

// Leaderboard ranking tiers with point requirements
// 51-100: achievable by clearing Season 1 a few times (~50K)
// 21-50: needs battle pass + lots of play in Season 2 (~150K)
// 1-20: practically unreachable (~300K+)
export const VGP_LB_TIERS = [
  { label: '1-20',   minRank: 1,   maxRank: 20,   pointReq: 300000 },
  { label: '21-50',  minRank: 21,  maxRank: 50,   pointReq: 150000 },
  { label: '51-100', minRank: 51,  maxRank: 100,  pointReq: 50000 },
  { label: '101+',   minRank: 101, maxRank: 999,  pointReq: 0 },
];

// Tournament end rewards by rank tier
export const VGP_LB_RANK_REWARDS = [
  { tierLabel: '1-20',   trainingSkips: 3, money: 100000 },
  { tierLabel: '21-50',  trainingSkips: 2, money: 50000 },
  { tierLabel: '51-100', trainingSkips: 1, money: 10000 },
];
