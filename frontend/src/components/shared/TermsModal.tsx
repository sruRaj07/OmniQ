import React, { useRef, useState } from "react";
import { Modal, View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Platform } from "react-native";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/store/useThemeStore";

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsModal({ visible, onClose, onAccept }: TermsModalProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Check if scrolled within 50 pixels of the bottom
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    if (isBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy & Terms</Text>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            Welcome to OmniQ. By signing up, you agree to our Terms of Service and Privacy Policy. 
            We are committed to protecting your personal information and your right to privacy.
          </Text>
          
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.text}>
            We collect personal information that you voluntarily provide to us when you register on the Services. 
            This includes your name, email address, passwords, and contact preferences.
          </Text>

          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.text}>
            We use personal information collected via our Services for a variety of business purposes described below. 
            We process your personal information for these purposes in reliance on our legitimate business interests, 
            in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
          </Text>
          
          <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
          <Text style={styles.text}>
            We only share information with your consent, to comply with laws, to provide you with services, 
            to protect your rights, or to fulfill business obligations.
          </Text>

          <Text style={styles.sectionTitle}>5. Security and Data Retention</Text>
          <Text style={styles.text}>
            We aim to protect your personal information through a system of organizational and technical security measures. 
            However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet 
            or information storage technology can be guaranteed to be 100% secure.
            {'\n\n'}(Please scroll to the bottom to accept)
            {'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n'}
            You have reached the end of the terms.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button 
            variant="secondary" 
            onPress={onClose} 
            style={styles.button}
          >
            Cancel
          </Button>
          <Button 
            onPress={onAccept} 
            disabled={!hasScrolledToBottom}
            style={[styles.button, !hasScrolledToBottom && styles.disabledButton]}
          >
            I Agree & Accept
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  button: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  }
});
