import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Platform, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { useGame } from '../context/GameContext';
import { STAFF_CARDS, STAFF_STAR_THRESHOLDS, STAFF_LEVEL_TROPHY_COST, STAFF_MAX_LEVEL, UPGRADES } from '../constants';
import { StaffCardDef, StaffRarity, StaffRole } from '../types';
import { getStaffStars, getStaffBonus } from '../utils';
import CurrencyIcon from '../components/CurrencyIcon';
import TutorialOverlay from '../components/TutorialOverlay';
import MiniScoreBar from '../components/MiniScoreBar';
import { StaffBoxOfferModal, EpicStaffOfferModal } from '../components/StaffOfferModal';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const RARITY_COLORS: Record<StaffRarity, string> = {
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};
const RARITY_BG: Record<StaffRarity, string> = {
  rare: '#1E3A5F',
  epic: '#3B1F5E',
  legendary: '#4A3000',
};
const RARITY_LABELS: Record<StaffRarity, string> = {
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const BUILDING_NAMES: Record<string, string> = {
  tickets: '🎟️ Tickets',
  marketing: '📢 Marketing',
  merch: '👕 Merch',
  training_hall: '🏋️ Training Hall',
  strategy_room: '📐 Strategy Room',
  infirmary: '🏥 Infirmary',
};

function StarBar({ copies }: { copies: number }) {
  const stars = getStaffStars(copies);
  return (
    <View style={ss.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={[ss.star, i <= stars ? ss.starActive : ss.starInactive]}>{i <= stars ? '★' : '☆'}</Text>
      ))}
    </View>
  );
}

const ROLE_TABS: { key: StaffRole; label: string; emoji: string }[] = [
  { key: 'marketer', label: 'Marketers', emoji: '💼' },
  { key: 'trainer',  label: 'Trainers',  emoji: '🏋️' },
  { key: 'doctor',   label: 'Doctors',   emoji: '🩺' },
];

