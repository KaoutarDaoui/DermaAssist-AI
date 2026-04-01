import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "../constants/theme";

export const Button = ({ 
  title, 
  onPress, 
  variant = "primary", 
  size = "md",
  disabled = false,
  style 
}) => {
  const variants = {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
    },
    secondary: {
      backgroundColor: colors.border,
      color: colors.dark,
    },
    ghost: {
      backgroundColor: "transparent",
      color: colors.primary,
    },
  };

  const sizes = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  };

  const selectedVariant = variants[variant];
  const selectedSize = sizes[size];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: selectedVariant.backgroundColor,
          ...selectedSize,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={{ 
        color: selectedVariant.color, 
        fontWeight: "600",
        fontSize: 14,
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
