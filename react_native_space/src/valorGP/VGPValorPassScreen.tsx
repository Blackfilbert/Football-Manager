/* ── VGP Valor Pass Screen ── */
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ScrollView, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useValorGP } from './context';
import { VP_TIERS, VGP_VP_GRAND_COST, getVpLevelInfo } from './constants';
import CurrencyIcon from '../components/CurrencyIcon';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const SW = Dimensions.get('window').width;
const ROSE = 'rgba(232,180,180,';
const ROSE_TEXT = ROSE + '0.85)';
const ROSE_DIM = ROSE + '0.45)';
const GOLD = '#D4A854';

const VP_HEADER_IMG = require('../../assets/images/vp_header.png');
const KEY_REG_IMG = require('../../assets/images/key_regular.png');
const KEY_GOLD_IMG = require('../../assets/images/key_gold.png');
const MONEY_IMG = require('../../assets/images/currency_money.png');
const TRAINING_IMG = require('../../assets/images/training_skip.png');

const COL_GAP = 3;
const MILESTONE_W = 36;
const GRID_PAD = 4;
const COL_W = (SW - MILESTONE_W - GRID_PAD * 2 - COL_GAP * 2) / 3;
const CELL_H = 90;

interface Props {
  onBack: () => void;
}

export default function VGPValorPassScreen({ onBack }: Props) {
  const { state, claimVpReward, claimAllVpRewards, buyVpTier } = useValorGP();
  const scrollRef = useRef<ScrollView>(null);

  const vpXp = state.vpXp;
  const { level: vpLevel, xpInLevel, xpForNext } = getVpLevelInfo(vpXp);
  const hasGrand = state.vpGrandPurchased;
  const hasGold = state.vpGoldPurchased;
  const freeCl = state.vpFreeClaimed ?? [];
  const grandCl = state.vpGrandClaimed ?? [];
  const goldCl = state.vpGoldClaimed ?? [];

  const hasFreeToClaim = VP_TIERS.some((t, i) => i < vpLevel && !freeCl.includes(i) && t.f > 0);
  const hasGrandToClaim = hasGrand && VP_TIERS.some((t, i) => i < vpLevel && !grandCl.includes(i) && t.g > 0);
  const hasGoldToClaim = hasGold && VP_TIERS.some((t, i) => i < vpLevel && !goldCl.includes(i) && t.d > 0);

  const fmtAmt = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toString();
  };

  const handleBuyGold = async () => {
    const sku = PRODUCT_IDS.valor_pass_gold;
    const purchased = await requestPurchase(sku);
    if (purchased) buyVpTier('gold');
  };

  const renderCell = (tierIdx: number, col: 'free' | 'grand' | 'gold') => {
    const t = VP_TIERS[tierIdx];
    const amt = col === 'free' ? t.f : col === 'grand' ? t.g : t.d;
    const reached = tierIdx < vpLevel;
    const claimedArr = col === 'free' ? freeCl : col === 'grand' ? grandCl : goldCl;
    const isClaimed = claimedArr.includes(tierIdx);
    const locked = col === 'grand' ? !hasGrand : col === 'gold' ? !hasGold : false;
    const canClaim = reached && !isClaimed && !locked && amt > 0;
    const isEmpty = amt === 0;

    // Colors per tier
    const bgBase = {
      free: isClaimed ? 'rgba(16,185,129,0.15)' : isEmpty ? 'rgba(60,35,55,0.4)' : 'rgba(60,35,55,0.7)',
      grand: isClaimed ? 'rgba(168,85,247,0.15)' : isEmpty ? 'rgba(60,35,55,0.4)' : 'rgba(80,40,80,0.7)',
      gold: isClaimed ? 'rgba(210,160,80,0.15)' : isEmpty ? 'rgba(60,35,55,0.4)' : 'rgba(80,60,30,0.7)',
    };
    const borderBase = {
      free: isClaimed ? 'rgba(16,185,129,0.4)' : canClaim ? 'rgba(16,185,129,0.6)' : 'rgba(232,180,180,0.1)',
      grand: isClaimed ? 'rgba(168,85,247,0.4)' : canClaim ? 'rgba(168,85,247,0.6)' : 'rgba(232,180,180,0.1)',
      gold: isClaimed ? 'rgba(210,160,80,0.4)' : canClaim ? 'rgba(210,160,80,0.6)' : 'rgba(232,180,180,0.1)',
    };

    let icon: React.ReactNode = null;
    if (!isEmpty) {
      if (t.type === 'trainingSkips') {
        icon = <Image source={TRAINING_IMG} style={rs.cellIcon} resizeMode="contain" />;
      } else if (t.type === 'money') {
        icon = <Image source={MONEY_IMG} style={rs.cellIcon} resizeMode="contain" />;
      } else {
        icon = <Image source={col === 'gold' ? KEY_GOLD_IMG : KEY_REG_IMG} style={rs.cellIcon} resizeMode="contain" />;
      }
    }

    return (
      <Pressable
        key={col}
        style={[rs.cell, { width: COL_W, backgroundColor: bgBase[col], borderColor: borderBase[col] }]}
        onPress={() => canClaim && claimVpReward(tierIdx, col)}
      >
        {isEmpty ? (
          <Text style={rs.emptyDash}>—</Text>
        ) : (
          <>
            {icon}
            <Text style={[rs.cellAmt, isClaimed && rs.cellAmtClaimed]}>{fmtAmt(amt)}</Text>
          </>
        )}
        {isClaimed && (
          <View style={rs.checkMark}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          </View>
        )}
        {(locked && !isEmpty) && (
          <View style={rs.lockIcon}>
            <Ionicons name="lock-closed" size={12} color="rgba(232,180,180,0.35)" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <Image source={require('../../assets/images/vgp_bg.png')} style={s.bgImage} resizeMode="cover" />
      <View style={s.bgOverlay} />

      {/* Header banner */}
      <View style={s.header}>
        <Image source={VP_HEADER_IMG} style={{ position: 'absolute', top: 0, left: 0, width: SW, height: SW * 0.52 }} resizeMode="cover" />
        <Pressable onPress={onBack} style={s.closeBtn} hitSlop={14}>
          <Ionicons name="close" size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* XP Progress */}
      <View style={s.xpRow}>
        <View style={s.xpLevelBadge}>
          <Ionicons name="star" size={14} color="#FFF" />
        </View>
        <View style={s.xpBarBg}>
          <LinearGradient
            colors={['#D4A854', '#E8CC7A'] as const}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.xpBarFill, { width: `${xpForNext > 0 ? (xpInLevel / xpForNext) * 100 : 100}%` }]}
          />
          <Text style={s.xpBarTxt}>{xpInLevel} / {xpForNext}</Text>
        </View>
        <View style={s.levelPill}>
          <Text style={s.levelTxt}>LV {vpLevel}</Text>
        </View>
      </View>

      {/* Column headers */}
      <View style={rs.headRow}>
        <View style={{ width: MILESTONE_W }}>
          <Text style={rs.headLabel}>LVL</Text>
        </View>
        <View style={[rs.headCol, { width: COL_W }]}>
          <Text style={[rs.headTxt, { color: '#10B981' }]}>Free</Text>
        </View>
        <View style={[rs.headCol, { width: COL_W }]}>
          <Text style={[rs.headTxt, { color: '#A855F7' }]}>Grand</Text>
          {!hasGrand && <Ionicons name="lock-closed" size={10} color="rgba(168,85,247,0.5)" />}
        </View>
        <View style={[rs.headCol, { width: COL_W }]}>
          <Text style={[rs.headTxt, { color: GOLD }]}>Gold</Text>
          {!hasGold && <Ionicons name="lock-closed" size={10} color="rgba(210,160,80,0.5)" />}
        </View>
      </View>

      {/* Reward grid */}
      <ScrollView ref={scrollRef} style={rs.gridScroll} showsVerticalScrollIndicator={false}>
        {VP_TIERS.map((_, i) => (
          <View key={i} style={rs.tierRow}>
            <View style={rs.msCol}>
              <View style={[
                rs.progressSeg,
                i < vpLevel ? rs.progressDone : rs.progressLocked,
                i === 0 && { top: '50%' },
                i === VP_TIERS.length - 1 && { bottom: '50%', height: '50%' },
              ]} />
              <View style={[rs.msPill, i < vpLevel && rs.msPillDone]}>
                <Text style={[rs.msTxt, i < vpLevel && rs.msTxtDone]}>{i + 1}</Text>
              </View>
            </View>
            <View style={rs.cellsRow}>
              {renderCell(i, 'free')}
              {renderCell(i, 'grand')}
              {renderCell(i, 'gold')}
            </View>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom purchase/claim row */}
      <View style={rs.bottomRow}>
        <View style={{ width: MILESTONE_W }} />
        <View style={rs.bottomCells}>
          {/* Free claim all */}
          <View style={{ width: COL_W }}>
            <Pressable onPress={hasFreeToClaim ? () => claimAllVpRewards('free') : undefined}>
              <LinearGradient
                colors={hasFreeToClaim ? ['#10B981', '#059669'] as const : ['rgba(60,35,55,0.5)', 'rgba(60,35,55,0.3)'] as const}
                style={rs.buyBtn}
              >
                <Text style={rs.buyBtnTxt}>Claim All</Text>
              </LinearGradient>
            </Pressable>
          </View>
          {/* Grand */}
          <View style={{ width: COL_W }}>
            {hasGrand ? (
              <Pressable onPress={hasGrandToClaim ? () => claimAllVpRewards('grand') : undefined}>
                <LinearGradient
                  colors={hasGrandToClaim ? ['#A855F7', '#7C3AED'] as const : ['rgba(60,35,55,0.5)', 'rgba(60,35,55,0.3)'] as const}
                  style={rs.buyBtn}
                >
                  <Text style={rs.buyBtnTxt}>Claim All</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable onPress={() => buyVpTier('grand')}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={rs.buyBtn}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <CurrencyIcon type="diamond" size={14} />
                    <Text style={rs.buyBtnTxt}>{VGP_VP_GRAND_COST}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            )}
          </View>
          {/* Gold */}
          <View style={{ width: COL_W }}>
            {hasGold ? (
              <Pressable onPress={hasGoldToClaim ? () => claimAllVpRewards('gold') : undefined}>
                <LinearGradient
                  colors={hasGoldToClaim ? ['#D4A854', '#A07830'] as const : ['rgba(60,35,55,0.5)', 'rgba(60,35,55,0.3)'] as const}
                  style={rs.buyBtn}
                >
                  <Text style={rs.buyBtnTxt}>Claim All</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable onPress={handleBuyGold}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={rs.buyBtn}>
                  <Text style={rs.buyBtnTxt}>$14.99</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,16,0.82)' },

  header: {
    width: '100%', height: SW * 0.52,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 46 : 34, right: 18, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },

  // XP bar
  xpRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8, gap: 6,
  },
  xpLevelBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#A855F7',
    alignItems: 'center', justifyContent: 'center',
  },
  xpBarBg: {
    flex: 1, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', justifyContent: 'center',
  },
  xpBarFill: { height: '100%', borderRadius: 7 },
  xpBarTxt: {
    position: 'absolute', alignSelf: 'center',
    fontSize: 9, fontWeight: '800', color: '#FFF',
  },
  levelPill: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
  },
  levelTxt: { fontSize: 11, fontWeight: '900', color: '#C084FC' },
});

