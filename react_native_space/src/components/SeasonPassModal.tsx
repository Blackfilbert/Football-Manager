import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, Dimensions, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import CurrencyIcon from './CurrencyIcon';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const SW = Dimensions.get('window').width;
const BP_HEADER_IMG = require('../../assets/images/sp_header.png');
const KEY_REG_IMG = require('../../assets/images/key_regular.png');
const KEY_GOLD_IMG = require('../../assets/images/key_gold.png');
const MONEY_IMG = require('../../assets/images/currency_money.png');

// ── QUEST DEFINITIONS ──
interface QuestDef {
  id: string;
  weeklyId?: string; // weekly counterpart
  label: string;
  target: number;
  xp: number;
}

const DAILY_QUESTS: QuestDef[] = [
  { id: 'play_match',     label: 'Play a match',         target: 15,  xp: 10 },
  { id: 'finish_season',  label: 'Finish a season',      target: 1,   xp: 10 },
  { id: 'spend_crystals', label: 'Spend crystals',       target: 50,  xp: 10 },
  { id: 'score_goal',     label: 'Score a goal',         target: 100, xp: 10 },
  { id: 'win_match',      label: 'Win a match',          target: 5,   xp: 10 },
  { id: 'buy_transfer',   label: 'Make a transfer',      target: 1,   xp: 3 },
  { id: 'scout_upgrade',  label: 'Upgrade scout level',  target: 1,   xp: 3 },
  { id: 'career_upgrade', label: 'Upgrade your player',  target: 1,   xp: 2 },
  { id: 'watch_ad',       label: 'Watch a rewarded ad',  target: 1,   xp: 5 },
  { id: 'open_staff_box', label: 'Open a staff box',     target: 1,   xp: 3 },
  { id: 'staff_levelup',  label: 'Level up staff',       target: 1,   xp: 3 },
  { id: 'heal_player',    label: 'Send player to heal',  target: 1,   xp: 3 },
  { id: 'train_player',   label: 'Train players',        target: 3,   xp: 5 },
  { id: 'collect_qte',    label: 'Collect QTE events',   target: 10,  xp: 5 },
];

const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'play_match_w',     label: 'Play matches',         target: 100, xp: 100 },
  { id: 'spend_crystals_w', label: 'Spend crystals',       target: 250, xp: 100 },
  { id: 'score_goal_w',     label: 'Score goals',          target: 750, xp: 100 },
  { id: 'win_match_w',      label: 'Win matches',          target: 60,  xp: 100 },
  { id: 'real_purchase_w',  label: 'Make a purchase',      target: 1,   xp: 100 },
  { id: 'open_star_chest_w', label: 'Open Star chests',   target: 10,  xp: 100 },
];

// ── SP REWARD TIERS (25 levels) ──
// Cycle: crystals → money → keys, repeat
// TOTALS: Free=18💎/100K$/10🔑  Silver=45💎/500K$/30🔑  Gold=235💎/5M$/30🔑gold💎/5M$/30🔑gold
interface SpTier {
  type: 'crystals' | 'money' | 'keys';
  f: number; n: number; c: number;
}
const SP_TIERS: SpTier[] = [
  { type: 'crystals', f: 2,      n: 5,       c: 22      },  // 1
  { type: 'money',    f: 10_000, n: 50_000,  c: 400_000 },  // 2
  { type: 'keys',     f: 1,      n: 3,       c: 3       },  // 3
  { type: 'crystals', f: 2,      n: 5,       c: 22      },  // 4
  { type: 'money',    f: 10_000, n: 50_000,  c: 500_000 },  // 5
  { type: 'keys',     f: 1,      n: 3,       c: 3       },  // 6
  { type: 'crystals', f: 2,      n: 5,       c: 25      },  // 7
  { type: 'money',    f: 10_000, n: 50_000,  c: 500_000 },  // 8
  { type: 'keys',     f: 1,      n: 3,       c: 3       },  // 9
  { type: 'crystals', f: 2,      n: 5,       c: 25      },  // 10
  { type: 'money',    f: 10_000, n: 60_000,  c: 600_000 },  // 11
  { type: 'keys',     f: 1,      n: 4,       c: 4       },  // 12
  { type: 'crystals', f: 2,      n: 5,       c: 25      },  // 13
  { type: 'money',    f: 15_000, n: 60_000,  c: 600_000 },  // 14
  { type: 'keys',     f: 1,      n: 4,       c: 4       },  // 15
  { type: 'crystals', f: 2,      n: 5,       c: 28      },  // 16
  { type: 'money',    f: 15_000, n: 70_000,  c: 700_000 },  // 17
  { type: 'keys',     f: 1,      n: 4,       c: 4       },  // 18
  { type: 'crystals', f: 2,      n: 5,       c: 28      },  // 19
  { type: 'money',    f: 15_000, n: 80_000,  c: 800_000 },  // 20
  { type: 'keys',     f: 2,      n: 4,       c: 4       },  // 21
  { type: 'crystals', f: 2,      n: 5,       c: 28      },  // 22
  { type: 'money',    f: 15_000, n: 80_000,  c: 900_000 },  // 23
  { type: 'keys',     f: 2,      n: 5,       c: 5       },  // 24
  { type: 'crystals', f: 2,      n: 5,       c: 32      },  // 25
];

