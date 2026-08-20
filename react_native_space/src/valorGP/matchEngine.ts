/* ── Valor GP Match Engine ── */
import { VGPMatchState, VGPMatchEvent } from './types';
import { VGP_MATCH_DURATION, VGP_GAME_MINUTES } from './constants';

export function createInitialMatchState(): VGPMatchState {
  return {
    status: 'playing',
    homeScore: 0,
    awayScore: 0,
    elapsedSec: 0,
    gameMinute: 0,
    events: [],
    ballHolder: { team: Math.random() > 0.5 ? 'home' : 'away', playerIndex: Math.floor(Math.random() * 5) },
  };
}

/**
 * Tick the match by 1 real second.
 * winChancePct: 0-100 chance that player's team scores (vs opponent).
 * Returns updated state (immutable).
 */
export function tickMatch(prev: VGPMatchState, winChancePct: number): VGPMatchState {
  if (prev.status === 'won' || prev.status === 'lost') return prev;

  const s = { ...prev };
  s.elapsedSec = prev.elapsedSec + 1;
  s.events = [...prev.events];

  // Calculate game minute display
  if (prev.status === 'sudden_death') {
    // Extra time: 45 + seconds since regular ended
    s.gameMinute = VGP_GAME_MINUTES + (s.elapsedSec - VGP_MATCH_DURATION);
  } else {
    s.gameMinute = Math.min(
      Math.round((s.elapsedSec / VGP_MATCH_DURATION) * VGP_GAME_MINUTES),
      VGP_GAME_MINUTES,
    );
  }

  // ── Check if regular time just ended (before processing goals this tick) ──
  if (s.elapsedSec >= VGP_MATCH_DURATION && prev.status === 'playing') {
    // Use score BEFORE this tick's goal processing
    if (prev.homeScore === prev.awayScore) {
      s.status = 'sudden_death';
      // Continue — sudden death starts, goals can still happen this tick
    } else {
      s.status = prev.homeScore > prev.awayScore ? 'won' : 'lost';
      return s;
    }
  }

  // ── Goal processing ──
  // In sudden death, increase goal chance so it doesn't drag forever
  const inSD = s.status === 'sudden_death';
  const sdSeconds = inSD ? (s.elapsedSec - VGP_MATCH_DURATION) : 0;
  // Base 5%, ramps up in sudden death: +1% every 5 seconds of extra time
  const goalChance = 0.05 + (inSD ? Math.min(sdSeconds * 0.002, 0.10) : 0);
  if (Math.random() < goalChance) {
    const isHome = Math.random() * 100 < winChancePct;
    const team = isHome ? 'home' : 'away';
    const pIdx = Math.floor(Math.random() * 5);
    s.events.push({
      type: 'goal',
      team,
      playerIndex: pIdx,
      gameMinute: s.gameMinute,
      timestamp: Date.now(),
    });
    if (isHome) s.homeScore = prev.homeScore + 1;
    else s.awayScore = prev.awayScore + 1;
    s.ballHolder = { team: team === 'home' ? 'away' : 'home', playerIndex: Math.floor(Math.random() * 5) };

    // In sudden death, any goal ends the match immediately
    if (s.status === 'sudden_death') {
      s.status = isHome ? 'won' : 'lost';
      return s;
    }
  } else {
    // Non-goal events for visual variety
    const r = Math.random();
    if (r < 0.15) {
      const newTeam = prev.ballHolder.team === 'home' ? 'away' : 'home';
      s.ballHolder = { team: newTeam, playerIndex: Math.floor(Math.random() * 5) };
      s.events.push({
        type: 'tackle',
        team: newTeam,
        playerIndex: s.ballHolder.playerIndex,
        gameMinute: s.gameMinute,
        timestamp: Date.now(),
      });
    } else if (r < 0.35) {
      const newIdx = (prev.ballHolder.playerIndex + 1 + Math.floor(Math.random() * 4)) % 5;
      s.ballHolder = { team: prev.ballHolder.team, playerIndex: newIdx };
    }
  }

  return s;
}

/**
 * Calculate win chance for VGP match.
 * teamPower: player's team power from main game.
 * difficulty: current difficulty level (1+).
 */
export function calcVGPWinChance(teamPower: number, difficulty: number, basePower: number, scalePerDiff: number): number {
  const opponentPower = basePower * (1 + scalePerDiff * (difficulty - 1));
  const tp = Math.max(teamPower, 10);
  const op = Math.max(opponentPower, 10);
  const exp = 2.5;
  return Math.round((Math.pow(tp, exp) / (Math.pow(tp, exp) + Math.pow(op, exp))) * 100);
}

export function getOpponentPower(difficulty: number, basePower: number, scalePerDiff: number): number {
  return Math.round(basePower * (1 + scalePerDiff * (difficulty - 1)));
}
