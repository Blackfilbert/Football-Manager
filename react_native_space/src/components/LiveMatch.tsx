import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, Pressable, Image, ImageSourcePropType } from 'react-native';

import { Colors, Spacing, Radius } from '../theme';
import { useGame } from '../context/GameContext';
import { formatMoney } from '../utils';
import { MATCH_DURATION } from '../constants';
import { hapticGoal, hapticWin, hapticLoss, playMatchStart, playGoalCheer } from '../utils/feedback';
import CurrencyIcon from './CurrencyIcon';

// Event bubble: 1 container sprite + 4 icon overlays
const EVENT_BUBBLE_IMG = require('../../assets/images/event_bubble.png');
const EVENT_ICONS: { type: string; source: ImageSourcePropType }[] = [
  { type: 'red_card', source: require('../../assets/images/icon_red_card.png') },
  { type: 'yellow_card', source: require('../../assets/images/icon_yellow_card.png') },
  { type: 'goal', source: require('../../assets/images/icon_goal.png') },
  { type: 'penalty', source: require('../../assets/images/icon_penalty.png') },
];

const EVENT_BUBBLE_SIZE = 44;
const EVENT_DURATION = 5000; // 5 seconds to tap
const EVENT_INTERVAL_MIN = 5000; // min 5s between events
const EVENT_INTERVAL_MAX = 10000; // max 10s between events
const EVENT_CUTOFF = 5; // don't spawn events in last 5 seconds

const PITCH_HEIGHT = 155;
const DOT_SIZE = 9;
const BALL_SIZE = 6;

// 4-4-2 formation base positions (percentage of pitch)
const HOME_POS = [
  { x: 0.07, y: 0.5 },   // GK
  { x: 0.2, y: 0.12 }, { x: 0.2, y: 0.37 }, { x: 0.2, y: 0.63 }, { x: 0.2, y: 0.88 },
  { x: 0.4, y: 0.12 }, { x: 0.4, y: 0.37 }, { x: 0.4, y: 0.63 }, { x: 0.4, y: 0.88 },
  { x: 0.62, y: 0.35 }, { x: 0.62, y: 0.65 },
];
const AWAY_POS = HOME_POS.map(p => ({ x: 1 - p.x, y: p.y }));

interface DotAnim { tx: Animated.Value; ty: Animated.Value }

