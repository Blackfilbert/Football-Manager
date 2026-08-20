import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../theme';
import { useGame } from '../context/GameContext';
import { formatMoney, formatNumber } from '../utils';
import { OPPONENT_NAMES_BY_LEAGUE, LEAGUES } from '../constants';
import CurrencyIcon from './CurrencyIcon';
import Boost2xModal from './Boost2xModal';

const DIV_COLORS = ['#CD7F32', '#C0C0C0', '#FFD700', '#8B5CF6', '#06B6D4'];
const PROMO_COLOR = '#FFD700'; // gold
const RELEG_COLOR = '#EF4444'; // red

interface StandingRow {
  pos: number;
  name: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  pts: number;
  isUs: boolean;
}

/** Simple seeded PRNG (mulberry32) — deterministic for same seed */
function createSeededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulate match between two teams based on their power ratings.
 * Returns: 1 = team A wins, -1 = team B wins, 0 = draw
 */
function simulateMatchByPower(
  powerA: number,
  powerB: number,
  rand: () => number,
): { result: 1 | 0 | -1; goalsA: number; goalsB: number } {
  const total = powerA + powerB;
  const chanceA = total > 0 ? powerA / total : 0.5;
  // Win prob: stronger team wins more, but not guaranteed
  const winA = chanceA * 0.65 + 0.1;  // range ~0.1–0.75
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

/**
 * Generate a proper round-robin schedule using the circle method.
 * Returns an array of matchdays, each matchday is an array of [teamA, teamB] pairs.
 * Every team plays exactly once per matchday.
 */
function generateRoundRobin(n: number, rand: () => number): [number, number][][] {
  // Need even number of teams for circle method; add a "bye" if odd
  const useN = n % 2 === 0 ? n : n + 1;
  const teams = Array.from({ length: useN }, (_, i) => i);

  // Shuffle team order for variety (but deterministic with seed)
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  const rounds: [number, number][][] = [];
  const fixed = teams[0];
  const rotating = teams.slice(1);

  for (let r = 0; r < useN - 1; r++) {
    const matchday: [number, number][] = [];
    // fixed vs first in rotating
    const a = fixed;
    const b = rotating[0];
    if (a < n && b < n) matchday.push([a, b]); // skip bye team

    for (let i = 1; i < rotating.length; i++) {
      const x = rotating[i];
      const y = rotating[rotating.length - i];
      if (i < rotating.length - i && x < n && y < n) {
        matchday.push([x, y]);
      }
    }

    rounds.push(matchday);
    // Rotate: move last to front
    rotating.unshift(rotating.pop()!);
  }

  return rounds;
}

/**
 * Simulate a realistic round-robin league with fixed team strengths.
 * Uses proper matchday scheduling so all teams have equal matches played.
 */
function generateStandings(
  teamName: string,
  wins: number,
  draws: number,
  losses: number,
  leagueIdx: number,
  seasonSeed: number,
  seasonResults?: ('W' | 'D' | 'L')[],
): StandingRow[] {
  const rand = createSeededRandom(seasonSeed);

  const names = OPPONENT_NAMES_BY_LEAGUE?.[leagueIdx] ?? OPPONENT_NAMES_BY_LEAGUE?.[0] ?? [];
  const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
  const teamCount = league?.teamCount ?? 10;
  const aiCount = Math.min(teamCount - 1, names.length);
  const totalTeams = aiCount + 1; // index 0 = us

  // Assign fixed power ratings to each AI team for this season
  // AI power scales exponentially with stadium level (~8.5% per level, matching opponent growth)
  const basePower = leagueIdx === 0 ? 230 : leagueIdx === 1 ? 320 : Math.floor(420 * Math.pow(1.085, leagueIdx));
  const aiPowers: number[] = [];
  for (let i = 0; i < aiCount; i++) {
    aiPowers.push(Math.round(basePower * (0.6 + rand() * 0.8)));
  }

  // Generate proper round-robin schedule (all teams including us = index 0)
  const matchdays = generateRoundRobin(totalTeams, rand);

  const stats = Array.from({ length: totalTeams }, () => ({
    w: 0, d: 0, l: 0, gf: 0, ga: 0,
  }));

  // Pre-simulate ALL matchdays with a separate PRNG so results are fixed
  const matchRand = createSeededRandom(seasonSeed + 999999);

  // For each matchday, pre-compute all match results
  type MatchResult = { a: number; b: number; goalsA: number; goalsB: number; res: 1 | 0 | -1 };
  const allMatchdayResults: MatchResult[][] = [];
  for (const md of matchdays) {
    const dayResults: MatchResult[] = [];
    for (const [a, b] of md) {
      const pA = a === 0 ? 0 : aiPowers[a - 1]; // we don't need our power for AI sim
      const pB = b === 0 ? 0 : aiPowers[b - 1];
      if (a === 0 || b === 0) {
        // Our match — result will be injected from real W/D/L, just consume rand
        matchRand(); matchRand(); matchRand();
        dayResults.push({ a, b, goalsA: 0, goalsB: 0, res: 0 });
      } else {
        const sim = simulateMatchByPower(pA, pB, matchRand);
        dayResults.push({ a, b, goalsA: sim.goalsA, goalsB: sim.goalsB, res: sim.result });
      }
    }
    allMatchdayResults.push(dayResults);
  }

  // Determine which matchdays have been played (= number of our matches played)
  const ourPlayed = wins + draws + losses;

  // Use chronological season results if available, fallback to grouped W/D/L
  const ourResults: ('w' | 'd' | 'l')[] = [];
  if (seasonResults && seasonResults.length > 0) {
    for (const r of seasonResults) {
      ourResults.push(r === 'W' ? 'w' : r === 'D' ? 'd' : 'l');
    }
  } else {
    for (let i = 0; i < wins; i++) ourResults.push('w');
    for (let i = 0; i < draws; i++) ourResults.push('d');
    for (let i = 0; i < losses; i++) ourResults.push('l');
  }

  // Find which matchdays involve us (team 0) and map to our result order
  let ourMatchIdx = 0;
  const goalRand = createSeededRandom(seasonSeed + 777777);

  for (let day = 0; day < matchdays.length; day++) {
    const dayResults = allMatchdayResults[day];
    const dayPlayed = day < ourPlayed; // this matchday has been played

    for (const mr of dayResults) {
      const isOurMatch = mr.a === 0 || mr.b === 0;

      if (isOurMatch) {
        if (!dayPlayed) continue; // matchday not yet played
        const opp = mr.a === 0 ? mr.b : mr.a;
        const result = ourResults[ourMatchIdx] ?? 'l';
        ourMatchIdx++;

        if (result === 'w') {
          const gf = 1 + Math.floor(goalRand() * 3);
          const ga = Math.floor(goalRand() * gf);
          stats[0].w++; stats[0].gf += gf; stats[0].ga += ga;
          stats[opp].l++; stats[opp].gf += ga; stats[opp].ga += gf;
        } else if (result === 'd') {
          const g = Math.floor(goalRand() * 3);
          stats[0].d++; stats[0].gf += g; stats[0].ga += g;
          stats[opp].d++; stats[opp].gf += g; stats[opp].ga += g;
        } else {
          const ga = 1 + Math.floor(goalRand() * 3);
          const gf = Math.floor(goalRand() * ga);
          stats[0].l++; stats[0].gf += gf; stats[0].ga += ga;
          stats[opp].w++; stats[opp].gf += ga; stats[opp].ga += gf;
        }
      } else {
        if (!dayPlayed) continue; // AI matches also only on played matchdays
        // Apply pre-computed AI result
        stats[mr.a].gf += mr.goalsA; stats[mr.a].ga += mr.goalsB;
        stats[mr.b].gf += mr.goalsB; stats[mr.b].ga += mr.goalsA;
        if (mr.res === 1) { stats[mr.a].w++; stats[mr.b].l++; }
        else if (mr.res === -1) { stats[mr.b].w++; stats[mr.a].l++; }
        else { stats[mr.a].d++; stats[mr.b].d++; }
      }
    }
  }

  const teamNames = [teamName, ...names.slice(0, aiCount)];
  const allTeams: StandingRow[] = stats.map((st, i) => ({
    pos: 0,
    name: teamNames[i] ?? `Team ${i}`,
    p: st.w + st.d + st.l,
    w: st.w,
    d: st.d,
    l: st.l,
    gd: st.gf - st.ga,
    pts: st.w * 3 + st.d,
    isUs: i === 0,
  }));

  allTeams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.w - a.w);
  allTeams.forEach((t, i) => { t.pos = i + 1; });

  return allTeams;
}

