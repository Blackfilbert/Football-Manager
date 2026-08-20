import { UpgradeConfig, LeagueConfig, ScoutTrainingConfig, Rarity, GameState, Position, StaffCardDef, IllnessType, PlayerIllness } from './types';

export const UPGRADES: UpgradeConfig[] = [
  // Power upgrades — increase team strength (win chance)
  { id: 'attack', name: 'Attack', emoji: '⚽', baseCost: 50, bonusPerLevel: 0.05, maxLevel: 100, description: 'Improves your attacking ability and goal scoring', type: 'power', powerPerClick: 1 },
  { id: 'defense', name: 'Defense', emoji: '🛡️', baseCost: 100, bonusPerLevel: 0.05, maxLevel: 100, description: 'Strengthens your defensive line against attacks', type: 'power', powerPerClick: 2 },
  { id: 'offside', name: 'Offside', emoji: '🚫', baseCost: 50, bonusPerLevel: 0.05, maxLevel: 100, description: 'Catches opponents offside more frequently', type: 'power', powerPerClick: 1 },
  { id: 'dribbling', name: 'Dribbling', emoji: '⚡', baseCost: 150, bonusPerLevel: 0.05, maxLevel: 100, description: 'Enhanced dribbling and ball retention', type: 'power', powerPerClick: 3 },
  // Income upgrades — increase money per second
  { id: 'tickets', name: 'Tickets', emoji: '🎟️', baseCost: 50, bonusPerLevel: 0.10, maxLevel: 100, description: 'Sell more tickets for higher match day income', type: 'income', incomePerClick: 1 },
  { id: 'marketing', name: 'Marketing', emoji: '📢', baseCost: 250, bonusPerLevel: 0.10, maxLevel: 100, description: 'Better marketing brings more sponsors and revenue', type: 'income', incomePerClick: 5 },
  { id: 'merch', name: 'Merch', emoji: '👕', baseCost: 750, bonusPerLevel: 0.10, maxLevel: 100, description: 'Sell merchandise for extra revenue', type: 'income', incomePerClick: 15 },
];

// Stadium locations — 30 levels from local pitch to world-famous stadiums
const R_C: Rarity[] = ['common', 'rare'];
const R_CE: Rarity[] = ['common', 'rare', 'epic'];
const R_CEL: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const R_CELI: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon'];
const R_ALL: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon', 'ultimate'];

