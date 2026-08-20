import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Platform, Pressable, Image, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../../src/context/GameContext';
import Header from '../../src/components/Header';
import LiveMatch from '../../src/components/LiveMatch';
import UpgradeCard from '../../src/components/UpgradeCard';
import SpecialBuildings from '../../src/components/SpecialBuildings';
import OfflineEarningsModal from '../../src/components/OfflineEarningsModal';
import SeasonCompleteModal from '../../src/components/SeasonCompleteModal';
import LeaguePackOfferModal from '../../src/components/LeaguePackOfferModal';
import { UPGRADES, LEAGUES, ILLNESS_TYPES } from '../../src/constants';
import { Colors, Spacing } from '../../src/theme';
import { generatePackPlayer, getUpgradeCost } from '../../src/utils';
import DailyRewardsModal from '../../src/components/DailyRewardsModal';
import SeasonPassModal from '../../src/components/SeasonPassModal';
import LocationsModal, { STADIUM_REWARDS } from '../../src/components/LocationsModal';
import StadiumRewardModal from '../../src/components/StadiumRewardModal';
import RateUsModal from '../../src/components/RateUsModal';
import { trackEvent, trackRevenue } from '../../src/services/analytics';
import TutorialOverlay from '../../src/components/TutorialOverlay';

import { requestPurchase } from '../../src/services/iap';

const IMG_MONEY = require('../../assets/images/currency_money.png');

type HomeSubTab = 'match' | 'workspace';
const HOME_SUB_TABS: { key: HomeSubTab; label: string; icon: string }[] = [
  { key: 'match', label: 'Match', icon: 'football-outline' },
  { key: 'workspace', label: 'Workspace', icon: 'business-outline' },
];

const canUseNative = Platform.OS !== 'web';

