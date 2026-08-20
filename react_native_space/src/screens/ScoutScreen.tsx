import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Image, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { SCOUT_TRAINING, SCOUT_CHANCES, RARITY_CONFIG } from '../constants';
import { formatMoney, formatMoneyRaw, formatNumber, formatTime } from '../utils';
import { Rarity } from '../types';
import MiniScoreBar from '../components/MiniScoreBar';
import CurrencyIcon from '../components/CurrencyIcon';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const RARITIES_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon', 'ultimate'];

// Muted background colors for each rarity row
const ROW_BG: Record<Rarity, string> = {
  common: '#F1F5F9',
  rare: '#F0FDF4',
  epic: '#EFF6FF',
  legendary: '#FAF5FF',
  icon: '#FFF7ED',
  ultimate: '#FEF2F2',
};

export default function ScoutScreen() {
  const router = useRouter();
  const { gameState, startScoutTraining, speedUpScout, buyPremiumPack, addQuestProgress } = useGame();
  const isTutUpgrade = gameState?.tutorialStep === 'scout_upgrade';
  const isTutSkip = gameState?.tutorialStep === 'scout_skip';

  const handleBuyBonusPack = useCallback(async () => {
    const purchased = await requestPurchase(PRODUCT_IDS.bonus_pack);
    if (!purchased) return;
    buyPremiumPack('bonusPack');
    addQuestProgress('real_purchase_w', 1, true);
    Alert.alert('Purchased!', 'Bonus Pack activated! +100 💎 +$500,000');
  }, [buyPremiumPack, addQuestProgress]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const scoutLevel = gameState?.scoutLevel ?? 1;
  const isTraining = !!gameState?.scoutTrainingStart;
  const isMaxLevel = scoutLevel >= 10;

  const trainingConfig = SCOUT_TRAINING?.find(t => t?.fromLevel === scoutLevel);
  const trainingDurationMs = (trainingConfig?.durationHours ?? 1) * 3600000;
  const trainingElapsed = isTraining ? now - (gameState?.scoutTrainingStart ?? now) : 0;
  const trainingRemaining = Math.max(0, trainingDurationMs - trainingElapsed);
  const trainingProgress = isTraining ? Math.min(1, trainingElapsed / trainingDurationMs) : 0;

  const hoursLeft = trainingRemaining / 3600000;
  const speedUpCost = trainingConfig?.speedUpCrystals ?? Math.max(1, Math.ceil(hoursLeft * 50));
  const canSpeedUp = (gameState?.crystals ?? 0) >= speedUpCost;
  const canAffordTraining = !isMaxLevel && !isTraining && !!trainingConfig && (gameState?.money ?? 0) >= (trainingConfig?.cost ?? Infinity);

  const currentChances = SCOUT_CHANCES?.[scoutLevel] ?? SCOUT_CHANCES[1];
  const nextChances = !isMaxLevel ? SCOUT_CHANCES?.[scoutLevel + 1] : null;

  const fmt = (v: number) => {
    if (v === 0) return '—';
    if (v < 1) return v.toFixed(2) + '%';
    return v.toFixed(1) + '%';
  };

  return (
    <View style={s.container}>
      <MiniScoreBar />
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Scout  <Text style={s.headerLevel}>LV.{scoutLevel}</Text></Text>
        <View style={s.balanceRow}>
          <Pressable style={s.balancePill} onPress={() => router.push('/tabs/shop')}><CurrencyIcon type="money" size={16} /><Text style={s.balanceText}>{formatMoneyRaw(gameState?.money ?? 0)}</Text></Pressable>
          <Pressable style={s.balancePill} onPress={() => router.push('/tabs/shop')}><CurrencyIcon type="diamond" size={16} /><Text style={s.balanceText}>{formatNumber(gameState?.crystals ?? 0)}</Text></Pressable>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Probability Table */}
        <View style={s.tableCard}>
          <Text style={s.tableTitle}>Scout Probabilities</Text>

          {/* Table Header */}
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, s.cellRarity]}>Tier</Text>
            <View style={[s.cellPercent, s.currentColHeader]}>
              <Text style={[s.tableHeaderCell, s.currentColHeaderText]}>Level {scoutLevel}</Text>
            </View>
            {!isMaxLevel && (
              <Text style={[s.tableHeaderCell, s.cellPercent, s.nextColText]}>Level {scoutLevel + 1}</Text>
            )}
          </View>

          {/* Rarity Rows */}
          {RARITIES_ORDER.map((r) => {
            const cfg = RARITY_CONFIG?.[r];
            const current = currentChances?.[r] ?? 0;
            const next = nextChances?.[r] ?? 0;
            const improved = !isMaxLevel && next > current;

            return (
              <View key={r} style={[s.tableRow, { backgroundColor: ROW_BG[r] }]}>
                {/* Rarity name with color indicator */}
                <View style={[s.cellRarity, s.rarityCell]}>
                  <View style={[s.colorBar, { backgroundColor: cfg?.color ?? '#94A3B8' }]} />
                  <Text style={[s.rarityLabel, { color: cfg?.color ?? '#94A3B8' }]}>
                    {cfg?.label ?? r}
                  </Text>
                </View>

                {/* Current level % — highlighted */}
                <View style={[s.cellPercent, s.currentColCell]}>
                  <Text style={[s.percentText, s.currentColValue]}>
                    {fmt(current)}
                  </Text>
                </View>

                {/* Next level % */}
                {!isMaxLevel && (
                  <Text style={[s.cellPercent, s.percentText, s.nextColText]}>
                    {fmt(next)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Training progress (only when training) */}
        {isTraining && (
          <View style={s.progressCard}>
            <Text style={s.trainingLabel}>
              Training to Level {gameState?.scoutTrainingTarget ?? scoutLevel + 1}
            </Text>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${Math.round(trainingProgress * 100)}%` }]} />
            </View>
            <Text style={s.timeLeft}>
              {formatTime(Math.floor(trainingRemaining / 1000))} remaining
            </Text>
          </View>
        )}

        {/* Action Button */}
        {isMaxLevel ? (
          <View style={s.maxCard}>
            <Text style={s.maxEmoji}>🎉</Text>
            <Text style={s.maxText}>Max Scout Level Reached!</Text>
          </View>
        ) : isTraining ? (
          <Pressable
            style={[s.actionBtn, s.speedUpBtn, !canSpeedUp && !isTutSkip && s.disabledBtn]}
            onPress={speedUpScout}
            disabled={!canSpeedUp && !isTutSkip}
          >
            <Text style={s.actionBtnText}>⚡ Speed Up</Text>
            {isTutSkip ? (
              <Text style={s.actionBtnSub}>FREE ✨</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><CurrencyIcon type="diamond" size={32} /><Text style={[s.actionBtnSub, !canSpeedUp && s.disabledCostText]}>{speedUpCost}</Text></View>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[s.actionBtn, s.upgradeBtn, !canAffordTraining && !isTutUpgrade && s.disabledBtn]}
            onPress={startScoutTraining}
            disabled={!canAffordTraining && !isTutUpgrade}
          >
            <Text style={s.actionBtnSmall}>
              Upgrade to Level {trainingConfig?.toLevel ?? scoutLevel + 1}
            </Text>
            {isTutUpgrade ? (
              <Text style={s.actionBtnCost}>FREE ✨</Text>
            ) : (
              <View style={s.costRow}>
                <CurrencyIcon type="money" size={32} />
                <Text style={[s.actionBtnCost, !canAffordTraining && s.disabledCostText]}>{formatMoneyRaw(trainingConfig?.cost ?? 0)}</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* ── BONUS PACK ── */}
        {!gameState?.bonusPack && scoutLevel >= 3 && (
          <View style={{ marginTop: 50 }}>
            <View style={s.bonusBanner}>
              <Image source={require('../../assets/images/bonus_pack.png')} style={s.bonusImage} resizeMode="stretch" />
              <View style={s.bonusOverlay}>
                <Pressable onPress={handleBuyBonusPack}>
                  <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.bonusBuyBtn}>
                    <Text style={s.bonusBuyText}>BUY NOW</Text>
                    <View style={s.bonusPriceBadge}><Text style={s.bonusPriceText}>$9.99</Text></View>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 44 : 28 },
  header: {
    backgroundColor: Colors.card,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...(Platform.OS === 'android' ? { elevation: 4 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.dark },
  headerLevel: { fontSize: 14, fontWeight: '700', color: Colors.primary, backgroundColor: 'rgba(59,130,246,0.12)', paddingHorizontal: 6, borderRadius: 4, overflow: 'hidden' },
  balanceRow: { flexDirection: 'row', gap: 8 },
  balancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1FCFF', borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  balanceText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },

  // Probability Table
  tableCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...cardShadow,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  cellRarity: { flex: 1.4 },
  cellPercent: { flex: 1, textAlign: 'center' },
  rarityCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorBar: { width: 4, height: 22, borderRadius: 2 },
  rarityLabel: { fontSize: 14, fontWeight: '700' },
  percentText: { fontSize: 14, fontWeight: '600', color: Colors.dark, textAlign: 'center' },


  // Current level column highlight
  currentColHeader: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentColHeaderText: {
    color: Colors.dark,
    fontWeight: '800',
  },
  currentColCell: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  currentColValue: {
    color: Colors.dark,
    fontWeight: '800',
  },
  nextColText: {
    opacity: 0.4,
  },

  // Training Progress
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...cardShadow,
  },
  trainingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 6,
    textAlign: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  timeLeft: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // Action Buttons
  actionBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...cardShadow,
  },
  upgradeBtn: {
    backgroundColor: Colors.primary,
  },
  speedUpBtn: {
    backgroundColor: '#16A34A',
  },
  disabledBtn: { opacity: 0.85 },
  disabledCostText: { color: '#FF4444' },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  costIcon: { fontSize: 16 },
  actionBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  actionBtnSmall: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  actionBtnSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 0.5 }, textShadowRadius: 1.5 },
  actionBtnCost: { fontSize: 18, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 0.5 }, textShadowRadius: 1.5 },

  // Max Level
  maxCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...cardShadow,
  },
  maxEmoji: { fontSize: 36, marginBottom: 8 },
  maxText: { fontSize: 16, fontWeight: '800', color: Colors.warning },

  // Bonus Pack (matches shop premiumOverlay style)
  bonusBanner: { borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  bonusImage: { width: '100%', height: (Dimensions.get('window').width - 32) / (717 / 239) },
  bonusOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 11 },
  bonusBuyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingVertical: 5.25, paddingHorizontal: 9, gap: 4.5 },
  bonusBuyText: { fontSize: 7.5, fontWeight: '900', color: '#FFF' },
  bonusPriceBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, paddingHorizontal: 5.25, paddingVertical: 1.5 },
  bonusPriceText: { fontSize: 7.5, fontWeight: '900', color: '#FFF' },
});