export const LEAGUES: LeagueConfig[] = [
  // --- Tier 1: Local grounds (1–2) ---
  { id: 0,  name: 'Street Pitch',      city: 'Hometown',       flag: '🏠', emoji: '⚽', color: '#78716C', multiplier: 1,   unlockedRarities: R_C,    teamCount: 6,  totalMatches: 5,  matchStart: 1, bonusMoney: 0,           bonusCrystals: 0 },
  { id: 1,  name: 'City Stadium',       city: 'Hometown',       flag: '🏟️', emoji: '🏟️', color: '#A8A29E', multiplier: 2,   unlockedRarities: R_C,    teamCount: 8,  totalMatches: 7,  matchStart: 1, bonusMoney: 50_000,      bonusCrystals: 2 },
  // --- Tier 2: Small European cities (3–8) ---
  { id: 2,  name: 'Stadion Valletta',   city: 'Valletta',       flag: '🇲🇹', emoji: '🥉', color: '#CD7F32', multiplier: 3,   unlockedRarities: R_C,    teamCount: 10, totalMatches: 9,  matchStart: 1, bonusMoney: 80_000,      bonusCrystals: 3 },
  { id: 3,  name: 'Stadion Nicosia',    city: 'Nicosia',        flag: '🇨🇾', emoji: '🥉', color: '#CD7F32', multiplier: 4,   unlockedRarities: R_CE,   teamCount: 10, totalMatches: 9,  matchStart: 1, bonusMoney: 100_000,     bonusCrystals: 4 },
  { id: 4,  name: 'Stadion Reykjavik',  city: 'Reykjavik',      flag: '🇮🇸', emoji: '🥉', color: '#CD7F32', multiplier: 5,   unlockedRarities: R_CE,   teamCount: 12, totalMatches: 11, matchStart: 1, bonusMoney: 120_000,     bonusCrystals: 5 },
  { id: 5,  name: 'Stadion Ljubljana',  city: 'Ljubljana',      flag: '🇸🇮', emoji: '🥈', color: '#C0C0C0', multiplier: 6,   unlockedRarities: R_CE,   teamCount: 12, totalMatches: 11, matchStart: 1, bonusMoney: 150_000,     bonusCrystals: 5 },
  { id: 6,  name: 'Stadion Sofia',      city: 'Sofia',          flag: '🇧🇬', emoji: '🥈', color: '#C0C0C0', multiplier: 7,   unlockedRarities: R_CE,   teamCount: 12, totalMatches: 11, matchStart: 1, bonusMoney: 180_000,     bonusCrystals: 6 },
  { id: 7,  name: 'Stadion Belgrade',   city: 'Belgrade',       flag: '🇷🇸', emoji: '🥈', color: '#C0C0C0', multiplier: 8,   unlockedRarities: R_CE,   teamCount: 14, totalMatches: 13, matchStart: 1, bonusMoney: 200_000,     bonusCrystals: 7 },
  // --- Tier 3: Rising European clubs (9–14) ---
  { id: 8,  name: 'Stadion Zagreb',     city: 'Zagreb',         flag: '🇭🇷', emoji: '🥇', color: '#FFD700', multiplier: 9,   unlockedRarities: R_CEL,  teamCount: 14, totalMatches: 13, matchStart: 1, bonusMoney: 250_000,     bonusCrystals: 8 },
  { id: 9,  name: 'Stadion Eindhoven',  city: 'Eindhoven',      flag: '🇳🇱', emoji: '🥇', color: '#FFD700', multiplier: 10,  unlockedRarities: R_CEL,  teamCount: 14, totalMatches: 13, matchStart: 1, bonusMoney: 300_000,     bonusCrystals: 8 },
  { id: 10, name: 'Stadion Porto',      city: 'Porto',          flag: '🇵🇹', emoji: '🥇', color: '#FFD700', multiplier: 11,  unlockedRarities: R_CEL,  teamCount: 16, totalMatches: 15, matchStart: 1, bonusMoney: 400_000,     bonusCrystals: 9 },
  { id: 11, name: 'Stadion Sevilla',    city: 'Sevilla',        flag: '🇪🇸', emoji: '⭐', color: '#8B5CF6', multiplier: 12,  unlockedRarities: R_CEL,  teamCount: 16, totalMatches: 15, matchStart: 1, bonusMoney: 500_000,     bonusCrystals: 10 },
  { id: 12, name: 'Stadion Glasgow',    city: 'Glasgow',        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', emoji: '⭐', color: '#8B5CF6', multiplier: 13,  unlockedRarities: R_CELI, teamCount: 16, totalMatches: 15, matchStart: 1, bonusMoney: 600_000,     bonusCrystals: 10 },
  { id: 13, name: 'Stadion Marseille',  city: 'Marseille',      flag: '🇫🇷', emoji: '⭐', color: '#8B5CF6', multiplier: 14,  unlockedRarities: R_CELI, teamCount: 18, totalMatches: 17, matchStart: 1, bonusMoney: 750_000,     bonusCrystals: 11 },
  // --- Tier 4: Big 5 leagues (15–20) ---
  { id: 14, name: 'Stadion Dortmund',   city: 'Dortmund',       flag: '🇩🇪', emoji: '💫', color: '#FBBF24', multiplier: 15,  unlockedRarities: R_CELI, teamCount: 18, totalMatches: 17, matchStart: 1, bonusMoney: 1_000_000,   bonusCrystals: 12 },
  { id: 15, name: 'Stadion Lisbon',     city: 'Lisbon',         flag: '🇵🇹', emoji: '💫', color: '#FBBF24', multiplier: 16,  unlockedRarities: R_CELI, teamCount: 18, totalMatches: 17, matchStart: 1, bonusMoney: 1_200_000,   bonusCrystals: 13 },
  { id: 16, name: 'Stadion Amsterdam',  city: 'Amsterdam',      flag: '🇳🇱', emoji: '💫', color: '#FBBF24', multiplier: 17,  unlockedRarities: R_CELI, teamCount: 18, totalMatches: 17, matchStart: 1, bonusMoney: 1_500_000,   bonusCrystals: 14 },
  { id: 17, name: 'Stadion Istanbul',   city: 'Istanbul',       flag: '🇹🇷', emoji: '🔥', color: '#EF4444', multiplier: 18,  unlockedRarities: R_CELI, teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 1_800_000,   bonusCrystals: 15 },
  { id: 18, name: 'Stadion Naples',     city: 'Naples',         flag: '🇮🇹', emoji: '🔥', color: '#EF4444', multiplier: 19,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 2_000_000,   bonusCrystals: 16 },
  { id: 19, name: 'Stadion Buenos Aires', city: 'Buenos Aires', flag: '🇦🇷', emoji: '🔥', color: '#EF4444', multiplier: 20,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 2_500_000,   bonusCrystals: 17 },
  // --- Tier 5: Elite stadiums (21–25) ---
  { id: 20, name: 'Stadion Turin',      city: 'Turin',          flag: '🇮🇹', emoji: '💎', color: '#06B6D4', multiplier: 21,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 3_000_000,   bonusCrystals: 18 },
  { id: 21, name: 'Stadion Liverpool',  city: 'Liverpool',      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '💎', color: '#06B6D4', multiplier: 22,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 3_500_000,   bonusCrystals: 19 },
  { id: 22, name: 'Stadion Milan',      city: 'Milan',          flag: '🇮🇹', emoji: '💎', color: '#06B6D4', multiplier: 23,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 4_000_000,   bonusCrystals: 20 },
  { id: 23, name: 'Stadion Munich',     city: 'Munich',         flag: '🇩🇪', emoji: '💎', color: '#06B6D4', multiplier: 24,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 5_000_000,   bonusCrystals: 22 },
  { id: 24, name: 'Stadion Paris',      city: 'Paris',          flag: '🇫🇷', emoji: '👑', color: '#D946EF', multiplier: 25,  unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 6_000_000,   bonusCrystals: 25 },
  // --- Tier 6: Legendary (26–30) ---
  { id: 25, name: 'Stadion Rio de Janeiro', city: 'Rio de Janeiro', flag: '🇧🇷', emoji: '👑', color: '#D946EF', multiplier: 26, unlockedRarities: R_ALL, teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 8_000_000,   bonusCrystals: 28 },
  { id: 26, name: 'Stadion Manchester', city: 'Manchester',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '👑', color: '#D946EF', multiplier: 27, unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 10_000_000,  bonusCrystals: 30 },
  { id: 27, name: 'Stadion London',     city: 'London',         flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '🏆', color: '#F59E0B', multiplier: 28, unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 15_000_000,  bonusCrystals: 35 },
  { id: 28, name: 'Stadion Barcelona',  city: 'Barcelona',      flag: '🇪🇸', emoji: '🏆', color: '#F59E0B', multiplier: 29, unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 20_000_000,  bonusCrystals: 40 },
  { id: 29, name: 'Stadion Madrid',     city: 'Madrid',         flag: '🇪🇸', emoji: '🏆', color: '#F59E0B', multiplier: 30, unlockedRarities: R_ALL,  teamCount: 20, totalMatches: 19, matchStart: 1, bonusMoney: 50_000_000,  bonusCrystals: 50 },
];

export const SCOUT_TRAINING: ScoutTrainingConfig[] = [
  // Tier 1: Tutorial (stadiums 0–2) — quick & cheap
  { fromLevel: 1,  toLevel: 2,  durationHours: 10 / 3600,  cost: 500 },
  { fromLevel: 2,  toLevel: 3,  durationHours: 2 / 60,     cost: 5_000 },
  // Tier 2: Early progression — accessible upgrade
  { fromLevel: 3,  toLevel: 4,  durationHours: 1,           cost: 150_000 },
  // Tier 3: First major wall (~8 hours)
  { fromLevel: 4,  toLevel: 5,  durationHours: 8,           cost: 100_000_000 },
  // Tier 4: Legendary unlock (stadiums 6–8) — smooth ramp from 100M→500M→3B
  { fromLevel: 5,  toLevel: 6,  durationHours: 16,          cost: 500_000_000 },
  { fromLevel: 6,  toLevel: 7,  durationHours: 24,          cost: 3_000_000_000 },
  // Tier 5: Full legendary teams (stadiums 9–13)
  { fromLevel: 7,  toLevel: 8,  durationHours: 36,          cost: 15_000_000_000 },
  { fromLevel: 8,  toLevel: 9,  durationHours: 48,          cost: 80_000_000_000 },
  // Tier 6: Icon/Ultimate focus (stadiums 14–18)
  { fromLevel: 9,  toLevel: 10, durationHours: 72,          cost: 500_000_000_000 },
  { fromLevel: 10, toLevel: 11, durationHours: 96,          cost: 5_000_000_000_000 },
  // Tier 7: Endgame (stadiums 19–24)
  { fromLevel: 11, toLevel: 12, durationHours: 120,         cost: 50_000_000_000_000 },
  { fromLevel: 12, toLevel: 13, durationHours: 168,         cost: 200_000_000_000_000 },
  // Tier 8: Final push (stadiums 25–29)
  { fromLevel: 13, toLevel: 14, durationHours: 240,         cost: 800_000_000_000_000 },
  { fromLevel: 14, toLevel: 15, durationHours: 336,         cost: 5_000_000_000_000_000 },
];

export const SCOUT_CHANCES: Record<number, Record<Rarity, number>> = {
  //        com   rare  epic  leg   icon  ult
  1:  { common: 100, rare: 0,  epic: 0,  legendary: 0,  icon: 0,  ultimate: 0 },
  2:  { common: 85,  rare: 15, epic: 0,  legendary: 0,  icon: 0,  ultimate: 0 },
  3:  { common: 70,  rare: 22, epic: 8,  legendary: 0,  icon: 0,  ultimate: 0 },
  4:  { common: 55,  rare: 25, epic: 20, legendary: 0,  icon: 0,  ultimate: 0 },
  5:  { common: 40,  rare: 25, epic: 35, legendary: 0,  icon: 0,  ultimate: 0 },
  // --- Legendary unlocks at level 6 (1%) ---
  6:  { common: 39,  rare: 24, epic: 36, legendary: 1,  icon: 0,  ultimate: 0 },
  7:  { common: 37,  rare: 23, epic: 37, legendary: 3,  icon: 0,  ultimate: 0 },
  8:  { common: 34,  rare: 22, epic: 37, legendary: 5,  icon: 2,  ultimate: 0 },
  9:  { common: 32,  rare: 21, epic: 36, legendary: 7,  icon: 4,  ultimate: 0 },
  // --- Icon grows, ultimate unlocks at level 12 ---
  10: { common: 30,  rare: 20, epic: 35, legendary: 9,  icon: 6,  ultimate: 0 },
  11: { common: 28,  rare: 19, epic: 34, legendary: 11, icon: 8,  ultimate: 0 },
  12: { common: 26,  rare: 18, epic: 33, legendary: 13, icon: 9,  ultimate: 1 },
  13: { common: 24,  rare: 17, epic: 32, legendary: 14, icon: 10, ultimate: 3 },
  14: { common: 22,  rare: 16, epic: 31, legendary: 15, icon: 11, ultimate: 5 },
  15: { common: 19,  rare: 15, epic: 28, legendary: 15, icon: 13, ultimate: 10 },
};

export const RARITY_CONFIG: Record<Rarity, { color: string; label: string; costMin: number; costMax: number; income: number; overallMin: number; overallMax: number }> = {
  common:    { color: '#94A3B8', label: 'Common',    costMin: 800,        costMax: 3_000,        income: 5,   overallMin: 35, overallMax: 49 },
  rare:      { color: '#22C55E', label: 'Rare',      costMin: 3_000,      costMax: 10_000,       income: 10,  overallMin: 50, overallMax: 59 },
  epic:      { color: '#3B82F6', label: 'Epic',      costMin: 20_000,     costMax: 150_000,      income: 20,  overallMin: 60, overallMax: 69 },
  legendary: { color: '#A855F7', label: 'Legendary', costMin: 250_000,    costMax: 1_500_000,    income: 30,  overallMin: 70, overallMax: 79 },
  icon:      { color: '#F97316', label: 'Icon',      costMin: 1_500_000,  costMax: 5_000_000,    income: 40,  overallMin: 80, overallMax: 99 },
  ultimate:  { color: '#EF4444', label: 'Ultimate',  costMin: 10_000_000, costMax: 50_000_000,   income: 50,  overallMin: 100, overallMax: 300 },
};

// Opponent power growth: 400 * 1.05^(match-1)
export const OPPONENT_BASE_POWER = 480;
export const OPPONENT_GROWTH_RATE = 1.07;

// Win bonus scales with match number (no goal bonus)
export const WIN_BONUS_BASE = 1000;
export const WIN_BONUS_GROWTH = 1.08;

// Opponent name pools — reused across stadium tiers
const _OPP_POOL_A = [
  'Villar ESP', 'Lazio ITA', 'Corin BRA', 'Feyenoo NLD', 'Jagi POL',
  'Ind del ECU', 'Rayo ESP', 'Int BRA', 'Alaju CRI',
  'Bucar COL', 'Cerro Por PRY', 'Al-Nas SAU', 'Gremi BRA', 'AEK Larn CYP',
  'Al-Ah EGY', 'Alian PER', 'Real Soc ESP', 'Velez ARG', 'Lille FRA',
  'BATE BLR', 'Zeni RUS',
];
const _OPP_POOL_B = [
  'Olym GRC', 'Cruze BRA', 'Man Utd GBR', 'Cope DNK', 'Celt GBR',
  'Penar URY', 'Cruz Az MEX', 'Notting For GBR', 'Bodo Gli NOR', 'Fiore ITA',
  'Ameri COL', 'Shak UKR', 'Celj SVN', 'Eint Fra DEU',
  'Ludo BGR', 'Genk BEL', 'Spar Pra CZE', 'FCSB ROU', 'Monac FRA', 'Panat GRC',
];
const _OPP_POOL_C = [
  'PSV Ein NLD', 'Frei DEU', 'Brag PRT', 'Sao Pau BRA', 'Midt DNK',
  'Napo ITA', 'Ferc HUN', 'Union BEL', 'Lanu ARG', 'AC Mi ITA', 'Al-Ahl SAU',
  'Vikt Plz CZE', 'Celt Vigo ESP', 'Rive ARG', 'Pyra EGY', 'Bahi BRA',
  'Once Cal COL', 'Athl Bil ESP', 'Qara AZE',
];
const _OPP_POOL_D = [
  'Brug BEL', 'Sport CP PRT', 'Bolog ITA', 'Botaf BRA', 'Al-Hil SAU',
  'Stutt DEU', 'Bayer Lev DEU', 'Porto PRT', 'Fener TUR', 'Lyon FRA',
  'Galatas TUR', 'Cryst Pal GBR', 'AZ Alk NLD', 'Raci ARG', 'Atal ITA',
  'Newc Utd GBR', 'Pafos CYP', 'LDU Qui ECU', 'Atle Min BRA',
  'Atle Nac COL', 'Red Star SRB', 'LAFC USA',
];
const _OPP_POOL_E = [
  'ParisSG FRA', 'Chels GBR', 'Baye Mun DEU', 'Real Mad ESP', 'Inte Mil ITA',
  'Barce ESP', 'Flamen BRA', 'Arsnl GBR', 'Palmr BRA', 'Dortm DEU',
  'Manch Cit GBR', 'Aston Vil GBR', 'Atle Mad ESP', 'Juven ITA',
  'Flumin BRA', 'Benfi PRT', 'Real Bet ESP', 'Tottnh GBR', 'Rome ITA', 'Liver GBR',
  'Inter Mia USA',
];

/** Get opponent names for a given stadium index — cycles through pools */
function _getOppPool(idx: number): string[] {
  if (idx <= 1) return _OPP_POOL_A;
  if (idx <= 5) return _OPP_POOL_B;
  if (idx <= 9) return _OPP_POOL_C;
  if (idx <= 14) return _OPP_POOL_D;
  if (idx <= 19) return [..._OPP_POOL_D, ..._OPP_POOL_E];
  return _OPP_POOL_E;
}

// Build OPPONENT_NAMES_BY_LEAGUE dynamically for all 30 stadiums
export const OPPONENT_NAMES_BY_LEAGUE: Record<number, string[]> = Object.fromEntries(
  LEAGUES.map(l => [l.id, _getOppPool(l.id)])
);

// Named players for high tiers (Legendary / Icon / Ultimate)
export type NamedPlayer = { firstName: string; lastName: string; country: string; position: Position };

export const NAMED_PLAYERS: Record<'legendary' | 'icon' | 'ultimate', NamedPlayer[]> = {
  ultimate: [
    { firstName: 'Manuel', lastName: 'Neuerovic', country: 'DE', position: 'GK' },
    { firstName: 'Gianluigi', lastName: 'Buffonito', country: 'IT', position: 'GK' },
    { firstName: 'Thibaut', lastName: 'Courtoisss', country: 'BE', position: 'GK' },
    { firstName: 'Jan', lastName: 'Oblakkk', country: 'SI', position: 'GK' },
    { firstName: 'Sergio', lastName: 'Ramus', country: 'ES', position: 'CD' },
    { firstName: 'Paolo', lastName: 'Maldinii', country: 'IT', position: 'CD' },
    { firstName: 'Virgil', lastName: 'van Dijck', country: 'NL', position: 'CD' },
    { firstName: 'Leonardo', lastName: 'Bonuccio', country: 'IT', position: 'CD' },
    { firstName: 'Philipp', lastName: 'Lahmm', country: 'DE', position: 'RD' },
    { firstName: 'Dani', lastName: 'Alvezz', country: 'BR', position: 'RD' },
    { firstName: 'Kyle', lastName: 'Walkerson', country: 'GB', position: 'RD' },
    { firstName: 'Achraf', lastName: 'Hakimii', country: 'MA', position: 'RD' },
    { firstName: 'Jordi', lastName: 'Albas', country: 'ES', position: 'LD' },
    { firstName: 'David', lastName: 'Alabaa', country: 'AT', position: 'LD' },
    { firstName: 'Andrew', lastName: 'Robertsn', country: 'GB', position: 'LD' },
    { firstName: 'Alphonso', lastName: 'Daviz', country: 'CA', position: 'LD' },
    { firstName: 'Zinedin', lastName: 'Zidane', country: 'FR', position: 'CM' },
    { firstName: 'Andro', lastName: 'Iniesta', country: 'ES', position: 'CM' },
    { firstName: 'Xavi', lastName: 'Hernandezx', country: 'ES', position: 'CM' },
    { firstName: 'Ronaldinhu', lastName: '', country: 'BR', position: 'CM' },
    { firstName: 'Luka', lastName: 'Modri', country: 'HR', position: 'CM' },
    { firstName: 'Kevin', lastName: 'De Bruyn', country: 'BE', position: 'CM' },
    { firstName: 'Toni', lastName: 'Kroosss', country: 'DE', position: 'CM' },
    { firstName: "N'Golo", lastName: 'Kanteh', country: 'FR', position: 'CM' },
    { firstName: 'Arjen', lastName: 'Robbenius', country: 'NL', position: 'RM' },
    { firstName: 'Angel', lastName: 'Di Mariia', country: 'AR', position: 'RM' },
    { firstName: 'Riyad', lastName: 'Mahrezz', country: 'DZ', position: 'RM' },
    { firstName: 'Bukayo', lastName: 'Sakaa', country: 'GB', position: 'RM' },
    { firstName: 'Franck', lastName: 'Riberyy', country: 'FR', position: 'LM' },
    { firstName: 'Eden', lastName: 'Hazarr', country: 'BE', position: 'LM' },
    { firstName: 'Raheem', lastName: 'Sterlinng', country: 'GB', position: 'LM' },
    { firstName: 'Leroy', lastName: 'Sanee', country: 'DE', position: 'LM' },
    { firstName: 'Lionel', lastName: 'Messys', country: 'AR', position: 'ST' },
    { firstName: 'Cristiano', lastName: 'Ronalduu', country: 'PT', position: 'ST' },
    { firstName: 'Ronaldo', lastName: 'Fenomeno', country: 'BR', position: 'ST' },
    { firstName: 'Thierry', lastName: 'Henri', country: 'FR', position: 'ST' },
    { firstName: 'Karim', lastName: 'Benzemau', country: 'FR', position: 'ST' },
    { firstName: 'Robert', lastName: 'Lewando', country: 'PL', position: 'ST' },
    { firstName: 'Zlatan', lastName: 'Ibra', country: 'SE', position: 'ST' },
    { firstName: 'Kilian', lastName: 'Mbappe', country: 'FR', position: 'ST' },
    { firstName: 'Neymar', lastName: 'Juniorr', country: 'BR', position: 'ST' },
    { firstName: 'Luis', lastName: 'Suarec', country: 'UY', position: 'ST' },
  ],
  icon: [
    { firstName: 'Jan', lastName: 'Oblakkk', country: 'SI', position: 'GK' },
    { firstName: 'Mike', lastName: 'Magnan', country: 'FR', position: 'GK' },
    { firstName: 'Ederson', lastName: 'Moss', country: 'BR', position: 'GK' },
    { firstName: 'Alisson', lastName: 'Beckerz', country: 'BR', position: 'GK' },
    { firstName: 'Keylor', lastName: 'Navass', country: 'CR', position: 'GK' },
    { firstName: 'Samir', lastName: 'Handanovicc', country: 'SI', position: 'GK' },
    { firstName: 'Hugo', lastName: 'Llorisz', country: 'FR', position: 'GK' },
    { firstName: 'Marc-Andre', lastName: 'ter Stegenn', country: 'DE', position: 'GK' },
    { firstName: 'David', lastName: 'De Geaah', country: 'ES', position: 'GK' },
    { firstName: 'Petr', lastName: 'Cechh', country: 'CZ', position: 'GK' },
    { firstName: 'Sergio', lastName: 'Ramus', country: 'ES', position: 'CD' },
    { firstName: 'Giorgio', lastName: 'Chiellinii', country: 'IT', position: 'CD' },
    { firstName: 'Carles', lastName: 'Puyoll', country: 'ES', position: 'CD' },
    { firstName: 'Fabio', lastName: 'Cannavaroow', country: 'IT', position: 'CD' },
    { firstName: 'Alessandro', lastName: 'Nestaa', country: 'IT', position: 'CD' },
    { firstName: 'Rio', lastName: 'Ferdinandd', country: 'GB', position: 'CD' },
    { firstName: 'John', lastName: 'Terryy', country: 'GB', position: 'CD' },
    { firstName: 'Laurent', lastName: 'Blancq', country: 'FR', position: 'CD' },
    { firstName: 'Lilian', lastName: 'Thuramm', country: 'FR', position: 'CD' },
    { firstName: 'Samuel', lastName: 'Umtitii', country: 'FR', position: 'CD' },
    { firstName: 'Cafuzo', lastName: '', country: 'BR', position: 'RD' },
    { firstName: 'Gary', lastName: 'Nevillle', country: 'GB', position: 'RD' },
    { firstName: 'Sergiño', lastName: 'Destino', country: 'US', position: 'RD' },
    { firstName: 'Jesus', lastName: 'Navaz', country: 'ES', position: 'RD' },
    { firstName: 'Danilo', lastName: 'Silvva', country: 'BR', position: 'RD' },
    { firstName: 'Giovanni', lastName: 'Di Lorenzoo', country: 'IT', position: 'RD' },
    { firstName: 'Benjamin', lastName: 'Pavarott', country: 'FR', position: 'RD' },
    { firstName: 'Kieran', lastName: 'Trippierr', country: 'GB', position: 'RD' },
    { firstName: 'Reece', lastName: 'Jameson', country: 'GB', position: 'RD' },
    { firstName: 'Trent', lastName: 'Alexander-Arnoldd', country: 'GB', position: 'RD' },
    { firstName: 'Roberto', lastName: 'Carloss', country: 'BR', position: 'LD' },
    { firstName: 'Marcelo', lastName: 'Vieiraa', country: 'BR', position: 'LD' },
    { firstName: 'Andrew', lastName: 'Robertsn', country: 'GB', position: 'LD' },
    { firstName: 'Jordi', lastName: 'Albaa', country: 'ES', position: 'LD' },
    { firstName: 'David', lastName: 'Alabaa', country: 'AT', position: 'LD' },
    { firstName: 'Lucas', lastName: 'Hernandezh', country: 'FR', position: 'LD' },
    { firstName: 'Raphael', lastName: 'Guerreirro', country: 'PT', position: 'LD' },
    { firstName: 'Alex', lastName: 'Sandroo', country: 'BR', position: 'LD' },
    { firstName: 'Theo', lastName: 'Hernandezz', country: 'FR', position: 'LD' },
    { firstName: 'Ferran', lastName: 'Mendyy', country: 'FR', position: 'LD' },
    { firstName: 'Frank', lastName: 'Lampart', country: 'GB', position: 'CM' },
    { firstName: 'Steven', lastName: 'Gerrardd', country: 'GB', position: 'CM' },
    { firstName: 'Claude', lastName: 'Makelele', country: 'FR', position: 'CM' },
    { firstName: 'Patrick', lastName: 'Vieiraa', country: 'FR', position: 'CM' },
    { firstName: 'Andrea', lastName: 'Pirloo', country: 'IT', position: 'CM' },
    { firstName: 'Bastian', lastName: 'Schweinsteiger', country: 'DE', position: 'CM' },
    { firstName: 'Sergio', lastName: 'Busquetts', country: 'ES', position: 'CM' },
    { firstName: 'Xabi', lastName: 'Alonsso', country: 'ES', position: 'CM' },
    { firstName: 'Javier', lastName: 'Mascheranoo', country: 'AR', position: 'CM' },
    { firstName: 'Yaya', lastName: 'Toureh', country: 'CI', position: 'CM' },
    { firstName: 'David', lastName: 'Beckam', country: 'GB', position: 'RM' },
    { firstName: 'James', lastName: 'Rodriguezs', country: 'CO', position: 'RM' },
    { firstName: 'Jadon', lastName: 'Sanchoo', country: 'GB', position: 'RM' },
    { firstName: 'Kingsley', lastName: 'Comann', country: 'FR', position: 'RM' },
    { firstName: 'Federico', lastName: 'Chiesaa', country: 'IT', position: 'RM' },
    { firstName: 'Rodrygoo', lastName: '', country: 'BR', position: 'RM' },
    { firstName: 'Leon', lastName: 'Baileey', country: 'JM', position: 'RM' },
    { firstName: 'Mason', lastName: 'Greenwoood', country: 'GB', position: 'RM' },
    { firstName: 'Serge', lastName: 'Gnabryy', country: 'DE', position: 'RM' },
    { firstName: 'Pedro', lastName: 'Netoo', country: 'PT', position: 'RM' },
    { firstName: 'Ryan', lastName: 'Giggsy', country: 'GB', position: 'LM' },
    { firstName: 'Laurence', lastName: 'Fishburnee', country: 'FR', position: 'LM' },
    { firstName: 'Yannick', lastName: 'Carrascco', country: 'BE', position: 'LM' },
    { firstName: 'Ivan', lastName: 'Perisicic', country: 'HR', position: 'LM' },
    { firstName: 'Marcus', lastName: 'Rashfordd', country: 'GB', position: 'LM' },
    { firstName: 'Harvey', lastName: 'Barness', country: 'GB', position: 'LM' },
    { firstName: 'Cody', lastName: 'Gakpoo', country: 'NL', position: 'LM' },
    { firstName: 'Noa', lastName: 'Langg', country: 'NL', position: 'LM' },
    { firstName: 'Jeremy', lastName: 'Dokuu', country: 'BE', position: 'LM' },
    { firstName: 'Allan', lastName: 'Saint-Maximinn', country: 'FR', position: 'LM' },
    { firstName: 'Didier', lastName: 'Drobaa', country: 'CI', position: 'ST' },
    { firstName: 'Wayne', lastName: 'Rooneyy', country: 'GB', position: 'ST' },
    { firstName: 'Sergio', lastName: 'Agueroo', country: 'AR', position: 'ST' },
    { firstName: 'Luis', lastName: 'Suarec', country: 'UY', position: 'ST' },
    { firstName: 'Samuel', lastName: 'Etou', country: 'CM', position: 'ST' },
    { firstName: 'Robin', lastName: 'van Persiee', country: 'NL', position: 'ST' },
    { firstName: 'David', lastName: 'Villaah', country: 'ES', position: 'ST' },
    { firstName: 'Fernando', lastName: 'Torres', country: 'ES', position: 'ST' },
    { firstName: 'Carlos', lastName: 'Tevezz', country: 'AR', position: 'ST' },
    { firstName: 'Edinson', lastName: 'Cavanii', country: 'UY', position: 'ST' },
  ],
  legendary: [
    { firstName: 'Ederson', lastName: 'Moss', country: 'BR', position: 'GK' },
    { firstName: 'Alisson', lastName: 'Beckerz', country: 'BR', position: 'GK' },
    { firstName: 'Keylor', lastName: 'Navass', country: 'CR', position: 'GK' },
    { firstName: 'Samir', lastName: 'Handanovicc', country: 'SI', position: 'GK' },
    { firstName: 'Hugo', lastName: 'Llorisz', country: 'FR', position: 'GK' },
    { firstName: 'Marc-Andre', lastName: 'ter Stegenn', country: 'DE', position: 'GK' },
    { firstName: 'David', lastName: 'De Geaah', country: 'ES', position: 'GK' },
    { firstName: 'Petr', lastName: 'Cechh', country: 'CZ', position: 'GK' },
    { firstName: 'Mike', lastName: 'Magnan', country: 'FR', position: 'GK' },
    { firstName: 'Wojciech', lastName: 'Szczesny', country: 'PL', position: 'GK' },
    { firstName: 'Kasper', lastName: 'Schmeichel', country: 'DK', position: 'GK' },
    { firstName: 'Emiliano', lastName: 'Martinez', country: 'AR', position: 'GK' },
    { firstName: 'Yann', lastName: 'Sommer', country: 'CH', position: 'GK' },
    { firstName: 'Rui', lastName: 'Patricio', country: 'PT', position: 'GK' },
    { firstName: 'Lukas', lastName: 'Fabianski', country: 'PL', position: 'GK' },
    { firstName: 'Salvatore', lastName: 'Sirigu', country: 'IT', position: 'GK' },
    { firstName: 'Koen', lastName: 'Casteels', country: 'BE', position: 'GK' },
    { firstName: 'Andriy', lastName: 'Lunin', country: 'UA', position: 'GK' },
    { firstName: 'Unai', lastName: 'Simon', country: 'ES', position: 'GK' },
    { firstName: 'Geronimo', lastName: 'Rulli', country: 'AR', position: 'GK' },
    { firstName: 'Pepe', lastName: 'Reina', country: 'ES', position: 'GK' },
    { firstName: 'Claudio', lastName: 'Bravo', country: 'CL', position: 'GK' },
    { firstName: 'Franco', lastName: 'Armani', country: 'AR', position: 'GK' },
    { firstName: 'Roman', lastName: 'Burki', country: 'CH', position: 'GK' },
    { firstName: 'Steve', lastName: 'Mandanda', country: 'FR', position: 'GK' },
    { firstName: 'Diego', lastName: 'Godin', country: 'UY', position: 'CD' },
    { firstName: 'Giorgio', lastName: 'Chiellinii', country: 'IT', position: 'CD' },
    { firstName: 'Leonardo', lastName: 'Bonuccio', country: 'IT', position: 'CD' },
    { firstName: 'Mats', lastName: 'Hummels', country: 'DE', position: 'CD' },
    { firstName: 'Jerome', lastName: 'Boateng', country: 'DE', position: 'CD' },
    { firstName: 'Raphael', lastName: 'Varane', country: 'FR', position: 'CD' },
    { firstName: 'Kalidou', lastName: 'Koulibaly', country: 'SN', position: 'CD' },
    { firstName: 'Marquinhos', lastName: '', country: 'BR', position: 'CD' },
    { firstName: 'Thiago', lastName: 'Silva', country: 'BR', position: 'CD' },
    { firstName: 'Pepe', lastName: '', country: 'PT', position: 'CD' },
    { firstName: 'John', lastName: 'Stones', country: 'GB', position: 'CD' },
    { firstName: 'Harry', lastName: 'Maguire', country: 'GB', position: 'CD' },
    { firstName: 'Antonio', lastName: 'Rudiger', country: 'DE', position: 'CD' },
    { firstName: 'David', lastName: 'Luiz', country: 'BR', position: 'CD' },
    { firstName: 'Martin', lastName: 'Skrtel', country: 'SK', position: 'CD' },
    { firstName: 'Mathijs', lastName: 'de Ligt', country: 'NL', position: 'CD' },
    { firstName: 'Stefan', lastName: 'de Vrij', country: 'NL', position: 'CD' },
    { firstName: 'Nicolas', lastName: 'Otamendi', country: 'AR', position: 'CD' },
    { firstName: 'Jose Maria', lastName: 'Gimenez', country: 'UY', position: 'CD' },
    { firstName: 'Sokratis', lastName: 'Papastathopoulos', country: 'GR', position: 'CD' },
    { firstName: 'Jonny', lastName: 'Evans', country: 'GB', position: 'CD' },
    { firstName: 'Gary', lastName: 'Cahill', country: 'GB', position: 'CD' },
    { firstName: 'Phil', lastName: 'Jones', country: 'GB', position: 'CD' },
    { firstName: 'Chris', lastName: 'Smalling', country: 'GB', position: 'CD' },
    { firstName: 'Jan', lastName: 'Vertonghen', country: 'BE', position: 'CD' },
    { firstName: 'Dani', lastName: 'Carvajal', country: 'ES', position: 'RD' },
    { firstName: 'Daniel', lastName: 'Alves', country: 'BR', position: 'RD' },
    { firstName: 'Maicon', lastName: '', country: 'BR', position: 'RD' },
    { firstName: 'Gary', lastName: 'Neville', country: 'GB', position: 'RD' },
    { firstName: 'Phillipp', lastName: 'Lahm', country: 'DE', position: 'RD' },
    { firstName: 'Bacary', lastName: 'Sagna', country: 'FR', position: 'RD' },
    { firstName: 'Patrice', lastName: 'Evra', country: 'FR', position: 'LD' },
    { firstName: 'Gael', lastName: 'Clichy', country: 'FR', position: 'LD' },
    { firstName: 'Fabio', lastName: 'Coentrao', country: 'PT', position: 'LD' },
    { firstName: 'Eric', lastName: 'Abidal', country: 'FR', position: 'LD' },
    { firstName: 'Ashley', lastName: 'Cole', country: 'GB', position: 'LD' },
    { firstName: 'Leighton', lastName: 'Baines', country: 'GB', position: 'LD' },
    { firstName: 'Marcelo', lastName: 'Vieiraa', country: 'BR', position: 'LD' },
    { firstName: 'Roberto', lastName: 'Carloss', country: 'BR', position: 'LD' },
    { firstName: 'Jordi', lastName: 'Albaa', country: 'ES', position: 'LD' },
    { firstName: 'Andy', lastName: 'Robertsn', country: 'GB', position: 'LD' },
    { firstName: 'David', lastName: 'Alabaa', country: 'AT', position: 'LD' },
    { firstName: 'Lucas', lastName: 'Hernandezh', country: 'FR', position: 'LD' },
    { firstName: 'Raphael', lastName: 'Guerreirro', country: 'PT', position: 'LD' },
    { firstName: 'Alex', lastName: 'Sandroo', country: 'BR', position: 'LD' },
    { firstName: 'Theo', lastName: 'Hernandezz', country: 'FR', position: 'LD' },
    { firstName: 'Ferran', lastName: 'Mendyy', country: 'FR', position: 'LD' },
    { firstName: 'Ben', lastName: 'Chilwell', country: 'GB', position: 'LD' },
    { firstName: 'Luke', lastName: 'Shaw', country: 'GB', position: 'LD' },
    { firstName: 'Nacho', lastName: 'Monreal', country: 'ES', position: 'LD' },
    { firstName: 'Alberto', lastName: 'Moreno', country: 'ES', position: 'LD' },
    { firstName: 'Ricardo', lastName: 'Rodriguez', country: 'CH', position: 'LD' },
    { firstName: 'Christian', lastName: 'Fuchs', country: 'AT', position: 'LD' },
    { firstName: 'Bastian', lastName: 'Schweinsteiger', country: 'DE', position: 'CM' },
    { firstName: 'Frank', lastName: 'Lampart', country: 'GB', position: 'CM' },
    { firstName: 'Steven', lastName: 'Gerrardd', country: 'GB', position: 'CM' },
    { firstName: 'Xabi', lastName: 'Alonsso', country: 'ES', position: 'CM' },
    { firstName: 'Sergio', lastName: 'Busquetts', country: 'ES', position: 'CM' },
    { firstName: 'Javier', lastName: 'Mascheranoo', country: 'AR', position: 'CM' },
    { firstName: 'Yaya', lastName: 'Toureh', country: 'CI', position: 'CM' },
    { firstName: 'Claude', lastName: 'Makelele', country: 'FR', position: 'CM' },
    { firstName: 'Patrick', lastName: 'Vieiraa', country: 'FR', position: 'CM' },
    { firstName: 'Andrea', lastName: 'Pirloo', country: 'IT', position: 'CM' },
    { firstName: 'Michael', lastName: 'Ballack', country: 'DE', position: 'CM' },
    { firstName: 'Paul', lastName: 'Scholes', country: 'GB', position: 'CM' },
    { firstName: 'Roy', lastName: 'Keane', country: 'IE', position: 'CM' },
    { firstName: 'Clarence', lastName: 'Seedorf', country: 'NL', position: 'CM' },
    { firstName: 'Edgar', lastName: 'Davids', country: 'NL', position: 'CM' },
    { firstName: 'Gennaro', lastName: 'Gattuso', country: 'IT', position: 'CM' },
    { firstName: 'Ivan', lastName: 'Rakitic', country: 'HR', position: 'CM' },
    { firstName: 'Arturo', lastName: 'Vidal', country: 'CL', position: 'CM' },
    { firstName: 'Thiago', lastName: 'Alcantara', country: 'ES', position: 'CM' },
    { firstName: 'Jordan', lastName: 'Henderson', country: 'GB', position: 'CM' },
    { firstName: 'Jorginho', lastName: '', country: 'IT', position: 'CM' },
    { firstName: 'Mateo', lastName: 'Kovacic', country: 'HR', position: 'CM' },
    { firstName: 'Frenkie', lastName: 'de Jong', country: 'NL', position: 'CM' },
    { firstName: 'Rodri', lastName: '', country: 'ES', position: 'CM' },
    { firstName: 'Fabinho', lastName: '', country: 'BR', position: 'CM' },
    { firstName: 'Casemiro', lastName: '', country: 'BR', position: 'CM' },
    { firstName: 'Charles', lastName: 'Aranguiz', country: 'CL', position: 'CM' },
    { firstName: 'Luiz', lastName: 'Gustavo', country: 'BR', position: 'CM' },
    { firstName: 'Fernandinho', lastName: '', country: 'BR', position: 'CM' },
    { firstName: 'Ramires', lastName: '', country: 'BR', position: 'CM' },
    { firstName: 'David', lastName: 'Beckam', country: 'GB', position: 'RM' },
    { firstName: 'Arjen', lastName: 'Robbenius', country: 'NL', position: 'RM' },
    { firstName: 'Angel', lastName: 'Di Mariia', country: 'AR', position: 'RM' },
    { firstName: 'Riyad', lastName: 'Mahrezz', country: 'DZ', position: 'RM' },
    { firstName: 'Jadon', lastName: 'Sanchoo', country: 'GB', position: 'RM' },
    { firstName: 'Kingsley', lastName: 'Comann', country: 'FR', position: 'RM' },
    { firstName: 'Federico', lastName: 'Chiesaa', country: 'IT', position: 'RM' },
    { firstName: 'Rodrygoo', lastName: '', country: 'BR', position: 'RM' },
    { firstName: 'Leon', lastName: 'Baileey', country: 'JM', position: 'RM' },
    { firstName: 'Mason', lastName: 'Greenwoood', country: 'GB', position: 'RM' },
    { firstName: 'Serge', lastName: 'Gnabryy', country: 'DE', position: 'RM' },
    { firstName: 'Pedro', lastName: 'Netoo', country: 'PT', position: 'RM' },
    { firstName: 'Jesus', lastName: 'Navaz', country: 'ES', position: 'RM' },
    { firstName: 'Joao', lastName: 'Cancelo', country: 'PT', position: 'RM' },
    { firstName: 'Achraf', lastName: 'Hakimii', country: 'MA', position: 'RM' },
    { firstName: 'Giovanni', lastName: 'Di Lorenzoo', country: 'IT', position: 'RM' },
    { firstName: 'Benjamin', lastName: 'Pavarott', country: 'FR', position: 'RM' },
    { firstName: 'Kieran', lastName: 'Trippierr', country: 'GB', position: 'RM' },
    { firstName: 'Reece', lastName: 'Jameson', country: 'GB', position: 'RM' },
    { firstName: 'Trent', lastName: 'Alexander-Arnoldd', country: 'GB', position: 'RM' },
    { firstName: 'Franck', lastName: 'Riberyy', country: 'FR', position: 'LM' },
    { firstName: 'Eden', lastName: 'Hazarr', country: 'BE', position: 'LM' },
    { firstName: 'Raheem', lastName: 'Sterlinng', country: 'GB', position: 'LM' },
    { firstName: 'Leroy', lastName: 'Sanee', country: 'DE', position: 'LM' },
    { firstName: 'Ryan', lastName: 'Giggsy', country: 'GB', position: 'LM' },
    { firstName: 'Laurence', lastName: 'Fishburnee', country: 'FR', position: 'LM' },
    { firstName: 'Yannick', lastName: 'Carrascco', country: 'BE', position: 'LM' },
    { firstName: 'Ivan', lastName: 'Perisicic', country: 'HR', position: 'LM' },
    { firstName: 'Marcus', lastName: 'Rashfordd', country: 'GB', position: 'LM' },
    { firstName: 'Harvey', lastName: 'Barness', country: 'GB', position: 'LM' },
    { firstName: 'Cody', lastName: 'Gakpoo', country: 'NL', position: 'LM' },
    { firstName: 'Noa', lastName: 'Langg', country: 'NL', position: 'LM' },
    { firstName: 'Jeremy', lastName: 'Dokuu', country: 'BE', position: 'LM' },
    { firstName: 'Allan', lastName: 'Saint-Maximinn', country: 'FR', position: 'LM' },
    { firstName: 'Sadio', lastName: 'Mane', country: 'SN', position: 'LM' },
    { firstName: 'Heung-min', lastName: 'Son', country: 'KR', position: 'LM' },
    { firstName: 'Philippe', lastName: 'Coutinho', country: 'BR', position: 'LM' },
    { firstName: 'Christian', lastName: 'Pulisic', country: 'US', position: 'LM' },
    { firstName: 'Memphis', lastName: 'Depay', country: 'NL', position: 'LM' },
    { firstName: 'Lorenzo', lastName: 'Insigne', country: 'IT', position: 'LM' },
    { firstName: 'Dries', lastName: 'Mertens', country: 'BE', position: 'LM' },
    { firstName: 'Pedro', lastName: '', country: 'ES', position: 'LM' },
    { firstName: 'Alexis', lastName: 'Sanchez', country: 'CL', position: 'LM' },
    { firstName: 'Didier', lastName: 'Drogbaa', country: 'CI', position: 'ST' },
    { firstName: 'Wayne', lastName: 'Roobeyy', country: 'GB', position: 'ST' },
    { firstName: 'Sergio', lastName: 'Agueroo', country: 'AR', position: 'ST' },
    { firstName: 'Luis', lastName: 'Suarec', country: 'UY', position: 'ST' },
    { firstName: 'Samuel', lastName: 'Etou', country: 'CM', position: 'ST' },
    { firstName: 'Robin', lastName: 'van Persiee', country: 'NL', position: 'ST' },
    { firstName: 'David', lastName: 'Villaa', country: 'ES', position: 'ST' },
    { firstName: 'Fernando', lastName: 'Torres', country: 'ES', position: 'ST' },
    { firstName: 'Carlos', lastName: 'Tevezz', country: 'AR', position: 'ST' },
    { firstName: 'Edinson', lastName: 'Cavanii', country: 'UY', position: 'ST' },
    { firstName: 'Romelu', lastName: 'Ukaku', country: 'BE', position: 'ST' },
    { firstName: 'Harry', lastName: 'Kane', country: 'GB', position: 'ST' },
    { firstName: 'Antoine', lastName: 'Griezmann', country: 'FR', position: 'ST' },
    { firstName: 'Paulo', lastName: 'Dybala', country: 'AR', position: 'ST' },
    { firstName: 'Mauro', lastName: 'Icardi', country: 'AR', position: 'ST' },
    { firstName: 'Gonzalo', lastName: 'Higuain', country: 'AR', position: 'ST' },
    { firstName: 'Mario', lastName: 'Mandzukic', country: 'HR', position: 'ST' },
    { firstName: 'Edin', lastName: 'Dzeko', country: 'BA', position: 'ST' },
    { firstName: 'Olivier', lastName: 'Giroud', country: 'FR', position: 'ST' },
    { firstName: 'Alvaro', lastName: 'Morata', country: 'ES', position: 'ST' },
    { firstName: 'Jamie', lastName: 'Vardy', country: 'GB', position: 'ST' },
    { firstName: 'Daniel', lastName: 'Sturridge', country: 'GB', position: 'ST' },
    { firstName: 'Peter', lastName: 'Crouch', country: 'GB', position: 'ST' },
    { firstName: 'Diego', lastName: 'Costa', country: 'ES', position: 'ST' },
    { firstName: 'Mario', lastName: 'Balotelli', country: 'IT', position: 'ST' },
    { firstName: 'Giuseppe', lastName: 'Rossi', country: 'IT', position: 'ST' },
    { firstName: 'Alexandre', lastName: 'Pato', country: 'BR', position: 'ST' },
    { firstName: 'Fred', lastName: '', country: 'FR', position: 'ST' },
    { firstName: 'Alan', lastName: 'Shearer', country: 'GB', position: 'ST' },
    { firstName: 'Miroslav', lastName: 'Kloze', country: 'DE', position: 'ST' },
    { firstName: 'Filippo', lastName: 'Inzaghi', country: 'IT', position: 'ST' },
    { firstName: 'Christian', lastName: 'Vieri', country: 'IT', position: 'ST' },
    { firstName: 'Hernan', lastName: 'Crespo', country: 'AR', position: 'ST' },
    { firstName: 'Rivalho', lastName: '', country: 'BR', position: 'ST' },
    { firstName: 'Romario', lastName: '', country: 'BR', position: 'ST' },
    { firstName: 'George', lastName: 'Weah', country: 'LR', position: 'ST' },
    { firstName: 'Dwight', lastName: 'Yorke', country: 'TT', position: 'ST' },
    { firstName: 'Henrik', lastName: 'Larsson', country: 'SE', position: 'ST' },
  ],
};

export const FIRST_NAMES = [
  'Marco', 'Luca', 'Bruno', 'Carlos', 'Diego', 'Emre', 'Fabio', 'Gabriel',
  'Hugo', 'Ivan', 'Jean', 'Karim', 'Leon', 'Mateo', 'Nico', 'Oscar',
  'Pablo', 'Rafael', 'Sandro', 'Tomas', 'Andre', 'Bernardo', 'Cristian',
  'Dani', 'Erik', 'Felipe', 'Gonzalo', 'Hector', 'Igor', 'Jakub',
  'Kevin', 'Lorenzo', 'Miguel', 'Neymar', 'Omar', 'Pedro', 'Quincy',
  'Romain', 'Stefan', 'Thiago', 'Uros', 'Victor', 'William', 'Xavi',
  'Youri', 'Zlatan', 'Adrien', 'Blaise', 'Cesc', 'Daichi',
];

export const LAST_NAMES = [
  'Silva', 'Santos', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Fernandez',
  'Garcia', 'Torres', 'Ramirez', 'Moreno', 'Hernandez', 'Alvarez', 'Romero',
  'Diaz', 'Perez', 'Gomez', 'Sanchez', 'Ruiz', 'Jimenez', 'Navarro',
  'Morales', 'Ortiz', 'Delgado', 'Castro', 'Ramos', 'Gutierrez', 'Soto',
  'Flores', 'Acosta', 'Varga', 'Novak', 'Kovac', 'Jansen', 'Muller',
  'Schmidt', 'Weber', 'Becker', 'Larsson', 'Andersen', 'Nielsen', 'Olsen',
  'Berg', 'Johansson', 'Eriksen', 'Petrov', 'Popov', 'Sokolov', 'Tanaka', 'Yamamoto',
];

export const COUNTRIES: { code: string; flag: string }[] = [
  { code: 'BR', flag: '🇧🇷' }, { code: 'AR', flag: '🇦🇷' }, { code: 'FR', flag: '🇫🇷' },
  { code: 'DE', flag: '🇩🇪' }, { code: 'ES', flag: '🇪🇸' }, { code: 'IT', flag: '🇮🇹' },
  { code: 'PT', flag: '🇵🇹' }, { code: 'NL', flag: '🇳🇱' }, { code: 'BE', flag: '🇧🇪' },
  { code: 'GB', flag: '🇬🇧' }, { code: 'HR', flag: '🇭🇷' }, { code: 'PL', flag: '🇵🇱' },
  { code: 'SE', flag: '🇸🇪' }, { code: 'DK', flag: '🇩🇰' }, { code: 'NO', flag: '🇳🇴' },
  { code: 'TR', flag: '🇹🇷' }, { code: 'JP', flag: '🇯🇵' }, { code: 'NG', flag: '🇳🇬' },
  { code: 'CM', flag: '🇨🇲' }, { code: 'SN', flag: '🇸🇳' }, { code: 'CO', flag: '🇨🇴' },
  { code: 'UY', flag: '🇺🇾' }, { code: 'CH', flag: '🇨🇭' }, { code: 'AT', flag: '🇦🇹' },
  { code: 'RS', flag: '🇷🇸' }, { code: 'CZ', flag: '🇨🇿' }, { code: 'GR', flag: '🇬🇷' },
  { code: 'MX', flag: '🇲🇽' }, { code: 'US', flag: '🇺🇸' }, { code: 'KR', flag: '🇰🇷' },
  { code: 'RU', flag: '🇷🇺' },
];

export const TEAM_COLORS = [
  '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#000000', '#1E3A5F', '#7C3AED',
];

export const MARKET_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const AUTO_SAVE_INTERVAL = 10 * 1000; // 10 seconds
export const OFFLINE_EARNINGS_CAP = 2 * 60 * 60; // 2 hours in seconds

// Trophy rewards per stadium: [1st, 2nd, 3rd] — scales with stadium level
export const TROPHY_REWARDS_TABLE: Record<number, [number, number, number]> = Object.fromEntries(
  LEAGUES.map(l => {
    // Generous trophy rewards for top finishes — scales with stadium
    const base = 8 + Math.floor(l.id * 1.5);
    return [l.id, [base, Math.max(2, Math.floor(base * 0.7)), Math.max(1, Math.floor(base * 0.4))] as [number, number, number]];
  })
);
// Legacy compat (base = 1st place)
export const TROPHY_REWARDS: Record<number, number> = Object.fromEntries(
  Object.entries(TROPHY_REWARDS_TABLE).map(([k, v]) => [k, v[0]])
);

// Skill upgrade cost per level (trophies) — flat 1 trophy per skill level
export const SKILL_COSTS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5];

