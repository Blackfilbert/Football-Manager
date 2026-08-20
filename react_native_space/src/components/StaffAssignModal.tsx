import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { useGame } from '../context/GameContext';
import { STAFF_CARDS } from '../constants';
import { getStaffStars, getStaffBonus } from '../utils';

const RARITY_COLORS: Record<string, string> = {
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};
const RARITY_BG: Record<string, string> = {
  rare: '#1E3A5F',
  epic: '#3B1F5E',
  legendary: '#4A3000',
};

interface Props {
  buildingId: string;
  buildingName: string;
  visible: boolean;
  onClose: () => void;
}

export default function StaffAssignModal({ buildingId, buildingName, visible, onClose }: Props) {
  const { gameState, assignStaff } = useGame();
  const staff = gameState?.staff ?? {};
  const assigned = gameState?.staffAssigned ?? {};
  const currentStaffId = assigned[buildingId] ?? null;

  // Get eligible staff cards for this building that are owned
  const eligible = STAFF_CARDS.filter(
    c => c.buildings.includes(buildingId) && (staff[c.id]?.copies ?? 0) > 0
  );

  const handleAssign = (staffId: string | null) => {
    assignStaff(buildingId, staffId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.headerRow}>
            <Text style={s.title}>Assign Staff</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={s.subtitle}>{buildingName}</Text>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {/* Unassign option */}
            {currentStaffId && (
              <Pressable style={[s.card, s.cardRemove]} onPress={() => handleAssign(null)}>
                <View style={s.removeIcon}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>Remove Staff</Text>
                  <Text style={s.cardMeta}>No bonus applied</Text>
                </View>
              </Pressable>
            )}

            {eligible.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyText}>No eligible staff owned</Text>
                <Text style={s.emptyHint}>Open boxes in the Staff tab to get marketers!</Text>
              </View>
            )}

            {eligible.map(card => {
              const own = staff[card.id]!;
              const stars = getStaffStars(own.copies);
              const bonus = getStaffBonus(card, own);
              const isCurrentlyAssigned = currentStaffId === card.id;
              // Check if this staff is assigned elsewhere
              const assignedElsewhere = Object.entries(assigned).find(([bId, sId]) => sId === card.id && bId !== buildingId)?.[0];

              return (
                <Pressable
                  key={card.id}
                  style={[s.card, isCurrentlyAssigned && s.cardActive]}
                  onPress={() => handleAssign(card.id)}
                >
                  <View style={[s.iconCircle, { backgroundColor: RARITY_BG[card.rarity] }]}>
                    <Text style={s.emoji}>{card.emoji}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.cardName}>{card.name}</Text>
                    <View style={s.metaRow}>
                      <View style={s.starRow}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Text key={i} style={{ fontSize: 10, color: i <= stars ? '#FBBF24' : '#475569' }}>
                            {i <= stars ? '★' : '☆'}
                          </Text>
                        ))}
                      </View>
                      <Text style={s.lvl}>Lv.{own.level}</Text>
                      <Text style={[s.bonus, { color: RARITY_COLORS[card.rarity] }]}>+{Math.round(bonus * 100)}% {card.role === 'marketer' ? 'income' : card.role === 'doctor' ? 'heal' : 'duration'}</Text>
                    </View>
                    {assignedElsewhere && (
                      <Text style={s.elsewhere}>Currently on {assignedElsewhere.replace(/_/g, ' ')}</Text>
                    )}
                  </View>
                  {isCurrentlyAssigned && (
                    <View style={s.checkBadge}>
                      <Text style={s.checkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 30, maxHeight: '60%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  subtitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
  list: { flexGrow: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 6,
    ...cardShadow,
  },
  cardActive: { borderWidth: 1.5, borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  cardRemove: { borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  removeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  emoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  cardMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  starRow: { flexDirection: 'row', gap: 1 },
  lvl: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  bonus: { fontSize: 11, fontWeight: '800' },
  elsewhere: { fontSize: 9, fontWeight: '600', color: '#F59E0B', marginTop: 2 },
  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  emptyHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
});
