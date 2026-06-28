/**
 * OmniQ mobile app - seller product form.
 * Author: OmniQ Team
 */
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ProductForm() {
  return (
    <View style={styles.stack}>
      <Input placeholder="Product title" />
      <Input placeholder="Price" keyboardType="numeric" />
      <Input placeholder="Stock" keyboardType="numeric" />
      <Input placeholder="Category" />
      <Button>Save Product</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14
  }
});