/* ── Street Cup ── */
export const STREET_CUP_MATCH_HOUR = 15; // 15:00 local time
export const STREET_CUP_CYCLE_DAYS = 5; // 4 match days + 1 rest
export const STREET_CUP_BOOST_COST = 50; // crystals
export const STREET_CUP_BOOST_PERCENT = 15; // +15% power

export const STREET_CUP_REWARDS = [
  { round: 1, winMoney: 5_000, winCrystals: 0, winTrophies: 0, loseMoney: 1_000, loseCrystals: 0, loseTrophies: 0 },
  { round: 2, winMoney: 15_000, winCrystals: 5, winTrophies: 0, loseMoney: 0, loseCrystals: 0, loseTrophies: 0 },
  { round: 3, winMoney: 50_000, winCrystals: 10, winTrophies: 0, loseMoney: 0, loseCrystals: 0, loseTrophies: 0 },
  { round: 4, winMoney: 200_000, winCrystals: 30, winTrophies: 5, loseMoney: 25_000, loseCrystals: 3, loseTrophies: 0 },
];

export const STREET_CUP_NAMES = [
  'FC Blaze', 'Iron United', 'Night Wolves', 'Storm FC',
  'Red Arrows', 'Golden Eagles', 'Dark Knights', 'Thunder FC',
  'Silver Hawks', 'Blue Sharks', 'Phantom XI', 'Wild Boars',
  'Cobra Strike', 'Flash City', 'Riot Squad', 'Venom FC',
  'Fire Foxes', 'Steel Wall', 'Shadow FC', 'Ice Titans',
];

