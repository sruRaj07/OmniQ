import React from "react";
import { StyleSheet, TextInput, View, TouchableOpacity, Text, type TextInputProps } from "react-native";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { ListIcon } from "@/components/ui/ListIcon";

export interface SearchInputProps extends TextInputProps {
  onFilterPress?: () => void;
}

export function SearchInput({ onFilterPress, style, ...props }: SearchInputProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <SearchIcon size={22} color="#333333" />
      </View>
      <TextInput 
        placeholderTextColor="#888888" 
        style={styles.input} 
        {...props} 
      />
      <TouchableOpacity activeOpacity={0.7} style={styles.filterBtn} onPress={onFilterPress}>
        <ListIcon size={16} color="#333333" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    // Amazon-style drop shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: "#000000",
    fontSize: 16,
    fontWeight: "500",
    height: "100%",
  },
  filterBtn: {
    padding: 6,
    marginLeft: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  }
});
