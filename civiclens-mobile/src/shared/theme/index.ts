import { colors, Colors } from './colors';
import { typography, Typography } from './typography';
import { spacing, borderRadius, Spacing, BorderRadius } from './spacing';

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
}

export const theme: Theme = {
  colors,
  typography,
  spacing,
  borderRadius,
};

export { colors, typography, spacing, borderRadius };