function createPixelDots(positions: { x: number; y: number }[], pw: number): DotAnim[] {
  return positions.map(p => ({
    tx: new Animated.Value(p.x * (pw - DOT_SIZE)),
    ty: new Animated.Value(p.y * (PITCH_HEIGHT - DOT_SIZE)),
  }));
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function LiveMatch() {
  const { matchState, lastGoalEvent, lastUpgradeEvent, matchProgression, gameState, winChance, teamPower, displayScore, setDisplayScore, incomePerSecond, claimMatchEvent, setTutorialStep } = useGame();
  const teamColor = gameState?.teamColor ?? Colors.primary;
  const pitchWidthRef = useRef(Dimensions.get('window').width - 32);
  const [, setPitchWidth] = useState(pitchWidthRef.current);

  const homeDotsRef = useRef<DotAnim[]>(createPixelDots(HOME_POS, pitchWidthRef.current));
  const awayDotsRef = useRef<DotAnim[]>(createPixelDots(AWAY_POS, pitchWidthRef.current));
  const ballTx = useRef(new Animated.Value(0.5 * (pitchWidthRef.current - BALL_SIZE))).current;
  const ballTy = useRef(new Animated.Value(0.5 * (PITCH_HEIGHT - BALL_SIZE))).current;
  const posRef = useRef({ home: HOME_POS.map(p => ({ ...p })), away: AWAY_POS.map(p => ({ ...p })) });

  // Possession & attack state
  const possessionRef = useRef<'home' | 'away'>('home');
  const attackPhaseRef = useRef(0);
  const ballCarrierRef = useRef(5);
  const goalAnimRef = useRef(false);
  const mountedRef = useRef(true);
  const isDribblingRef = useRef(false);
  const ballPosRef = useRef({ x: 0.5, y: 0.5 }); // track ball position for player awareness
  const pendingGoalRef = useRef<{ isHome: boolean; scorer?: string; bonus?: number; timestamp?: number } | null>(null);
  const turnoverCooldownRef = useRef(0); // ticks to skip turnovers after one just happened
  const ballBusyRef = useRef(false); // true while ball is in flight (pass/shot/turnover)
  const frozenPlayersRef = useRef<Set<string>>(new Set()); // "home-5", "away-3" — frozen during pass

  // Goal flash
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const goalTextOpacity = useRef(new Animated.Value(0)).current;
  const goalTextY = useRef(new Animated.Value(0)).current;
  const [goalBonusText, setGoalBonusText] = useState('');
  // Delayed score — only update when goal animation actually fires


  // Upgrade toast
  const upgradeToastOpacity = useRef(new Animated.Value(0)).current;
  const upgradeToastScale = useRef(new Animated.Value(0.8)).current;
  const [upgradeToast, setUpgradeToast] = useState<{ type: string; total: string; diff: string } | null>(null);

  const canUseNative = Platform.OS !== 'web';

  // ─── Match Event Bubble ───
  interface EventBubble {
    id: number;
    type: string;
    source: ImageSourcePropType;
    x: number; // percentage of pitch width (0-1)
    y: number; // percentage of pitch height (0-1)
  }
  const [activeEvent, setActiveEvent] = useState<EventBubble | null>(null);
  const eventIdCounter = useRef(0);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventActiveRef = useRef(false);
  const eventBubbleScale = useRef(new Animated.Value(0)).current;
  const eventBubbleOpacity = useRef(new Animated.Value(0)).current;
  const [eventRewardText, setEventRewardText] = useState<string | null>(null);
  const [eventRewardFame, setEventRewardFame] = useState(0);
  const eventRewardOpacity = useRef(new Animated.Value(0)).current;
  const eventRewardY = useRef(new Animated.Value(0)).current;

  const spawnEvent = useCallback(() => {
    if (eventActiveRef.current) return;
    const matchTime = matchState?.matchTime ?? 0;
    const result = matchState?.result;
    // result is null during play, set to 'won'/'lost'/'draw' at end
    if (result && result !== 'playing') return;
    if (matchTime >= MATCH_DURATION - EVENT_CUTOFF) return;

    eventActiveRef.current = true;
    const icon = EVENT_ICONS[Math.floor(Math.random() * EVENT_ICONS.length)];
    // Random position near center with some spread, but clamped to stay inside pitch
    const x = clamp(0.3 + Math.random() * 0.4, 0.15, 0.85);
    const y = clamp(0.2 + Math.random() * 0.6, 0.1, 0.9);
    eventIdCounter.current += 1;
    const bubble: EventBubble = { id: eventIdCounter.current, type: icon.type, source: icon.source, x, y };
    setActiveEvent(bubble);

    // Punch animation: scale 0 → 1.25 → 1 (overshoot tween)
    eventBubbleScale.setValue(0);
    eventBubbleOpacity.setValue(1);
    Animated.sequence([
      Animated.timing(eventBubbleScale, { toValue: 1.25, duration: 180, useNativeDriver: canUseNative }),
      Animated.timing(eventBubbleScale, { toValue: 0.9, duration: 100, useNativeDriver: canUseNative }),
      Animated.timing(eventBubbleScale, { toValue: 1.05, duration: 80, useNativeDriver: canUseNative }),
      Animated.timing(eventBubbleScale, { toValue: 1, duration: 60, useNativeDriver: canUseNative }),
    ]).start();

    // Auto-expire after 5 seconds
    eventExpireRef.current = setTimeout(() => {
      dismissEvent();
    }, EVENT_DURATION);
  }, [matchState?.matchTime, matchState?.result]);

  const dismissEvent = useCallback(() => {
    Animated.timing(eventBubbleOpacity, { toValue: 0, duration: 200, useNativeDriver: canUseNative }).start(() => {
      setActiveEvent(null);
      eventActiveRef.current = false;
    });
    if (eventExpireRef.current) { clearTimeout(eventExpireRef.current); eventExpireRef.current = null; }
  }, []);

  const handleEventTap = useCallback(() => {
    if (!activeEvent) return;
    // Dismiss QTE tutorial hint
    if (gameState?.tutorialStep === 'qte_hint') setTutorialStep(undefined);
    // Calculate rewards: 500% income/s for money, 5 fame (= 100% of loss fame reward)
    const moneyReward = Math.max(1, Math.floor(incomePerSecond * 5));
    const canEarnFame = (gameState?.leagueIndex ?? 0) >= 1;
    const fameReward = canEarnFame ? 5 : 0;
    claimMatchEvent(moneyReward, fameReward);

    // Show reward text (using same format as currency bar)
    setEventRewardText(`+${formatMoney(moneyReward)}`);
    setEventRewardFame(fameReward);
    eventRewardOpacity.setValue(1);
    eventRewardY.setValue(0);
    Animated.parallel([
      Animated.timing(eventRewardOpacity, { toValue: 0, duration: 1500, useNativeDriver: canUseNative }),
      Animated.timing(eventRewardY, { toValue: -40, duration: 1500, useNativeDriver: canUseNative }),
    ]).start(() => setEventRewardText(null));

    // Dismiss bubble
    if (eventExpireRef.current) { clearTimeout(eventExpireRef.current); eventExpireRef.current = null; }
    Animated.timing(eventBubbleOpacity, { toValue: 0, duration: 150, useNativeDriver: canUseNative }).start(() => {
      setActiveEvent(null);
      eventActiveRef.current = false;
    });
  }, [activeEvent, incomePerSecond, claimMatchEvent]);

  // Schedule events using a persistent interval that checks conditions each tick
  const eventScheduledAtRef = useRef(-1); // matchTime when next event should spawn (-1 = needs init)
  useEffect(() => {
    const mt = matchState?.matchTime ?? 0;
    const result = matchState?.result;
    // result is null during active play, non-null at end ('won'/'lost'/'draw')
    const isPlaying = !result || result === 'playing';

    // Reset schedule on new match
    if (mt <= 1) {
      eventScheduledAtRef.current = Math.floor(3 + Math.random() * 7); // first event at 3-10s
      if (eventTimerRef.current) { clearTimeout(eventTimerRef.current); eventTimerRef.current = null; }
      if (eventExpireRef.current) { clearTimeout(eventExpireRef.current); eventExpireRef.current = null; }
      setActiveEvent(null);
      eventActiveRef.current = false;
      return;
    }

    // Clear on match end (result is non-null and not 'playing')
    if (result && result !== 'playing') {
      if (eventTimerRef.current) { clearTimeout(eventTimerRef.current); eventTimerRef.current = null; }
      if (eventExpireRef.current) { clearTimeout(eventExpireRef.current); eventExpireRef.current = null; }
      setActiveEvent(null);
      eventActiveRef.current = false;
      return;
    }

    // Initialize schedule if needed (e.g. loaded mid-match)
    if (eventScheduledAtRef.current < 0 && isPlaying && mt > 1) {
      eventScheduledAtRef.current = mt + Math.floor(3 + Math.random() * 5);
    }

    // Check if it's time to spawn
    if (isPlaying && !eventActiveRef.current && eventScheduledAtRef.current > 0 && mt >= eventScheduledAtRef.current && mt < MATCH_DURATION - EVENT_CUTOFF) {
      spawnEvent();
      // Schedule next event 5-10s after this one disappears (current + EVENT_DURATION/1000 + random)
      eventScheduledAtRef.current = mt + Math.ceil(EVENT_DURATION / 1000) + Math.floor(5 + Math.random() * 5);
    }
  }, [matchState?.matchTime, matchState?.result, spawnEvent]);

  const onPitchLayout = useCallback((e: any) => {
    const w = e?.nativeEvent?.layout?.width ?? pitchWidthRef.current;
    pitchWidthRef.current = w;
    setPitchWidth(w);
  }, []);

  // ─── INTELLIGENT PLAYER MOVEMENT ───
  useEffect(() => {
    mountedRef.current = true;
    const pw = () => pitchWidthRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Helper: lerp toward a value
    const toward = (cur: number, target: number, strength: number) => cur + (target - cur) * strength;

    const animateOnePlayer = (
      dots: DotAnim[],
      basePositions: typeof HOME_POS,
      positions: { x: number; y: number }[],
      team: 'home' | 'away',
      index: number
    ) => {
      if (!mountedRef.current) return;
      const base = basePositions[index];
      const dot = dots[index];
      if (!base || !dot) return;

      // Frozen — waiting for pass, stay perfectly still
      const frozenKey = `${team}-${index}`;
      if (frozenPlayersRef.current.has(frozenKey)) {
        const t = setTimeout(() => animateOnePlayer(dots, basePositions, positions, team, index), 150);
        timers.push(t);
        return;
      }

      const poss = possessionRef.current;
      const phase = attackPhaseRef.current;
      const bx = ballPosRef.current.x;
      const by = ballPosRef.current.y;
      const isHome = team === 'home';
      const isGK = index === 0;
      const isDefender = index >= 1 && index <= 4;
      const isMidfield = index >= 5 && index <= 8;
      const isStriker = index >= 9;
      const isWideMid = index === 5 || index === 8; // LM, RM
      const isCentreMid = index === 6 || index === 7; // CM, CM
      const hasBall = ballCarrierRef.current === index && poss === team;
      const teamAttacking = poss === team;
      const prev = positions[index] ?? base;

      // ── Team-wide shift: whole formation follows ball ──
      // Horizontal: team shifts toward ball zone
      const ballShiftX = (bx - 0.5) * 0.12;
      // Vertical: defensive line tracks ball vertically
      const ballShiftY = (by - 0.5) * (isDefender ? 0.2 : isMidfield ? 0.12 : 0.08);

      // ── Attacking/defending compression ──
      let formationShiftX = 0;
      if (isHome) {
        formationShiftX = teamAttacking ? 0.06 + phase * 0.03 : -0.04;
      } else {
        formationShiftX = teamAttacking ? -0.06 - phase * 0.03 : 0.04;
      }

      // When defending, compress lines closer together
      let compactFactor = 1.0;
      if (!teamAttacking) compactFactor = 0.75; // tighter shape

      let nx: number;
      let ny: number;
      let duration: number;

      if (isGK) {
        // GK: tracks ball vertically within penalty area, slight forward sweep
        const gkBaseX = isHome ? 0.07 : 0.93;
        // Step forward slightly when team attacks
        const gkOffsetX = teamAttacking ? (isHome ? 0.03 : -0.03) : 0;
        nx = clamp(gkBaseX + gkOffsetX + (Math.random() - 0.5) * 0.02, isHome ? 0.03 : 0.87, isHome ? 0.14 : 0.97);
        // Track ball Y but damped
        ny = clamp(toward(0.5, by, 0.35) + (Math.random() - 0.5) * 0.06, 0.3, 0.7);
        duration = rand(1200, 2200);

      } else if (hasBall && teamAttacking && phase >= 2) {
        // ── Ball carrier drives toward goal ──
        const goalX = isHome ? 0.92 : 0.08;
        nx = clamp(toward(prev.x, goalX, rand(0.15, 0.3)), 0.05, 0.95);
        // Slight drift toward center of goal
        ny = clamp(toward(prev.y, 0.5, 0.15) + (Math.random() - 0.5) * 0.08, 0.1, 0.9);
        duration = rand(500, 1000);

      } else if (isStriker && teamAttacking) {
        // ── Strikers: diagonal runs behind defence, stretch vertically ──
        if (Math.random() < 0.35) {
          // Deep run: sprint toward goal line in the channel
          const goalX = isHome ? rand(0.7, 0.85) : rand(0.15, 0.3);
          const channelY = index === 9 ? rand(0.2, 0.4) : rand(0.6, 0.8); // split wide
          nx = clamp(goalX + (Math.random() - 0.5) * 0.06, 0.05, 0.95);
          ny = clamp(channelY + (Math.random() - 0.5) * 0.1, 0.1, 0.9);
          duration = rand(600, 1100);
        } else {
          // Hold position: link-up play, check to ball
          const holdX = base.x + formationShiftX + ballShiftX * 0.5;
          nx = clamp(holdX + (Math.random() - 0.5) * 0.08, 0.05, 0.95);
          ny = clamp(toward(base.y, by, 0.2) + (Math.random() - 0.5) * 0.12, 0.15, 0.85);
          duration = rand(800, 1400);
        }

      } else if (isStriker && !teamAttacking) {
        // ── Strikers defending: drop back to midfield line, stay central ──
        const retreatX = isHome ? clamp(base.x - 0.1, 0.35, 0.55) : clamp(base.x + 0.1, 0.45, 0.65);
        nx = clamp(retreatX + (Math.random() - 0.5) * 0.08, 0.15, 0.85);
        ny = clamp(base.y + (Math.random() - 0.5) * 0.15, 0.2, 0.8);
        duration = rand(800, 1500);

      } else if (isWideMid && teamAttacking) {
        // ── Wide mids: hug touchline in attack, create width ──
        const wideY = index === 5 ? rand(0.02, 0.15) : rand(0.85, 0.98); // near touchline
        const pushX = base.x + formationShiftX + (isHome ? phase * 0.04 : -phase * 0.04);
        nx = clamp(pushX + ballShiftX * 0.3, 0.1, 0.9);
        ny = clamp(wideY, 0.02, 0.98);
        duration = rand(700, 1300);

      } else if (isWideMid && !teamAttacking) {
        // ── Wide mids defending: tuck in to make compact 4-4 block ──
        const tuckY = index === 5 ? rand(0.15, 0.3) : rand(0.7, 0.85);
        const retreatX = isHome ? clamp(base.x - 0.06, 0.2, 0.4) : clamp(base.x + 0.06, 0.6, 0.8);
        nx = clamp(retreatX + ballShiftX * 0.4, 0.1, 0.9);
        ny = clamp(toward(tuckY, by, 0.15), 0.1, 0.9);
        duration = rand(700, 1400);

      } else if (isCentreMid && teamAttacking) {
        // ── Centre mids: one pushes forward, one holds ──
        const isAdvanced = (index === 6 && phase >= 1) || (index === 7 && phase >= 2);
        if (isAdvanced) {
          // Push into space between midfield and attack
          const pushX = base.x + formationShiftX + (isHome ? 0.1 : -0.1);
          nx = clamp(pushX + ballShiftX * 0.3 + (Math.random() - 0.5) * 0.06, 0.15, 0.85);
          ny = clamp(toward(base.y, by, 0.25) + (Math.random() - 0.5) * 0.12, 0.2, 0.8);
        } else {
          // Hold position, provide passing option
          nx = clamp(base.x + formationShiftX + ballShiftX * 0.5 + (Math.random() - 0.5) * 0.06, 0.15, 0.85);
          ny = clamp(base.y + ballShiftY + (Math.random() - 0.5) * 0.1, 0.2, 0.8);
        }
        duration = rand(700, 1400);

      } else if (isCentreMid && !teamAttacking) {
        // ── Centre mids defending: shield defence, track ball ──
        const shieldX = isHome ? clamp(base.x - 0.05, 0.22, 0.38) : clamp(base.x + 0.05, 0.62, 0.78);
        nx = clamp(shieldX + ballShiftX * 0.4, 0.15, 0.85);
        ny = clamp(toward(base.y, by, 0.3) + (Math.random() - 0.5) * 0.08, 0.2, 0.8);
        duration = rand(600, 1200);

      } else if (isDefender && teamAttacking) {
        // ── Defenders in attack: push up, maintain flat line ──
        // Full-backs (1,4) push wider and higher; centre-backs (2,3) hold
        const isFB = index === 1 || index === 4;
        const pushUp = isFB ? formationShiftX * 1.2 : formationShiftX * 0.5;
        const targetX = base.x + pushUp + ballShiftX * 0.3;
        nx = clamp(targetX + (Math.random() - 0.5) * 0.04, isHome ? 0.1 : 0.5, isHome ? 0.5 : 0.9);
        // Full-backs go wider in attack
        const ySpread = isFB ? (Math.random() - 0.5) * 0.08 : (Math.random() - 0.5) * 0.06;
        ny = clamp(base.y + ballShiftY * 0.5 + ySpread, 0.05, 0.95);
        duration = rand(800, 1600);

      } else if (isDefender && !teamAttacking) {
        // ── Defenders out of possession: flat line, track ball, stay compact ──
        const defLineX = isHome ? clamp(0.18 + ballShiftX * 0.3, 0.12, 0.3) : clamp(0.82 + ballShiftX * 0.3, 0.7, 0.88);
        nx = clamp(defLineX + (Math.random() - 0.5) * 0.03, isHome ? 0.08 : 0.65, isHome ? 0.35 : 0.92);
        // Track ball Y — whole line shifts toward the ball side
        const lineY = base.y * compactFactor + 0.5 * (1 - compactFactor);
        ny = clamp(toward(lineY, by, 0.2) + (Math.random() - 0.5) * 0.05, 0.08, 0.92);
        duration = rand(700, 1400);

      } else {
        // ── Fallback: gentle positioning ──
        nx = clamp(base.x + formationShiftX + ballShiftX * 0.3 + (Math.random() - 0.5) * 0.08, 0.05, 0.95);
        ny = clamp(base.y + ballShiftY + (Math.random() - 0.5) * 0.1, 0.05, 0.95);
        duration = rand(800, 1600);
      }

      if (positions[index]) positions[index] = { x: nx, y: ny };

      Animated.parallel([
        Animated.timing(dot.tx, { toValue: nx * (pw() - DOT_SIZE), duration, useNativeDriver: canUseNative }),
        Animated.timing(dot.ty, { toValue: ny * (PITCH_HEIGHT - DOT_SIZE), duration, useNativeDriver: canUseNative }),
      ]).start();

      // ── GLUE BALL to carrier: same target, same duration, zero extra logic ──
      if (team === possessionRef.current && index === ballCarrierRef.current && !ballBusyRef.current && !goalAnimRef.current) {
        ballPosRef.current = { x: nx, y: ny };
        Animated.timing(ballTx, { toValue: nx * (pw() - BALL_SIZE), duration, useNativeDriver: canUseNative }).start();
        Animated.timing(ballTy, { toValue: ny * (PITCH_HEIGHT - BALL_SIZE), duration, useNativeDriver: canUseNative }).start();
      }

      const pause = rand(50, 300);
      const t = setTimeout(() => {
        animateOnePlayer(dots, basePositions, positions, team, index);
      }, duration + pause);
      timers.push(t);
    };

    for (let i = 0; i < 11; i++) {
      const homeDelay = Math.random() * 600;
      const awayDelay = Math.random() * 600;
      const t1 = setTimeout(() => {
        animateOnePlayer(homeDotsRef.current, HOME_POS, posRef.current.home, 'home', i);
      }, homeDelay);
      const t2 = setTimeout(() => {
        animateOnePlayer(awayDotsRef.current, AWAY_POS, posRef.current.away, 'away', i);
      }, awayDelay);
      timers.push(t1, t2);
    }

    return () => {
      mountedRef.current = false;
      timers.forEach(t => clearTimeout(t));
    };
  }, [canUseNative]);

  // ─── BALL MOVEMENT — realistic build-up play ───
  useEffect(() => {
    mountedRef.current = true;
    const pw = () => pitchWidthRef.current;
    let ballTimer: ReturnType<typeof setTimeout> | null = null;
    // (dribbleInterval removed — dribble is now just a timer delay)

    // Update ball position tracker
    const updateBallPos = (x: number, y: number) => {
      ballPosRef.current = { x, y };
    };

    // Freeze a player: stop animation, sync posRef via callback (works on native driver)
    const freezePlayer = (team: 'home' | 'away', idx: number, onDone?: () => void) => {
      frozenPlayersRef.current.add(`${team}-${idx}`);
      const dots = team === 'home' ? homeDotsRef.current : awayDotsRef.current;
      const positions = team === 'home' ? posRef.current.home : posRef.current.away;
      const dot = dots?.[idx];
      if (dot) {
        let got = 0;
        const check = () => { got++; if (got === 2) onDone?.(); };
        dot.tx.stopAnimation((vx) => {
          if (positions[idx]) positions[idx].x = clamp(vx / (pitchWidthRef.current - DOT_SIZE), 0, 1);
          check();
        });
        dot.ty.stopAnimation((vy) => {
          if (positions[idx]) positions[idx].y = clamp(vy / (PITCH_HEIGHT - DOT_SIZE), 0, 1);
          check();
        });
      } else {
        onDone?.();
      }
    };
    const unfreezePlayer = (team: 'home' | 'away', idx: number) => {
      frozenPlayersRef.current.delete(`${team}-${idx}`);
    };
    const unfreezeAll = () => { frozenPlayersRef.current.clear(); };

    // Read position from posRef
    const getVisualPos = (team: 'home' | 'away', idx: number): { x: number; y: number } => {
      const positions = team === 'home' ? posRef.current.home : posRef.current.away;
      return positions[idx] ? { x: positions[idx].x, y: positions[idx].y } : { x: 0.5, y: 0.5 };
    };

    // Snap ball exactly onto a frozen player via stopAnimation callback
    const snapBallToPlayer = (team: 'home' | 'away', idx: number) => {
      const dots = team === 'home' ? homeDotsRef.current : awayDotsRef.current;
      const dot = dots?.[idx];
      if (!dot) return;
      dot.tx.stopAnimation((px) => {
        ballTx.setValue(px + (DOT_SIZE - BALL_SIZE) / 2);
        ballPosRef.current.x = clamp(px / (pitchWidthRef.current - DOT_SIZE), 0, 1);
      });
      dot.ty.stopAnimation((py) => {
        ballTy.setValue(py + (DOT_SIZE - BALL_SIZE) / 2);
        ballPosRef.current.y = clamp(py / (PITCH_HEIGHT - DOT_SIZE), 0, 1);
      });
    };

    // Dribble: carrier just runs normally (animateOnePlayer handles movement),
    // ball follows via follow system. We just wait before next action.
    const startDribble = (onDone: () => void) => {
      // No special animation — carrier moves like any other player
      // Just delay the next scheduleBall call
      ballTimer = setTimeout(onDone, rand(500, 900));
    };

    // Shot on goal that misses → GK goal kick
    const doMissedShot = (onDone: () => void) => {
      unfreezeAll();
      ballBusyRef.current = true;
      const poss = possessionRef.current;
      const goalEdgeX = poss === 'home' ? 0.98 * (pw() - BALL_SIZE) : 0.02 * (pw() - BALL_SIZE);
      const missY = (Math.random() < 0.5 ? rand(0.05, 0.3) : rand(0.7, 0.95)) * (PITCH_HEIGHT - BALL_SIZE);

      Animated.parallel([
        Animated.timing(ballTx, { toValue: goalEdgeX, duration: 280, useNativeDriver: canUseNative }),
        Animated.timing(ballTy, { toValue: missY, duration: 280, useNativeDriver: canUseNative }),
      ]).start(() => {
        updateBallPos(poss === 'home' ? 0.98 : 0.02, missY / (PITCH_HEIGHT - BALL_SIZE));
        setTimeout(() => {
          if (!mountedRef.current) return;
          const oppTeam = poss === 'home' ? 'away' : 'home';
          possessionRef.current = oppTeam;
          attackPhaseRef.current = 0;
          ballCarrierRef.current = 0; // GK
          const gkPos = oppTeam === 'home' ? posRef.current.home[0] : posRef.current.away[0];
          if (gkPos) {
            updateBallPos(gkPos.x, gkPos.y);
            Animated.parallel([
              Animated.timing(ballTx, { toValue: gkPos.x * (pw() - BALL_SIZE), duration: 400, useNativeDriver: canUseNative }),
              Animated.timing(ballTy, { toValue: gkPos.y * (PITCH_HEIGHT - BALL_SIZE), duration: 400, useNativeDriver: canUseNative }),
            ]).start(() => {
              setTimeout(() => {
                if (!mountedRef.current) return;
                // GK distributes: short to centre-back or long to midfielder
                const isLong = Math.random() < 0.3;
                const defIdx = isLong ? (5 + Math.floor(Math.random() * 2)) : (2 + Math.floor(Math.random() * 2)); // CB or CM
                ballCarrierRef.current = defIdx;
                const defPos = oppTeam === 'home' ? posRef.current.home[defIdx] : posRef.current.away[defIdx];
                if (defPos) {
                  const flyTime = isLong ? rand(500, 700) : rand(300, 450);
                  updateBallPos(defPos.x, defPos.y);
                  Animated.parallel([
                    Animated.timing(ballTx, { toValue: defPos.x * (pw() - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
                    Animated.timing(ballTy, { toValue: defPos.y * (PITCH_HEIGHT - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
                  ]).start(() => { ballBusyRef.current = false; onDone(); });
                } else {
                  ballBusyRef.current = false; onDone();
                }
              }, rand(400, 700));
            });
          } else {
            ballBusyRef.current = false; onDone();
          }
        }, rand(300, 600));
      });
    };

    // Goal shot — ball goes into the net, flash, kickoff
    const doGoalShot = (goalEvent: { isHome: boolean; scorer?: string; bonus?: number }) => {
      unfreezeAll();
      goalAnimRef.current = true;
      ballBusyRef.current = true;
      const isHome = goalEvent.isHome;
      const pw2 = pw();

      const goalX = isHome ? 0.99 * (pw2 - BALL_SIZE) : 0.01 * (pw2 - BALL_SIZE);
      const goalY = rand(0.38, 0.62) * (PITCH_HEIGHT - BALL_SIZE);

      // Ball into net from current position
      Animated.parallel([
        Animated.timing(ballTx, { toValue: goalX, duration: 220, useNativeDriver: canUseNative }),
        Animated.timing(ballTy, { toValue: goalY, duration: 220, useNativeDriver: canUseNative }),
      ]).start(() => {
        // NOW update the displayed score — bump by 1 for scoring team
        setDisplayScore(prev => ({
          home: goalEvent.isHome ? prev.home + 1 : prev.home,
          away: goalEvent.isHome ? prev.away : prev.away + 1,
        }));
        hapticGoal();
        if (isHome) playGoalCheer();
        if (isHome && goalEvent.scorer) {
          setGoalBonusText('\u26BD goal ' + goalEvent.scorer + ' !');
        } else if ((goalEvent.bonus ?? 0) > 0) {
          setGoalBonusText('+' + formatMoney(goalEvent.bonus ?? 0));
        } else {
          setGoalBonusText('GOAL!');
        }
        goalTextY.setValue(0); goalTextOpacity.setValue(1); flashOpacity.setValue(0.5);
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue: 0, duration: 500, useNativeDriver: canUseNative }),
          Animated.timing(goalTextY, { toValue: -50, duration: 2200, useNativeDriver: canUseNative }),
          Animated.timing(goalTextOpacity, { toValue: 0, duration: 2200, useNativeDriver: canUseNative }),
        ]).start();

        // Kickoff — back to center
        setTimeout(() => {
          if (!mountedRef.current) return;
          Animated.parallel([
            Animated.timing(ballTx, { toValue: 0.5 * (pw2 - BALL_SIZE), duration: 300, useNativeDriver: canUseNative }),
            Animated.timing(ballTy, { toValue: 0.5 * (PITCH_HEIGHT - BALL_SIZE), duration: 300, useNativeDriver: canUseNative }),
          ]).start(() => {
            possessionRef.current = isHome ? 'away' : 'home';
            attackPhaseRef.current = 0;
            ballCarrierRef.current = 9;
            goalAnimRef.current = false;
            ballTimer = setTimeout(scheduleBall, 400);
          });
        }, 800);
      });
    };

    // Find nearest teammate to pass to (realistic: prefer forward, close passes)
    const findPassTarget = (teamPos: { x: number; y: number }[], carrierIdx: number, poss: 'home' | 'away', phase: number): number => {
      const carrier = teamPos[carrierIdx];
      if (!carrier) return 5;
      const isHome = poss === 'home';

      // Build-up pattern: prefer passing in sequence (def→mid→att)
      let preferred: number[];
      const isGK = carrierIdx === 0;
      const isDef = carrierIdx >= 1 && carrierIdx <= 4;
      const isMid = carrierIdx >= 5 && carrierIdx <= 8;

      if (isGK) {
        preferred = [2, 3, 1, 4]; // CB first, then FB
      } else if (isDef && phase < 1) {
        // Defenders pass to each other or to midfield
        preferred = [1, 2, 3, 4, 6, 7].filter(i => i !== carrierIdx);
      } else if (isDef) {
        preferred = [5, 6, 7, 8].filter(i => i !== carrierIdx); // midfield
      } else if (isMid && phase < 2) {
        // Midfielders circulate or push to wide
        preferred = [5, 6, 7, 8].filter(i => i !== carrierIdx);
        if (Math.random() < 0.3) preferred = [9, 10, ...preferred]; // occasionally to strikers
      } else if (isMid) {
        preferred = [9, 10, 5, 6, 7, 8].filter(i => i !== carrierIdx); // strikers preferred
      } else {
        // Strikers: lay off to midfield or pass to other striker
        preferred = [9, 10, 6, 7, 5, 8].filter(i => i !== carrierIdx);
      }

      // Weight by distance — prefer closer, forward players
      let best = preferred[0] ?? 5;
      let bestScore = -999;
      for (const idx of preferred) {
        const tp = teamPos[idx];
        if (!tp) continue;
        const dist = Math.hypot(tp.x - carrier.x, tp.y - carrier.y);
        const forwardBonus = isHome ? (tp.x - carrier.x) * 2 : (carrier.x - tp.x) * 2;
        const closenessBonus = Math.max(0, 0.4 - dist) * 3;
        const score = forwardBonus + closenessBonus + Math.random() * 0.5;
        if (score > bestScore) {
          bestScore = score;
          best = idx;
        }
      }
      return best;
    };

    const scheduleBall = () => {
      if (!mountedRef.current || goalAnimRef.current) {
        ballTimer = setTimeout(scheduleBall, 300);
        return;
      }

      const poss = possessionRef.current;
      const isHome = poss === 'home';
      const teamPos = poss === 'home' ? posRef.current.home : posRef.current.away;
      const oppPos = poss === 'home' ? posRef.current.away : posRef.current.home;
      const carrier = teamPos?.[ballCarrierRef.current];
      const pg = pendingGoalRef.current;

      // ── PENDING GOAL: carrier in box → score! Otherwise play normally (no turnovers) ──
      if (pg) {
        if (carrier) {
          const inBox = isHome ? carrier.x > 0.72 : carrier.x < 0.28;
          if (inBox) {
            pendingGoalRef.current = null;
            doGoalShot(pg);
            return;
          }
        }
        // Not in box yet — force forward action (dribble or pass), no turnovers
        if (attackPhaseRef.current < 3) attackPhaseRef.current += 1;
        if (Math.random() < 0.5) {
          startDribble(scheduleBall);
        } else {
          const curIdx = ballCarrierRef.current;
          const nextIdx = findPassTarget(teamPos, curIdx, poss, attackPhaseRef.current);

          // Freeze both, wait for positions to sync, THEN fly ball
          freezePlayer(poss, curIdx, () => {
            freezePlayer(poss, nextIdx, () => {
              const fromVis = getVisualPos(poss, curIdx);
              const toVis = getVisualPos(poss, nextIdx);

              ballCarrierRef.current = nextIdx;
              const dist = Math.hypot(toVis.x - fromVis.x, toVis.y - fromVis.y);
              const flyTime = dist < 0.18 ? rand(250, 400) : dist > 0.4 ? rand(500, 700) : rand(350, 550);
              ballBusyRef.current = true;
              updateBallPos(toVis.x, toVis.y);
              Animated.parallel([
                Animated.timing(ballTx, { toValue: toVis.x * (pw() - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
                Animated.timing(ballTy, { toValue: toVis.y * (PITCH_HEIGHT - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
              ]).start(() => {
                snapBallToPlayer(poss, nextIdx);
                ballBusyRef.current = false;
                unfreezePlayer(poss, curIdx);
                unfreezePlayer(poss, nextIdx);
              });
              ballTimer = setTimeout(scheduleBall, flyTime + rand(100, 250));
            });
          });
        }
        return;
      }

      // ── SHOT: near GK area — always shoot, edge of box — sometimes ──
      if (carrier) {
        const nearGK = isHome ? carrier.x > 0.82 : carrier.x < 0.18;
        const edgeOfBox = isHome ? carrier.x > 0.72 : carrier.x < 0.28;
        if (nearGK || (edgeOfBox && Math.random() < 0.30)) {
          doMissedShot(scheduleBall);
          return;
        }
      }

      const roll = Math.random();
      const phase = attackPhaseRef.current;

      // ── TURNOVER — more likely in dangerous areas, cooldown prevents ping-pong ──
      if (turnoverCooldownRef.current > 0) turnoverCooldownRef.current -= 1;
      const turnoverChance = phase >= 2 ? 0.14 : 0.08;
      if (roll < turnoverChance && turnoverCooldownRef.current <= 0) {
        turnoverCooldownRef.current = 3;
        const opp = poss === 'home' ? 'away' : 'home';
        
        const prevCarrier = ballCarrierRef.current;
        // Freeze carrier, wait for position sync, then find nearest and fly
        freezePlayer(poss, prevCarrier, () => {
          const carrierVis = getVisualPos(poss, prevCarrier);
          
          let nearestIdx = 3; let nearestDist = 999;
          for (let i = 1; i <= 8; i++) {
            const op = oppPos?.[i]; if (!op) continue;
            const d = Math.hypot(op.x - carrierVis.x, op.y - carrierVis.y);
            if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
          }
          
          freezePlayer(opp, nearestIdx, () => {
            const receiverVis = getVisualPos(opp, nearestIdx);
            
            possessionRef.current = opp;
            attackPhaseRef.current = 0;
            ballCarrierRef.current = nearestIdx;
            
            ballBusyRef.current = true;
            updateBallPos(receiverVis.x, receiverVis.y);
            const flyTime = rand(300, 500);
            Animated.parallel([
              Animated.timing(ballTx, { toValue: receiverVis.x * (pw() - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
              Animated.timing(ballTy, { toValue: receiverVis.y * (PITCH_HEIGHT - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
            ]).start(() => {
              snapBallToPlayer(opp, nearestIdx);
              ballBusyRef.current = false;
              unfreezePlayer(poss, prevCarrier);
              unfreezePlayer(opp, nearestIdx);
            });
            ballTimer = setTimeout(scheduleBall, flyTime + rand(200, 500));
          });
        });
        return;
      }

      // ── DRIBBLE — more common for strikers/wide mids in final third ──
      const carrierIsAttacker = ballCarrierRef.current >= 5;
      const dribbleChance = carrierIsAttacker ? 0.35 : 0.2;
      if (roll < turnoverChance + dribbleChance) {
        startDribble(scheduleBall);
        return;
      }

      // ── PASS — freeze both players, ball flies between actual positions ──
      if (attackPhaseRef.current < 3 && Math.random() < 0.45) {
        attackPhaseRef.current += 1;
      }

      const currentCarrier = ballCarrierRef.current;
      const nextIdx = findPassTarget(teamPos, currentCarrier, poss, attackPhaseRef.current);

      // 1. Freeze both — wait for position sync via callbacks, THEN fly ball
      freezePlayer(poss, currentCarrier, () => {
        freezePlayer(poss, nextIdx, () => {
          const fromPos = getVisualPos(poss, currentCarrier);
          const toPos = getVisualPos(poss, nextIdx);

          ballCarrierRef.current = nextIdx;

          const dist = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
          const isShort = dist < 0.18;
          const isLong = dist > 0.4;
          const flyTime = isLong ? rand(500, 750) : isShort ? rand(250, 400) : rand(350, 550);

          ballBusyRef.current = true;
          updateBallPos(toPos.x, toPos.y);
          Animated.parallel([
            Animated.timing(ballTx, { toValue: toPos.x * (pw() - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
            Animated.timing(ballTy, { toValue: toPos.y * (PITCH_HEIGHT - BALL_SIZE), duration: flyTime, useNativeDriver: canUseNative }),
          ]).start(() => {
            snapBallToPlayer(poss, nextIdx);
            ballBusyRef.current = false;
            unfreezePlayer(poss, currentCarrier);
            unfreezePlayer(poss, nextIdx);
          });

          const isBackPass = (poss === 'home' && toPos.x < fromPos.x) || (poss === 'away' && toPos.x > fromPos.x);
          const receiveTime = isBackPass ? rand(300, 600) : isShort ? rand(100, 250) : rand(200, 400);
          ballTimer = setTimeout(scheduleBall, flyTime + receiveTime);
        });
      });
    };

    ballTimer = setTimeout(scheduleBall, 200);

    return () => {
      mountedRef.current = false;
      if (ballTimer) clearTimeout(ballTimer);
    };
  }, [canUseNative]);

  // Ball follow removed — ball is glued directly to carrier in animateOnePlayer

  // ─── GOAL EVENT — queue into normal attack flow ───
  useEffect(() => {
    if (!lastGoalEvent) return;
    // Give possession to scoring team and queue goal — scheduleBall handles the rest
    const scoringTeam: 'home' | 'away' = lastGoalEvent.isHome ? 'home' : 'away';
    possessionRef.current = scoringTeam;
    attackPhaseRef.current = 2;
    // Pick a striker as carrier if not already attacking
    if (ballCarrierRef.current < 5) ballCarrierRef.current = 9 + Math.floor(Math.random() * 2);
    pendingGoalRef.current = {
      isHome: lastGoalEvent.isHome,
      scorer: lastGoalEvent.scorer,
      bonus: lastGoalEvent.bonus,
      timestamp: lastGoalEvent.timestamp,
    };
  }, [lastGoalEvent?.timestamp]);

  // Whistle on match start
  const prevMatchTimeRef = useRef(0);
  useEffect(() => {
    const mt = matchState?.matchTime ?? 0;
    if (prevMatchTimeRef.current === 0 && mt === 1) playMatchStart();
    prevMatchTimeRef.current = mt;
  }, [matchState?.matchTime]);

  // Haptic on match end
  const prevResultRef = useRef<string | null>(null);
  useEffect(() => {
    const r = matchState?.result ?? null;
    if (r && r !== 'playing' && prevResultRef.current !== r) {
      if (r === 'won') hapticWin(); else hapticLoss();
    }
    prevResultRef.current = r;
  }, [matchState?.result]);

  // Upgrade toast
  useEffect(() => {
    if (!lastUpgradeEvent) return;
    const totalStr = lastUpgradeEvent.type === 'power'
      ? `${lastUpgradeEvent.total}`
      : `$${lastUpgradeEvent.total}/s`;
    const diffStr = lastUpgradeEvent.type === 'power'
      ? `+${lastUpgradeEvent.diff}`
      : `+$${lastUpgradeEvent.diff}/s`;
    setUpgradeToast({ type: lastUpgradeEvent.type, total: totalStr, diff: diffStr });
    upgradeToastOpacity.setValue(0);
    upgradeToastScale.setValue(0.8);
    Animated.parallel([
      Animated.spring(upgradeToastScale, { toValue: 1, useNativeDriver: canUseNative, speed: 20, bounciness: 8 }),
      Animated.timing(upgradeToastOpacity, { toValue: 1, duration: 200, useNativeDriver: canUseNative }),
    ]).start();
    const hideTimer = setTimeout(() => {
      Animated.timing(upgradeToastOpacity, { toValue: 0, duration: 400, useNativeDriver: canUseNative }).start(() => {
        setUpgradeToast(null);
      });
    }, 2000);
    return () => clearTimeout(hideTimer);
  }, [lastUpgradeEvent?.timestamp]);

  // Sync displayed score when no goal is pending (match start, match end, normal ticks)
  useEffect(() => {
    if (!pendingGoalRef.current && !goalAnimRef.current) {
      setDisplayScore({ home: matchState?.homeScore ?? 0, away: matchState?.awayScore ?? 0 });
    }
  }, [matchState?.homeScore, matchState?.awayScore]);





  // Reset on new match
  useEffect(() => {
    const mt = matchState?.matchTime ?? 0;
    if (mt <= 1) {
      possessionRef.current = 'home';
      attackPhaseRef.current = 0;
      ballCarrierRef.current = 5;
      goalAnimRef.current = false;
      ballBusyRef.current = false;
      pendingGoalRef.current = null;
      turnoverCooldownRef.current = 0;
      frozenPlayersRef.current.clear();
      setDisplayScore({ home: 0, away: 0 });
    }
  }, [matchState?.matchTime]);

  const matchTime = matchState?.matchTime ?? 0;
  // Map real seconds (0→MATCH_DURATION) to football minutes (0→90)
  const footballMinute = Math.min(90, Math.round((Math.min(matchTime, MATCH_DURATION) / MATCH_DURATION) * 90));
  const result = matchState?.result;
  const isPlaying = !result || result === 'playing';

  const resultColor = result === 'won' ? '#10B981' : result === 'lost' ? '#EF4444' : '#F59E0B';
  const resultText = result === 'won' ? '✅ VICTORY!' : result === 'lost' ? '❌ DEFEAT' : result === 'draw' ? '🤝 DRAW' : '';

  return (
    <View style={s.container}>
      <View style={s.infoBar}>
        <View style={s.teamCol}>
          <Text style={[s.teamNameHome, { color: teamColor }]} numberOfLines={1}>({teamPower}) {gameState?.teamName ?? 'My Team'}</Text>
          <Text style={s.winChanceHome}>win chance {Math.round(winChance)}%</Text>
        </View>
        <View style={s.scoreContainer}>
          <Text style={[s.scoreHome, { color: teamColor }]}>{displayScore.home}</Text>
          <Text style={s.scoreTime}>
            {isPlaying ? `${footballMinute}'` : 'FT'}
          </Text>
          <Text style={s.scoreAway}>{displayScore.away}</Text>
        </View>
        <View style={s.teamColRight}>
          <View style={s.awayNameRow}>
            <Text style={s.teamNameAwayLabel} numberOfLines={1} ellipsizeMode="tail">{matchState?.opponentName ?? 'Opponent'}</Text>
            <Text style={s.teamNameAwayPower}> ({matchState?.opponentPower ?? 0})</Text>
          </View>
          <Text style={s.winChanceAway}>win chance {Math.round(100 - winChance)}%</Text>
        </View>
      </View>

      <View style={[s.pitch, { height: PITCH_HEIGHT }]} onLayout={onPitchLayout}>
        <View style={s.centerLine} />
        <View style={s.centerCircle} />
        <View style={s.penaltyLeft} />
        <View style={s.penaltyRight} />
        <View style={s.goalLeft} />
        <View style={s.goalRight} />

        {homeDotsRef.current?.map((dot, i) => (
          <Animated.View key={`h${i}`} style={[s.dot, { backgroundColor: i === 0 ? '#FFD700' : teamColor }, { transform: [{ translateX: dot.tx }, { translateY: dot.ty }] }]} />
        ))}
        {awayDotsRef.current?.map((dot, i) => (
          <Animated.View key={`a${i}`} style={[s.dot, { backgroundColor: i === 0 ? '#FFD700' : Colors.danger }, { transform: [{ translateX: dot.tx }, { translateY: dot.ty }] }]} />
        ))}

        <Animated.View style={[s.ball, { transform: [{ translateX: ballTx }, { translateY: ballTy }] }]} />
        <Animated.View style={[s.flash, { opacity: flashOpacity }]} pointerEvents="none" />
        <Animated.Text style={[s.goalText, { opacity: goalTextOpacity, transform: [{ translateY: goalTextY }] }]}>{goalBonusText}</Animated.Text>

        {/* Match Event Bubble */}
        {activeEvent && (
          <Animated.View
            style={[
              s.eventBubbleWrap,
              {
                left: activeEvent.x * (pitchWidthRef.current - EVENT_BUBBLE_SIZE),
                top: activeEvent.y * (PITCH_HEIGHT - EVENT_BUBBLE_SIZE),
                opacity: eventBubbleOpacity,
                transform: [{ scale: eventBubbleScale }],
              },
            ]}
          >
            <Pressable onPress={handleEventTap} style={s.eventBubblePress}>
              <Image source={EVENT_BUBBLE_IMG} style={s.eventBubbleImg} resizeMode="contain" />
              <Image source={activeEvent.source} style={s.eventIconImg} resizeMode="contain" />
            </Pressable>
          </Animated.View>
        )}

        {/* Event reward float */}
        {eventRewardText && (
          <Animated.View
            style={[
              s.eventRewardWrap,
              { opacity: eventRewardOpacity, transform: [{ translateY: eventRewardY }] },
            ]}
            pointerEvents="none"
          >
            <CurrencyIcon type="money" size={14} />
            <Text style={s.eventRewardMoney}>{eventRewardText}</Text>
            {eventRewardFame > 0 && (
              <>
                <CurrencyIcon type="fame" size={14} />
                <Text style={s.eventRewardFame}>+{eventRewardFame}</Text>
              </>
            )}
          </Animated.View>
        )}

        {/* Upgrade toast moved to HomeScreen overlay */}

        {result && result !== 'playing' && (
          <View style={s.resultOverlay}>
            <Text style={[s.resultText, { color: resultColor }]}>{resultText}</Text>
            {result === 'won' && <Text style={s.resultBonus}>+{formatMoney(matchProgression?.winBonus ?? 0)} Win Bonus</Text>}
            {result !== 'won' && <Text style={s.resultRetry}>Replaying match...</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: Colors.dark, borderRadius: Radius.lg, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, overflow: 'hidden' },
  infoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreHome: { color: Colors.green, fontWeight: '800', fontSize: 22 },
  scoreTime: { color: '#FFF', fontWeight: '600', fontSize: 13, opacity: 0.7 },
  scoreAway: { color: Colors.danger, fontWeight: '800', fontSize: 22 },
  pitch: { backgroundColor: Colors.pitch, position: 'relative', overflow: 'hidden' },
  centerLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  centerCircle: { position: 'absolute', left: '50%', top: '50%', width: 50, height: 50, marginLeft: -25, marginTop: -25, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  penaltyLeft: { position: 'absolute', left: 0, top: '25%', width: '14%', height: '50%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderLeftWidth: 0 },
  penaltyRight: { position: 'absolute', right: 0, top: '25%', width: '14%', height: '50%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRightWidth: 0 },
  goalLeft: { position: 'absolute', left: 0, top: '40%', width: '3%', height: '20%', backgroundColor: 'rgba(255,255,255,0.15)' },
  goalRight: { position: 'absolute', right: 0, top: '40%', width: '3%', height: '20%', backgroundColor: 'rgba(255,255,255,0.15)' },
  dot: { position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  ball: { position: 'absolute', width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2, backgroundColor: '#FFF', zIndex: 10 },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF' },
  goalText: { position: 'absolute', alignSelf: 'center', top: '40%', fontSize: 22, fontWeight: '900', color: '#FFD700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  resultOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  resultText: { fontSize: 26, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  resultBonus: { fontSize: 14, fontWeight: '700', color: '#FFD700', marginTop: 4 },
  resultRetry: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  upgradeToast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    zIndex: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  upgradeToastIcon: { fontSize: 16 },
  upgradeToastLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 },
  upgradeToastTotal: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  upgradeToastDiff: { color: '#10B981', fontWeight: '800', fontSize: 13 },
  teamCol: { flex: 1 },
  teamColRight: { flex: 1, alignItems: 'flex-end' },
  teamNameHome: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  awayNameRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  teamNameAwayLabel: { color: Colors.danger, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  teamNameAwayPower: { color: Colors.danger, fontSize: 12, fontWeight: '700', flexShrink: 0 },
  winChanceHome: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  winChanceAway: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  // Event bubble
  eventBubbleWrap: {
    position: 'absolute',
    width: EVENT_BUBBLE_SIZE,
    height: EVENT_BUBBLE_SIZE,
    zIndex: 25,
  },
  eventBubblePress: {
    width: EVENT_BUBBLE_SIZE,
    height: EVENT_BUBBLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBubbleImg: {
    position: 'absolute',
    width: EVENT_BUBBLE_SIZE,
    height: EVENT_BUBBLE_SIZE,
  },
  eventIconImg: {
    width: EVENT_BUBBLE_SIZE * 0.55,
    height: EVENT_BUBBLE_SIZE * 0.55,
    marginBottom: 4, // nudge up slightly to sit inside bubble (above pointer)
  },
  eventRewardWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    zIndex: 26,
  },
  eventRewardMoney: {
    fontSize: 13,
    fontWeight: '900',
    color: '#22C55E',
  },
  eventRewardFame: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFB800',
  },
});