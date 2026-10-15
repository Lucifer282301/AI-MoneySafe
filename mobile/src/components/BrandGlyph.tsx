import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SHIELD =
  'M50 9 C61 15 72 20 83 20 L83 49 C83 67 69 82 50 91 C31 82 17 67 17 49 L17 20 C28 20 39 15 50 9 Z';
const CHECK = 'M36 50 L46 60 L65 39';

export default function BrandGlyph({
  size = 20,
  color = '#B9E3CF',
  strokeWidth = 6,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d={SHIELD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d={CHECK}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