const rs = StyleSheet.create({
  // Column headers
  headRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: GRID_PAD, marginBottom: 2,
  },
  headLabel: { fontSize: 8, fontWeight: '700', color: ROSE_DIM, textAlign: 'center' },
  headCol: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    marginLeft: COL_GAP,
  },
  headTxt: { fontSize: 11, fontWeight: '900' },

  // Grid
  gridScroll: { flex: 1, paddingHorizontal: GRID_PAD },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 2,
  },
  msCol: {
    width: MILESTONE_W, alignItems: 'center', justifyContent: 'center',
    height: CELL_H, position: 'relative',
  },
  progressSeg: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    left: MILESTONE_W / 2 - 1,
  },
  progressDone: { backgroundColor: GOLD },
  progressLocked: { backgroundColor: 'rgba(255,255,255,0.08)' },
  msPill: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(60,35,55,0.8)',
    borderWidth: 1.5, borderColor: 'rgba(232,180,180,0.15)',
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  msPillDone: {
    backgroundColor: 'rgba(210,160,80,0.25)', borderColor: GOLD,
  },
  msTxt: { fontSize: 9, fontWeight: '900', color: ROSE_DIM },
  msTxtDone: { color: GOLD },

  cellsRow: { flex: 1, flexDirection: 'row', gap: COL_GAP },
  cell: {
    height: CELL_H, borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  cellIcon: { width: 36, height: 36, marginBottom: 2 },
  cellAmt: { fontSize: 12, fontWeight: '900', color: ROSE_TEXT },
  cellAmtClaimed: { color: 'rgba(232,180,180,0.35)' },
  emptyDash: { fontSize: 16, fontWeight: '700', color: 'rgba(232,180,180,0.15)' },
  checkMark: { position: 'absolute', top: 4, right: 4 },
  lockIcon: { position: 'absolute', top: 4, right: 4 },

  // Bottom row
  bottomRow: {
    flexDirection: 'row', paddingHorizontal: GRID_PAD,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: 'rgba(10,8,16,0.9)',
    borderTopWidth: 1, borderTopColor: 'rgba(232,180,180,0.08)',
  },
  bottomCells: { flex: 1, flexDirection: 'row', gap: COL_GAP },
  buyBtn: {
    height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnTxt: { fontSize: 12, fontWeight: '900', color: '#FFF' },
});
