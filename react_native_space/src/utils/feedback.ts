import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const startSound = require('../../assets/whistle_start.mp3');
const goalSound = require('../../assets/goal_cheer.mp3');

let startRef: Audio.Sound | null = null;
let goalRef: Audio.Sound | null = null;

async function getSound(ref: Audio.Sound | null, source: any): Promise<Audio.Sound | null> {
  try {
    if (!ref) {
      const { sound } = await Audio.Sound.createAsync(source);
      return sound;
    }
    return ref;
  } catch (_) { return null; }
}

export async function playMatchStart() {
  try {
    startRef = await getSound(startRef, startSound);
    if (startRef) {
      await startRef.setPositionAsync(0);
      await startRef.playAsync();
    }
  } catch (_) {}
}

export async function playGoalCheer() {
  try {
    goalRef = await getSound(goalRef, goalSound);
    if (goalRef) {
      await goalRef.setPositionAsync(0);
      await goalRef.playAsync();
    }
  } catch (_) {}
}

export function hapticGoal() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (_) {}
}

export function hapticWin() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (_) {}
    }, 300);
  } catch (_) {}
}

export function hapticLoss() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (_) {}
}