export default function StaffScreen() {
  const { gameState, openFreeStaffBox, assignStaff, levelUpStaff, setTutorialStep, activateStaffOffers, claimStaffBoxOffer, claimEpicStaffOffer, dismissStaffBoxOffer, dismissEpicStaffOffer } = useGame();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  const [showOpened, setShowOpened] = useState(false);
  const [activeRole, setActiveRole] = useState<StaffRole>('marketer');
  const [tutOpenDismissed, setTutOpenDismissed] = useState(false);
  const [tutAssignDismissed, setTutAssignDismissed] = useState(false);
  const [boxOfferDismissed, setBoxOfferDismissed] = useState(false);
  const [epicOfferDismissed, setEpicOfferDismissed] = useState(false);
  const lvlUpAnim = useRef(new RNAnimated.Value(1)).current;
  const tutStep = gameState?.tutorialStep;

  const staff = gameState?.staff ?? {};
  const assigned = gameState?.staffAssigned ?? {};
  const trophies = gameState?.trophies ?? 0;
  const crystals = gameState?.crystals ?? 0;
  const fame = gameState?.fame ?? 0;
  const freeOpens = gameState?.freeStaffOpens ?? 0;

  const allCards = STAFF_CARDS.filter(c => c.role === activeRole);
  const ownedCards = allCards.filter(c => (staff[c.id]?.copies ?? 0) > 0);
  const unownedCards = allCards.filter(c => (staff[c.id]?.copies ?? 0) === 0);

  const handleLevelUp = useCallback((cardId: string) => {
    levelUpStaff(cardId);
    // Pulse animation
    lvlUpAnim.setValue(1.15);
    RNAnimated.spring(lvlUpAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  }, [levelUpStaff, lvlUpAnim]);

  const handleOpenFreeBox = useCallback(() => {
    if (freeOpens <= 0) return;
    const id = openFreeStaffBox();
    if (id) {
      setLastOpened(id);
      setShowOpened(true);
    }
  }, [freeOpens, openFreeStaffBox]);

  const selectedDef = selectedId ? allCards.find(c => c.id === selectedId) : null;
  const selectedOwned = selectedId ? staff[selectedId] : null;

  return (
    <View style={ss.container}>
      <MiniScoreBar />
      {/* Header */}
      <View style={ss.header}>
        <Text style={ss.headerTitle}>Staff</Text>
      </View>

      {/* Go to Shop button */}
      <Pressable style={ss.goToShopBtn} onPress={() => router.push('/tabs/shop')}>
        <Ionicons name="cart" size={16} color="#FFF" />
        <Text style={ss.goToShopText}>Open Staff Boxes in Shop</Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {/* Role tabs */}
      <View style={ss.roleTabs}>
        {ROLE_TABS.map(tab => {
          const hasUpgradeable = STAFF_CARDS.some(c => {
            if (c.role !== tab.key) return false;
            const own = staff[c.id];
            if (!own || own.copies <= 0) return false;
            return own.level < STAFF_MAX_LEVEL && fame >= STAFF_LEVEL_TROPHY_COST(own.level);
          });
          return (
            <Pressable
              key={tab.key}
              style={[ss.roleTab, activeRole === tab.key && ss.roleTabActive]}
              onPress={() => setActiveRole(tab.key)}
            >
              <View>
                <Text style={ss.roleTabEmoji}>{tab.emoji}</Text>
                {hasUpgradeable && activeRole !== tab.key && <View style={ss.roleTabBadge} />}
              </View>
              <Text style={[ss.roleTabLabel, activeRole === tab.key && ss.roleTabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={ss.scroll} contentContainerStyle={ss.scrollContent}>
        {/* Owned */}
        {ownedCards.length > 0 && (
          <>
            <Text style={ss.sectionTitle}>YOUR STAFF ({ownedCards.length}/{allCards.length})</Text>
            {(['legendary', 'epic', 'rare'] as StaffRarity[]).map(rarity => {
              const cards = ownedCards.filter(c => c.rarity === rarity);
              if (cards.length === 0) return null;
              return (
                <View key={rarity}>
                  <Text style={[ss.rarityLabel, { color: RARITY_COLORS[rarity] }]}>{RARITY_LABELS[rarity]}</Text>
                  {cards.map(card => {
                    const own = staff[card.id]!;
                    const bonus = getStaffBonus(card, own);
                    const assignedBldg = Object.entries(assigned).find(([, v]) => v === card.id)?.[0];
                    const lvlCost = STAFF_LEVEL_TROPHY_COST(own.level);
                    const canUpgrade = own.level < STAFF_MAX_LEVEL && fame >= lvlCost;
                    return (
                      <Pressable key={card.id} style={[ss.card, { borderLeftColor: RARITY_COLORS[card.rarity] }]} onPress={() => setSelectedId(card.id)}>
                        <View style={[ss.cardIcon, { backgroundColor: RARITY_BG[card.rarity] }]}>
                          <Text style={ss.cardEmoji}>{card.emoji}</Text>
                        </View>
                        <View style={ss.cardInfo}>
                          <Text style={ss.cardName}>{card.name}</Text>
                          <View style={ss.cardMetaRow}>
                            <StarBar copies={own.copies} />
                            <Text style={ss.cardLvl}>Lv.{own.level}</Text>
                            <Text style={[ss.cardBonus, { color: RARITY_COLORS[card.rarity] }]}>+{Math.round(bonus * 100)}%</Text>
                          </View>
                          {assignedBldg && <Text style={ss.assignedLabel}>→ {BUILDING_NAMES[assignedBldg] ?? assignedBldg}</Text>}
                        </View>
                        {canUpgrade && <View style={ss.redDot} />}
                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}

        {/* Not yet owned */}
        {unownedCards.length > 0 && (
          <>
            <Text style={[ss.sectionTitle, { marginTop: 16 }]}>UNDISCOVERED ({unownedCards.length})</Text>
            {unownedCards.map(card => (
              <View key={card.id} style={[ss.card, ss.cardLocked, { borderLeftColor: Colors.textMuted }]}> 
                <View style={[ss.cardIcon, { backgroundColor: '#1E293B' }]}>
                  <Text style={ss.cardEmoji}>?</Text>
                </View>
                <View style={ss.cardInfo}>
                  <Text style={[ss.cardName, { color: Colors.textMuted }]}>???</Text>
                  <Text style={[ss.rarityLabel, { color: RARITY_COLORS[card.rarity], fontSize: 10, marginTop: 2 }]}>{RARITY_LABELS[card.rarity]}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {ownedCards.length === 0 && unownedCards.length === 0 && (
          <View style={ss.emptyState}>
            <Text style={ss.emptyEmoji}>📦</Text>
            <Text style={ss.emptyTitle}>No Staff Yet</Text>
            <Text style={ss.emptyHint}>Open boxes to get staff cards!</Text>
          </View>
        )}
      </ScrollView>

      {/* Free box → redirect to shop */}
      {freeOpens > 0 && (
        <Pressable style={ss.freeOpenBtn} onPress={() => router.push('/tabs/shop')}>
          <Text style={ss.freeOpenBtnText}>🎁 {freeOpens} Free Box{freeOpens > 1 ? 'es' : ''} Available!</Text>
          <Text style={ss.freeOpenBtnHint}>Tap to open in Shop</Text>
        </Pressable>
      )}

      {/* Detail modal */}
      <Modal visible={!!selectedDef && !!selectedOwned} transparent animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <Pressable style={ss.modalOverlay} onPress={() => setSelectedId(null)}>
          <Pressable style={ss.modalSheet} onPress={(e) => e.stopPropagation()}>
            {selectedDef && selectedOwned && (() => {
              const bonus = getStaffBonus(selectedDef, selectedOwned);
              const lvlCost = STAFF_LEVEL_TROPHY_COST(selectedOwned.level);
              const canLvl = selectedOwned.level < STAFF_MAX_LEVEL && fame >= lvlCost;
              const stars = getStaffStars(selectedOwned.copies);
              const nextCopies = STAFF_STAR_THRESHOLDS[stars] ?? null;
              return (
                <>
                  <View style={ss.modalHeader}>
                    <View style={[ss.modalIcon, { backgroundColor: RARITY_BG[selectedDef.rarity] }]}>
                      <Text style={{ fontSize: 32 }}>{selectedDef.emoji}</Text>
                    </View>
                    <View style={ss.modalTitleArea}>
                      <Text style={ss.modalName}>{selectedDef.name}</Text>
                      <Text style={[ss.modalRarity, { color: RARITY_COLORS[selectedDef.rarity] }]}>{RARITY_LABELS[selectedDef.rarity]} {selectedDef.role === 'marketer' ? 'Marketer' : selectedDef.role === 'doctor' ? 'Doctor' : 'Trainer'}</Text>
                      <StarBar copies={selectedOwned.copies} />
                    </View>
                    <Pressable onPress={() => setSelectedId(null)} hitSlop={12}>
                      <Ionicons name="close" size={24} color={Colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={ss.modalStatRow}>
                    <Text style={ss.modalStatLabel}>Level</Text>
                    <Text style={ss.modalStatVal}>{selectedOwned.level} / {STAFF_MAX_LEVEL}</Text>
                  </View>
                  <View style={ss.modalStatRow}>
                    <Text style={ss.modalStatLabel}>
                      {selectedDef.role === 'marketer' ? 'Income Bonus' : selectedDef.role === 'doctor' ? 'Healing Speed' : 'Duration Bonus'}
                    </Text>
                    <Text style={[ss.modalStatVal, { color: '#22C55E' }]}>+{Math.round(bonus * 100)}%</Text>
                  </View>
                  <View style={ss.modalStatRow}>
                    <Text style={ss.modalStatLabel}>Cards</Text>
                    <Text style={ss.modalStatVal}>{selectedOwned.copies}{nextCopies ? ` / ${nextCopies} (next ★)` : ' (MAX ★)'}</Text>
                  </View>
                  <View style={ss.modalStatRow}>
                    <Text style={ss.modalStatLabel}>Can assign to</Text>
                    <Text style={ss.modalStatVal}>{selectedDef.buildings.map(b => BUILDING_NAMES[b] ?? b).join(', ')}</Text>
                  </View>

                  {/* Level up */}
                  <View style={ss.lvlUpRow}>
                    <RNAnimated.View style={{ transform: [{ scale: lvlUpAnim }] }}>
                      <Pressable
                        style={[ss.actionBtn, ss.lvlUpBtn, !canLvl && ss.actionBtnDisabled]}
                        onPress={() => { handleLevelUp(selectedDef.id); }}
                        disabled={!canLvl}
                      >
                        {selectedOwned.level >= STAFF_MAX_LEVEL ? (
                          <Text style={ss.actionBtnText}>MAX LEVEL</Text>
                        ) : (
                          <View style={ss.lvlUpContent}>
                            <Text style={ss.actionBtnText}>Level Up</Text>
                            <CurrencyIcon type="fame" size={16} />
                            <Text style={ss.actionBtnText}>{lvlCost}</Text>
                          </View>
                        )}
                      </Pressable>
                    </RNAnimated.View>
                    {canLvl && <View style={ss.redDotLvl} />}
                  </View>

                  {/* Assign to building */}
                  <Text style={ss.assignTitle}>Assign to Building</Text>
                  {selectedDef.buildings.map(bId => {
                    const isAssignedHere = assigned[bId] === selectedDef.id;
                    const otherStaff = assigned[bId] && assigned[bId] !== selectedDef.id ? STAFF_CARDS.find(c => c.id === assigned[bId]) : null;
                    return (
                      <Pressable
                        key={bId}
                        style={[ss.buildingBtn, isAssignedHere && ss.buildingBtnActive]}
                        onPress={() => {
                          if (isAssignedHere) assignStaff(bId, null);
                          else assignStaff(bId, selectedDef.id);
                        }}
                      >
                        <Text style={ss.buildingBtnText}>{BUILDING_NAMES[bId] ?? bId}</Text>
                        {isAssignedHere && <Text style={ss.buildingBtnCheck}>✓ Assigned</Text>}
                        {otherStaff && <Text style={ss.buildingBtnOther}>{otherStaff.emoji} {otherStaff.name}</Text>}
                      </Pressable>
                    );
                  })}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Box opened popup */}
      <Modal visible={showOpened} transparent animationType="fade" onRequestClose={() => setShowOpened(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.openedCard}>
            {(() => {
              const def = lastOpened ? STAFF_CARDS.find(c => c.id === lastOpened) : null;
              if (!def) return null;
              const own = staff[def.id];
              return (
                <>
                  <View style={[ss.openedIcon, { backgroundColor: RARITY_BG[def.rarity] }]}>
                    <Text style={{ fontSize: 48 }}>{def.emoji}</Text>
                  </View>
                  <Text style={[ss.openedRarity, { color: RARITY_COLORS[def.rarity] }]}>{RARITY_LABELS[def.rarity]}</Text>
                  <Text style={ss.openedName}>{def.name}</Text>
                  {own && <Text style={ss.openedCopies}>Cards: {own.copies}</Text>}
                  <Pressable style={ss.openedCloseBtn} onPress={() => { setShowOpened(false); activateStaffOffers(); }}>
                    <Text style={ss.openedCloseTxt}>OK</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Tutorial overlays */}
      <TutorialOverlay
        visible={tutStep === 'staff_open' && !tutOpenDismissed}
        emoji="🎁"
        text="Open a Free Staff Box!"
        subText="Tap the Free Box button above to hire your first staff member!"
        buttonText="OK"
        onPress={() => setTutOpenDismissed(true)}
        position="center"
      />
      <TutorialOverlay
        visible={tutStep === 'staff_assign' && !tutAssignDismissed && !showOpened}
        emoji="📋"
        text="Assign Your Staff!"
        subText="Let's assign your new staff member to a building to boost income!"
        buttonText="Assign Now"
        onPress={() => {
          setTutAssignDismissed(true);
          // Find first compatible income building for the opened card
          const INCOME_BUILDINGS = ['tickets', 'marketing', 'merch'];
          const card = lastOpened ? STAFF_CARDS.find(c => c.id === lastOpened) : null;
          const buildingId = card?.buildings?.find(b => INCOME_BUILDINGS.includes(b)) ?? 'tickets';
          router.replace(`/tabs?assignBuilding=${buildingId}`);
        }}
        position="center"
      />
      <TutorialOverlay
        visible={tutStep === 'staff_done'}
        emoji="🏆"
        text="Staff System Unlocked!"
        subText="Level up staff with Fame tokens to increase their bonus. Collect more cards from boxes to earn stars!"
        buttonText="Got It!"
        onPress={() => setTutorialStep(undefined)}
        position="center"
      />

      {/* Staff box offer popup — only when Staff tab is focused */}
      <StaffBoxOfferModal
        visible={isFocused && !boxOfferDismissed && !!(gameState?.staffBoxOfferShown && !gameState?.staffBoxOfferClaimed)}
        expiresAt={gameState?.staffBoxOfferExpiresAt}
        onBuy={async () => {
          const purchased = await requestPurchase(PRODUCT_IDS.staff_offer_legendary);
          if (!purchased) return;
          claimStaffBoxOffer();
          setBoxOfferDismissed(true);
        }}
        onDismiss={() => { setBoxOfferDismissed(true); }}
      />

      {/* Epic staff offer popup — only when Staff tab is focused */}
      <EpicStaffOfferModal
        visible={isFocused && !epicOfferDismissed && !!(gameState?.epicStaffOfferShown && !gameState?.epicStaffOfferClaimed && gameState?.epicStaffOfferCardId)}
        cardId={gameState?.epicStaffOfferCardId}
        onBuy={async () => {
          const purchased = await requestPurchase(PRODUCT_IDS.staff_offer_epic);
          if (!purchased) return;
          claimEpicStaffOffer();
          setEpicOfferDismissed(true);
        }}
        onDismiss={() => { setEpicOfferDismissed(true); }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 44 : 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.dark },
  goToShopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 10, marginHorizontal: Spacing.lg, marginBottom: 6, ...cardShadow },
  goToShopText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  roleTabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 6, marginBottom: 4 },
  roleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.background },
  roleTabActive: { backgroundColor: Colors.primary },
  roleTabEmoji: { fontSize: 14 },
  roleTabLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  roleTabLabelActive: { color: '#FFF' },
  roleTabBadge: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 6, marginTop: 8 },
  rarityLabel: { fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 10, marginBottom: 6, borderLeftWidth: 3, ...cardShadow },
  cardLocked: { opacity: 0.5 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardLvl: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  cardBonus: { fontSize: 11, fontWeight: '800' },
  assignedLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  starRow: { flexDirection: 'row', gap: 1 },
  star: { fontSize: 12 },
  starActive: { color: '#FBBF24' },
  starInactive: { color: '#475569' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark, marginTop: 8 },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalTitleArea: { flex: 1 },
  modalName: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  modalRarity: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  modalStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  modalStatLabel: { fontSize: 13, color: Colors.textSecondary },
  modalStatVal: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  actionBtn: { backgroundColor: '#F59E0B', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  actionBtnDisabled: { backgroundColor: '#CBD5E1', opacity: 0.6 },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  assignTitle: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, marginTop: 14, marginBottom: 6 },
  buildingBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 8, padding: 10, marginBottom: 6 },
  buildingBtnActive: { backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#22C55E' },
  buildingBtnText: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  buildingBtnCheck: { fontSize: 11, fontWeight: '700', color: '#22C55E' },
  buildingBtnOther: { fontSize: 11, color: Colors.textMuted },
  /* Box opened */
  openedCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 24, alignItems: 'center', marginHorizontal: 40, marginBottom: 100 },
  openedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  openedRarity: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  openedName: { fontSize: 20, fontWeight: '900', color: Colors.dark, marginBottom: 4 },
  openedCopies: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  openedCloseBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 40 },
  openedCloseTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  /* Free open button */
  freeOpenBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16, marginHorizontal: Spacing.md, marginBottom: Spacing.md, alignItems: 'center', ...cardShadow },
  freeOpenBtnText: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  freeOpenBtnHint: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 4 },
  redDotLvl: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', position: 'absolute', top: 6, right: -2 },
  lvlUpRow: { position: 'relative', marginTop: 12, marginHorizontal: 4 },
  lvlUpBtn: { flexDirection: 'row', paddingHorizontal: 16 },
  lvlUpContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
