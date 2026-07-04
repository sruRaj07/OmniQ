import React, { useRef } from "react";
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Animated, useWindowDimensions } from "react-native";
import { colors } from "@/constants/colors";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "expo-router";



type Advertisement = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
};

export function AdvertisementCarousel() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = width - 48; // Full width minus padding
  
  const { data: ads, isLoading } = useQuery({
    queryKey: ["buyer-advertisements"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Advertisement[] }>("/products/advertisements");
      return res.data.data;
    },
  });

  const scrollX = useRef(new Animated.Value(0)).current;

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
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
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
            <Image source={{ uri: ad.image_url }} style={styles.image} />
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>Sponsored ⓘ</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
      
      {ads.length > 1 && (
        <View style={styles.pagination}>
          {ads.map((_, i) => {
            const inputRange = [(i - 1) * (CARD_WIDTH + 12), i * (CARD_WIDTH + 12), (i + 1) * (CARD_WIDTH + 12)];
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.8, 1.2, 0.8],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View 
                key={i} 
                style={[styles.dot, { opacity, transform: [{ scale }] }]} 
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  scrollContent: {
    paddingRight: 24, // to allow last card to align properly
    gap: 12,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.bgSecondary,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  sponsoredBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sponsoredText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  }
});
