import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, Dimensions, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import CurrencyIcon from './CurrencyIcon';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const SW = Dimensions.get('window').width;
const BP_HEADER_IMG = require('../../assets/images/bp_header.png');
const TROPHY_IMG = require('../../assets/images/trophy_icon.png');

// 15 tiers: power threshold, free crystals, premium crystals, vip crystals, free trophies, premium trophies, vip trophies
const BP_TIERS = [
  { power: 500,  fc: 0,  pc: 0,   vc: 0,   ft: 1,  pt: 3,  vt: 10  },
  { power: 600,  fc: 3,  pc: 15,  vc: 50,  ft: 0,  pt: 0,  vt: 0   },
  { power: 700,  fc: 0,  pc: 0,   vc: 0,   ft: 1,  pt: 4,  vt: 12  },
  { power: 800,  fc: 4,  pc: 20,  vc: 60,  ft: 0,  pt: 0,  vt: 0   },
  { power: 900,  fc: 0,  pc: 0,   vc: 0,   ft: 1,  pt: 5,  vt: 15  },
  { power: 1000, fc: 5,  pc: 25,  vc: 75,  ft: 0,  pt: 0,  vt: 0   },
  { power: 1100, fc: 0,  pc: 0,   vc: 0,   ft: 2,  pt: 6,  vt: 18  },
  { power: 1200, fc: 7,  pc: 30,  vc: 90,  ft: 0,  pt: 0,  vt: 0   },
  { power: 1300, fc: 0,  pc: 0,   vc: 0,   ft: 2,  pt: 7,  vt: 20  },
  { power: 1400, fc: 8,  pc: 40,  vc: 110, ft: 0,  pt: 0,  vt: 0   },
  { power: 1500, fc: 0,  pc: 0,   vc: 0,   ft: 3,  pt: 8,  vt: 22  },
  { power: 1600, fc: 10, pc: 50,  vc: 130, ft: 0,  pt: 0,  vt: 0   },
  { power: 1700, fc: 0,  pc: 0,   vc: 0,   ft: 3,  pt: 10, vt: 25  },
  { power: 1800, fc: 13, pc: 60,  vc: 195, ft: 0,  pt: 0,  vt: 0   },
  { power: 1900, fc: 0,  pc: 0,   vc: 0,   ft: 5,  pt: 15, vt: 52  },
];

