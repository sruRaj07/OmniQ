/**
 * OmniQ mobile app - horizontal category selector.
 * Author: OmniQ Team
 */
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { useState } from "react";
import { colors } from "@/constants/colors";

const categories = [
  { imageUrl: "https://cdn3d.iconscout.com/3d/premium/thumb/store-5590715-4652419.png", label: "All" },
  { imageUrl: "https://cdn3d.iconscout.com/3d/premium/thumb/dress-5374020-4495914.png", label: "Fashion" },
  { imageUrl: "https://cdn3d.iconscout.com/3d/premium/thumb/smartphone-6844445-5625078.png", label: "Tech" },
  { imageUrl: "https://cdn3d.iconscout.com/3d/premium/thumb/house-4993540-4161747.png", label: "Home" },
  { imageUrl: "https://cdn3d.iconscout.com/3d/premium/thumb/lipstick-5242416-4383188.png", label: "Beauty" }
];

export function CategoryScroll() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((category, index) => {
        const isActive = index === activeIndex;
        
        return (
          <TouchableOpacity 
            key={category.label} 
            activeOpacity={0.7} 
            onPress={() => setActiveIndex(index)}
            style={styles.itemWrapper}
          >
            <View style={[
              styles.item, 
              isActive && styles.activeItem
            ]}>
              <Image source={{ uri: category.imageUrl }} style={styles.imageIcon} resizeMode="contain" />
            </View>
            <Text style={[styles.label, isActive && styles.activeText]}>{category.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  activeItem: {
    borderColor: colors.accentLight,
    borderWidth: 1.5,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
  },
  imageIcon: {
    width: 36,
    height: 36
  },
  label: {
    color: colors.textSecondary,
    marginTop: 8,
    fontWeight: "700",
    fontSize: 12
  },
  activeText: {
    color: colors.textPrimary,
    fontWeight: "900"
  }
});
