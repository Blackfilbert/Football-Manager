import React, { useMemo, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme';
import { useGame } from '../../src/context/GameContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LEAGUES } from '../../src/constants';

// ── Fake leaderboard data ──
const FAKE_NAMES = [
  'FalconPro', 'BlueWolf10', 'NeoKick', 'StrikerX_07', 'RisingLegend',
  'GoalMachine', 'VenomFC', 'ElitePlaymaker', 'ShadowStrike', 'IronDefense',
  'ThunderBolt', 'PhoenixFC', 'TitanKing', 'WolfPack99', 'BlazeMaster',
  'DarkHorse11', 'CyberGoal', 'AlphaStrike', 'MegaFC_Pro', 'SilverFang',
  'GoldenBoot', 'StormRider', 'DragonFC', 'NightHawk', 'DiamondXI',
  'RocketShot', 'ViperFC', 'TurboKick', 'IceBreaker', 'SteelWall',
  'CobraFC', 'FlashGoal', 'BeastMode', 'AceStriker', 'CrownFC',
  'JaguarPro', 'HammerFC', 'SparkPlug', 'ZeusFC', 'OmegaXI',
  'MatadorFC', 'NinjaGoal', 'PantherFC', 'SaberTooth', 'GladiatorXI',
  'CometFC', 'TridentPro', 'LionHeart', 'WarriorFC', 'SpectrumXI',
  'AtlasFC', 'NovaKick', 'PulsarFC', 'OnyxStrike', 'MaverickXI',
  'CenturionFC', 'InfernoFC', 'NebulaPro', 'TempestXI', 'VortexFC',
  'SentinelFC', 'MonarchXI', 'AvalancheFC', 'CycloneFC', 'ZenithPro',
  'OracleFC', 'GriffinXI', 'CatalystFC', 'MiragePro', 'ApexFC',
  'SpartanXI', 'VertexFC', 'HorizonPro', 'TactixFC', 'RogueXI',
  'ArmadaFC', 'EclipseXI', 'FortressFC', 'LegacyPro', 'SummitFC',
  'BarrierFC', 'CommandoXI', 'FusionFC', 'PinnacleXI', 'AssaultFC',
  'RebelXI', 'DominatorFC', 'StealthPro', 'PrestigeFc', 'ConquestXI',
  'MarshallFC', 'EnvoyPro', 'VanguardFC', 'SovereignXI', 'EmberFC',
  'ProdigyXI', 'RampageFC', 'TalonPro', 'HavocFC', 'ChampionXI',
];
const LOGO_ICONS: string[] = ['shield', 'football', 'star', 'trophy', 'flame', 'diamond', 'flash', 'rocket', 'planet', 'skull'];
const LOGO_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2'];

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface RankedPlayer { rank: number; name: string; power: number; iconName: string; iconColor: string; isPlayer: boolean; }
const TOTAL_GLOBAL_PLAYERS = 120_000;
const MAX_POWER = 3500;

function powerToRank(power: number): number {
  if (power >= MAX_POWER) return 1;
  const minP = 50;
  if (power <= minP) return TOTAL_GLOBAL_PLAYERS;
  const ratio = (power - minP) / (MAX_POWER - minP);
  return Math.max(1, Math.floor(TOTAL_GLOBAL_PLAYERS * (1 - Math.pow(ratio, 0.78))));
}

function generateLeaderboard(playerPower: number, playerName: string): RankedPlayer[] {
  const rand = seededRandom(42);
  const playerRank = powerToRank(playerPower);
  const entries: RankedPlayer[] = [];
  const topPowers = [MAX_POWER, MAX_POWER - 30, MAX_POWER - 80];
  for (let i = 0; i < 3; i++) {
    entries.push({ rank: i + 1, name: FAKE_NAMES[i], power: topPowers[i], iconName: LOGO_ICONS[Math.floor(rand() * LOGO_ICONS.length)], iconColor: LOGO_COLORS[Math.floor(rand() * LOGO_COLORS.length)], isPlayer: false });
  }
  if (playerRank >= 4 && playerRank <= 20) {
    entries.push({ rank: playerRank, name: playerName, power: playerPower, iconName: 'shield', iconColor: '#3B82F6', isPlayer: true });
  }
  for (let r = 4; r <= 20; r++) {
    if (r === playerRank) continue;
    const frac = r / TOTAL_GLOBAL_PLAYERS; const ratio = Math.pow(1 - frac, 1 / 0.78);
    const basePow = Math.floor(50 + ratio * (MAX_POWER - 50)); const jitter = Math.floor(rand() * 10 - 5);
    const nameIdx = ((r * 7 + 13) % FAKE_NAMES.length + FAKE_NAMES.length) % FAKE_NAMES.length;
    entries.push({ rank: r, name: FAKE_NAMES[nameIdx], power: Math.max(350, basePow + jitter), iconName: LOGO_ICONS[Math.floor(rand() * LOGO_ICONS.length)], iconColor: LOGO_COLORS[Math.floor(rand() * LOGO_COLORS.length)], isPlayer: false });
  }
  const windowSize = 25;
  for (let offset = -windowSize; offset <= windowSize; offset++) {
    const r = playerRank + offset;
    if (r < 1 || r > TOTAL_GLOBAL_PLAYERS || r <= 20) continue;
    if (offset === 0) {
      entries.push({ rank: playerRank, name: playerName, power: playerPower, iconName: 'shield', iconColor: '#3B82F6', isPlayer: true });
    } else {
      const frac = r / TOTAL_GLOBAL_PLAYERS; const ratio = Math.pow(1 - frac, 1 / 0.78);
      const basePow = Math.floor(50 + ratio * (MAX_POWER - 50)); const jitter = Math.floor(rand() * 10 - 5);
      const nameIdx = ((r * 7 + 13) % FAKE_NAMES.length + FAKE_NAMES.length) % FAKE_NAMES.length;
      entries.push({ rank: r, name: FAKE_NAMES[nameIdx], power: Math.max(350, basePow + jitter), iconName: LOGO_ICONS[Math.floor(rand() * LOGO_ICONS.length)], iconColor: LOGO_COLORS[Math.floor(rand() * LOGO_COLORS.length)], isPlayer: false });
    }
  }
  entries.sort((a, b) => a.rank - b.rank);
  return entries;
}

// ── Tab type ──
type Tab = 'ranking' | 'statistics';

export default function RatingsScreen() {
  const { teamPower, gameState } = useGame();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const playerName = gameState?.teamName || 'MY TEAM';
  const [activeTab, setActiveTab] = useState<Tab>('ranking');

  const leaderboard = useMemo(() => generateLeaderboard(teamPower, playerName), [teamPower, playerName]);
  const playerEntry = leaderboard.find(e => e.isPlayer);
  const playerRank = playerEntry?.rank ?? 0;
  const top3 = leaderboard.slice(0, 3);
  const listRef = useRef<FlatList>(null);

  const scrollToPlayer = useCallback(() => {
    const idx = leaderboard.findIndex(e => e.isPlayer);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollToIndex({ index: Math.max(0, idx - 3), animated: true });
    }
  }, [leaderboard]);

  // ── Statistics data ──
  const players = gameState?.players ?? [];
  const startingIds = new Set(gameState?.startingIds ?? []);
  const starters = players.filter(p => startingIds.has(p.id));
  const allSquad = starters.length > 0 ? starters : players;

  const topScorers = useMemo(() =>
    [...allSquad].filter(p => (p.goals ?? 0) > 0).sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)).slice(0, 10),
    [allSquad]
  );
  const topAssisters = useMemo(() =>
    [...allSquad].filter(p => (p.assists ?? 0) > 0).sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0)).slice(0, 10),
    [allSquad]
  );

  const maxLeague = gameState?.maxLeagueReached ?? gameState?.leagueIndex ?? 0;
  const bestPos = gameState?.bestLeaguePosition ?? 0;
  const leagueName = LEAGUES[maxLeague]?.name ?? 'League 3';
  const leagueEmoji = LEAGUES[maxLeague]?.emoji ?? '🥉';

  const totalGoals = useMemo(() => allSquad.reduce((s, p) => s + (p.goals ?? 0), 0), [allSquad]);
  const totalAssists = useMemo(() => allSquad.reduce((s, p) => s + (p.assists ?? 0), 0), [allSquad]);
  const matchWins = gameState?.matchWins ?? 0;
  const matchDraws = gameState?.matchDraws ?? 0;
  const matchLosses = gameState?.matchLosses ?? 0;
  const totalMatches = matchWins + matchDraws + matchLosses;
  const winRate = totalMatches > 0 ? Math.round((matchWins / totalMatches) * 100) : 0;

  // ── Render ranking row ──
  const renderItem = ({ item }: { item: RankedPlayer }) => (
    <View style={[s.row, item.isPlayer && s.rowPlayer]}>
      <Text style={[s.rankText, item.isPlayer && s.rankTextPlayer]}>{item.rank}</Text>
      <View style={[s.logoCircle, { backgroundColor: item.iconColor + '20', borderColor: item.iconColor }]}>
        <Ionicons name={item.iconName as any} size={16} color={item.iconColor} />
      </View>
      <View style={s.nameCol}>
        <Text style={[s.nameText, item.isPlayer && s.nameTextPlayer]} numberOfLines={1}>{item.name}</Text>
        {item.isPlayer && <View style={s.youBadge}><Text style={s.youBadgeText}>YOU</Text></View>}
      </View>
      <View style={s.powerCol}>
        <Ionicons name="flash" size={14} color={item.isPlayer ? '#FFF' : '#F59E0B'} />
        <Text style={[s.powerText, item.isPlayer && s.powerTextPlayer]}>{item.power}</Text>
      </View>
    </View>
  );

  const PODIUM_SIZES = [
    { trophy: 50, fontSize: 13, trophyColor: '#C0C0C0', label: '2' },
    { trophy: 60, fontSize: 14, trophyColor: '#FFD700', label: '1' },
    { trophy: 44, fontSize: 12, trophyColor: '#CD7F32', label: '3' },
  ];
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumConf = [PODIUM_SIZES[0], PODIUM_SIZES[1], PODIUM_SIZES[2]];

  // ── Stat card helper ──
  const StatCard = ({ icon, iconColor, label, value }: { icon: string; iconColor: string; label: string; value: string }) => (
    <View style={s.statCard}>
      <Ionicons name={icon as any} size={22} color={iconColor} />
      <Text style={s.statCardValue}>{value}</Text>
      <Text style={s.statCardLabel}>{label}</Text>
    </View>
  );

  // ── Player stat row ──
  const PlayerStatRow = ({ rank, name, pos, value, color }: { rank: number; name: string; pos: string; value: number; color: string }) => (
    <View style={s.playerStatRow}>
      <Text style={s.psRank}>{rank}</Text>
      <View style={[s.psPosCircle, { backgroundColor: color + '20' }]}>
        <Text style={[s.psPosText, { color }]}>{pos}</Text>
      </View>
      <Text style={s.psName} numberOfLines={1}>{name}</Text>
      <Text style={[s.psValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>{activeTab === 'ranking' ? 'WORLD RANKING' : 'STATISTICS'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab switcher */}
      <View style={s.tabBar}>
        <Pressable style={[s.tab, activeTab === 'ranking' && s.tabActive]} onPress={() => setActiveTab('ranking')}>
          <Ionicons name="trophy" size={16} color={activeTab === 'ranking' ? '#FFF' : Colors.textMuted} />
          <Text style={[s.tabText, activeTab === 'ranking' && s.tabTextActive]}>RANKING</Text>
        </Pressable>
        <Pressable style={[s.tab, activeTab === 'statistics' && s.tabActive]} onPress={() => setActiveTab('statistics')}>
          <Ionicons name="stats-chart" size={16} color={activeTab === 'statistics' ? '#FFF' : Colors.textMuted} />
          <Text style={[s.tabText, activeTab === 'statistics' && s.tabTextActive]}>STATISTICS</Text>
        </Pressable>
      </View>

      {activeTab === 'ranking' ? (
        /* ── RANKING TAB ── */
        <>
          {/* Your stats bar */}
          <View style={s.statsBar}>
            <View style={s.statItem}><Ionicons name="trophy" size={18} color="#F59E0B" /><Text style={s.statLabel}>YOUR RANK</Text><Text style={s.statValue}>{playerRank.toLocaleString()}</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="flash" size={18} color="#3B82F6" /><Text style={s.statLabel}>TEAM POWER</Text><Text style={s.statValue}>{teamPower.toLocaleString()}</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="football" size={18} color="#10B981" /><Text style={s.statLabel}>LEAGUE</Text><Text style={s.statValue}>{gameState?.leagueIndex !== undefined ? ['L3', 'L2', 'L1', 'PR', 'CH'][gameState.leagueIndex] ?? 'L3' : 'L3'}</Text></View>
          </View>

          {/* Top 3 Podium */}
          <View style={s.podiumContainer}>
            {podiumOrder.map((entry, i) => {
              if (!entry) return null;
              const conf = podiumConf[i];
              return (
                <View key={entry.rank} style={[s.podiumItem, i === 1 && s.podiumCenter]}>
                  <View style={[s.podiumRankCircle, { backgroundColor: conf.trophyColor }]}>
                    <Text style={s.podiumRankNum}>{conf.label}</Text>
                  </View>
                  <Ionicons name="trophy" size={conf.trophy} color={conf.trophyColor} />
                  <Text style={s.podiumName} numberOfLines={1}>{entry.name}</Text>
                  <View style={s.podiumPowerRow}><Ionicons name="flash" size={12} color="#F59E0B" /><Text style={s.podiumPower}>{entry.power}</Text></View>
                </View>
              );
            })}
          </View>

          {/* Table header */}
          <LinearGradient colors={['#3B82F6', '#2563EB'] as const} style={s.tableHeader}>
            <Text style={s.thRank}>RANK</Text><Text style={s.thPlayer}>PLAYER</Text><Text style={s.thPower}>POWER</Text>
          </LinearGradient>

          {/* Leaderboard list */}
          <FlatList ref={listRef} data={leaderboard} renderItem={renderItem} keyExtractor={item => item.rank.toString()} style={s.list} contentContainerStyle={{ paddingBottom: 120 }} initialNumToRender={20} getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })} onScrollToIndexFailed={() => {}} />

          {/* Bottom bar */}
          <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={s.bottomStats}>
              <View style={s.bottomStatItem}><Ionicons name="people" size={16} color="#3B82F6" /><View><Text style={s.bottomStatLabel}>PLAYERS</Text><Text style={s.bottomStatValueB}>120,000+</Text></View></View>
              <View style={s.bottomStatItem}><Ionicons name="globe" size={16} color="#3B82F6" /><View><Text style={s.bottomStatLabel}>SEASON</Text><Text style={s.bottomStatValueB}>Global</Text></View></View>
              <View style={s.bottomStatItem}><Ionicons name="radio" size={16} color="#3B82F6" /><View><Text style={s.bottomStatLabel}>UPDATED</Text><Text style={s.bottomStatValueB}>Live</Text></View></View>
            </View>
            <Pressable style={({ pressed }) => [s.findMeBtn, pressed && { opacity: 0.8 }]} onPress={scrollToPlayer}>
              <Ionicons name="locate" size={18} color="#FFF" /><Text style={s.findMeText}>FIND MY RANK</Text>
            </Pressable>
          </View>
        </>
      ) : (
        /* ── STATISTICS TAB ── */
        <ScrollView style={s.statsScroll} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Best league achievement */}
          <View style={s.achieveCard}>
            <LinearGradient colors={['#6366F1', '#8B5CF6'] as const} style={s.achieveGrad}>
              <Text style={s.achieveEmoji}>{leagueEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.achieveTitle}>Best League Reached</Text>
                <Text style={s.achieveValue}>{leagueName}</Text>
                {bestPos > 0 && bestPos < 99 && (
                  <Text style={s.achieveSub}>Best finish: {bestPos}{bestPos === 1 ? 'st' : bestPos === 2 ? 'nd' : bestPos === 3 ? 'rd' : 'th'} place</Text>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Overview cards */}
          <View style={s.statsGrid}>
            <StatCard icon="football" iconColor="#10B981" label="Total Goals" value={totalGoals.toString()} />
            <StatCard icon="hand-left" iconColor="#3B82F6" label="Total Assists" value={totalAssists.toString()} />
            <StatCard icon="trophy" iconColor="#F59E0B" label="Matches Won" value={matchWins.toString()} />
            <StatCard icon="trending-up" iconColor="#8B5CF6" label="Win Rate" value={`${winRate}%`} />
            <StatCard icon="swap-horizontal" iconColor="#06B6D4" label="Matches Drawn" value={matchDraws.toString()} />
            <StatCard icon="close-circle" iconColor="#EF4444" label="Matches Lost" value={matchLosses.toString()} />
          </View>

          {/* Top Scorers */}
          <View style={s.leaderSection}>
            <View style={s.leaderHeader}>
              <Ionicons name="football" size={18} color="#10B981" />
              <Text style={s.leaderTitle}>TOP SCORERS</Text>
            </View>
            {topScorers.length === 0 ? (
              <Text style={s.emptyText}>No goals scored yet</Text>
            ) : (
              topScorers.map((p, i) => (
                <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.position} value={p.goals ?? 0} color="#10B981" />
              ))
            )}
          </View>

          {/* Top Assisters */}
          <View style={s.leaderSection}>
            <View style={s.leaderHeader}>
              <Ionicons name="hand-left" size={18} color="#3B82F6" />
              <Text style={s.leaderTitle}>TOP ASSISTS</Text>
            </View>
            {topAssisters.length === 0 ? (
              <Text style={s.emptyText}>No assists recorded yet</Text>
            ) : (
              topAssisters.map((p, i) => (
                <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.position} value={p.assists ?? 0} color="#3B82F6" />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) as any },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 1 },

  // Tab bar
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.card, borderRadius: 12, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  tabTextActive: { color: '#FFF' },

  // Ranking tab
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) as any },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumCenter: { marginBottom: 8 },
  podiumRankCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  podiumRankNum: { fontSize: 12, fontWeight: '900', color: '#FFF' },
  podiumName: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginTop: 4, maxWidth: 90 },
  podiumPowerRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  podiumPower: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary },
  tableHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 2 },
  thRank: { width: 50, fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  thPlayer: { flex: 1, fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  thPower: { width: 70, fontSize: 11, fontWeight: '800', color: '#FFF', textAlign: 'right', letterSpacing: 0.5 },
  list: { flex: 1, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, height: 52 },
  rowPlayer: { backgroundColor: '#3B82F6', borderRadius: 10, borderBottomWidth: 0, marginVertical: 2 },
  rankText: { width: 46, fontSize: 12, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  rankTextPlayer: { color: '#FFF' },
  logoCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  nameCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  nameTextPlayer: { color: '#FFF' },
  youBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  youBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  powerCol: { width: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  powerText: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  powerTextPlayer: { color: '#FFF' },
  bottomBar: { backgroundColor: Colors.card, paddingTop: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Colors.border, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -3 } }, android: { elevation: 8 } }) as any },
  bottomStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  bottomStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottomStatLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  bottomStatValueB: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  findMeBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  findMeText: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },

  // Statistics tab
  statsScroll: { flex: 1, paddingHorizontal: 16 },
  achieveCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  achieveGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 16 },
  achieveEmoji: { fontSize: 40 },
  achieveTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  achieveValue: { fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 2 },
  achieveSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%' as any, backgroundColor: Colors.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 1 } }) as any },
  statCardValue: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  statCardLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.3 },

  leaderSection: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 1 } }) as any },
  leaderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  leaderTitle: { fontSize: 14, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 0.5 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  playerStatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  psRank: { width: 24, fontSize: 13, fontWeight: '800', color: Colors.textMuted, textAlign: 'center' },
  psPosCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  psPosText: { fontSize: 10, fontWeight: '800' },
  psName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  psValue: { fontSize: 16, fontWeight: '900', marginLeft: 8 },
});