const COL_GAP = 3;
const MILESTONE_W = 40;
const GRID_PAD = 4;
const COL_W = (SW - MILESTONE_W - GRID_PAD * 2 - COL_GAP * 2) / 3;
const CELL_H = 100;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BattlePassModal({ visible, onClose }: Props) {
  const { gameState, teamPower, claimBattlePass, claimAllBattlePass, buyBattlePassTier, addQuestProgress } = useGame();

  const handleBuyBP = useCallback(async (tier: 'premium' | 'vip') => {
    const sku = tier === 'premium' ? PRODUCT_IDS.career_bp_premium : PRODUCT_IDS.career_bp_vip;
    const purchased = await requestPurchase(sku);
    if (!purchased) return;
    buyBattlePassTier(tier);
    addQuestProgress('real_purchase_w', 1, true);
  }, [buyBattlePassTier, addQuestProgress]);
  const scrollRef = useRef<ScrollView>(null);

  const freeCl = gameState?.battlePassClaimed ?? [];
  const premCl = gameState?.bpPremiumClaimed ?? [];
  const vipCl = gameState?.bpVipClaimed ?? [];
  const hasPrem = gameState?.bpPremiumPurchased ?? false;
  const hasVip = gameState?.bpVipPurchased ?? false;
  const crystals = gameState?.crystals ?? 0;
  const hasFreeToClaim = BP_TIERS.some((t, i) => teamPower >= t.power && !freeCl.includes(i));
  const hasPremToClaim = hasPrem && BP_TIERS.some((t, i) => teamPower >= t.power && !premCl.includes(i));
  const hasVipToClaim = hasVip && BP_TIERS.some((t, i) => teamPower >= t.power && !vipCl.includes(i));

  const highestReached = BP_TIERS.reduce((acc, t, i) => teamPower >= t.power ? i : acc, -1);

  useEffect(() => {
    if (visible && scrollRef.current) {
      const first = BP_TIERS.findIndex((_, i) => !freeCl.includes(i));
      if (first > 2) {
        setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, (first - 1) * CELL_H), animated: true }), 300);
      }
    }
  }, [visible]);

  if (!visible) return null;

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);

  const renderCell = (tierIdx: number, col: 'free' | 'premium' | 'vip') => {
    const t = BP_TIERS[tierIdx];
    const reached = teamPower >= t.power;
    const isTrophyRow = tierIdx % 2 === 0; // even=trophies, odd=crystals
    const amt = isTrophyRow
      ? (col === 'free' ? t.ft : col === 'premium' ? t.pt : t.vt)
      : (col === 'free' ? t.fc : col === 'premium' ? t.pc : t.vc);
    const claimedArr = col === 'free' ? freeCl : col === 'premium' ? premCl : vipCl;
    const isClaimed = claimedArr.includes(tierIdx);
    const locked = col === 'premium' ? !hasPrem : col === 'vip' ? !hasVip : false;
    const canClaim = reached && !isClaimed && !locked;

    const bgColors = {
      free: isClaimed ? '#1E3A8A' : '#DBEAFE',
      premium: isClaimed ? '#6D28D9' : '#F3E8FF',
      vip: isClaimed ? '#B45309' : '#FEF3C7',
    };

    return (
      <Pressable
        key={col}
        style={[s.cell, { backgroundColor: bgColors[col], width: COL_W }]}
        onPress={() => canClaim && claimBattlePass(tierIdx, col)}
      >
        {isTrophyRow ? (
          <Image source={TROPHY_IMG} style={s.cellTrophyImg} resizeMode="contain" />
        ) : (
          <CurrencyIcon type="diamond" size={32} />
        )}
        <Text style={[s.cellAmt, isClaimed && s.cellAmtClaimed]}>{amt}</Text>

        {/* Claimed checkmark */}
        {isClaimed && (
          <View style={s.checkMark}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          </View>
        )}

        {/* Lock */}
        {(locked || (!reached && !isClaimed)) && !isClaimed && (
          <View style={s.lockIcon}>
            <Ionicons name="lock-closed" size={14} color="#94A3B8" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.root}>
        {/* === HEADER WITH BG IMAGE === */}
        <View style={s.header}>
          <Image source={BP_HEADER_IMG} style={{ position: 'absolute', top: 0, left: 0, width: SW, height: SW * 0.52 }} resizeMode="cover" />
          {/* Close */}
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={16}>
            <Text style={s.closeTxt}>x</Text>
          </Pressable>

          {/* Title removed — shown in banner image */}
          <Text style={s.subtitle}>Grow your team and collect rewards!</Text>

          {/* Currency pills */}
          <View style={s.pillsRow}>
            <View style={s.pill}>
              <Ionicons name="flash" size={15} color="#F59E0B" />
              <Text style={s.pillTxt}>{fmt(teamPower)}</Text>
            </View>
            <View style={s.pill}>
              <CurrencyIcon type="diamond" size={16} />
              <Text style={s.pillTxt}>{crystals}</Text>
            </View>
          </View>
        </View>

        {/* === COLUMN TABS === */}
        <View style={s.tabsRow}>
          <View style={s.tabSpacer}>
            <Text style={s.powerLabel}>POWER</Text>
          </View>
          <View style={[s.tab, s.tabFree]}>
            <Text style={[s.tabTxt, { color: '#2563EB' }]}>Free</Text>
          </View>
          <View style={[s.tab, s.tabPrem]}>
            <Text style={[s.tabTxt, { color: '#7C3AED' }]}>Premium</Text>
          </View>
          <View style={[s.tab, s.tabVip]}>
            <Text style={[s.tabTxt, { color: '#D97706' }]}>VIP</Text>
          </View>
        </View>

        {/* === GRID === */}
        <ScrollView ref={scrollRef} style={s.gridScroll} showsVerticalScrollIndicator={false}>
          {BP_TIERS.map((tier, i) => {
            const reached = teamPower >= tier.power;
            return (
              <View key={i} style={s.tierRow}>
                {/* Milestone column with progress line */}
                <View style={s.milestoneCol}>
                  {/* Progress line segment */}
                  <View style={[
                    s.progressSeg,
                    i <= highestReached ? s.progressSegDone : s.progressSegLocked,
                    i === 0 && { top: '50%' },
                    i === BP_TIERS.length - 1 && { bottom: '50%', height: '50%' },
                  ]} />
                  <View style={[s.msPill, reached && s.msPillDone]}>
                    <Text style={[s.msTxt, reached && s.msTxtDone]}>{fmt(tier.power)}</Text>
                  </View>
                </View>

                {/* 3 cells */}
                <View style={s.cellsRow}>
                  {renderCell(i, 'free')}
                  {renderCell(i, 'premium')}
                  {renderCell(i, 'vip')}
                </View>
              </View>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* === BOTTOM PURCHASE ROW === */}
        <View style={s.bottomRow}>
          {/* Spacer matching milestone column */}
          <View style={{ width: MILESTONE_W }} />

          {/* 3 buttons matching cellsRow layout */}
          <View style={s.bottomCells}>
            {/* Free - Claim All */}
            <View style={[s.bottomCell, { width: COL_W }]}>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={hasFreeToClaim ? () => claimAllBattlePass('free') : undefined}
                style={{ width: '100%' }}
              >
                <LinearGradient
                  colors={hasFreeToClaim ? ['#3B82F6', '#2563EB'] as const : ['#CBD5E1', '#94A3B8'] as const}
                  style={s.buyBtn}
                >
                  <Text style={s.buyBtnTxt}>Claim All</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Premium */}
            {hasPrem ? (
              <View style={[s.bottomCell, { width: COL_W }]}>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={hasPremToClaim ? () => claimAllBattlePass('premium') : undefined}
                  style={{ width: '100%' }}
                >
                  <LinearGradient
                    colors={hasPremToClaim ? ['#8B5CF6', '#7C3AED'] as const : ['#CBD5E1', '#94A3B8'] as const}
                    style={s.buyBtn}
                  >
                    <Text style={s.buyBtnTxt}>Claim All</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <View style={[s.bottomCell, { width: COL_W }]}>
                <View style={s.bonusBadge}>
                  <Text style={s.bonusTxt}>+900%</Text>
                </View>
                <Pressable onPress={() => handleBuyBP('premium')} style={{ width: '100%' }}>
                  <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.buyBtn}>
                    <Text style={s.buyBtnTxt}>5.99 USD</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* VIP */}
            {hasVip ? (
              <View style={[s.bottomCell, { width: COL_W }]}>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={hasVipToClaim ? () => claimAllBattlePass('vip') : undefined}
                  style={{ width: '100%' }}
                >
                  <LinearGradient
                    colors={hasVipToClaim ? ['#F59E0B', '#D97706'] as const : ['#CBD5E1', '#94A3B8'] as const}
                    style={s.buyBtn}
                  >
                    <Text style={s.buyBtnTxt}>Claim All</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <View style={[s.bottomCell, { width: COL_W }]}>
                <View style={[s.bonusBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={s.bonusTxt}>+1200%</Text>
                </View>
                <Pressable onPress={() => handleBuyBP('vip')} style={{ width: '100%' }}>
                  <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.buyBtn}>
                    <Text style={s.buyBtnTxt}>22.99 USD</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },
  /* Header */
  header: {
    width: '100%',
    height: SW * 0.52,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 46 : 34,
    right: 18,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  /* Tabs */
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PAD,
    marginTop: 0,
  },
  tabSpacer: {
    width: MILESTONE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  tab: {
    width: COL_W,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: COL_GAP / 2,
  },
  tabFree: { backgroundColor: '#DBEAFE' },
  tabPrem: { backgroundColor: '#F3E8FF' },
  tabVip: { backgroundColor: '#FEF3C7' },
  tabTxt: {
    fontSize: 14,
    fontWeight: '800',
  },
  /* Grid */
  gridScroll: {
    flex: 1,
    paddingHorizontal: GRID_PAD,
  },
  tierRow: {
    flexDirection: 'row',
    height: CELL_H + 4,
    alignItems: 'center',
  },
  /* Milestone */
  milestoneCol: {
    width: MILESTONE_W,
    height: CELL_H + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSeg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
  progressSegDone: {
    backgroundColor: '#22C55E',
  },
  progressSegLocked: {
    backgroundColor: '#D1D5DB',
  },
  msPill: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#FFF',
    minWidth: 34,
    alignItems: 'center',
  },
  msPillDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  msTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  msTxtDone: {
    color: '#16A34A',
  },
  /* Cells row */
  cellsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: COL_GAP,
  },
  cell: {
    height: CELL_H,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  cellTrophyImg: {
    width: 36,
    height: 36,
  },
  cellAmt: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 2,
  },
  cellAmtClaimed: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkMark: {
    position: 'absolute',
    bottom: 4,
    left: 4,
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  /* Bottom */
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PAD,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#EEF2F7',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomCells: {
    flex: 1,
    flexDirection: 'row',
    gap: COL_GAP,
  },
  bottomCell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bottomFreeCell: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 44,
  },
  bottomPremActiveCell: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    height: 44,
  },
  bottomVipActiveCell: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    height: 44,
  },
  bottomActiveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  bonusBadge: {
    backgroundColor: '#F97316',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  bonusTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  buyBtn: {
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
});