export const STREET_CUP_COUNTRIES = [
  'br', 'ar', 'de', 'fr', 'es', 'it', 'gb', 'pt',
  'nl', 'be', 'hr', 'jp', 'kr', 'mx', 'us', 'co',
  'pl', 'ua', 'tr', 'se', 'dk', 'ng', 'gh', 'cm',
];
// Each skill level adds +2 attack or +2 defense (or +2 overall depending on skill)
export const SKILL_MAX_LEVEL = Infinity;
// ── Staff Cards (Marketers) ──
export const STAFF_CARDS: StaffCardDef[] = [
  // ── Marketers ──
  // Rare — 2 buildings, modest bonus
  { id: 'r1', name: 'Alex Rivera',    emoji: '👨‍💼', rarity: 'rare',      role: 'marketer', buildings: ['tickets', 'marketing'], baseMult: 0.016 },
  { id: 'r2', name: 'Sam Chen',       emoji: '👩‍💼', rarity: 'rare',      role: 'marketer', buildings: ['marketing', 'merch'],   baseMult: 0.016 },
  { id: 'r3', name: 'Dana Kowalski',  emoji: '🧑‍💼', rarity: 'rare',      role: 'marketer', buildings: ['tickets', 'merch'],     baseMult: 0.016 },
  { id: 'r4', name: 'Max Weber',      emoji: '👨‍💻', rarity: 'rare',      role: 'marketer', buildings: ['tickets', 'marketing'], baseMult: 0.017 },
  { id: 'r5', name: 'Lena Park',      emoji: '👩‍💻', rarity: 'rare',      role: 'marketer', buildings: ['marketing', 'merch'],   baseMult: 0.017 },
  // Epic — 1 building only, much higher bonus
  { id: 'e1', name: 'Victoria Stone', emoji: '👸', rarity: 'epic',      role: 'marketer', buildings: ['tickets'],              baseMult: 0.024 },
  { id: 'e2', name: 'Marcus Black',   emoji: '🤵', rarity: 'epic',      role: 'marketer', buildings: ['marketing'],            baseMult: 0.024 },
  { id: 'e3', name: 'Isabella Cruz',  emoji: '💃', rarity: 'epic',      role: 'marketer', buildings: ['merch'],                baseMult: 0.024 },
  { id: 'e4', name: 'Oliver Knight',  emoji: '🎩', rarity: 'epic',      role: 'marketer', buildings: ['tickets'],              baseMult: 0.025 },
  { id: 'e5', name: 'Sophie Laurent', emoji: '👑', rarity: 'epic',      role: 'marketer', buildings: ['marketing'],            baseMult: 0.025 },
  // Legendary — all 3 buildings
  { id: 'l1', name: 'James Sterling', emoji: '⭐', rarity: 'legendary', role: 'marketer', buildings: ['tickets', 'marketing', 'merch'], baseMult: 0.040 },
  { id: 'l2', name: 'Elena Volkov',   emoji: '🌟', rarity: 'legendary', role: 'marketer', buildings: ['tickets', 'marketing', 'merch'], baseMult: 0.040 },
  { id: 'l3', name: 'Rafael Santos',  emoji: '✨', rarity: 'legendary', role: 'marketer', buildings: ['tickets', 'marketing', 'merch'], baseMult: 0.042 },
  { id: 'l4', name: 'Aria Kim',       emoji: '💎', rarity: 'legendary', role: 'marketer', buildings: ['tickets', 'marketing', 'merch'], baseMult: 0.042 },
  { id: 'l5', name: 'Dominic Hart',   emoji: '🔱', rarity: 'legendary', role: 'marketer', buildings: ['tickets', 'marketing', 'merch'], baseMult: 0.044 },
  // ── Trainers ──
  // Rare — 2 special buildings
  { id: 'tr1', name: 'Carlos Mendes',  emoji: '🏋️', rarity: 'rare',      role: 'trainer', buildings: ['training_hall', 'strategy_room'], baseMult: 0.016 },
  { id: 'tr2', name: 'Johan Eriksson', emoji: '📋', rarity: 'rare',      role: 'trainer', buildings: ['training_hall', 'strategy_room'], baseMult: 0.016 },
  { id: 'tr3', name: 'Marco Bianchi',  emoji: '🎯', rarity: 'rare',      role: 'trainer', buildings: ['training_hall', 'strategy_room'], baseMult: 0.017 },
  // Epic — 1 building, higher bonus
  { id: 'te1', name: 'Hans Müller',     emoji: '🧠', rarity: 'epic',      role: 'trainer', buildings: ['strategy_room'],              baseMult: 0.024 },
  { id: 'te2', name: 'Pep Navarro',     emoji: '⚡', rarity: 'epic',      role: 'trainer', buildings: ['training_hall'],              baseMult: 0.024 },
  { id: 'te3', name: 'Yuki Tanaka',     emoji: '🥋', rarity: 'epic',      role: 'trainer', buildings: ['training_hall'],              baseMult: 0.025 },
  // Legendary — both buildings
  { id: 'tl1', name: 'Sir Alex Reid',   emoji: '🏆', rarity: 'legendary', role: 'trainer', buildings: ['training_hall', 'strategy_room'], baseMult: 0.040 },
  { id: 'tl2', name: 'Zinedine Laroui', emoji: '👔', rarity: 'legendary', role: 'trainer', buildings: ['training_hall', 'strategy_room'], baseMult: 0.042 },
  { id: 'tl3', name: 'Antonio Vieri',   emoji: '🎖️', rarity: 'legendary', role: 'trainer', buildings: ['training_hall', 'strategy_room'], baseMult: 0.044 },
  // ── Doctors ──
  // Rare
  { id: 'dr1', name: 'Dr. Sarah Mills',   emoji: '🩺', rarity: 'rare',      role: 'doctor', buildings: ['infirmary'], baseMult: 0.016 },
  { id: 'dr2', name: 'Dr. Kenji Ota',     emoji: '💊', rarity: 'rare',      role: 'doctor', buildings: ['infirmary'], baseMult: 0.016 },
  { id: 'dr3', name: 'Dr. Anna Petrova',  emoji: '🏥', rarity: 'rare',      role: 'doctor', buildings: ['infirmary'], baseMult: 0.017 },
  // Epic
  { id: 'de1', name: 'Dr. James Wong',    emoji: '🔬', rarity: 'epic',      role: 'doctor', buildings: ['infirmary'], baseMult: 0.024 },
  { id: 'de2', name: 'Dr. Elena Rossi',   emoji: '💉', rarity: 'epic',      role: 'doctor', buildings: ['infirmary'], baseMult: 0.025 },
  { id: 'de3', name: 'Dr. Omar Hassan',   emoji: '🧬', rarity: 'epic',      role: 'doctor', buildings: ['infirmary'], baseMult: 0.025 },
  // Legendary
  { id: 'dl1', name: 'Prof. Eva Lund',    emoji: '⚕️', rarity: 'legendary', role: 'doctor', buildings: ['infirmary'], baseMult: 0.040 },
  { id: 'dl2', name: 'Prof. Chen Wei',    emoji: '🌡️', rarity: 'legendary', role: 'doctor', buildings: ['infirmary'], baseMult: 0.042 },
  { id: 'dl3', name: 'Prof. D. Alvarez',  emoji: '❤️‍🩹', rarity: 'legendary', role: 'doctor', buildings: ['infirmary'], baseMult: 0.044 },
];

