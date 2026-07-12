import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Animated, useWindowDimensions } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
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
export function AdvertisementCarousel({ type = 'ads' }: { type?: 'ads' | 'offers' }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = width - 48; // Full width minus padding

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

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!ads || ads.length <= 1) return;

    const interval = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % ads.length;
      scrollViewRef.current?.scrollTo({
        x: currentIndexRef.current * (CARD_WIDTH + 12),
        animated: true,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [ads, CARD_WIDTH]);

  if (isLoading || !ads || ads.length === 0) {
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
          <Text style={styles.sectionTitle}>Exclusive Offers</Text>
        </View>
      )}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        ref={scrollViewRef}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          currentIndexRef.current = Math.round(offsetX / (CARD_WIDTH + 12));
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {ads.map((ad, index) => (
          <TouchableOpacity 
            key={ad.id} 
            activeOpacity={0.9} 
            onPress={() => handlePress(ad.target_url)} 
            style={[styles.card, { width: CARD_WIDTH, height: Math.floor(CARD_WIDTH * (9 / 16)) }]}
          >
            <Image 
              source={{ uri: ad.image_url }} 
              style={styles.image} 
              resizeMode="cover" 
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
      
      {ads.length > 1 && <View style={styles.pagination}>
          {ads.map((_, i) => {
        const inputRange = [(i - 1) * (CARD_WIDTH + 12), i * (CARD_WIDTH + 12), (i + 1) * (CARD_WIDTH + 12)];
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp'
        });
        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.8, 1.2, 0.8],
          extrapolate: 'clamp'
        });
        return <Animated.View key={i} style={[styles.dot, {
          opacity,
          transform: [{
            scale
          }]
        }]} />;
      })}
      </View>}
    </View>
  );
}
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5
  },
  scrollContent: {
    paddingRight: 24,
    // to allow last card to align properly
    gap: 12
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.bgSecondary
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
    backgroundColor: colors.accent
  }
});