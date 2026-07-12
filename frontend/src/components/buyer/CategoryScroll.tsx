/**
 * OmniQ mobile app - horizontal category selector with premium animations.
 * Author: OmniQ Team
 */
import { ScrollView, StyleSheet, Text, View, Pressable, Animated } from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import Svg, { Path, Rect, Line } from "react-native-svg";
import { useAppTheme } from "@/store/useThemeStore";

/* ── SVG Category Icons ───────────────────────────────────────────────── */

function GroceryIcon({
  color = "#22C55E",
  size = 28
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </Svg>;
}
function KitchenIcon({
  color = "#F59E0B",
  size = 28
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <Line x1="6" y1="1" x2="6" y2="4" />
      <Line x1="10" y1="1" x2="10" y2="4" />
      <Line x1="14" y1="1" x2="14" y2="4" />
    </Svg>;
}
function ClothesIcon({
  color = "#EC4899",
  size = 28
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </Svg>;
}
function ElectricalIcon({
  color = "#3B82F6",
  size = 28
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14 12 14 11 22 21 10 12 10 13 2Z" />
    </Svg>;
}
function OthersIcon({
  color = "#8B85FF",
  size = 28
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="14" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
    </Svg>;
}

/* ── Category data ────────────────────────────────────────────────────── */

const categories = [{
  icon: GroceryIcon,
  label: "Grocery",
  tint: "#22C55E",
  bgTint: "rgba(34,197,94,0.12)"
}, {
  icon: KitchenIcon,
  label: "Kitchen",
  tint: "#F59E0B",
  bgTint: "rgba(245,158,11,0.12)"
}, {
  icon: ClothesIcon,
  label: "Clothes",
  tint: "#EC4899",
  bgTint: "rgba(236,72,153,0.12)"
}, {
  icon: ElectricalIcon,
  label: "Electrical",
  tint: "#3B82F6",
  bgTint: "rgba(59,130,246,0.12)"
}, {
  icon: OthersIcon,
  label: "Others",
  tint: "#8B85FF",
  bgTint: "rgba(139,133,255,0.12)"
}];

/* ── Animated Category Item ───────────────────────────────────────────── */

function AnimatedCategoryItem({
  category,
  index,
  isActive,
  onPress
}: {
  category: typeof categories[0];
  index: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const IconComponent = category.icon;

  // Staggered entrance animation
  const entrance = useRef(new Animated.Value(0)).current;
  // Scale bounce on press
  const scale = useRef(new Animated.Value(1)).current;
  // Active glow pulse
  const glow = useRef(new Animated.Value(0)).current;
  // Icon rotation wiggle
  const wiggle = useRef(new Animated.Value(0)).current;

  // Staggered slide-up + fade-in on mount
  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      delay: index * 100,
      tension: 60,
      friction: 8,
      useNativeDriver: true
    }).start();
  }, []);

  // Pulse glow when active
  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(Animated.sequence([Animated.timing(glow, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true
      }), Animated.timing(glow, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true
      })]));
      pulse.start();
      return () => pulse.stop();
    } else {
      glow.setValue(0);
    }
  }, [isActive]);
  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.85,
      tension: 200,
      friction: 10,
      useNativeDriver: true
    }).start();
  }, []);
  const handlePressOut = useCallback(() => {
    // Bounce back with overshoot
    Animated.spring(scale, {
      toValue: 1,
      tension: 300,
      friction: 8,
      useNativeDriver: true
    }).start();

    // Wiggle the icon
    Animated.sequence([Animated.timing(wiggle, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true
    }), Animated.timing(wiggle, {
      toValue: -1,
      duration: 80,
      useNativeDriver: true
    }), Animated.timing(wiggle, {
      toValue: 0.5,
      duration: 60,
      useNativeDriver: true
    }), Animated.timing(wiggle, {
      toValue: -0.5,
      duration: 60,
      useNativeDriver: true
    }), Animated.timing(wiggle, {
      toValue: 0,
      duration: 40,
      useNativeDriver: true
    })]).start();
  }, []);

  // Interpolated values
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0]
  });
  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });
  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08]
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7]
  });
  const iconRotate = wiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-12deg", "0deg", "12deg"]
  });
  return <Animated.View style={[styles.itemWrapper, {
    opacity,
    transform: [{
      translateY
    }, {
      scale
    }]
  }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        <Animated.View style={[styles.item, {
        borderColor: isActive ? category.tint : colors.border2
      }, isActive && {
        backgroundColor: category.bgTint,
        borderWidth: 1.5,
        transform: [{
          scale: glowScale
        }],
        opacity: glowOpacity
      }]}>
          <Animated.View style={{
          transform: [{
            rotate: iconRotate
          }]
        }}>
            <IconComponent color={isActive ? category.tint : colors.textMuted} size={28} />
          </Animated.View>
        </Animated.View>
        <Text style={[styles.label, isActive && {
        color: category.tint,
        fontWeight: "700"
      }]}>
          {category.label}
        </Text>
      </Pressable>
    </Animated.View>;
}

/* ── Main Component ───────────────────────────────────────────────────── */

export function CategoryScroll() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((category, index) => <AnimatedCategoryItem key={category.label} category={category} index={index} isActive={index === activeIndex} onPress={() => setActiveIndex(index === activeIndex ? null : index)} />)}
    </ScrollView>;
}

/* ── Styles ────────────────────────────────────────────────────────────── */

const getStyles = (colors: any) => StyleSheet.create({
  row: {
    gap: 16,
    paddingVertical: 10
  },
  itemWrapper: {
    alignItems: "center"
  },
  item: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "transparent",
    borderColor: colors.border2,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  label: {
    color: colors.textSecondary,
    marginTop: 8,
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center"
  }
});