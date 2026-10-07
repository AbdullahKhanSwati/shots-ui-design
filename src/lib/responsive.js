import { useWindowDimensions } from 'react-native';

// Screen-size helpers for the Shots app.
//
// Everything here reacts to the LIVE window size (useWindowDimensions), so a
// layout follows a rotation or a split-screen resize instead of being fixed at
// launch. Phones keep exactly the layout they have today; the extra room on big
// phones, tablets and landscape is what gets used.
//
//   compact  < 360dp   small phones (older/budget Androids)
//   phone    < 600dp   normal phones
//   tablet  >= 600dp   small tablets and most phones in landscape
//   large   >= 900dp   big tablets

export const BREAKPOINTS = { compact: 360, tablet: 600, large: 900 };

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    landscape: width > height,
    isCompact: width < BREAKPOINTS.compact,
    isTablet: width >= BREAKPOINTS.tablet,
    isLarge: width >= BREAKPOINTS.large,
  };
}

// How many cards fit across, given the narrowest width one card may have.
// `max` caps it so a card grid never turns into a thin strip on a big screen.
export function useColumns({ min = 170, max = 4 } = {}) {
  const { width } = useWindowDimensions();
  // The screen minus the page's side padding (16 each side) and the gaps.
  const usable = Math.max(0, width - 32);
  const fit = Math.floor((usable + 12) / (min + 12));
  return Math.max(1, Math.min(max, fit || 1));
}

// Width (as a %) of one cell in a wrapped grid that uses
// `justifyContent: 'space-between'`, leaving `gap` % between columns.
// 2 columns with the default gap gives the 48% the cards already use, so
// existing phone layouts are unchanged.
export function cellWidth(columns, gap = 4) {
  if (columns <= 1) return '100%';
  const totalGap = gap * (columns - 1);
  return `${(100 - totalGap) / columns}%`;
}