/** Get 3 rows around our team (1 above, us, 1 below) */
function getVisibleRows(all: StandingRow[]): StandingRow[] {
  const ourIdx = all.findIndex(t => t.isUs);
  let start = Math.max(0, ourIdx - 1);
  let end = start + 3;
  if (end > all.length) {
    end = all.length;
    start = Math.max(0, end - 3);
  }
  return all.slice(start, end);
}

function UpArrow({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(1);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000,
        delay: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={{ opacity, marginLeft: 2 }} pointerEvents="none">
      <Ionicons name="arrow-up" size={14} color={Colors.green} />
    </Animated.View>
  );
}

export default function Header({ onManagerPress, onRatingsPress, onDailyPress, showDailyBadge, onBattlePress, showBattleBadge, onLocationPress, showLocationBadge }: { onManagerPress?: () => void; onRatingsPress?: () => void; onDailyPress?: () => void; showDailyBadge?: boolean; onBattlePress?: () => void; showBattleBadge?: boolean; onLocationPress?: () => void; showLocationBadge?: boolean }) {
  const router = useRouter();
  const { gameState, incomePerSecond, matchProgression } = useGame();
  const today = new Date().toISOString().split('T')[0] ?? '';
  const showManagerBadge = !(gameState?.teamNameSet ?? false) || gameState?.lastLoginDate !== today;
  const teamColor = gameState?.teamColor ?? Colors.primary;
  const [expanded, setExpanded] = useState(false);
  const [boost2xVisible, setBoost2xVisible] = useState(false);
  const [fameTooltip, setFameTooltip] = useState(false);
  const stadiumIdx = gameState?.leagueIndex ?? 0;

  const leagueIdx = matchProgression?.leagueIndex ?? 0;
  const divColor = DIV_COLORS[leagueIdx] ?? '#CD7F32';
  const leagueName = matchProgression?.leagueName ?? 'League 3';
  const teamName = gameState?.teamName ?? 'My Team';

  // Use season stats for standings
  const wins = gameState?.seasonWins ?? 0;
  const draws = gameState?.seasonDraws ?? 0;
  const losses = gameState?.seasonLosses ?? 0;

  const league = LEAGUES[leagueIdx] ?? LEAGUES[0];
  const teamCount = league?.teamCount ?? 10;

  // Promotion zone info (no relegation)
  const isTopLeague = leagueIdx >= LEAGUES.length - 1;
  const promoZone = isTopLeague ? 0 : 3; // top 3 promote
  const relegZone = 0; // no relegation

  // Memoize standings so they don't reshuffle every render
  const seasonSeed = gameState?.seasonSeed ?? 0;
  const seasonResults = gameState?.seasonResults ?? [];
  const resultsKey = seasonResults.join('');
  const standingsKey = `${leagueIdx}-${resultsKey}-${seasonSeed}`;
  const standingsRef = useRef<{ key: string; data: StandingRow[] }>({ key: '', data: [] });
  const allStandings = useMemo(() => {
    if (standingsRef.current.key === standingsKey) return standingsRef.current.data;
    const data = generateStandings(teamName, wins, draws, losses, leagueIdx, seasonSeed, seasonResults);
    standingsRef.current = { key: standingsKey, data };
    return data;
  }, [standingsKey, teamName, wins, draws, losses, leagueIdx, seasonSeed, resultsKey]);

  const visibleRows = expanded ? allStandings : getVisibleRows(allStandings);

  // Track increases for green arrow
  const prevIncomeRef = useRef(incomePerSecond);
  const [incomeUp, setIncomeUp] = useState(false);
  const incomeTickRef = useRef(0);

  useEffect(() => {
    if (incomePerSecond > prevIncomeRef.current) {
      setIncomeUp(false);
      incomeTickRef.current += 1;
      requestAnimationFrame(() => setIncomeUp(true));
    }
    prevIncomeRef.current = incomePerSecond;
  }, [incomePerSecond]);

  /** Get zone color for position badge */
  const getZoneBorder = (pos: number): string | null => {
    if (promoZone > 0 && pos <= promoZone) return PROMO_COLOR;
    if (relegZone > 0 && pos > teamCount - relegZone) return RELEG_COLOR;
    return null;
  };

  // Next league name for promotion label
  const promoLeagueName = !isTopLeague ? (LEAGUES[leagueIdx + 1]?.name ?? '') : '';
  // No relegation

  return (
    <View style={s.container}>
      {/* Income row */}
      <View style={s.incomeRow}>
        <Text style={s.incomeCenterLabel}>{(gameState?.incomeMultiplier ?? 1) >= 2 ? '2x Income /s' : 'Income /s'}</Text>
        <View style={s.valueCell}>
          <Text style={s.incomeCenterValue}>{formatMoney(incomePerSecond ?? 0)}</Text>
          <UpArrow key={`i${incomeTickRef.current}`} visible={incomeUp} />
        </View>
        {(gameState?.incomeMultiplier ?? 1) < 2 && (
          <Pressable style={s.activate2xBtn} onPress={() => setBoost2xVisible(true)} hitSlop={8}>
            <LinearGradient colors={((gameState?.boost2xEndTime ?? 0) > Date.now() ? ['#22C55E', '#16A34A'] : ['#F59E0B', '#D97706']) as readonly [string, string]} style={s.activate2xGrad} pointerEvents="none">
              <Text style={s.activate2xText}>{(gameState?.boost2xEndTime ?? 0) > Date.now() ? '2x Active' : 'Bonus 2x'}</Text>
            </LinearGradient>
          </Pressable>
        )}
        {(gameState?.incomeMultiplier ?? 1) < 2 && (gameState?.boost2xEndTime ?? 0) <= Date.now() && (
          <Text style={s.activate2xSub}>not active</Text>
        )}
      </View>

      {/* Currency bar */}
      <View style={s.currencyBar}>
        <Pressable style={s.currencyItem} onPress={() => router.push('/tabs/shop')}>
          <CurrencyIcon type="money" size={14} />
          <Text style={s.currencyValue}>{formatMoney(gameState?.money ?? 0)}</Text>
        </Pressable>
        {stadiumIdx >= 1 && (
          <Pressable style={s.currencyItem} onPress={() => setFameTooltip(true)}>
            <CurrencyIcon type="fame" size={14} />
            <Text style={s.currencyValue}>{formatNumber(gameState?.fame ?? 0)}</Text>
          </Pressable>
        )}
        <Pressable style={s.currencyItem} onPress={() => router.push('/tabs/shop')}>
          <CurrencyIcon type="diamond" size={14} />
          <Text style={s.currencyValue}>{formatNumber(gameState?.crystals ?? 0)}</Text>
        </Pressable>
      </View>

      {/* Shortcut buttons row */}
      <View style={s.shortcutRow}>
        <View style={s.shortcutLeft}>
          {onManagerPress && (
            <Pressable style={s.shortcutBtn} onPress={onManagerPress}>
              <Image source={require('../../assets/manager-icon.png')} style={s.shortcutIcon} />
              {showManagerBadge && <View style={s.shortcutBadge} />}
            </Pressable>
          )}
          {onRatingsPress && (
            <Pressable style={s.shortcutBtn} onPress={onRatingsPress}>
              <Image source={require('../../assets/ratings-icon.png')} style={s.shortcutIcon} />
            </Pressable>
          )}
          {onDailyPress && (
            <Pressable style={s.shortcutBtn} onPress={onDailyPress}>
              <Image source={require('../../assets/images/daily_icon.png')} style={s.shortcutIcon} />
              {showDailyBadge && <View style={s.shortcutBadge} />}
            </Pressable>
          )}
          {onBattlePress && (
            <Pressable style={s.seasonBtn} onPress={onBattlePress}>
              <Image source={require('../../assets/images/season_icon.png')} style={s.seasonIcon} />
              {showBattleBadge && <View style={s.shortcutBadge} />}
            </Pressable>
          )}
        </View>
        <View style={s.shortcutRight}>
          {onLocationPress && (
            <Pressable style={s.locationBtn} onPress={onLocationPress}>
              <Text style={s.locationBtnText} numberOfLines={1}>{leagueName}</Text>
              {showLocationBadge && <View style={s.locationBadge} />}
            </Pressable>
          )}
        </View>
      </View>

      {/* League Table Card */}
      <Pressable style={s.tableCard} onPress={() => setExpanded(!expanded)}>
        {/* League header */}
        <View style={s.leagueHeader}>
          <Text style={s.leagueEmoji}>🏆</Text>
          <Text style={[s.leagueName, { color: divColor }]}>{leagueName}</Text>
          <Text style={s.matchCount}>MATCHES: {wins + draws + losses}/{league?.totalMatches ?? 9}</Text>
        </View>

        {/* Table header */}
        <View style={s.tableHeaderRow}>
          <Text style={[s.th, s.thPos]}>#</Text>
          <Text style={[s.th, s.thTeam]}>TEAM</Text>
          <Text style={[s.th, s.thStat]}>W</Text>
          <Text style={[s.th, s.thStat]}>D</Text>
          <Text style={[s.th, s.thStat]}>L</Text>
          <Text style={[s.th, s.thStat]}>GD</Text>
          <Text style={[s.th, s.thPts]}>PTS</Text>
        </View>

        {/* Table rows */}
        {visibleRows.map((row, i) => {
          const zoneBorder = getZoneBorder(row.pos);
          return (
            <View key={`${row.name}-${i}`} style={[s.tableRow, row.isUs && [s.tableRowUs, { backgroundColor: teamColor + '25' }]]}>
              <View style={s.posCell}>
                {zoneBorder ? (
                  <View style={[s.posBadge, { borderColor: zoneBorder }]}>
                    <Text style={[s.posBadgeText, row.isUs && s.tdUs]}>{row.pos}</Text>
                  </View>
                ) : (
                  <Text style={[s.td, s.tdPosPlain, row.isUs && s.tdUs]}>{row.pos}</Text>
                )}
              </View>
              <Text style={[s.td, s.tdTeam, row.isUs && s.tdUs]} numberOfLines={1}>{row.name}</Text>
              <Text style={[s.td, s.tdStat, row.isUs && s.tdUs]}>{row.w}</Text>
              <Text style={[s.td, s.tdStat, row.isUs && s.tdUs]}>{row.d}</Text>
              <Text style={[s.td, s.tdStat, row.isUs && s.tdUs]}>{row.l}</Text>
              <Text style={[s.td, s.tdStat, row.isUs && s.tdUs, row.gd > 0 && s.tdGdPos, row.gd < 0 && s.tdGdNeg]}>
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </Text>
              <Text style={[s.td, s.tdPts, row.isUs && s.tdUs]}>{row.pts}</Text>
            </View>
          );
        })}

        {/* Legend with expand chevron */}
        {(promoZone > 0 || relegZone > 0) ? (
          <View style={s.legend}>
            {promoZone > 0 && (
              <View style={s.legendItem}>
                <View style={[s.legendBox, { borderColor: PROMO_COLOR }]} />
                <Text style={s.legendText}>Promotion — {promoLeagueName}</Text>
              </View>
            )}
            {/* No relegation */}
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.4)" style={s.legendChevron} />
          </View>
        ) : (
          <View style={s.expandIndicator}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.4)" />
          </View>
        )}
      </Pressable>

      <Boost2xModal visible={boost2xVisible} onClose={() => setBoost2xVisible(false)} />

      {/* Fame info tooltip */}
      <Modal visible={fameTooltip} transparent animationType="fade" onRequestClose={() => setFameTooltip(false)} statusBarTranslucent>
        <Pressable style={s.fameOverlay} onPress={() => setFameTooltip(false)}>
          <View style={s.fameCard}>
            <CurrencyIcon type="fame" size={36} />
            <Text style={s.fameTitle}>Fame Tokens</Text>
            <Text style={s.fameDesc}>
              Earn fame tokens by participating in matches. Use them to upgrade your staff and make them more powerful!
            </Text>
            <Pressable style={s.fameCloseBtn} onPress={() => setFameTooltip(false)}>
              <Text style={s.fameCloseTxt}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 1,
    paddingHorizontal: Spacing.lg,
    ...(Platform.OS === 'android' ? { elevation: 4 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },

  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shortcutRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortcutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(71,85,105,0.5)',
    backgroundColor: 'rgba(30,41,59,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  seasonBtn: {
    width: 58,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonIcon: {
    width: 55,
    height: 30.6,
    resizeMode: 'cover',
    borderRadius: 5,
  },
  shortcutBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  locationBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 150,
  },
  locationBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  locationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },

  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  currencyBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1FCFF',
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
  },
  currencyIcon: { fontSize: 14 },
  currencyValue: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  incomeCenterLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  incomeCenterValue: { fontSize: 18, fontWeight: '900', color: Colors.green },
  activate2xBtn: {
    marginLeft: 4,
  },
  activate2xGrad: {
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activate2xText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  activate2xSub: {
    fontSize: 7,
    fontWeight: '600',
    color: '#F87171',
    marginLeft: 4,
  },

  // League table card
  tableCard: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  leagueEmoji: { fontSize: 18 },
  leagueName: { fontSize: 16, fontWeight: '900', flex: 1 },
  matchCount: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  incomeChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  incomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  incomeChipLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  incomeChipValue: { fontSize: 14, fontWeight: '900', color: Colors.green },
  valueCell: { flexDirection: 'row', alignItems: 'center' },

  // Table header
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 2,
    marginBottom: 1,
  },
  th: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  thPos: { width: 24 },
  thTeam: { flex: 1, textAlign: 'left', paddingLeft: 4 },
  thStat: { width: 22 },
  thPts: { width: 28 },

  // Table rows
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tableRowUs: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 4,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  td: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  tdUs: { color: '#FFF', fontWeight: '800' },

  // Position cell with zone badge
  posCell: { width: 24, alignItems: 'center', justifyContent: 'center' },
  posBadge: {
    width: 20,
    height: 18,
    borderWidth: 2,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posBadgeText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)' },
  tdPosPlain: { width: 24, fontWeight: '700' },

  tdTeam: { flex: 1, textAlign: 'left', paddingLeft: 4, fontWeight: '600' },
  tdStat: { width: 22 },
  tdPts: { width: 28, fontWeight: '800', color: 'rgba(255,255,255,0.8)' },
  tdGdPos: { color: Colors.green },
  tdGdNeg: { color: Colors.danger },

  expandIndicator: {
    alignItems: 'center',
    paddingTop: 2,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
    paddingTop: 3,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  legendChevron: {
    marginLeft: 'auto',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  /* Fame tooltip */
  fameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  fameCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%' },
  fameTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 8, marginBottom: 6 },
  fameDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  fameCloseBtn: { backgroundColor: '#F59E0B', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 32 },
  fameCloseTxt: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});