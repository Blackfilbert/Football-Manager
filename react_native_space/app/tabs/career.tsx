import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Image, Dimensions, ImageSourcePropType, Modal, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '../../src/context/GameContext';
import { Colors, Spacing } from '../../src/theme';
import { SKILL_COSTS, SKILL_MAX_LEVEL } from '../../src/constants';
import { CareerSkills } from '../../src/types';
import { LinearGradient } from 'expo-linear-gradient';
import BattlePassModal from '../../src/components/BattlePassModal';
import TutorialOverlay from '../../src/components/TutorialOverlay';

const TROPHY_IMG = require('../../assets/images/trophy_icon.png');

const SW = Dimensions.get('window').width;
const CARD_W = Math.min(SW * 0.6, 240);
const CARD_H = CARD_W * 1.32;

const SKILL_IMAGES: Record<string, ImageSourcePropType> = {
  shot: require('../../assets/skill_shot.png'),
  pass: require('../../assets/skill_pass.png'),
  dribbling: require('../../assets/skill_dribbling.png'),
  speed: require('../../assets/skill_speed.png'),
  stamina: require('../../assets/skill_stamina.png'),
  tactics: require('../../assets/skill_tactics.png'),
};

type SkillDef = { key: keyof CareerSkills; label: string };

const SKILLS: SkillDef[] = [
  { key: 'shot', label: 'SHOT' },
  { key: 'pass', label: 'PASS' },
  { key: 'dribbling', label: 'DRIBBLING' },
  { key: 'speed', label: 'SPEED' },
  { key: 'stamina', label: 'STAMINA' },
  { key: 'tactics', label: 'TACTICS' },
];

const BP_POWERS = [500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900];

