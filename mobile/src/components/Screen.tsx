import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';

interface Props {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Screen({ title, right, children, style }: Props) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top']}
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
    >
      {title ? (
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          {right}
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontWeight: '700' },
});
