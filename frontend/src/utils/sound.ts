/**
 * OmniQ - Order Confirmation Sound & Feedback Utility.
 * 
 * Produces a soft, warm, and friendly major-triad chime (C5 -> E5 -> G5)
 * when an order is successfully placed, paired with a subtle haptic tap.
 * 
 * Designed to be zero-overhead, non-blocking, and completely fail-safe.
 */
import { Platform, Vibration } from "react-native";

/**
 * Synthesizes a soft, harmonic bell chime using Web Audio API on web/browser.
 */
function playWebChime() {
  if (typeof window === "undefined") return;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    try {
      // Fallback to audio element
      const audio = new Audio(require("../../assets/sounds/order-success.wav"));
      audio.volume = 0.25;
      audio.play().catch(() => {});
    } catch {}
    return;
  }

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Harmonic major triad: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) + subtle C6 sparkle (1046Hz)
    const tones = [
      { freq: 523.25, start: 0.0, duration: 0.35, maxGain: 0.14 },
      { freq: 659.25, start: 0.10, duration: 0.40, maxGain: 0.16 },
      { freq: 783.99, start: 0.20, duration: 0.65, maxGain: 0.18 },
      { freq: 1046.5, start: 0.22, duration: 0.50, maxGain: 0.06 }
    ];

    tones.forEach(({ freq, start, duration, maxGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      // Smooth attack and pleasant exponential release
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(maxGain, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    // Close audio context after sound completes
    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1500);
  } catch (err) {
    console.debug("[sound] Web chime fallback:", err);
  }
}

/**
 * Plays the soft success chime and triggers a gentle tactile haptic pulse.
 */
export async function playOrderSuccessSound(): Promise<void> {
  try {
    // 1. Gentle tactile haptic feedback
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate([0, 40, 50, 70]);
      } catch {}
    }

    // 2. Play sound
    if (Platform.OS === "web") {
      playWebChime();
    } else {
      // Optional native audio via expo-av if present in the runtime
      try {
        const expoAv = require("expo-av");
        if (expoAv?.Audio?.Sound) {
          const { sound } = await expoAv.Audio.Sound.createAsync(
            require("../../assets/sounds/order-success.wav"),
            { shouldPlay: true, volume: 0.3 }
          );
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          });
        }
      } catch {
        // Safe: expo-av not linked yet or not available on this platform
      }
    }
  } catch (error) {
    // Non-critical: failure to play sound should never break order placement
    console.debug("[sound] Could not play success sound:", error);
  }
}

