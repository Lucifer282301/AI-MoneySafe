import React from 'react';
import { View } from 'react-native';
import { Icon } from 'react-native-paper';
import { CATEGORY_META } from '../utils/categories';
import type { Category } from '../types';

export default function CategoryIcon({
  category,
  size = 44,
}: {
  category: Category;
  size?: number;
}) {
  const meta = CATEGORY_META[category];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        backgroundColor: meta.color + '26',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon source={meta.icon} size={size * 0.52} color={meta.color} />
    </View>
  );
}
