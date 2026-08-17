/**
 * OmniQ mobile app - real-time network quality detection.
 * Drives image sizing, retry budgets and the offline banner.
 * Author: OmniQ Team
 */
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { setNetworkQuality } from "@/lib/queryClient";

export type NetworkQuality = "offline" | "2g" | "3g" | "4g" | "wifi";

/**
 * Browsers do not report a connection *type*, so NetInfo hands back "unknown" for
 * every web visitor — which used to drop them all onto the cautious 3g tier and a
 * 300px image budget, however fast their link actually was. The Network
 * Information API reports an *effective* tier instead, which is the better signal
 * where it exists. Where it does not (Safari, Firefox) a desktop browser is
 * assumed to be on a good connection, matching what the tier is used for.
 */
function webQuality(): NetworkQuality {
  const connection =
    typeof navigator !== "undefined"
      ? (navigator as any).connection ??
        (navigator as any).mozConnection ??
        (navigator as any).webkitConnection
      : undefined;

  if (connection?.saveData === true) return "2g";

  switch (connection?.effectiveType) {
    case "slow-2g":
    case "2g":
      return "2g";
    case "3g":
      return "3g";
    case "4g":
      return "wifi";
    default:
      return "wifi";
  }
}

/**
 * Maps a NetInfo state onto an OmniQ network tier.
 *
 * `cellularGeneration` is only populated for cellular connections, and is null
 * on some Android builds even when connected — those fall back to "3g" so the
 * app degrades toward the cautious side rather than assuming a fast link.
 */
export function qualityFromState(state: NetInfoState): NetworkQuality {
  if (state.isConnected === false) return "offline";

  // isInternetReachable is null while the reachability probe is still in
  // flight; only an explicit false means captive portal / no route.
  if (state.isInternetReachable === false) return "offline";

  if (state.type === "wifi" || state.type === "ethernet") return "wifi";

  if (state.type === "cellular") {
    switch (state.details?.cellularGeneration) {
      case "2g":
        return "2g";
      case "3g":
        return "3g";
      case "4g":
      case "5g":
        return "4g";
      default:
        return "3g";
    }
  }

  if (state.type === "none") return "offline";

  // Web reaches here for essentially every visitor, so it gets the browser's own
  // reading rather than the blanket mid-tier assumption below.
  if (Platform.OS === "web") return webQuality();

  // bluetooth / wimax / vpn / unknown — assume mid-tier.
  return "3g";
}

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>("4g");

  useEffect(() => {
    let active = true;

    const apply = (state: NetInfoState) => {
      if (!active) return;
      const next = qualityFromState(state);
      // setState bails out on an identical value, so repeated NetInfo events
      // for an unchanged connection do not re-render consumers.
      setQuality(next);
      // Keep the non-React queryClient singleton in step.
      setNetworkQuality(next);
    };

    NetInfo.fetch().then(apply);
    const unsubscribe = NetInfo.addEventListener(apply);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return useMemo(() => quality, [quality]);
}
