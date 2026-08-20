/* ── Valor GP Match: Vertical 5v5 with full LiveMatch-style animation ── */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Platform, Pressable, Image, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { VGPMatchState } from './types';
import { useValorGP, VGPSquadPlayer } from './context';
import { useGame } from '../context/GameContext';
import { LAST_NAMES } from '../constants';

// Map pitch index → VGP squad slot index
// Pitch: [0=GK, 1=LM, 2=RM, 3=CD, 4=ST]
// Squad: [0=GK, 1=CD, 2=LM, 3=RM, 4=ST]
const PITCH_TO_SQUAD: number[] = [0, 2, 3, 1, 4];

const { width: SW, height: SH } = Dimensions.get('window');
const PITCH_W = SW - 32;
const PITCH_H = Math.min(SH * 0.55, 440);
const DOT_SIZE = 12;
const BALL_SIZE = 8;

// 5v5 vertical diamond: y=0 top (opponent goal), y=1 bottom (my goal)
// HOME pitch indices: [0=GK, 1=LM, 2=RM, 3=CD, 4=ST]
// Maps to VGP squad: [GK→0, CD→3, LM→1, RM→2, ST→4]
const HOME_POS = [
  { x: 0.5,  y: 0.92 },  // 0: GK
  { x: 0.20, y: 0.58 },  // 1: LM (left midfield)
  { x: 0.80, y: 0.58 },  // 2: RM (right midfield)
  { x: 0.5,  y: 0.74 },  // 3: CD (center defense)
  { x: 0.5,  y: 0.35 },  // 4: ST (striker)
];
const AWAY_POS = [
  { x: 0.5,  y: 0.08 },  // 0: GK
  { x: 0.80, y: 0.42 },  // 1: LM
  { x: 0.20, y: 0.42 },  // 2: RM
  { x: 0.5,  y: 0.26 },  // 3: CD
  { x: 0.5,  y: 0.65 },  // 4: ST
];

interface DotAnim { tx: Animated.Value; ty: Animated.Value }

function createDots(positions: { x: number; y: number }[]): DotAnim[] {
  return positions.map(p => ({
    tx: new Animated.Value(p.x * (PITCH_W - DOT_SIZE)),
    ty: new Animated.Value(p.y * (PITCH_H - DOT_SIZE)),
  }));
}

const SPEED = 1.5; // animation speed multiplier (1.5x faster)
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (a: number, b: number) => (a + Math.random() * (b - a)) / SPEED;
const toward = (cur: number, tgt: number, s: number) => cur + (tgt - cur) * s;
/** Duration helper for hardcoded values */
const spd = (ms: number) => ms / SPEED;

interface Props {
  matchState: VGPMatchState;
  difficulty: number;
  runWins: number;
  showResult: 'won' | 'lost' | null;
  opponentName: string;
  opponentPower: number;
  onContinue: () => void;
  onEndRun: () => void;
  onBack: () => void;
}

