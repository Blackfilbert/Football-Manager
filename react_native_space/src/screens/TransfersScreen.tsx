import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '../context/GameContext';
import PlayerCard from '../components/PlayerCard';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { RARITY_CONFIG, LEAGUES, MARKET_REFRESH_INTERVAL, SCOUT_CHANCES } from '../constants';
import { formatMoney, formatMoneyRaw, formatNumber, generatePackPlayer } from '../utils';
import { Rarity, Player } from '../types';
import MiniScoreBar from '../components/MiniScoreBar';
import CurrencyIcon from '../components/CurrencyIcon';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';
import { trackEvent, trackRevenue } from '../services/analytics';

export default function TransfersScreen() {
  const router = useRouter();
  const { gameState, buyPlayer, markMarketNotifSeen, forceRefreshMarket, addChestPlayers, addQuestProgress } = useGame();
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');

  const marketLocked = !(gameState?.marketUnlocked ?? false);

  useEffect(() => {
    if (!marketLocked && gameState?.marketUnlocked && !gameState?.marketNotifSeen) {
      markMarketNotifSeen();
    }
  }, [marketLocked, gameState?.marketUnlocked, gameState?.marketNotifSeen, markMarketNotifSeen]);

  const leagueIdx = gameState?.leagueIndex ?? 0;
  const scoutLvl = gameState?.scoutLevel ?? 1;
  const scoutChances = SCOUT_CHANCES?.[scoutLvl] ?? SCOUT_CHANCES[1];
  const availableRarities = (['common', 'rare', 'epic', 'legendary', 'icon', 'ultimate'] as Rarity[]).filter(r => (scoutChances?.[r] ?? 0) > 0);

  // Generate one Ultimate offer player — regenerates each market refresh
  const ULTIMATE_OFFER_ID = '__ultimate_offer__';
  const ultimateOfferPlayer = useMemo(() => {
    const p = generatePackPlayer('ST', 100 + Math.floor(Math.random() * 200));
    return { ...p, id: ULTIMATE_OFFER_ID };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.transferMarketRefreshTime]);

  const [ultimateBought, setUltimateBought] = useState(false);

  // Reset bought flag when market refreshes
  const prevRefreshRef = useRef(gameState?.transferMarketRefreshTime);
  useEffect(() => {
    if (gameState?.transferMarketRefreshTime !== prevRefreshRef.current) {
      prevRefreshRef.current = gameState?.transferMarketRefreshTime;
      setUltimateBought(false);
    }
  }, [gameState?.transferMarketRefreshTime]);

  // Cycle ultimate offer visibility: 5 min on, 5 min off
  const [ultimateVisible, setUltimateVisible] = useState(() => {
    const cycle = Math.floor(Date.now() / (5 * 60 * 1000));
    return cycle % 2 === 0;
  });
  useEffect(() => {
    const check = () => {
      const cycle = Math.floor(Date.now() / (5 * 60 * 1000));
      setUltimateVisible(cycle % 2 === 0);
    };
    const iv = setInterval(check, 10_000); // check every 10s
    return () => clearInterval(iv);
  }, []);

  const handleBuyUltimate = useCallback(async () => {
    const purchased = await requestPurchase(PRODUCT_IDS.ultimate_player);
    if (!purchased) return;
    addChestPlayers([{ ...ultimateOfferPlayer, id: ultimateOfferPlayer.id + '_' + Date.now() }]);
    addQuestProgress('real_purchase_w', 1, true);
    trackEvent('purchases', { ultimate_player: '1' });
    trackRevenue(19.99, 'USD', 'ultimate_player');
    setUltimateBought(true);
    Alert.alert('Purchased!', `${ultimateOfferPlayer.firstName} ${ultimateOfferPlayer.lastName} joined your team!`);
  }, [ultimateOfferPlayer, addChestPlayers, addQuestProgress]);

  const filteredMarket = useMemo(() => {
    const market = gameState?.transferMarket ?? [];
    const filtered = rarityFilter === 'all' ? market : market.filter(p => p?.rarity === rarityFilter);
    // Append ultimate offer at the end (only if not bought, visible cycle, and filter allows)
    if (!ultimateBought && ultimateVisible && scoutLvl >= 3 && (rarityFilter === 'all' || rarityFilter === 'ultimate')) {
      return [...filtered, ultimateOfferPlayer];
    }
    return filtered;
  }, [gameState?.transferMarket, rarityFilter, ultimateOfferPlayer, ultimateBought, ultimateVisible, scoutLvl]);

  const refreshTime = gameState?.transferMarketRefreshTime ?? 0;
  const elapsed = Date.now() - refreshTime;
  const remaining = Math.max(0, Math.floor((MARKET_REFRESH_INTERVAL - elapsed) / 1000));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const canForceRefresh = (gameState?.crystals ?? 0) >= 10;

  const renderMarketPlayer = ({ item }: { item: Player }) => {
    const isUltimateOffer = item?.id === ULTIMATE_OFFER_ID;
    if (isUltimateOffer) {
      return (
        <PlayerCard
          player={item}
          actionLabel="Buy $19.99"
          actionColor="#16A34A"
          actionDisabled={false}
          onAction={handleBuyUltimate}
        />
      );
    }
    const cantAfford = (gameState?.money ?? 0) < (item?.cost ?? Infinity);
    return (
      <PlayerCard
        player={item}
        actionIcon={<CurrencyIcon type="money" size={16} />}
        actionLabel={formatMoney(item?.cost ?? 0)}
        actionColor={Colors.primary}
        actionDisabled={cantAfford}
        onAction={() => buyPlayer(item?.id ?? '')}
      />
    );
  };

  return (
    <View style={s.container}>
      <MiniScoreBar />
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Transfer Market</Text>
          <View style={s.balanceRow}>
            <Pressable style={s.balancePill} onPress={() => router.push('/tabs/shop')}><CurrencyIcon type="money" size={16} /><Text style={s.balanceText}>{formatMoneyRaw(gameState?.money ?? 0)}</Text></Pressable>
            <Pressable style={s.balancePill} onPress={() => router.push('/tabs/shop')}><CurrencyIcon type="diamond" size={16} /><Text style={s.balanceText}>{formatNumber(gameState?.crystals ?? 0)}</Text></Pressable>
          </View>
        </View>

        {!marketLocked && (
          <>
            <View style={s.refreshRow}>
              <Text style={s.refreshText}>
                Refreshes in {mins}:{secs.toString().padStart(2, '0')}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  s.resetBtn,
                  canForceRefresh ? {} : s.resetBtnDisabled,
                  pressed && canForceRefresh && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => { if (canForceRefresh) forceRefreshMarket(); }}
                disabled={!canForceRefresh}
              >
                <Ionicons name="refresh" size={13} color={canForceRefresh ? '#8B5CF6' : '#555'} style={{ marginRight: 4 }} />
                <Text style={[s.resetBtnText, !canForceRefresh && s.resetBtnTextDisabled]}>10</Text>
                <CurrencyIcon type="diamond" size={13} />
              </Pressable>
            </View>
            <View style={s.filterRow}>
              <Pressable
                style={[s.filterPill, rarityFilter === 'all' && s.activePill]}
                onPress={() => setRarityFilter('all')}
              >
                <Text style={[s.filterPillText, rarityFilter === 'all' && s.activePillText]}>All</Text>
              </Pressable>
              {availableRarities?.map(r => (
                <Pressable
                  key={r}
                  style={[
                    s.filterPill,
                    rarityFilter === r && { backgroundColor: (RARITY_CONFIG?.[r]?.color ?? '#94A3B8') + '20', borderColor: RARITY_CONFIG?.[r]?.color ?? '#94A3B8' },
                  ]}
                  onPress={() => setRarityFilter(r)}
                >
                  <Text
                    style={[
                      s.filterPillText,
                      rarityFilter === r && { color: RARITY_CONFIG?.[r]?.color ?? '#94A3B8' },
                    ]}
                  >
                    {RARITY_CONFIG?.[r]?.label ?? r}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      {marketLocked ? (
        <View style={s.lockedCenter}>
          <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
          <Text style={s.lockedTitle}>CLOSED</Text>
          <Text style={s.lockedSubtext}>Market opens at <Text style={s.lockedHighlight}>$1,000</Text></Text>
          <Text style={s.lockedBalance}>Current: {formatMoney(gameState?.money ?? 0)}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMarket ?? []}
          keyExtractor={item => item?.id ?? ''}
          renderItem={renderMarketPlayer}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>No players available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 44 : 28 },

  header: {
    backgroundColor: Colors.card,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    ...(Platform.OS === 'android' ? { elevation: 4 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  balanceRow: { flexDirection: 'row', gap: 8 },
  balancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1FCFF', borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  balanceText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  lockedCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.dark,
    marginTop: 16,
    letterSpacing: 2,
  },
  lockedSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  lockedHighlight: {
    color: Colors.green,
    fontWeight: '800',
  },
  lockedBalance: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 12,
    fontWeight: '600',
  },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: Spacing.sm },
  refreshText: { fontSize: 12, color: Colors.textMuted },
  resetBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'transparent' },
  resetBtnDisabled: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent' },
  resetBtnText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },
  resetBtnTextDisabled: { color: '#555' },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePill: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  filterPillText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  activePillText: { color: Colors.primary },
  listContent: { padding: Spacing.lg },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  emptySubtext: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
});
