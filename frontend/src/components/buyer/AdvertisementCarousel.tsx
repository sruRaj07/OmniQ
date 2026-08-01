import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from "react-native-reanimated";
import { useThemeColors } from "@/store/useThemeStore";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "expo-router";

type Advertisement = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  is_active: boolean;
};

// Sub-component for individual pagination dots to safely use hooks
function PaginationDot({ scrollX, index, itemWidth, colors }: { scrollX: SharedValue<number>, index: number, itemWidth: number, colors: any }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.8, 1.2, 0.8], Extrapolation.CLAMP) }
      ]
    };
  });

  return (
    <Animated.View style={[styles.dot, { backgroundColor: colors.accent }, animatedStyle]} />
  );
}

export function AdvertisementCarousel({ type = 'ads' }: { type?: 'ads' | 'offers' }) {
  const colors = useThemeColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = width - 48; // Full width minus padding
  const ITEM_WIDTH = CARD_WIDTH + 12;

  const { data: ads, isLoading } = useQuery({
    queryKey: ["buyer-advertisements", type],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Advertisement[] }>("/products/advertisements");
      let items = res.data.data.filter(item => item.is_active);
      if (type === 'ads') {
        items = items.filter(item => !item.title.startsWith("[OFFER]"));
      } else {
        items = items.filter(item => item.title.startsWith("[OFFER]"));
      }
      return items;
    }
  });

  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const currentIndexRef = useRef(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    }
  });

  useEffect(() => {
    if (!ads || ads.length <= 1) return;

    const interval = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % ads.length;
      scrollViewRef.current?.scrollTo({
        x: currentIndexRef.current * ITEM_WIDTH,
        animated: true,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [ads, ITEM_WIDTH]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: 24 }]}>
        <View style={{ width: CARD_WIDTH, height: Math.floor(CARD_WIDTH * (9 / 16)), backgroundColor: colors.card2 || "#2A2826", borderRadius: 16 }} />
      </View>
    );
  }
  if (!ads || ads.length === 0) {
    return null;
  }

  const handlePress = (targetUrl: string) => {
    if (targetUrl) {
      router.push(`/product/${targetUrl}`);
    }
  };

  return (
    <View style={styles.container}>
      {type === 'offers' && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Exclusive Offers</Text>
        </View>
      )}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        ref={scrollViewRef}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          currentIndexRef.current = Math.round(offsetX / ITEM_WIDTH);
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {ads.map((ad, index) => (
          <TouchableOpacity 
            key={ad.id} 
            activeOpacity={0.9} 
            onPress={() => handlePress(ad.target_url)} 
            style={[styles.card, { backgroundColor: colors.bgSecondary, width: CARD_WIDTH, height: Math.floor(CARD_WIDTH * (9 / 16)) }]}
          >
            <Image 
              source={ad.image_url} 
              style={styles.image} 
              contentFit="cover" 
              transition={150}
              priority="high"
            />
            {type === 'ads' ? (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>Sponsored ⓘ</Text>
              </View>
            ) : (
              <View style={[styles.sponsoredBadge, { backgroundColor: '#F93C65' }]}>
                <Text style={styles.sponsoredText}>Special Offer ⚡</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
      
      {ads.length > 1 && (
        <View style={styles.pagination}>
          {ads.map((_, i) => (
            <PaginationDot 
              key={i} 
              index={i} 
              itemWidth={ITEM_WIDTH} 
              scrollX={scrollX} 
              colors={colors} 
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5
  },
  scrollContent: {
    paddingRight: 24,
    gap: 12
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%"
  },
  sponsoredBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  sponsoredText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700"
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});