export default function CareerScreen() {
  const router = useRouter();
  const { gameState, initCareerPlayer, upgradeCareerSkill, updateCareerName, updateCareerNumber, teamPower, setTutorialStep } = useGame();
  const cp = gameState?.careerPlayer;
  const trophies = gameState?.trophies ?? 0;

  const [showNumPicker, setShowNumPicker] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showBattlePass, setShowBattlePass] = useState(false);

  const scoutLvl = gameState?.scoutLevel ?? 1;
  useEffect(() => { if (!cp && scoutLvl >= 3) initCareerPlayer(); }, [cp, scoutLvl]);

  // Battle pass unclaimed indicator
  const freeClaimed = gameState?.battlePassClaimed ?? [];
  const hasUnclaimedBP = BP_POWERS.some((p, i) => !freeClaimed.includes(i) && teamPower >= p);

  if (!cp) return <View style={s.root}><Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 120 }}>Loading...</Text></View>;

  const NUMBERS = Array.from({ length: 99 }, (_, i) => i + 1);

  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length > 0) updateCareerName(trimmed);
    setShowNameEdit(false);
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.hdr}>
        <View style={s.hdrLeft}>
          <Text style={s.hdrTitle}>CAREER MODE</Text>
        </View>
        <View style={s.hdrRight}>
          <View style={s.trophyChip}>
            <Image source={TROPHY_IMG} style={s.trophyIcon} />
            <Text style={s.trophyNum}>{trophies}</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={14} style={s.hdrCircle}>
            <Ionicons name="close" size={22} color="#334155" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* === PLAYER CARD (centered) === */}
        <View style={s.cardArea}>
          <View style={s.cardWrap}>
            <LinearGradient colors={['#1E3A8A', '#0B1120'] as const} style={s.cardShell}>
              <View style={s.cardClip}>
                <Image source={require('../../assets/career_player_bg.png')} style={s.cardImg} resizeMode="cover" />
                <Pressable style={s.numBadge} onPress={() => setShowNumPicker(true)}>
                  <Text style={s.numTxt}>{cp.number ?? 7}</Text>
                </Pressable>
                <Pressable style={s.nameStrip} onPress={() => { setNameInput(cp.name); setShowNameEdit(true); }}>
                  <Text style={s.nameText}>{cp.name.toUpperCase()}</Text>
                  <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.5)" style={{ marginLeft: 6 }} />
                </Pressable>
                <View style={s.statsStrip}>
                  <View style={s.sSide}>
                    <Text style={s.sEmoji}>{"\u2694\uFE0F"}</Text>
                    <Text style={[s.sVal, { color: '#EF4444' }]}>{cp.attack}</Text>
                  </View>
                  <View style={s.sDivider} />
                  <View style={s.sSide}>
                    <Text style={s.sEmoji}>{"\uD83D\uDEE1\uFE0F"}</Text>
                    <Text style={[s.sVal, { color: '#3B82F6' }]}>{cp.defense}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
          {/* Power Pass button — left side */}
          <Pressable style={s.bpBtn} onPress={() => setShowBattlePass(true)}>
            <Image source={require('../../assets/images/power_icon.png')} style={s.bpIcon} />
            {hasUnclaimedBP && <View style={s.bpDot} />}
          </Pressable>
        </View>

        {/* === INFO ROW === */}
        <View style={s.infoRow}>
          {[
            { ic: 'star' as const, val: String(cp.overall), lbl: 'OVERALL RATING' },
            { ic: 'football' as const, val: cp.position, lbl: 'POSITION' },
            { ic: 'football' as const, val: String(cp.goalsScored ?? 0), lbl: 'GOALS' },
          ].map((it, i) => (
            <View key={i} style={[s.infoCell, i < 2 && s.infoBorder]}>
              <View style={s.infoIc}><Ionicons name={it.ic} size={16} color="#2563EB" /></View>
              <Text style={s.infoVal}>{it.val}</Text>
              <Text style={s.infoLbl}>{it.lbl}</Text>
            </View>
          ))}
        </View>

        {/* === SKILLS === */}
        <View style={s.skHdr}>
          <Text style={s.skTitle}>SKILLS</Text>
          <View style={s.skLine} />
        </View>

        <View style={s.skGrid}>
          {SKILLS.map(sk => {
            const lv = cp.skills[sk.key] ?? 0;
            const max = false;
            const cost = lv < SKILL_COSTS.length
              ? SKILL_COSTS[lv]
              : Math.floor(5 + (lv - SKILL_COSTS.length + 1) * 2);
            const ok = trophies >= cost;
            return (
              <View key={sk.key} style={s.skCard}>
                <View style={s.skTop}>
                  <Image source={SKILL_IMAGES[sk.key]} style={s.skImg} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.skName}>{sk.label}</Text>
                    <Text style={s.skLv}>Lv. {lv}  {!max && <Text style={s.skBonus}>+{cost} {"\uD83C\uDFC6"}</Text>}</Text>
                  </View>
                </View>
                {max ? (
                  <View style={s.skMaxBadge}>
                    <Text style={s.skMaxTxt}>MAX</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[s.skBtn, !ok && s.skBtnOff]}
                    onPress={() => upgradeCareerSkill(sk.key)}
                    disabled={!ok}
                  >
                    <Text style={[s.skBtnTxt, !ok && s.skBtnTxtOff]}>Upgrade {cost} {"\uD83C\uDFC6"}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* === HOW TO EARN === */}
        <View style={s.earnCard}>
          <Text style={s.earnTitle}>How to earn trophies</Text>
          <Text style={s.earnHint}>Finish top 3 in a stadium season</Text>
          <View style={s.earnHeader}>
            <Text style={[s.earnL, { flex: 2 }]}>Stadium</Text>
            <Text style={s.earnColH}>{"\uD83E\uDD47"}</Text>
            <Text style={s.earnColH}>{"\uD83E\uDD48"}</Text>
            <Text style={s.earnColH}>{"\uD83E\uDD49"}</Text>
          </View>
          {[
            ['Tier 1-2', 5],
            ['Tier 3-7', 10],
            ['Tier 8-13', 20],
            ['Tier 14-23', 30],
            ['Tier 24+', 50],
          ].map(([l, b]) => {
            const base = b as number;
            return (
              <View key={l as string} style={s.earnRow}>
                <Text style={[s.earnL, { flex: 2 }]}>{l as string}</Text>
                <Text style={s.earnCol}>{base}</Text>
                <Text style={s.earnCol}>{Math.floor(base * 0.6)}</Text>
                <Text style={s.earnCol}>{Math.floor(base * 0.3)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* === NUMBER PICKER MODAL === */}
      <Modal visible={showNumPicker} transparent animationType="fade">
        <Pressable style={s.modalBg} onPress={() => setShowNumPicker(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Choose Number</Text>
            <FlatList
              data={NUMBERS}
              numColumns={5}
              keyExtractor={n => String(n)}
              contentContainerStyle={s.numGrid}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.numCell, (cp.number ?? 7) === item && s.numCellActive]}
                  onPress={() => { updateCareerNumber(item); setShowNumPicker(false); }}
                >
                  <Text style={[s.numCellTxt, (cp.number ?? 7) === item && s.numCellTxtActive]}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* === BATTLE PASS MODAL === */}
      <BattlePassModal visible={showBattlePass} onClose={() => setShowBattlePass(false)} />

      {/* === NAME EDIT MODAL === */}
      <Modal visible={showNameEdit} transparent animationType="fade">
        <Pressable style={s.modalBg} onPress={() => setShowNameEdit(false)}>
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>Player Name</Text>
            <TextInput
              style={s.nameInputField}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={20}
              autoFocus
              placeholder="Enter name"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={handleNameSave}
              returnKeyType="done"
            />
            <Pressable style={s.nameSaveBtn} onPress={handleNameSave}>
              <Text style={s.nameSaveTxt}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <TutorialOverlay
        visible={gameState?.tutorialStep === 'career_trophies'}
        emoji="🏆"
        text="Meet Your Career Player!"
        subText="Upgrade skills using Trophies 🏆. You earn Trophies every time you promote to a new stadium!"
        buttonText="Next"
        onPress={() => setTutorialStep('career_place')}
      />
      <TutorialOverlay
        visible={gameState?.tutorialStep === 'career_place'}
        emoji="👟"
        text="Place Him in Your Team!"
        subText="Go to Team Hub → My Team and swap your career player into the starting lineup!"
        buttonText="Go to Team"
        onPress={() => { setTutorialStep(undefined); router.push('/tabs/teamhub?tab=myteam'); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8EDF4' },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 14 : 12, paddingBottom: 6 },
  hdrLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hdrCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: 0.3 },
  hdrRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trophyChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  trophyIcon: { width: 18, height: 18 },
  trophyNum: { fontSize: 14, fontWeight: '900', color: '#92400E' },
  body: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 80 },
  /* Card area */
  cardArea: { alignItems: 'center', marginTop: 6, width: '100%' },
  bpBtn: { position: 'absolute', left: -12, top: '50%', marginTop: -22, width: 58, height: 34, borderRadius: 8, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  bpIcon: { width: 55, height: 30.6, resizeMode: 'cover' as const, borderRadius: 5 },
  bpDot: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
  /* Card */
  cardWrap: { },
  cardShell: { width: CARD_W + 6, height: CARD_H + 6, borderRadius: 18, borderWidth: 2, borderColor: '#2563EB', padding: 3 },
  cardClip: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8EDF4' },
  cardImg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  numBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#F97316', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  numTxt: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  nameStrip: { position: 'absolute', bottom: 40, left: 0, right: 0, backgroundColor: 'rgba(8,18,38,0.7)', paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nameText: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 },
  statsStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: 'rgba(8,18,38,0.85)', paddingVertical: 7, justifyContent: 'center', alignItems: 'center' },
  sSide: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60, justifyContent: 'center' },
  sEmoji: { fontSize: 14 },
  sVal: { fontSize: 17, fontWeight: '900', color: '#FFF' },
  sDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  /* Info row */
  infoRow: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, marginTop: 12, width: '100%', paddingVertical: 10 },
  infoCell: { flex: 1, alignItems: 'center' },
  infoBorder: { borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  infoIc: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4FF' },
  infoVal: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  infoLbl: { fontSize: 7, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginTop: 1 },
  /* Skills */
  skHdr: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16, marginBottom: 8, gap: 8 },
  skTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', letterSpacing: 1 },
  skLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  skGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  skCard: { width: '48%', flexGrow: 1, flexBasis: '46%', backgroundColor: '#FFF', borderRadius: 12, padding: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  skTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  skImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9' },
  skName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  skLv: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  skBonus: { color: '#F59E0B', fontWeight: '700' },
  skBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  skBtnOff: { backgroundColor: '#CBD5E1', opacity: 0.7 },
  skBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  skBtnTxtOff: { color: '#94A3B8' },
  skMaxBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  skMaxTxt: { color: '#D97706', fontWeight: '800', fontSize: 13 },
  /* Earn info */
  earnCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginTop: 14, width: '100%' },
  earnTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  earnHint: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  earnHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 2 },
  earnColH: { flex: 1, fontSize: 14, textAlign: 'center' },
  earnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  earnL: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  earnCol: { flex: 1, fontSize: 12, fontWeight: '800', color: '#F59E0B', textAlign: 'center' },
  /* Modals */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '80%', maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 14 },
  numGrid: { paddingBottom: 8 },
  numCell: { flex: 1, margin: 4, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  numCellActive: { backgroundColor: '#2563EB' },
  numCellTxt: { fontSize: 16, fontWeight: '800', color: '#334155' },
  numCellTxtActive: { color: '#FFF' },
  nameInputField: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
  nameSaveBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  nameSaveTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