/** Stars from card copies: 1→★, 2→★★, 4→★★★, 8→★★★★, 16→★★★★★ */
export const STAFF_STAR_THRESHOLDS = [1, 2, 4, 8, 16] as const;
/** Trophy cost per staff level: level 1→2 costs 5, etc */
export const STAFF_LEVEL_FAME_COST = (lvl: number) => Math.max(1, Math.floor(0.1 * lvl * lvl + 0.5 * lvl + 1));
/** @deprecated Use STAFF_LEVEL_FAME_COST */
export const STAFF_LEVEL_TROPHY_COST = STAFF_LEVEL_FAME_COST;
export const STAFF_MAX_LEVEL = 100;

/* ── Illness Config ── */
export const ILLNESS_CHANCE_PER_MATCH = 0.05; // 5% chance a starter gets ill after match (low)
export const ILLNESS_TYPES: { type: IllnessType; label: string; emoji: string; effectiveness: number; weight: number; healTime: number; duration: number }[] = [
  { type: 'cold',          label: 'Cold',          emoji: '🤧', effectiveness: 0.70, weight: 50, healTime: 5 * 60_000,  duration: 3_600_000 },     // heal 5min, natural 1h
  { type: 'fracture',      label: 'Fracture',      emoji: '🦴', effectiveness: 0.50, weight: 25, healTime: 10 * 60_000, duration: 7_200_000 },     // heal 10min, natural 2h
  { type: 'depression',    label: 'Depression',     emoji: '😞', effectiveness: 0.30, weight: 15, healTime: 20 * 60_000, duration: 14_400_000 },    // heal 20min, natural 4h
  { type: 'torn_ligament', label: 'Torn Ligament',  emoji: '🩹', effectiveness: 0.10, weight: 10, healTime: 30 * 60_000, duration: 28_800_000 },    // heal 30min, natural 8h
];