const COL_GAP = 3;
const MILESTONE_W = 40;
const GRID_PAD = 4;
const COL_W = (SW - MILESTONE_W - GRID_PAD * 2 - COL_GAP * 2) / 3;
const CELL_H = 100;
const SP_XP_PER_LEVEL = 30;
const SP_SEASON_DAYS = 30;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SeasonPassModal({ visible, onClose }: Props) {
  const { gameState, claimQuest, claimSpReward, claimAllSpRewards, buySpTier, addQuestProgress } = useGame();

  const handleBuySP = useCallback(async (tier: 'novice' | 'champion') => {
    const sku = tier === 'novice' ? PRODUCT_IDS.season_pass_silver : PRODUCT_IDS.season_pass_gold;
    const purchased = await requestPurchase(sku);
    if (!purchased) return;
    buySpTier(tier);
    addQuestProgress('real_purchase_w', 1, true);
  }, [buySpTier, addQuestProgress]);
  const [activeTab, setActiveTab] = useState<'rewards' | 'tasks'>('tasks');
  const scrollRef = useRef<ScrollView>(null);
  const [now, setNow] = useState(Date.now());

  // Timer tick
  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [visible]);

  const spXp = gameState?.spXp ?? 0;
  const spLevel = Math.floor(spXp / SP_XP_PER_LEVEL) + 1;
  const xpInLevel = spXp % SP_XP_PER_LEVEL;
  const crystals = gameState?.crystals ?? 0;

  const freeCl = gameState?.spFreeClaimed ?? [];
  const novCl = gameState?.spNoviceClaimed ?? [];
  const chaCl = gameState?.spChampionClaimed ?? [];
  const hasNov = gameState?.spNovicePurchased ?? false;
  const hasCha = gameState?.spChampionPurchased ?? false;

  // Season timer
  const seasonStart = gameState?.spSeasonStart ?? Date.now();
  const seasonEnd = seasonStart + SP_SEASON_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, seasonEnd - now);
  const daysLeft = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hoursLeft = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minsLeft = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const timerStr = `${daysLeft}D ${hoursLeft}H ${minsLeft}M`;

  // Daily reset timer
  const todayDate = new Date();
  const midnight = new Date(todayDate);
  midnight.setHours(24, 0, 0, 0);
  const dailyRemaining = Math.max(0, midnight.getTime() - now);
  const dH = Math.floor(dailyRemaining / (60 * 60 * 1000));
  const dM = Math.floor((dailyRemaining % (60 * 60 * 1000)) / (60 * 1000));
  const dS = Math.floor((dailyRemaining % (60 * 1000)) / 1000);
  const dailyTimer = `${dH}h ${String(dM).padStart(2, '0')}m ${String(dS).padStart(2, '0')}s`;

  // Quest progress
  const dailyProgress = gameState?.questDailyProgress ?? {};
  const dailyClaimed = gameState?.questDailyClaimed ?? [];
  const weeklyProgress = gameState?.questWeeklyProgress ?? {};
  const weeklyClaimed = gameState?.questWeeklyClaimed ?? [];

  const hasFreeToClaim = SP_TIERS.some((_, i) => i < spLevel && !freeCl.includes(i));
  const hasNovToClaim = hasNov && SP_TIERS.some((_, i) => i < spLevel && !novCl.includes(i));
  const hasChaToClaim = hasCha && SP_TIERS.some((_, i) => i < spLevel && !chaCl.includes(i));

  // Check if there are unclaimed completed quests
  const hasUnclaimedDaily = DAILY_QUESTS.some(q => !dailyClaimed.includes(q.id) && (dailyProgress[q.id] ?? 0) >= q.target);
  const hasUnclaimedWeekly = WEEKLY_QUESTS.some(q => !weeklyClaimed.includes(q.id) && (weeklyProgress[q.id] ?? 0) >= q.target);
  const hasTaskBadge = hasUnclaimedDaily || hasUnclaimedWeekly;
  const hasRewardsBadge = hasFreeToClaim || hasNovToClaim || hasChaToClaim;

  if (!visible) return null;

  const renderQuestRow = (quest: QuestDef, isWeekly: boolean) => {
    const progress = isWeekly ? (weeklyProgress[quest.id] ?? 0) : (dailyProgress[quest.id] ?? 0);
    const claimed = isWeekly ? weeklyClaimed.includes(quest.id) : dailyClaimed.includes(quest.id);
    const completed = progress >= quest.target;
    const pct = Math.min(1, progress / quest.target);

    return (
      <View key={quest.id} style={q.row}>
        <View style={q.coinWrap}>
          <View style={q.xpBadge}>
            <Ionicons name="star" size={18} color="#FFF" />
          </View>
          <Text style={q.coinAmt}>{quest.xp}</Text>
        </View>
        <View style={q.questInfo}>
          <Text style={q.questLabel}>{quest.label}</Text>
          <View style={q.barBg}>
            <View style={[q.barFill, { width: `${pct * 100}%` }, completed && q.barFillDone]} />
            <Text style={q.barText}>{Math.min(progress, quest.target)} / {quest.target}</Text>
          </View>
        </View>
        <Pressable
          style={[q.claimBtn, completed && !claimed && q.claimBtnActive, claimed && q.claimBtnClaimed]}
          onPress={() => completed && !claimed && claimQuest(quest.id, quest.xp, isWeekly)}
          disabled={!completed || claimed}
        >
          <Text style={[q.claimTxt, completed && !claimed && q.claimTxtActive]}>
            {claimed ? '\u2713' : 'Collect'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const fmtAmt = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toString();
  };

  const renderRewardCell = (tierIdx: number, col: 'free' | 'novice' | 'champion') => {
    const t = SP_TIERS[tierIdx];
    const reached = tierIdx < spLevel;
    const amt = col === 'free' ? t.f : col === 'novice' ? t.n : t.c;
    const claimedArr = col === 'free' ? freeCl : col === 'novice' ? novCl : chaCl;
    const isClaimed = claimedArr.includes(tierIdx);
    const locked = col === 'novice' ? !hasNov : col === 'champion' ? !hasCha : false;
    const canClaim = reached && !isClaimed && !locked;

    const bgColors = {
      free: isClaimed ? '#1E3A8A' : '#DBEAFE',
      novice: isClaimed ? '#6D28D9' : '#F3E8FF',
      champion: isClaimed ? '#B45309' : '#FEF3C7',
    };

    // Icon based on type
    let icon: React.ReactNode;
    if (t.type === 'crystals') {
      icon = <CurrencyIcon type="diamond" size={32} />;
    } else if (t.type === 'money') {
      icon = <Image source={MONEY_IMG} style={rs.cellIcon} resizeMode="contain" />;
    } else {
      // keys: champion gets gold, others get regular
      icon = <Image source={col === 'champion' ? KEY_GOLD_IMG : KEY_REG_IMG} style={rs.cellIcon} resizeMode="contain" />;
    }

    return (
      <Pressable
        key={col}
        style={[rs.cell, { backgroundColor: bgColors[col], width: COL_W }]}
        onPress={() => canClaim && claimSpReward(tierIdx, col)}
      >
        {icon}
        <Text style={[rs.cellAmt, isClaimed && rs.cellAmtClaimed]}>{fmtAmt(amt)}</Text>
        {isClaimed && (
          <View style={rs.checkMark}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          </View>
        )}
        {(locked || (!reached && !isClaimed)) && !isClaimed && (
          <View style={rs.lockIcon}>
            <Ionicons name="lock-closed" size={14} color="#94A3B8" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.root}>
        {/* HEADER */}
        <View style={s.header}>
          <Image source={BP_HEADER_IMG} style={{ position: 'absolute', top: 0, left: 0, width: SW, height: SW * 0.52 }} resizeMode="cover" />
          <Pressable style={s.infoBtn} hitSlop={12}>
            <Ionicons name="information-circle" size={22} color="#FFF" />
          </Pressable>
          {/* Title removed — shown in banner image */}
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={16}>
            <Text style={s.closeTxt}>x</Text>
          </Pressable>
        </View>

        {/* TABS: Rewards / Tasks */}
        <View style={s.mainTabs}>
          <Pressable
            style={[s.mainTab, activeTab === 'rewards' && s.mainTabActive]}
            onPress={() => setActiveTab('rewards')}
          >
            <Text style={[s.mainTabTxt, activeTab === 'rewards' && s.mainTabTxtActive]}>Rewards</Text>
            {hasRewardsBadge && <View style={s.tabBadge} />}
          </Pressable>
          <Pressable
            style={[s.mainTab, activeTab === 'tasks' && s.mainTabActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Text style={[s.mainTabTxt, activeTab === 'tasks' && s.mainTabTxtActive]}>Tasks</Text>
            {hasTaskBadge && <View style={s.tabBadge} />}
          </Pressable>
        </View>

        {/* XP PROGRESS BAR */}
        <View style={s.xpBar}>
          <View style={s.xpStarBadge}>
            <Ionicons name="star" size={12} color="#FFF" />
          </View>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${(xpInLevel / SP_XP_PER_LEVEL) * 100}%` }]} />
            <Text style={s.xpBarTxt}>{xpInLevel} / {SP_XP_PER_LEVEL}</Text>
          </View>
          <View style={s.levelBadge}>
            <Text style={s.levelTxt}>{spLevel}</Text>
          </View>
        </View>

        {/* CONTENT */}
        {activeTab === 'tasks' ? (
          <ScrollView style={s.taskScroll} showsVerticalScrollIndicator={false}>
            {/* DAILY */}
            <View style={q.sectionHeader}>
              <Text style={q.sectionTitle}>DAILY</Text>
              <Text style={q.sectionTimer}>{dailyTimer}</Text>
            </View>
            {DAILY_QUESTS.map(quest => renderQuestRow(quest, false))}

            {/* WEEKLY */}
            <View style={[q.sectionHeader, { marginTop: 16 }]}>
              <Text style={q.sectionTitle}>WEEKLY</Text>
              <Text style={q.sectionTimer}>{dailyTimer}</Text>
            </View>
            {WEEKLY_QUESTS.map(quest => renderQuestRow(quest, true))}
            <View style={{ height: 32 }} />
          </ScrollView>
        ) : (
          /* REWARDS TAB */
          <>
            <View style={rs.tabsRow}>
              <View style={rs.tabSpacer}>
                <Text style={rs.powerLabel}>LEVEL</Text>
              </View>
              <View style={[rs.tab, rs.tabFree]}>
                <Text style={[rs.tabTxt, { color: '#2563EB' }]}>Free</Text>
              </View>
              <View style={[rs.tab, rs.tabNov]}>
                <Text style={[rs.tabTxt, { color: '#7C3AED' }]}>Silver</Text>
                {!hasNov && <View style={rs.lockSmall}><Ionicons name="lock-closed" size={10} color="#94A3B8" /></View>}
              </View>
              <View style={[rs.tab, rs.tabCha]}>
                <Text style={[rs.tabTxt, { color: '#D97706' }]}>Gold</Text>
                {!hasCha && <View style={rs.lockSmall}><Ionicons name="lock-closed" size={10} color="#94A3B8" /></View>}
              </View>
            </View>

            <ScrollView ref={scrollRef} style={rs.gridScroll} showsVerticalScrollIndicator={false}>
              {SP_TIERS.map((_, i) => (
                <View key={i} style={rs.tierRow}>
                  <View style={rs.milestoneCol}>
                    <View style={[
                      rs.progressSeg,
                      i < spLevel ? rs.progressSegDone : rs.progressSegLocked,
                      i === 0 && { top: '50%' },
                      i === SP_TIERS.length - 1 && { bottom: '50%', height: '50%' },
                    ]} />
                    <View style={[rs.msPill, i < spLevel && rs.msPillDone]}>
                      <Text style={[rs.msTxt, i < spLevel && rs.msTxtDone]}>{i + 1}</Text>
                    </View>
                  </View>
                  <View style={rs.cellsRow}>
                    {renderRewardCell(i, 'free')}
                    {renderRewardCell(i, 'novice')}
                    {renderRewardCell(i, 'champion')}
                  </View>
                </View>
              ))}
              <View style={{ height: 16 }} />
            </ScrollView>

            {/* BOTTOM PURCHASE ROW */}
            <View style={rs.bottomRow}>
              <View style={{ width: MILESTONE_W }} />
              <View style={rs.bottomCells}>
                <View style={[rs.bottomCell, { width: COL_W }]}>
                  <Pressable onPress={hasFreeToClaim ? () => claimAllSpRewards('free') : undefined} style={{ width: '100%' }}>
                    <LinearGradient
                      colors={hasFreeToClaim ? ['#3B82F6', '#2563EB'] as const : ['#CBD5E1', '#94A3B8'] as const}
                      style={rs.buyBtn}
                    >
                      <Text style={rs.buyBtnTxt}>Claim All</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
                {hasNov ? (
                  <View style={[rs.bottomCell, { width: COL_W }]}>
                    <Pressable onPress={hasNovToClaim ? () => claimAllSpRewards('novice') : undefined} style={{ width: '100%' }}>
                      <LinearGradient
                        colors={hasNovToClaim ? ['#8B5CF6', '#7C3AED'] as const : ['#CBD5E1', '#94A3B8'] as const}
                        style={rs.buyBtn}
                      >
                        <Text style={rs.buyBtnTxt}>Claim All</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[rs.bottomCell, { width: COL_W }]}>
                    <Pressable onPress={() => handleBuySP('novice')} style={{ width: '100%' }}>
                      <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={rs.buyBtn}>
                        <Text style={rs.buyBtnTxt}>$5.99</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
                {hasCha ? (
                  <View style={[rs.bottomCell, { width: COL_W }]}>
                    <Pressable onPress={hasChaToClaim ? () => claimAllSpRewards('champion') : undefined} style={{ width: '100%' }}>
                      <LinearGradient
                        colors={hasChaToClaim ? ['#F59E0B', '#D97706'] as const : ['#CBD5E1', '#94A3B8'] as const}
                        style={rs.buyBtn}
                      >
                        <Text style={rs.buyBtnTxt}>Claim All</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[rs.bottomCell, { width: COL_W }]}>
                    <Pressable onPress={() => handleBuySP('champion')} style={{ width: '100%' }}>
                      <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={rs.buyBtn}>
                        <Text style={rs.buyBtnTxt}>$14.99</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── MAIN STYLES ──
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF2F7' },
  header: {
    width: '100%',
    height: SW * 0.52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 30 : 18,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  infoBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 46 : 34, left: 18, zIndex: 10 },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 46 : 34, right: 18, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 18, fontWeight: '700', color: '#FFF', lineHeight: 20 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pillsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillTxt: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  // Main tabs
  mainTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...(Platform.OS === 'android' ? { elevation: 4 } : {
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    }),
  },
  mainTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  mainTabTxt: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  mainTabTxtActive: { color: '#0F172A', fontWeight: '800' },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: '25%',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  // XP bar
  xpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  xpStarBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBarBg: {
    flex: 1,
    height: 16,
    backgroundColor: '#475569',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  xpBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#22C55E',
    borderRadius: 8,
  },
  xpBarTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  levelBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTxt: { fontSize: 11, fontWeight: '900', color: '#16A34A' },
  taskScroll: { flex: 1, paddingHorizontal: 12 },
});

// ── QUEST STYLES ──
const q = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  sectionTimer: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    ...(Platform.OS === 'android' ? { elevation: 1 } : {
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    }),
  },
  coinWrap: { alignItems: 'center', width: 42 },
  xpBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinAmt: { fontSize: 10, fontWeight: '800', color: '#D97706', marginTop: 1 },
  questInfo: { flex: 1, marginHorizontal: 10 },
  questLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  barBg: {
    height: 18,
    backgroundColor: '#E2E8F0',
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 9,
  },
  barFillDone: { backgroundColor: '#22C55E' },
  barText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  claimBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 68,
    alignItems: 'center',
  },
  claimBtnActive: { backgroundColor: '#22C55E' },
  claimBtnClaimed: { backgroundColor: '#CBD5E1' },
  claimTxt: { fontSize: 12, fontWeight: '800', color: '#94A3B8' },
  claimTxtActive: { color: '#FFF' },
});

// ── REWARD STYLES ──
const rs = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PAD,
    marginTop: 0,
  },
  tabSpacer: { width: MILESTONE_W, alignItems: 'center', justifyContent: 'center' },
  powerLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5 },
  tab: {
    width: COL_W,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: COL_GAP / 2,
    position: 'relative',
  },
  tabFree: { backgroundColor: '#DBEAFE' },
  tabNov: { backgroundColor: '#F3E8FF' },
  tabCha: { backgroundColor: '#FEF3C7' },
  tabTxt: { fontSize: 13, fontWeight: '800' },
  lockSmall: { position: 'absolute', top: 4, right: 4 },
  gridScroll: { flex: 1, paddingHorizontal: GRID_PAD },
  tierRow: { flexDirection: 'row', height: CELL_H + 4, alignItems: 'center' },
  milestoneCol: { width: MILESTONE_W, height: CELL_H + 4, alignItems: 'center', justifyContent: 'center' },
  progressSeg: { position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 2 },
  progressSegDone: { backgroundColor: '#22C55E' },
  progressSegLocked: { backgroundColor: '#D1D5DB' },
  msPill: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#FFF',
    minWidth: 28,
    alignItems: 'center',
  },
  msPillDone: { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  msTxt: { fontSize: 10, fontWeight: '800', color: '#9CA3AF' },
  msTxtDone: { color: '#16A34A' },
  cellsRow: { flex: 1, flexDirection: 'row', gap: COL_GAP },
  cell: {
    height: CELL_H,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  cellIcon: { width: 36, height: 36 },
  cellAmt: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 2 },
  cellAmtClaimed: { color: 'rgba(255,255,255,0.9)' },
  checkMark: { position: 'absolute', bottom: 4, left: 4 },
  lockIcon: { position: 'absolute', top: 4, right: 4 },
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PAD,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#EEF2F7',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomCells: { flex: 1, flexDirection: 'row', gap: COL_GAP },
  bottomCell: { alignItems: 'center', justifyContent: 'flex-end' },
  buyBtn: { borderRadius: 12, height: 44, justifyContent: 'center', alignItems: 'center' },
  buyBtnTxt: { fontSize: 13, fontWeight: '900', color: '#FFF' },
});