export default function VGPMatchScreen({
  matchState, difficulty, runWins, showResult, opponentName, opponentPower, onContinue, onEndRun, onBack,
}: Props) {
  const { tickRef, vgpPower, squadPlayers, state: vgpState, getTimeRemaining } = useValorGP();
  const { gameState } = useGame();
  const teamColor = gameState?.teamColor ?? '#3B82F6';
  const teamName = gameState?.teamName ?? 'My Team';
  // Build pitch-indexed names from squad (for labels under dots)
  const homeNames: string[] = [0, 1, 2, 3, 4].map(pitchIdx => {
    const squadIdx = PITCH_TO_SQUAD[pitchIdx] ?? pitchIdx;
    return squadPlayers[squadIdx]?.lastName ?? '';
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canUseNative = Platform.OS !== 'web';

  const homeDotsRef = useRef<DotAnim[]>(createDots(HOME_POS));
  const awayDotsRef = useRef<DotAnim[]>(createDots(AWAY_POS));
  const ballTx = useRef(new Animated.Value(0.5 * (PITCH_W - BALL_SIZE))).current;
  const ballTy = useRef(new Animated.Value(0.5 * (PITCH_H - BALL_SIZE))).current;
  const posRef = useRef({ home: HOME_POS.map(p => ({ ...p })), away: AWAY_POS.map(p => ({ ...p })) });

  const possessionRef = useRef<'home' | 'away'>('home');
  const attackPhaseRef = useRef(0);
  const ballCarrierRef = useRef(3); // start with MID
  const goalAnimRef = useRef(false);
  const mountedRef = useRef(true);
  const matchPausedRef = useRef(false); // true while result overlay shows — pauses anims without killing loops
  const ballPosRef = useRef({ x: 0.5, y: 0.5 });
  const ballBusyRef = useRef(false);
  const frozenRef = useRef<Set<string>>(new Set());
  const turnoverCdRef = useRef(0);
  const pendingGoalQueueRef = useRef<{ isHome: boolean }[]>([]);
  const processedEvtsRef = useRef(0);
  const gameMinuteRef = useRef(0);

  // Goal flash
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const goalTextOpacity = useRef(new Animated.Value(0)).current;
  const goalTextY = useRef(new Animated.Value(0)).current;
  const [goalText, setGoalText] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Timer for header
  const [timer, setTimer] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const iv = setInterval(() => setTimer(getTimeRemaining()), 1000);
    return () => clearInterval(iv);
  }, [getTimeRemaining]);

  // Displayed score (delayed until goal animation fires)
  const [dispScore, setDispScore] = useState({ home: 0, away: 0 });
  const dispScoreRef = useRef(dispScore);
  dispScoreRef.current = dispScore;

  // Confirmed goals — only added after animation plays (not from engine events)
  const [confirmedGoals, setConfirmedGoals] = useState<{ team: 'home' | 'away'; gameMinute: number; scorer: string }[]>([]);

  // Start tick — stop when result overlay is showing or goals are pending animation
  useEffect(() => {
    if (!showResult && (matchState.status === 'playing' || matchState.status === 'sudden_death')) {
      intervalRef.current = setInterval(() => {
        // Don't advance engine while goals are queued — prevents premature match end
        if (pendingGoalQueueRef.current.length > 0 || goalAnimRef.current) return;
        tickRef.current?.();
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [matchState.status, tickRef, showResult]);

  // Freeze all players when result overlay shows (but keep loops alive for next match)
  const matchFrozen = !!showResult;
  useEffect(() => {
    if (matchFrozen) {
      matchPausedRef.current = true;
      // Stop all running animations visually
      for (let i = 0; i < 5; i++) {
        homeDotsRef.current[i]?.tx.stopAnimation();
        homeDotsRef.current[i]?.ty.stopAnimation();
        awayDotsRef.current[i]?.tx.stopAnimation();
        awayDotsRef.current[i]?.ty.stopAnimation();
      }
      ballTx.stopAnimation();
      ballTy.stopAnimation();
    }
  }, [matchFrozen]);

  // Keep gameMinuteRef in sync for use inside animation callbacks
  useEffect(() => { gameMinuteRef.current = matchState.gameMinute; }, [matchState.gameMinute]);

  // ── Goal events from engine — queue ALL new goals ──
  useEffect(() => {
    const evts = matchState.events;
    const already = processedEvtsRef.current;
    if (evts.length <= already) return;
    for (let i = already; i < evts.length; i++) {
      const e = evts[i];
      if (e?.type === 'goal') {
        const isHome = e.team === 'home';
        pendingGoalQueueRef.current.push({ isHome });
        possessionRef.current = isHome ? 'home' : 'away';
        attackPhaseRef.current = 2;
        ballCarrierRef.current = 4;
      }
    }
    processedEvtsRef.current = evts.length;
  }, [matchState.events.length]);

  // Reset on new match (only at elapsedSec===0, not 1, to avoid jerking players back)
  useEffect(() => {
    if (matchState.elapsedSec === 0) {
      matchPausedRef.current = false; // unfreeze for new match
      possessionRef.current = 'home';
      attackPhaseRef.current = 0;
      ballCarrierRef.current = 3;
      goalAnimRef.current = false;
      ballBusyRef.current = false;
      pendingGoalQueueRef.current = [];
      processedEvtsRef.current = 0;
      turnoverCdRef.current = 0;
      frozenRef.current.clear();
      setDispScore({ home: 0, away: 0 });
      setConfirmedGoals([]);
      // Reset dot positions
      HOME_POS.forEach((p, i) => {
        const d = homeDotsRef.current[i];
        if (d) { d.tx.setValue(p.x * (PITCH_W - DOT_SIZE)); d.ty.setValue(p.y * (PITCH_H - DOT_SIZE)); }
        if (posRef.current.home[i]) posRef.current.home[i] = { ...p };
      });
      AWAY_POS.forEach((p, i) => {
        const d = awayDotsRef.current[i];
        if (d) { d.tx.setValue(p.x * (PITCH_W - DOT_SIZE)); d.ty.setValue(p.y * (PITCH_H - DOT_SIZE)); }
        if (posRef.current.away[i]) posRef.current.away[i] = { ...p };
      });
      ballTx.setValue(0.5 * (PITCH_W - BALL_SIZE));
      ballTy.setValue(0.5 * (PITCH_H - BALL_SIZE));
    }
  }, [matchState.elapsedSec]);

  // ── Player movement — smooth, realistic, limited speed ──
  // Max distance a player can move per step (fraction of pitch)
  const MAX_STEP = 0.10; // ~10% of pitch per animation cycle
  const MAX_STEP_GK = 0.06;
  /** Clamp movement so no player teleports across field */
  const limitStep = (prev: number, target: number, maxD: number) => {
    const diff = target - prev;
    if (Math.abs(diff) <= maxD) return target;
    return prev + Math.sign(diff) * maxD;
  };
  /** Duration proportional to distance — feels like running, not teleporting */
  const moveDur = (dist: number, baseMin: number, baseMax: number) => {
    const d = Math.max(dist, 0.02);
    // ~1200-2400ms for full step, shorter for small adjustments
    return Math.max(baseMin, Math.min(baseMax, d * 12000)) / SPEED;
  };

  useEffect(() => {
    mountedRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const animatePlayer = (
      dots: DotAnim[], basePos: typeof HOME_POS, positions: { x: number; y: number }[],
      team: 'home' | 'away', idx: number,
    ) => {
      if (!mountedRef.current) return;
      // Match paused (result overlay) — keep loop alive but don't animate
      if (matchPausedRef.current) {
        timers.push(setTimeout(() => animatePlayer(dots, basePos, positions, team, idx), 300));
        return;
      }
      const base = basePos[idx];
      const dot = dots[idx];
      if (!base || !dot) return;
      // Skip frozen players — keep retrying
      if (frozenRef.current.has(`${team}-${idx}`)) {
        timers.push(setTimeout(() => animatePlayer(dots, basePos, positions, team, idx), 200));
        return;
      }

      const poss = possessionRef.current;
      const bx = ballPosRef.current.x;
      const by = ballPosRef.current.y;
      const isHome = team === 'home';
      // Pitch: [0=GK, 1=LM, 2=RM, 3=CD, 4=ST]
      const isGK = idx === 0;
      const isCD = idx === 3;    // center defender
      const isWing = idx === 1 || idx === 2; // LM/RM
      const isST = idx === 4;
      const isDef = isCD;
      const isMid = isWing;
      const hasBall = ballCarrierRef.current === idx && poss === team;
      const attacking = poss === team;
      const prev = positions[idx] ?? { ...base };

      const ballShiftX = (bx - 0.5) * 0.12;
      const ballShiftY = (by - 0.5) * (isDef ? 0.15 : 0.10);
      const formShiftY = isHome
        ? (attacking ? -0.05 - attackPhaseRef.current * 0.02 : 0.03)
        : (attacking ? 0.05 + attackPhaseRef.current * 0.02 : -0.03);

      // Compute desired target position (tactical)
      let tx: number, ty: number;

      if (isGK) {
        const gkBaseY = isHome ? 0.92 : 0.08;
        const gkOff = attacking ? (isHome ? -0.03 : 0.03) : 0;
        tx = clamp(toward(0.5, bx, 0.3) + (Math.random() - 0.5) * 0.06, 0.3, 0.7);
        ty = clamp(gkBaseY + gkOff + (Math.random() - 0.5) * 0.02, isHome ? 0.87 : 0.03, isHome ? 0.97 : 0.13);
      } else if (hasBall && attacking && attackPhaseRef.current >= 2) {
        const goalY = isHome ? 0.15 : 0.85;
        tx = clamp(toward(prev.x, 0.5, 0.15) + (Math.random() - 0.5) * 0.08, 0.15, 0.85);
        ty = clamp(toward(prev.y, goalY, 0.25), 0.05, 0.95);
      } else if (isST && attacking) {
        if (Math.random() < 0.35) {
          // Intelligent run — drift toward goal area
          const goalY = isHome ? 0.18 : 0.82;
          tx = clamp(prev.x + (Math.random() - 0.5) * 0.15, 0.15, 0.85);
          ty = clamp(toward(prev.y, goalY, 0.2) + (Math.random() - 0.5) * 0.06, 0.12, 0.88);
        } else {
          tx = clamp(base.x + ballShiftX + (Math.random() - 0.5) * 0.12, 0.15, 0.85);
          ty = clamp(base.y + formShiftY + (Math.random() - 0.5) * 0.08, 0.15, 0.85);
        }
      } else if (isST && !attacking) {
        // Drop back slightly
        ty = clamp(toward(prev.y, base.y + (isHome ? 0.08 : -0.08), 0.3), 0.25, 0.75);
        tx = clamp(prev.x + (Math.random() - 0.5) * 0.10, 0.15, 0.85);
      } else if (isMid) {
        tx = clamp(base.x + ballShiftX * 0.6 + (Math.random() - 0.5) * 0.12, 0.12, 0.88);
        ty = clamp(base.y + formShiftY + ballShiftY * 0.3 + (Math.random() - 0.5) * 0.08, 0.25, 0.75);
      } else if (isDef && attacking) {
        tx = clamp(base.x + ballShiftX * 0.3 + (Math.random() - 0.5) * 0.10, 0.10, 0.90);
        ty = clamp(base.y + formShiftY * 0.6 + (Math.random() - 0.5) * 0.06, isHome ? 0.50 : 0.10, isHome ? 0.82 : 0.50);
      } else if (isDef && !attacking) {
        const defLineY = isHome
          ? clamp(0.76 + ballShiftY * 0.25, 0.62, 0.82)
          : clamp(0.24 + ballShiftY * 0.25, 0.18, 0.38);
        tx = clamp(base.x + (Math.random() - 0.5) * 0.10, 0.12, 0.88);
        ty = clamp(toward(defLineY, by, 0.15) + (Math.random() - 0.5) * 0.04, 0.10, 0.90);
      } else {
        tx = clamp(base.x + (Math.random() - 0.5) * 0.10, 0.10, 0.90);
        ty = clamp(base.y + (Math.random() - 0.5) * 0.08, 0.10, 0.90);
      }

      // ── Limit step distance so players don't teleport ──
      const maxS = isGK ? MAX_STEP_GK : MAX_STEP;
      const nx = limitStep(prev.x, tx, maxS);
      const ny = limitStep(prev.y, ty, maxS);
      const dist = Math.hypot(nx - prev.x, ny - prev.y);
      // Duration proportional to distance: small jog = short, big run = long
      const dur = isGK ? moveDur(dist, 600, 1800) : moveDur(dist, 500, 1600);

      if (positions[idx]) positions[idx] = { x: nx, y: ny };

      Animated.parallel([
        Animated.timing(dot.tx, { toValue: nx * (PITCH_W - DOT_SIZE), duration: dur, useNativeDriver: canUseNative }),
        Animated.timing(dot.ty, { toValue: ny * (PITCH_H - DOT_SIZE), duration: dur, useNativeDriver: canUseNative }),
      ]).start();

      // Glue ball to carrier
      if (team === possessionRef.current && idx === ballCarrierRef.current && !ballBusyRef.current && !goalAnimRef.current) {
        ballPosRef.current = { x: nx, y: ny };
        Animated.timing(ballTx, { toValue: nx * (PITCH_W - BALL_SIZE), duration: dur, useNativeDriver: canUseNative }).start();
        Animated.timing(ballTy, { toValue: ny * (PITCH_H - BALL_SIZE), duration: dur, useNativeDriver: canUseNative }).start();
      }

      // Next move: wait for this animation to finish, then small pause
      const nextDelay = dur + 80 + Math.random() * 200;
      timers.push(setTimeout(() => animatePlayer(dots, basePos, positions, team, idx), nextDelay));
    };

    // Stagger initial starts slightly
    for (let i = 0; i < 5; i++) {
      timers.push(setTimeout(() => animatePlayer(homeDotsRef.current, HOME_POS, posRef.current.home, 'home', i), 200 + Math.random() * 400));
      timers.push(setTimeout(() => animatePlayer(awayDotsRef.current, AWAY_POS, posRef.current.away, 'away', i), 200 + Math.random() * 400));
    }

    return () => { mountedRef.current = false; timers.forEach(t => clearTimeout(t)); };
  }, [canUseNative]);

  // ── Ball movement system ──
  useEffect(() => {
    mountedRef.current = true;
    let ballTimer: ReturnType<typeof setTimeout> | null = null;

    const updateBallPos = (x: number, y: number) => { ballPosRef.current = { x, y }; };

    const freezePlayer = (team: 'home' | 'away', idx: number, cb?: () => void) => {
      frozenRef.current.add(`${team}-${idx}`);
      const dots = team === 'home' ? homeDotsRef.current : awayDotsRef.current;
      const positions = team === 'home' ? posRef.current.home : posRef.current.away;
      const dot = dots?.[idx];
      if (dot) {
        let fired = false;
        const done = () => { if (fired) return; fired = true; cb?.(); };
        let got = 0;
        const check = () => { got++; if (got === 2) done(); };
        dot.tx.stopAnimation(vx => { if (positions[idx]) positions[idx].x = clamp(vx / (PITCH_W - DOT_SIZE), 0, 1); check(); });
        dot.ty.stopAnimation(vy => { if (positions[idx]) positions[idx].y = clamp(vy / (PITCH_H - DOT_SIZE), 0, 1); check(); });
        // Safety: if stopAnimation callbacks don't fire within 200ms, force callback
        setTimeout(done, 200);
      } else cb?.();
    };
    const unfreezePlayer = (team: 'home' | 'away', idx: number) => frozenRef.current.delete(`${team}-${idx}`);
    const unfreezeAll = () => frozenRef.current.clear();
    const getPos = (team: 'home' | 'away', idx: number) => {
      const p = (team === 'home' ? posRef.current.home : posRef.current.away)[idx];
      return p ? { x: p.x, y: p.y } : { x: 0.5, y: 0.5 };
    };
    const snapBall = (team: 'home' | 'away', idx: number) => {
      const dots = team === 'home' ? homeDotsRef.current : awayDotsRef.current;
      const dot = dots?.[idx];
      if (!dot) return;
      dot.tx.stopAnimation(px => { ballTx.setValue(px + (DOT_SIZE - BALL_SIZE) / 2); ballPosRef.current.x = clamp(px / (PITCH_W - DOT_SIZE), 0, 1); });
      dot.ty.stopAnimation(py => { ballTy.setValue(py + (DOT_SIZE - BALL_SIZE) / 2); ballPosRef.current.y = clamp(py / (PITCH_H - DOT_SIZE), 0, 1); });
    };

    const startDribble = (cb: () => void) => {
      const poss = possessionRef.current;
      const ci = ballCarrierRef.current;
      const isHome = poss === 'home';
      const teamPos = isHome ? posRef.current.home : posRef.current.away;
      const dots = isHome ? homeDotsRef.current : awayDotsRef.current;
      const cur = teamPos[ci];
      const dot = dots?.[ci];
      if (!cur || !dot) { ballTimer = setTimeout(cb, rand(300, 500)); return; }
      ballBusyRef.current = true;
      // Dribble: move carrier + ball forward with slight zigzag, limited step
      const advY = isHome ? -0.06 : 0.06;
      const zigX = (Math.random() - 0.5) * 0.08;
      const rawX = clamp(cur.x + zigX, 0.10, 0.90);
      const rawY = clamp(cur.y + advY + (Math.random() - 0.5) * 0.02, 0.05, 0.95);
      // Limit dribble step too
      const dxd = rawX - cur.x; const dyd = rawY - cur.y;
      const dDist = Math.hypot(dxd, dyd);
      const maxDrib = 0.08;
      const scale = dDist > maxDrib ? maxDrib / dDist : 1;
      const nx = cur.x + dxd * scale;
      const ny = cur.y + dyd * scale;
      if (teamPos[ci]) teamPos[ci] = { x: nx, y: ny };
      // Duration proportional to distance
      const dur = Math.max(400, Math.min(1000, dDist * scale * 10000)) / SPEED;
      Animated.parallel([
        Animated.timing(dot.tx, { toValue: nx * (PITCH_W - DOT_SIZE), duration: dur, useNativeDriver: canUseNative }),
        Animated.timing(dot.ty, { toValue: ny * (PITCH_H - DOT_SIZE), duration: dur, useNativeDriver: canUseNative }),
        Animated.timing(ballTx, { toValue: nx * (PITCH_W - BALL_SIZE), duration: dur, useNativeDriver: canUseNative }),
        Animated.timing(ballTy, { toValue: ny * (PITCH_H - BALL_SIZE), duration: dur, useNativeDriver: canUseNative }),
      ]).start(() => {
        updateBallPos(nx, ny);
        ballBusyRef.current = false;
      });
      ballTimer = setTimeout(cb, dur + 100 + Math.random() * 150);
    };

    const doMissedShot = (cb: () => void) => {
      unfreezeAll();
      ballBusyRef.current = true;
      const poss = possessionRef.current;
      const isHome = poss === 'home';
      // Vertical: goal at top (away goal, y=0) for home attacking, goal at bottom (y=1) for away attacking
      const goalY = isHome ? 0.02 * (PITCH_H - BALL_SIZE) : 0.98 * (PITCH_H - BALL_SIZE);
      const missX = rand(0.2, 0.8) * (PITCH_W - BALL_SIZE);

      Animated.parallel([
        Animated.timing(ballTx, { toValue: missX, duration: spd(280), useNativeDriver: canUseNative }),
        Animated.timing(ballTy, { toValue: goalY, duration: spd(280), useNativeDriver: canUseNative }),
      ]).start(() => {
        updateBallPos(missX / (PITCH_W - BALL_SIZE), isHome ? 0.02 : 0.98);
        setTimeout(() => {
          if (!mountedRef.current) return;
          const opp = isHome ? 'away' : 'home';
          possessionRef.current = opp;
          attackPhaseRef.current = 0;
          ballCarrierRef.current = 0; // GK
          const gkPos = opp === 'home' ? posRef.current.home[0] : posRef.current.away[0];
          if (gkPos) {
            updateBallPos(gkPos.x, gkPos.y);
            Animated.parallel([
              Animated.timing(ballTx, { toValue: gkPos.x * (PITCH_W - BALL_SIZE), duration: spd(400), useNativeDriver: canUseNative }),
              Animated.timing(ballTy, { toValue: gkPos.y * (PITCH_H - BALL_SIZE), duration: spd(400), useNativeDriver: canUseNative }),
            ]).start(() => {
              setTimeout(() => {
                if (!mountedRef.current) return;
                const defIdx = Math.random() < 0.4 ? 3 : (1 + Math.floor(Math.random() * 2));
                ballCarrierRef.current = defIdx;
                const defPos = opp === 'home' ? posRef.current.home[defIdx] : posRef.current.away[defIdx];
                if (defPos) {
                  const fly = rand(300, 500);
                  updateBallPos(defPos.x, defPos.y);
                  Animated.parallel([
                    Animated.timing(ballTx, { toValue: defPos.x * (PITCH_W - BALL_SIZE), duration: fly, useNativeDriver: canUseNative }),
                    Animated.timing(ballTy, { toValue: defPos.y * (PITCH_H - BALL_SIZE), duration: fly, useNativeDriver: canUseNative }),
                  ]).start(() => { ballBusyRef.current = false; cb(); });
                } else { ballBusyRef.current = false; cb(); }
              }, rand(400, 700));
            });
          } else { ballBusyRef.current = false; cb(); }
        }, rand(300, 600));
      });
    };

    const doGoalShot = (isHome: boolean) => {
      unfreezeAll();
      goalAnimRef.current = true;
      ballBusyRef.current = true;
      // Vertical: home scores at top (y=0), away scores at bottom (y=1)
      const goalY = isHome ? 0.01 * (PITCH_H - BALL_SIZE) : 0.99 * (PITCH_H - BALL_SIZE);
      const goalX = rand(0.38, 0.62) * (PITCH_W - BALL_SIZE);

      Animated.parallel([
        Animated.timing(ballTx, { toValue: goalX, duration: spd(220), useNativeDriver: canUseNative }),
        Animated.timing(ballTy, { toValue: goalY, duration: spd(220), useNativeDriver: canUseNative }),
      ]).start(() => {
        const scorerName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)] ?? 'Unknown';
        setDispScore(prev => ({
          home: isHome ? prev.home + 1 : prev.home,
          away: isHome ? prev.away : prev.away + 1,
        }));
        // Add to confirmed goals feed (only after ball-in-goal animation)
        setConfirmedGoals(prev => [...prev, {
          team: isHome ? 'home' as const : 'away' as const,
          gameMinute: gameMinuteRef.current,
          scorer: scorerName,
        }]);
        setGoalText(isHome ? `⚽ GOAL! ${scorerName}` : `⚽ GOAL ${scorerName}`);
        goalTextY.setValue(0); goalTextOpacity.setValue(1); flashOpacity.setValue(0.5);
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue: 0, duration: spd(500), useNativeDriver: canUseNative }),
          Animated.timing(goalTextY, { toValue: -50, duration: spd(2200), useNativeDriver: canUseNative }),
          Animated.timing(goalTextOpacity, { toValue: 0, duration: spd(2200), useNativeDriver: canUseNative }),
        ]).start();

        setTimeout(() => {
          if (!mountedRef.current) return;
          Animated.parallel([
            Animated.timing(ballTx, { toValue: 0.5 * (PITCH_W - BALL_SIZE), duration: spd(300), useNativeDriver: canUseNative }),
            Animated.timing(ballTy, { toValue: 0.5 * (PITCH_H - BALL_SIZE), duration: spd(300), useNativeDriver: canUseNative }),
          ]).start(() => {
            possessionRef.current = isHome ? 'away' : 'home';
            attackPhaseRef.current = 0;
            ballCarrierRef.current = 4;
            goalAnimRef.current = false;
            ballBusyRef.current = false;
            ballTimer = setTimeout(scheduleBall, spd(400));
          });
        }, spd(800));
      });
    };

    const findPassTarget = (teamPos: { x: number; y: number }[], carrier: number, poss: 'home' | 'away'): number => {
      const c = teamPos[carrier];
      if (!c) return 3;
      const isHome = poss === 'home';
      let preferred: number[];
      if (carrier === 0) preferred = [1, 2]; // GK→DEF
      else if (carrier <= 2) preferred = [3, 1, 2].filter(i => i !== carrier); // DEF→MID
      else if (carrier === 3) preferred = [4, 1, 2]; // MID→ST or back
      else preferred = [3, 1, 2]; // ST→lay off

      let best = preferred[0] ?? 3;
      let bestScore = -999;
      for (const idx of preferred) {
        const tp = teamPos[idx];
        if (!tp) continue;
        const dist = Math.hypot(tp.x - c.x, tp.y - c.y);
        // Vertical: forward = toward goal = negative y for home, positive y for away
        const fwd = isHome ? (c.y - tp.y) * 2 : (tp.y - c.y) * 2;
        const score = fwd + Math.max(0, 0.4 - dist) * 3 + Math.random() * 0.5;
        if (score > bestScore) { bestScore = score; best = idx; }
      }
      return best;
    };

    const scheduleBall = () => {
      if (!mountedRef.current) return;
      if (matchPausedRef.current || goalAnimRef.current) {
        ballTimer = setTimeout(scheduleBall, 300);
        return;
      }

      const poss = possessionRef.current;
      const isHome = poss === 'home';
      const teamPos = isHome ? posRef.current.home : posRef.current.away;
      const oppPos = isHome ? posRef.current.away : posRef.current.home;
      const carrier = teamPos?.[ballCarrierRef.current];
      const queue = pendingGoalQueueRef.current;

      // Pending goal(s) in queue
      if (queue.length > 0) {
        const pg = queue[0];
        if (carrier) {
          const pgHome = pg.isHome;
          const inBox = pgHome ? carrier.y < 0.28 : carrier.y > 0.72;
          if (inBox) {
            queue.shift();
            doGoalShot(pg.isHome);
            return;
          }
        }
        if (attackPhaseRef.current < 3) attackPhaseRef.current += 1;
        // Drive toward goal with possession of scoring team
        possessionRef.current = pg.isHome ? 'home' : 'away';
        if (Math.random() < 0.5) {
          startDribble(scheduleBall);
        } else {
          const cur = ballCarrierRef.current;
          const scoringTeamPos = pg.isHome ? posRef.current.home : posRef.current.away;
          const next = findPassTarget(scoringTeamPos, cur, pg.isHome ? 'home' : 'away');
          doPass(pg.isHome ? 'home' : 'away', cur, next, scheduleBall);
        }
        return;
      }

      // Shot?
      if (carrier) {
        const nearGoal = isHome ? carrier.y < 0.18 : carrier.y > 0.82;
        const edgeBox = isHome ? carrier.y < 0.28 : carrier.y > 0.72;
        if (nearGoal || (edgeBox && Math.random() < 0.30)) {
          doMissedShot(scheduleBall);
          return;
        }
      }

      const roll = Math.random();

      // Turnover
      if (turnoverCdRef.current > 0) turnoverCdRef.current -= 1;
      const toChance = attackPhaseRef.current >= 2 ? 0.14 : 0.08;
      if (roll < toChance && turnoverCdRef.current <= 0) {
        turnoverCdRef.current = 3;
        const opp = isHome ? 'away' : 'home';
        const prevC = ballCarrierRef.current;
        freezePlayer(poss, prevC, () => {
          const cVis = getPos(poss, prevC);
          let nearIdx = 1; let nearDist = 999;
          for (let i = 1; i <= 4; i++) {
            const op = oppPos?.[i]; if (!op) continue;
            const d = Math.hypot(op.x - cVis.x, op.y - cVis.y);
            if (d < nearDist) { nearDist = d; nearIdx = i; }
          }
          freezePlayer(opp, nearIdx, () => {
            const rVis = getPos(opp, nearIdx);
            possessionRef.current = opp;
            attackPhaseRef.current = 0;
            ballCarrierRef.current = nearIdx;
            ballBusyRef.current = true;
            updateBallPos(rVis.x, rVis.y);
            const fly = rand(300, 500);
            Animated.parallel([
              Animated.timing(ballTx, { toValue: rVis.x * (PITCH_W - BALL_SIZE), duration: fly, useNativeDriver: canUseNative }),
              Animated.timing(ballTy, { toValue: rVis.y * (PITCH_H - BALL_SIZE), duration: fly, useNativeDriver: canUseNative }),
            ]).start(() => { snapBall(opp, nearIdx); ballBusyRef.current = false; unfreezePlayer(poss, prevC); unfreezePlayer(opp, nearIdx); });
            ballTimer = setTimeout(scheduleBall, fly + rand(200, 500));
          });
        });
        return;
      }

      // Dribble
      if (roll < toChance + 0.45) {
        startDribble(scheduleBall);
        return;
      }

      // Pass
      if (attackPhaseRef.current < 3 && Math.random() < 0.45) attackPhaseRef.current += 1;
      const cur = ballCarrierRef.current;
      const next = findPassTarget(teamPos, cur, poss);
      doPass(poss, cur, next, scheduleBall);
    };

    const doPass = (poss: 'home' | 'away', from: number, to: number, cb: () => void) => {
      freezePlayer(poss, from, () => {
        freezePlayer(poss, to, () => {
          const fromVis = getPos(poss, from);
          const toVis = getPos(poss, to);
          ballCarrierRef.current = to;
          const dist = Math.hypot(toVis.x - fromVis.x, toVis.y - fromVis.y);
          const fly = dist < 0.18 ? rand(250, 400) : dist > 0.4 ? rand(500, 700) : rand(350, 550);
          ballBusyRef.current = true;
          updateBallPos(toVis.x, toVis.y);
          Animated.parallel([
            Animated.timing(ballTx, { toValue: toVis.x * (PITCH_W - BALL_SIZE), duration: fly, useNativeDriver: canUseNative }),
            Animated.timing(ballTy, { toValue: toVis.y * (PITCH_H - BALL_SIZE), duration: fly, useNativeDriver: canUseNative }),
          ]).start(() => { snapBall(poss, to); ballBusyRef.current = false; unfreezePlayer(poss, from); unfreezePlayer(poss, to); });
          ballTimer = setTimeout(cb, fly + rand(100, 250));
        });
      });
    };

    ballTimer = setTimeout(scheduleBall, spd(200));
    return () => { mountedRef.current = false; if (ballTimer) clearTimeout(ballTimer); };
  }, [canUseNative]);

  // Auto-continue to next match on win after 2 seconds
  useEffect(() => {
    if (showResult !== 'won') return;
    const t = setTimeout(() => { onContinue(); }, 2000);
    return () => clearTimeout(t);
  }, [showResult, onContinue]);

  // When match finishes, clear pending queue — dispScore is the final truth
  useEffect(() => {
    const fin = matchState.status === 'won' || matchState.status === 'lost';
    if (fin) {
      pendingGoalQueueRef.current = [];
    }
  }, [matchState.status]);

  const gameMin = matchState.gameMinute;
  const timeStr = matchState.status === 'sudden_death' ? `${gameMin}' ⚡` : `${gameMin}'`;
  const isFinished = matchState.status === 'won' || matchState.status === 'lost';

  return (
    <View style={ms.container}>
      {/* Background image — same as hub */}
      <Image
        source={require('../../assets/images/vgp_bg.png')}
        style={ms.bgImage}
        resizeMode="cover"
      />
      <View style={ms.bgOverlay} />

      {/* Close button (top-right) — confirm if match in progress */}
      <Pressable
        onPress={() => {
          const st = matchState?.status;
          if (st === 'playing' || st === 'sudden_death') {
            setShowExitConfirm(true);
          } else {
            onBack();
          }
        }}
        style={ms.closeBtn}
        hitSlop={14}
      >
        <Ionicons name="close" size={24} color="rgba(232,180,180,0.45)" />
      </Pressable>

      {/* VGP Header — same as lobby */}
      <View style={ms.vgpHeaderRow}>
        <View style={ms.vgpTitleWrap}>
          <View style={ms.vgpTitleAccent} />
          <Text style={ms.vgpTitle}>Valor Grand Prix</Text>
        </View>
      </View>
      <View style={ms.vgpSeasonRow}>
        <LinearGradient
          colors={['rgba(80,50,60,0.6)', 'rgba(60,35,50,0.8)', 'rgba(80,50,60,0.6)'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={ms.vgpSeasonBadge}
        >
          <Text style={ms.vgpSeasonText}>Season {vgpState.season ?? 1}</Text>
        </LinearGradient>
        <View style={ms.vgpTimerPill}>
          <Ionicons name="time-outline" size={11} color="rgba(232,180,180,0.45)" />
          <Text style={ms.vgpTimerText}>Ends in: {timer.days > 0 ? `${timer.days}D ` : ''}{String(timer.hours).padStart(2, '0')}H{String(timer.minutes).padStart(2, '0')}M{String(timer.seconds).padStart(2, '0')}S</Text>
        </View>
      </View>

      {/* Scoreboard - matches main game LiveMatch style */}
      <View style={ms.infoBar}>
        <View style={ms.teamCol}>
          <Text style={[ms.teamNameHome, { color: teamColor }]} numberOfLines={1}>({vgpPower}) {teamName}</Text>
        </View>
        <View style={ms.scoreRow}>
          <Text style={[ms.scoreHome, { color: teamColor }]}>{dispScore.home}</Text>
          <Text style={ms.scoreTime}>{timeStr}</Text>
          <Text style={ms.scoreAway}>{dispScore.away}</Text>
        </View>
        <View style={ms.teamColRight}>
          <Text style={ms.teamNameAway} numberOfLines={1}>{opponentName} ({opponentPower})</Text>
        </View>
      </View>
      {matchState.status === 'sudden_death' && (
        <Text style={ms.sdBanner}>⚡ EXTRA TIME</Text>
      )}

      {/* Pitch */}
      <View style={ms.pitchWrap}>
        <View style={ms.pitch}>
          {/* Field markings */}
          <View style={ms.centerLine} />
          <View style={ms.centerCircle} />
          <View style={ms.penaltyTop} />
          <View style={ms.penaltyBottom} />
          <View style={ms.goalTop} />
          <View style={ms.goalBottom} />

          {/* Away dots (top) */}
          {awayDotsRef.current.map((dot, i) => (
            <Animated.View key={`a${i}`} style={[
              ms.dotAbs,
              { backgroundColor: '#EF4444' },
              { transform: [{ translateX: dot.tx }, { translateY: dot.ty }] },
            ]} />
          ))}
          {/* Home dots (bottom) with name labels */}
          {homeDotsRef.current.map((dot, i) => (
            <Animated.View key={`h${i}`} style={[
              ms.dotWrap,
              { transform: [{ translateX: dot.tx }, { translateY: dot.ty }] },
            ]}>
              <View style={[ms.dot, { backgroundColor: '#3B82F6' }]} />
              {homeNames[i] ? (
                <Text style={ms.dotName} numberOfLines={1}>{homeNames[i]}</Text>
              ) : null}
            </Animated.View>
          ))}
          {/* Ball */}
          <Animated.View style={[ms.ball, { transform: [{ translateX: ballTx }, { translateY: ballTy }] }]} />
          {/* Flash */}
          <Animated.View style={[ms.flash, { opacity: flashOpacity }]} pointerEvents="none" />
          {/* Goal text */}
          <Animated.Text style={[ms.goalTextAnim, { opacity: goalTextOpacity, transform: [{ translateY: goalTextY }] }]}>{goalText}</Animated.Text>
        </View>
      </View>

      {/* Event Feed — all confirmed goals, home left / away right */}
      <View style={ms.eventFeed}>
        {confirmedGoals.map((g, i) => {
          const isHome = g.team === 'home';
          const label = isHome ? teamName : opponentName;
          return (
            <Text
              key={`g-${i}`}
              style={[ms.eventGoal, { textAlign: isHome ? 'left' : 'right', color: isHome ? '#F59E0B' : '#EF4444' }]}
            >
              ⚽ {g.gameMinute}' {g.scorer} ({label})
            </Text>
          );
        })}
      </View>

      {/* Win Overlay — shows on pitch, auto-continues */}
      {showResult === 'won' && (
        <View style={ms.winOverlay} pointerEvents="none">
          <Text style={ms.winEmoji}>🏆</Text>
          <Text style={ms.winTitle}>VICTORY!</Text>
          <Text style={ms.winScore}>{dispScore.home} - {dispScore.away}</Text>
        </View>
      )}

      {/* Loss Modal — full overlay with END RUN button */}
      {showResult === 'lost' && (
        <View style={ms.resultOverlay}>
          <View style={ms.resultCard}>
            <Text style={ms.resultEmoji}>💥</Text>
            <Text style={[ms.resultTitle, ms.resultLose]}>DEFEATED</Text>
            <Text style={ms.resultScore}>
              {dispScore.home} - {dispScore.away}
            </Text>
            <Pressable onPress={onEndRun}>
              <LinearGradient colors={['#E11D48', '#BE123C'] as const} style={ms.resultBtn}>
                <Text style={ms.resultBtnText}>LOBBY</Text>
              </LinearGradient>
            </Pressable>
            <Text style={ms.runSummary}>Run: {runWins} win{runWins !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {/* ── WINSTREAK TRACK (bottom) ── */}
      <View style={ms.wsArea}>
        <Text style={ms.wsLabel}>🔥 Win Streak: {runWins}/18</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ms.wsScroll}>
          {[2, 4, 6, 8, 10, 12, 14, 16, 18].map((wins) => {
            const won = runWins >= wins;
            const current = runWins >= wins - 1 && runWins < wins; // currently working toward this
            return (
              <View key={wins} style={ms.wsItem}>
                <View style={[
                  ms.wsCard,
                  won && ms.wsCardWon,
                  current && ms.wsCardCurrent,
                ]}>
                  {won ? (
                    <Ionicons name="checkmark" size={18} color="#10B981" />
                  ) : (
                    <Text style={ms.wsNum}>{wins}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        {/* Progress bar */}
        <View style={ms.wsTrackWrap}>
          <View style={ms.wsTrackBg}>
            <LinearGradient
              colors={['#A07830', '#D4A854'] as const}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[ms.wsTrackFill, { width: `${Math.min(100, (runWins / 18) * 100)}%` }]}
            />
          </View>
        </View>
      </View>

      {/* ── EXIT CONFIRMATION MODAL ── */}
      {showExitConfirm && (
        <View style={ms.exitOverlay}>
          <View style={ms.exitCard}>
            <Ionicons name="warning" size={36} color="#F59E0B" style={{ marginBottom: 10 }} />
            <Text style={ms.exitTitle}>Leave Match?</Text>
            <Text style={ms.exitDesc}>
              Leaving now will count as a{'\n'}
              <Text style={{ color: '#E11D48', fontWeight: '900' }}>loss</Text>. Your attempt will be consumed{'\n'}and all rewards from this run will be lost.
            </Text>
            <View style={ms.exitBtnRow}>
              <Pressable style={ms.exitBtnCancel} onPress={() => setShowExitConfirm(false)}>
                <Text style={ms.exitBtnCancelText}>Continue Playing</Text>
              </Pressable>
              <Pressable style={ms.exitBtnConfirm} onPress={() => { setShowExitConfirm(false); onBack(); }}>
                <LinearGradient colors={['#E11D48', '#9F1239'] as const} style={ms.exitBtnConfirmGrad}>
                  <Text style={ms.exitBtnConfirmText}>Leave</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  bgImage: { position: 'absolute', top: 0, left: 0, width: SW, height: SH },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,18,0.55)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 },
  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(232,180,180,0.08)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  topCenter: { flex: 1, alignItems: 'center' },
  winsText: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  infoBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#1F2937', borderRadius: 10, marginHorizontal: 16, marginBottom: 4,
  },
  teamCol: { flex: 1 },
  teamColRight: { flex: 1, alignItems: 'flex-end' },
  teamNameHome: { fontSize: 11, fontWeight: '700' },
  teamNameAway: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreHome: { fontWeight: '800', fontSize: 22 },
  scoreTime: { color: '#FFF', fontWeight: '600', fontSize: 13, opacity: 0.7 },
  scoreAway: { color: '#EF4444', fontWeight: '800', fontSize: 22 },
  sdBanner: {
    fontSize: 10, fontWeight: '800', color: '#E11D48', textAlign: 'center',
    letterSpacing: 1, marginBottom: 2,
  },
  pitchWrap: { alignItems: 'center', paddingHorizontal: 16 },
  pitch: {
    width: PITCH_W, height: PITCH_H,
    backgroundColor: '#22C55E',
    borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative', overflow: 'hidden',
  },
  centerLine: { position: 'absolute', top: PITCH_H / 2 - 1, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  centerCircle: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    top: PITCH_H / 2 - 30, left: PITCH_W / 2 - 30,
  },
  penaltyTop: {
    position: 'absolute', top: 0, left: PITCH_W / 2 - 55, width: 110, height: 45,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderTopWidth: 0,
  },
  penaltyBottom: {
    position: 'absolute', bottom: 0, left: PITCH_W / 2 - 55, width: 110, height: 45,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderBottomWidth: 0,
  },
  goalTop: {
    position: 'absolute', top: -2, left: PITCH_W / 2 - 25, width: 50, height: 6,
    backgroundColor: 'rgba(255,255,255,0.4)', borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  goalBottom: {
    position: 'absolute', bottom: -2, left: PITCH_W / 2 - 25, width: 50, height: 6,
    backgroundColor: 'rgba(255,255,255,0.4)', borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  dotAbs: {
    position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  dotWrap: {
    position: 'absolute', alignItems: 'center', width: 50, marginLeft: -19,
  },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  dotName: {
    fontSize: 7, fontWeight: '700', color: '#FFF', marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    textAlign: 'center', maxWidth: 50,
  },
  ball: {
    position: 'absolute', width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2,
    backgroundColor: '#FFF', zIndex: 10,
  },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF' },
  goalTextAnim: {
    position: 'absolute', alignSelf: 'center', top: '40%',
    fontSize: 22, fontWeight: '900', color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  eventFeed: { paddingHorizontal: 16, paddingTop: 10, gap: 3 },
  eventGoal: { color: '#F59E0B', fontSize: 13, fontWeight: '800' },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  resultCard: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 30, alignItems: 'center',
    minWidth: 260, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  resultEmoji: { fontSize: 50, marginBottom: 10 },
  resultTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  resultWin: { color: '#F59E0B' },
  resultLose: { color: '#E11D48' },
  resultScore: { fontSize: 30, fontWeight: '900', color: '#F0F4FF', marginBottom: 16 },
  resultBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginBottom: 10 },
  resultBtnText: { fontSize: 14, fontWeight: '900', color: '#2A1520' },

  // ── VGP HEADER (same as lobby) ──
  vgpHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 2 },
  vgpTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vgpTitleAccent: { width: 3, height: 20, backgroundColor: '#E11D48', borderRadius: 2 },
  vgpTitle: { fontSize: 17, fontWeight: '800', color: 'rgba(232,180,180,0.85)' },
  vgpSeasonRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 2, gap: 8 },
  vgpSeasonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
  },
  vgpSeasonText: { fontSize: 10, fontWeight: '700', color: 'rgba(232,180,180,0.45)' },
  vgpTimerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(232,180,180,0.06)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.08)',
  },
  vgpTimerText: { fontSize: 10, color: 'rgba(232,180,180,0.45)', fontWeight: '600' },

  // ── WINSTREAK TRACK ──
  wsArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    backgroundColor: 'rgba(10,8,16,0.75)',
  },
  wsLabel: {
    fontSize: 13, fontWeight: '800', color: '#D4A054',
    textAlign: 'center', paddingTop: 6, paddingBottom: 2,
  },
  wsScroll: { paddingHorizontal: 16, alignItems: 'flex-end', paddingTop: 4 },
  wsItem: { alignItems: 'center', marginRight: 4, width: 44 },
  wsCard: {
    width: 40, height: 40, borderRadius: 7,
    backgroundColor: 'rgba(60,35,55,0.8)',
    borderWidth: 1.5, borderColor: 'rgba(232,180,180,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  wsCardWon: {
    borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.1)',
  },
  wsCardCurrent: {
    borderColor: 'rgba(210,160,80,0.6)', backgroundColor: 'rgba(210,160,80,0.12)',
  },
  wsNum: { fontSize: 11, fontWeight: '800', color: 'rgba(232,180,180,0.35)' },
  wsTrackWrap: { paddingHorizontal: 16, marginTop: 4 },
  wsTrackBg: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden',
  },
  wsTrackFill: { height: '100%', borderRadius: 2 },

  // ── EXIT CONFIRMATION ──
  exitOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  exitCard: {
    backgroundColor: 'rgba(30,18,28,0.97)', borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.35)',
    paddingTop: 24, paddingBottom: 20, paddingHorizontal: 24,
    alignItems: 'center', width: SW * 0.85,
  },
  exitTitle: { fontSize: 20, fontWeight: '900', color: '#F59E0B', marginBottom: 8 },
  exitDesc: {
    fontSize: 14, fontWeight: '600', color: 'rgba(232,180,180,0.75)',
    textAlign: 'center', lineHeight: 21, marginBottom: 20,
  },
  exitBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  exitBtnCancel: {
    flex: 1, height: 46, borderRadius: 10,
    backgroundColor: 'rgba(232,180,180,0.1)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  exitBtnCancelText: { fontSize: 13, fontWeight: '800', color: 'rgba(232,180,180,0.7)' },
  exitBtnConfirm: { flex: 1, height: 46, borderRadius: 10, overflow: 'hidden' },
  exitBtnConfirmGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  exitBtnConfirmText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  runSummary: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  winOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  winEmoji: { fontSize: 50, marginBottom: 6 },
  winTitle: { fontSize: 28, fontWeight: '900', color: '#F59E0B', letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
  winScore: { fontSize: 24, fontWeight: '900', color: '#F0F4FF', marginTop: 4 },
});