/* ── Special Buildings ── */
export const SPECIAL_BUILDINGS = [
  { id: 'training_hall',  name: 'Training Hall',  emoji: '🏋️', desc: 'Train players for temporary stat boosts' },
  { id: 'strategy_room',  name: 'Strategy Room',  emoji: '📐', desc: 'Generate team strategies every 5 min' },
  { id: 'infirmary',      name: 'Infirmary',      emoji: '🏥', desc: 'Heal sick players faster' },
];

export const STRATEGY_GEN_FIRST = 10 * 1000;       // first strategy generates in 10 seconds
export const STRATEGY_GEN_INTERVAL = 5 * 60 * 1000; // subsequent: 5 min
export const STRATEGY_BATCH_SIZE = 1;               // generate 1 at a time
export const STRATEGY_DURATION = 1 * 60 * 1000;     // strategy buff lasts 1 min
export const STRATEGY_MAX_READY = 9;
// Training tiers: { boost %, cooldown ms, base buff duration ms }
export const TRAINING_TIERS = [
  { pct: 10, cooldown: 5 * 60_000, baseDuration: 2 * 60_000 },  // +10% → 5min cooldown, 2min buff
  { pct: 20, cooldown: 10 * 60_000, baseDuration: 2 * 60_000 }, // +20% → 10min cooldown, 2min buff
  { pct: 30, cooldown: 15 * 60_000, baseDuration: 2 * 60_000 }, // +30% → 15min cooldown, 2min buff
];
export const TRAINING_MAX_DURATION = 5 * 60_000; // max buff duration (5min) after trainer level bonus
// Legacy exports for backwards compat
export const TRAINING_DURATION = TRAINING_TIERS[0].baseDuration;
export const TRAINING_COOLDOWN = TRAINING_TIERS[0].cooldown;