export default function HomeScreen() {
  const router = useRouter();
  const { gameState, isLoaded, offlineEarnings, offlineSeconds, dismissOfflineEarnings, lastUpgradeEvent, seasonCompleteInfo, dismissSeasonComplete, confirmPromotion, triggerPromotionConfirmation, markRateUsShown, cheatAddMoney, cheatAddCrystals, addChestPlayers, markLeaguePackPurchased, claimDailyReward, addQuestProgress, setTutorialStep, activateStaffOffers, claimStaffBoxOffer, claimEpicStaffOffer, dismissStaffBoxOffer, dismissEpicStaffOffer, dismissSickPopup } = useGame();
  // Legacy migration: activate any old pending flags on focus
  useFocusEffect(useCallback(() => { activateStaffOffers(); }, [activateStaffOffers]));
  const goToManager = useCallback(() => router.push('/tabs/settings'), [router]);
  const goToRatings = useCallback(() => router.push('/tabs/ratings'), [router]);
  const [showDaily, setShowDaily] = useState(false);
  const [showBattlePass, setShowBattlePass] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [stadiumRewardIdx, setStadiumRewardIdx] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'match' | 'workspace'>('match');
  const params = useLocalSearchParams<{ assignBuilding?: string }>();
  const [assignBuildingId, setAssignBuildingId] = useState<string | null>(null);

  // Auto-switch to workspace when assignBuilding param is passed (from staff tutorial)
  useFocusEffect(useCallback(() => {
    if (params.assignBuilding) {
      setSubTab('workspace');
      setAssignBuildingId(params.assignBuilding);
    }
  }, [params.assignBuilding]));

  // Badge: can upgrade any building in workspace (income only)?
  const canUpgradeAnyBuilding = useMemo(() => {
    const money = gameState?.money ?? 0;
    const upgrades = gameState?.upgrades ?? {};
    return UPGRADES.filter(u => u.type === 'income').some(u => {
      const lvl = upgrades[u.id] ?? 0;
      return lvl < u.maxLevel && money >= getUpgradeCost(u.id, lvl);
    });
  }, [gameState?.money, gameState?.upgrades]);

  const today = new Date().toISOString().split('T')[0] ?? '';
  const dailyDay = gameState?.dailyDay ?? 1;
  const dailyClaimedDates = gameState?.dailyClaimedDates ?? [];
  const canClaimDaily = !dailyClaimedDates.includes(today);

  // Battle badge: check if any SP quest is completed but unclaimed
  const spDailyTargets: Record<string, number> = { play_match: 15, finish_season: 1, spend_crystals: 50, score_goal: 100, win_match: 5 };
  const spWeeklyTargets: Record<string, number> = { play_match_w: 100, spend_crystals_w: 250, score_goal_w: 750, win_match_w: 60 };
  const spDailyProgress = gameState?.questDailyProgress ?? {};
  const spDailyClaimed = gameState?.questDailyClaimed ?? [];
  const spWeeklyProgress = gameState?.questWeeklyProgress ?? {};
  const spWeeklyClaimed = gameState?.questWeeklyClaimed ?? [];
  // Check unclaimed tier rewards (free column always available)
  const SP_XP_PER_LEVEL = 30;
  const spLevel = Math.floor((gameState?.spXp ?? 0) / SP_XP_PER_LEVEL) + 1;
  const spFreeCl = gameState?.spFreeClaimed ?? [];
  const hasUnclaimedSpReward = Array.from({ length: 25 }, (_, i) => i).some(i => i < spLevel && !spFreeCl.includes(i));

  const hasBattleBadge = hasUnclaimedSpReward
    || Object.entries(spDailyTargets).some(([id, t]) => !spDailyClaimed.includes(id) && (spDailyProgress[id] ?? 0) >= t)
    || Object.entries(spWeeklyTargets).some(([id, t]) => !spWeeklyClaimed.includes(id) && (spWeeklyProgress[id] ?? 0) >= t);
  const claimedDaysCount = dailyDay - 1 < 0 ? 0 : dailyDay - 1; // days already claimed in current cycle

  const handleClaimDaily = useCallback(() => {
    claimDailyReward();
  }, [claimDailyReward]);
  const rateChecked = useRef(false);
  const [showRateUs, setShowRateUs] = useState(false);
  const [leagueOffer, setLeagueOffer] = useState<'league2' | 'league1' | 'premier' | 'champions' | null>(null);

  const purchased = gameState?.purchasedLeaguePacks ?? [];

  const handleSeasonDismiss = useCallback(() => {
    const info = seasonCompleteInfo;
    dismissSeasonComplete();
    const packMap: Record<number, 'league2' | 'league1' | 'premier' | 'champions'> = { 0: 'league2', 1: 'league1', 2: 'premier', 3: 'champions' };
    const pack = packMap[info?.leagueIndex ?? -1];
    if (pack && !purchased.includes(pack)) {
      trackEvent('purchases', { offer_shown: '1' });
      setTimeout(() => setLeagueOffer(pack), 300);
    }
  }, [seasonCompleteInfo, dismissSeasonComplete, purchased]);

  // Wrap confirmPromotion to show stadium reward popup
  const handleConfirmPromotion = useCallback(() => {
    const currentIdx = gameState?.leagueIndex ?? 0;
    const newIdx = currentIdx + 1;
    const isFirstTime = newIdx > (gameState?.maxLeagueReached ?? 0);
    confirmPromotion();
    // Show reward popup if first time and reward exists
    if (isFirstTime && STADIUM_REWARDS[newIdx]) {
      setTimeout(() => setStadiumRewardIdx(newIdx), 400);
    }
  }, [gameState?.leagueIndex, gameState?.maxLeagueReached, confirmPromotion]);

  const OFFER_PRICES: Record<string, string> = { league2: '$4.99', league1: '$11.99', premier: '$19.99', champions: '$24.99' };

  const handleOfferBuy = useCallback(async () => {
    if (!leagueOffer) return;
    // Real IAP purchase
    const purchased = await requestPurchase(`league_pack_${leagueOffer}`);
    if (!purchased) return;

    const packData: Record<string, { crystals: number; money: number; pos: string; ovr: number }> = {
      league2: { crystals: 50, money: 100_000, pos: 'CM', ovr: 79 },
      league1: { crystals: 100, money: 500_000, pos: 'ST', ovr: 99 },
      premier: { crystals: 200, money: 1_000_000, pos: 'CD', ovr: 150 },
      champions: { crystals: 500, money: 5_000_000, pos: 'RM', ovr: 300 },
    };
    const d = packData[leagueOffer];
    if (d) {
      cheatAddCrystals(d.crystals);
      cheatAddMoney(d.money);
      addChestPlayers([generatePackPlayer(d.pos as any, d.ovr)]);
    }
    markLeaguePackPurchased(leagueOffer);
    trackEvent('purchases', { [`league_pack_${leagueOffer}`]: '1' });
    addQuestProgress('real_purchase_w', 1, true);
    const offerPriceNum = parseFloat((OFFER_PRICES[leagueOffer] ?? '$0').replace('$', ''));
    if (offerPriceNum > 0) trackRevenue(offerPriceNum, 'USD', `league_pack_${leagueOffer}`);
    setLeagueOffer(null);
  }, [leagueOffer, cheatAddCrystals, cheatAddMoney, addChestPlayers, markLeaguePackPurchased, addQuestProgress]);

  // Rate Us — show custom modal once on day 2+
  useEffect(() => {
    if (!isLoaded || !gameState || rateChecked.current) return;
    rateChecked.current = true;
    const firstOpen = gameState.firstOpenDate;
    if (!firstOpen) return;
    if (gameState.rateUsShown) return;
    const today = new Date().toISOString().split('T')[0] ?? '';
    const diffMs = new Date(today).getTime() - new Date(firstOpen).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 1) {
      // Delay so it doesn't conflict with offline earnings modal
      setTimeout(() => setShowRateUs(true), 3500);
    }
  }, [isLoaded, gameState]);

  // Upgrade toast state — fixed center of screen
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastScale = useRef(new Animated.Value(0.8)).current;
  const [upgradeToast, setUpgradeToast] = useState<{ type: string; total: string; diff: string } | null>(null);

  useEffect(() => {
    if (!lastUpgradeEvent) return;
    const totalStr = lastUpgradeEvent.type === 'power'
      ? `${lastUpgradeEvent.total}`
      : `$${lastUpgradeEvent.total}/s`;
    const diffStr = lastUpgradeEvent.type === 'power'
      ? `+${lastUpgradeEvent.diff}`
      : `+$${lastUpgradeEvent.diff}/s`;
    setUpgradeToast({ type: lastUpgradeEvent.type, total: totalStr, diff: diffStr });
    toastOpacity.setValue(0);
    toastScale.setValue(0.8);
    Animated.parallel([
      Animated.spring(toastScale, { toValue: 1, useNativeDriver: canUseNative, speed: 20, bounciness: 8 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: canUseNative }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: canUseNative }).start(() => {
          setUpgradeToast(null);
        });
      }, 1200);
    });
  }, [lastUpgradeEvent?.timestamp]);

  if (!isLoaded) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingText}>⚽ Loading...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Header onManagerPress={goToManager} onRatingsPress={goToRatings} onDailyPress={() => setShowDaily(true)} showDailyBadge={canClaimDaily} onBattlePress={() => setShowBattlePass(true)} showBattleBadge={hasBattleBadge} onLocationPress={() => setShowLocations(true)} showLocationBadge={!!(gameState?.pendingPromotion)} />

      {/* Content area */}
      {subTab === 'match' ? (
        <ScrollView
          style={s.scrollArea}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LiveMatch />

          {/* Power Upgrades */}
          <View style={s.upgradesSection}>
            <Text style={s.sectionTitle}>⚡ POWER UPGRADES</Text>
            <View style={s.upgradeGrid}>
              {UPGRADES?.filter(u => u?.type === 'power')?.map(u => (
                <View key={u?.id ?? ''} style={s.upgradeItem}>
                  <UpgradeCard config={u} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scrollArea}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Compact income multiplier banner */}
          <View style={s.multBanner}>
            <Image source={IMG_MONEY} style={s.multBannerIcon} />
            <Text style={s.multBannerText}>Income ×{LEAGUES[gameState?.leagueIndex ?? 0]?.multiplier ?? 1}</Text>
            <Text style={s.multBannerHint}> · base ${5 * (LEAGUES[gameState?.leagueIndex ?? 0]?.multiplier ?? 1)}/s</Text>
          </View>

          {/* Income Upgrades — vertical list */}
          <View style={s.upgradesSection}>
            <Text style={s.sectionTitle}>💰 INCOME BUILDINGS</Text>
            {UPGRADES?.filter(u => u?.type === 'income')?.map(u => (
              <UpgradeCard key={u?.id ?? ''} config={u} listMode autoAssign={assignBuildingId === u?.id} onAutoAssignDone={() => setAssignBuildingId(null)} />
            ))}
          </View>

          {/* Special Buildings (unlocked after stadium 2) */}
          {(gameState?.leagueIndex ?? 0) >= 1 && (
            <View style={s.upgradesSection}>
              <SpecialBuildings />
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom sub-tab bar (same style as Team hub) */}
      <View style={s.subTabBar}>
        {HOME_SUB_TABS.map(tab => {
          const isActive = subTab === tab.key;
          return (
            <Pressable key={tab.key} style={[s.subTab, isActive && s.subTabActive]} onPress={() => setSubTab(tab.key)}>
              <Ionicons name={tab.icon as any} size={18} color={isActive ? Colors.primary : Colors.textMuted} />
              <Text style={[s.subTabLabel, isActive && s.subTabLabelActive]}>{tab.label}</Text>
              {tab.key === 'workspace' && canUpgradeAnyBuilding && !isActive && <View style={s.subTabDot} />}
            </Pressable>
          );
        })}
      </View>

      {/* Upgrade toast — fixed center overlay */}
      {upgradeToast && (
        <Animated.View style={[s.upgradeToast, { opacity: toastOpacity, transform: [{ scale: toastScale }] }]} pointerEvents="none">
          <Text style={s.toastIcon}>{upgradeToast.type === 'power' ? '⚡' : '💰'}</Text>
          <Text style={s.toastLabel}>{upgradeToast.type === 'power' ? 'Power ' : 'Income '}</Text>
          <Text style={s.toastTotal}>{upgradeToast.total}</Text>
          <Text style={s.toastDiff}> ▲{upgradeToast.diff}</Text>
        </Animated.View>
      )}

      {/* Modals */}
      <OfflineEarningsModal
        visible={offlineEarnings > 0}
        earnings={offlineEarnings}
        seconds={offlineSeconds}
        idleMultiplier={gameState?.idleMultiplier ?? 1}
        onDismiss={() => {
          dismissOfflineEarnings();
          // Show highest available league pack offer after collecting offline earnings
          const packs: Array<{ id: 'league2' | 'league1' | 'premier' | 'champions'; minLeague: number }> = [
            { id: 'champions', minLeague: 3 },
            { id: 'premier', minLeague: 2 },
            { id: 'league1', minLeague: 1 },
            { id: 'league2', minLeague: 0 },
          ];
          const li = gameState?.leagueIndex ?? 0;
          const bought = gameState?.purchasedLeaguePacks ?? [];
          const best = packs.find(p => li >= p.minLeague && !bought.includes(p.id));
          if (best) {
            trackEvent('purchases', { offer_shown: '1' });
            setTimeout(() => setLeagueOffer(best.id), 300);
          }
        }}
      />
      {seasonCompleteInfo && (
        <SeasonCompleteModal info={seasonCompleteInfo} onDismiss={handleSeasonDismiss} onConfirmPromotion={handleConfirmPromotion} />
      )}
      <DailyRewardsModal
        visible={showDaily}
        currentDay={dailyDay}
        claimedDays={claimedDaysCount}
        canClaim={canClaimDaily}
        onClaim={handleClaimDaily}
        onClose={() => setShowDaily(false)}
      />
      <LeaguePackOfferModal
        visible={leagueOffer !== null}
        packId={leagueOffer ?? 'league2'}
        price={OFFER_PRICES[leagueOffer ?? 'league2'] ?? '$4.99'}
        onBuy={handleOfferBuy}
        onDismiss={() => { trackEvent('purchases', { offer_dismissed: '1' }); setLeagueOffer(null); }}
      />
      <SeasonPassModal visible={showBattlePass} onClose={() => setShowBattlePass(false)} />
      <LocationsModal
        visible={showLocations}
        currentIndex={gameState?.leagueIndex ?? 0}
        maxReached={gameState?.maxLeagueReached ?? 0}
        canPromote={!!(gameState?.pendingPromotion)}
        onPromote={() => { setShowLocations(false); setTimeout(() => triggerPromotionConfirmation(), 300); }}
        onClose={() => setShowLocations(false)}
      />
      <RateUsModal visible={showRateUs} onDismiss={() => { setShowRateUs(false); markRateUsShown(); }} />
      <StadiumRewardModal
        visible={stadiumRewardIdx !== null}
        stadiumIndex={stadiumRewardIdx ?? 0}
        onClose={() => setStadiumRewardIdx(null)}
      />

      {/* Tutorial overlays */}
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'qte_hint'}
        emoji="👆"
        text="Collect extra rewards from match events!"
        subText="Tap the event bubbles that appear during matches to earn bonus money."
        buttonText="Got it!"
        onPress={() => setTutorialStep(undefined)}
      />
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'transfer_go'}
        emoji="🏪"
        text="Transfer Market Unlocked!"
        subText="You've earned enough to buy players. Go to the Team tab and open Transfers to find new talent!"
        buttonText="Go to Transfers"
        onPress={() => { setTutorialStep('transfer_buy'); router.push('/tabs/teamhub'); }}
      />
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'staff_hint'}
        emoji="💼"
        text="Staff System Unlocked!"
        subText="You can now hire staff to boost your club. Let's get your first staff member for free!"
        buttonText="Go to Staff"
        onPress={() => { setTutorialStep('staff_open'); router.push('/tabs/staff'); }}
      />
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'heal_hint'}
        emoji="🏥"
        text="Your Player Is Sick!"
        subText="Scroll down to the Infirmary and heal your player. Sick players perform worse in matches!"
        buttonText="Got It!"
        onPress={() => setTutorialStep(undefined)}
      />
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'income_hint'}
        emoji="💪"
        text="Time to Compete!"
        subText="You're earning good money! Upgrade your team stats, buy better players, and start winning matches to move to the next stadium!"
        buttonText="Let's Go!"
        onPress={() => setTutorialStep(undefined)}
      />
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'career_hint'}
        emoji="⚽"
        text="Career Mode Unlocked!"
        subText="Your scout reached Level 3! You can now train a personal career player."
        buttonText="Go to Activities"
        onPress={() => { setTutorialStep('career_go'); router.push('/tabs/activity'); }}
      />

      {/* Staff offer popups moved to Staff tab only */}

      {/* Illness popup */}
      {(() => {
        const sickId = gameState?.lastSickPlayerId;
        if (!sickId) return null;
        const pl = (gameState?.players ?? []).find(p => p.id === sickId);
        if (!pl || !pl.illness) return null;
        const illInfo = ILLNESS_TYPES.find(i => i.type === pl.illness?.type);
        return (
          <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismissSickPopup}>
            <Pressable style={s.sickOverlay} onPress={dismissSickPopup}>
              <Pressable style={s.sickCard} onPress={e => e.stopPropagation()}>
                <Text style={s.sickEmoji}>{illInfo?.emoji ?? '🤒'}</Text>
                <Text style={s.sickTitle}>Player Got Sick!</Text>
                <Text style={s.sickName}>{pl.firstName} {pl.lastName}</Text>
                <Text style={s.sickType}>{illInfo?.label ?? 'Illness'}</Text>
                <Text style={s.sickDesc}>
                  Effectiveness reduced to {Math.round((illInfo?.effectiveness ?? 0.5) * 100)}%{'\n'}
                  Team power decreased!
                </Text>
                <Pressable style={s.sickBtn} onPress={dismissSickPopup}>
                  <Text style={s.sickBtnText}>OK</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { fontSize: 20, fontWeight: '700', color: Colors.dark },
  /* Bottom sub-tab bar (matches Team hub style) */
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    paddingBottom: 4,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  subTabActive: {
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: -1,
  },
  subTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  subTabLabelActive: {
    color: Colors.primary,
  },
  subTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: 4,
    right: 4,
  },
  /* Compact income banner */
  multBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: '#064E3B',
    borderRadius: 8,
  },
  multBannerIcon: { width: 18, height: 18, marginRight: 4 },
  multBannerText: { fontSize: 15, fontWeight: '900', color: '#34D399' },
  multBannerHint: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  upgradesSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  upgradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  upgradeItem: {
    width: '50%',
  },
  upgradeToast: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  toastIcon: { fontSize: 16 },
  toastLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  toastTotal: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  toastDiff: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  // Illness popup
  sickOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  sickCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '80%', maxWidth: 320, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sickEmoji: { fontSize: 48, marginBottom: 8 },
  sickTitle: { fontSize: 20, fontWeight: '900', color: '#EF4444', marginBottom: 4 },
  sickName: { fontSize: 16, fontWeight: '700', color: Colors.dark, marginBottom: 2 },
  sickType: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginBottom: 8 },
  sickDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  sickBtn: { backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 40 },
  sickBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
});