export const MATCH_DURATION = 60; // seconds (1 minute per match)
export const MATCH_PAUSE = 5; // seconds between matches (show result)
export const MAX_MATCH = 90; // total matches across all leagues

export const DEFAULT_GAME_STATE: GameState = {
  money: 50,
  crystals: 10,
  fame: 0,
  keysRegular: 0,
  keysGold: 0,
  totalEarned: 0,
  players: [],
  startingIds: [],
  upgrades: {},
  currentMatch: 1,
  leagueIndex: 0,
  seasonWins: 0,
  seasonDraws: 0,
  seasonLosses: 0,
  seasonResults: [],
  seasonSeed: Math.floor(Math.random() * 1000000),
  matchWins: 0,
  matchLosses: 0,
  matchDraws: 0,
  recentForm: [],
  scoutLevel: 1,
  scoutTrainingStart: null,
  scoutTrainingTarget: null,
  lastLoginDate: '',
  careerDailyLastClaim: '',
  careerDailyStreak: 0,
  lastSaveTime: Date.now(),
  tutorialComplete: false,
  transferMarket: [],
  transferMarketRefreshTime: 0,
  teamName: 'My Team',
  marketUnlocked: false,
  marketNotifSeen: false,
  teamNameSet: false,
  teamColor: '#3B82F6',
  teamCountry: 'us',
  teamLogo: null,
  careerModeSeen: false,
  trophies: 0,
  careerPlayer: null,
  streetCupUnlocked: false,
  streetCup: null,
  // Season Pass
  spXp: 0,
  spLevel: 1,
  spFreeClaimed: [],
  spNoviceClaimed: [],
  spChampionClaimed: [],
  spNovicePurchased: false,
  spChampionPurchased: false,
  spSeasonStart: Date.now(),
  questDailyDate: '',
  questDailyProgress: {},
  questDailyClaimed: [],
  questWeeklyStart: '',
  questWeeklyProgress: {},
  questWeeklyClaimed: [],
  // Staff
  staff: {},
  staffAssigned: {},
  stadiumEarnings: 0,
  trainingBoosts: [],
  activeStrategies: [],
  strategiesReady: 0,
  strategyLastGenTime: 0,
  trainingCooldown: 0,
  freeStaffOpens: 0,
  totalStaffOpensUsed: 0,
};
