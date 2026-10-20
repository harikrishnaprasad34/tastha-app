/** Logical pixels; system text scaling remains enabled. */
export function shoppingLayout(width: number, fontScale = 1) {
  const contentWidth = Math.min(Math.max(width, 240), 1040);
  const padding = width < 360 ? 12 : width >= 720 ? 24 : 16;
  const available = contentWidth - padding * 2;
  const minCard = fontScale > 1.4 ? 240 : 140;
  const columns = Math.max(
    1,
    Math.min(4, Math.floor((available + 10) / (minCard + 10))),
  );
  return {
    contentWidth,
    padding,
    columns,
    carouselWidth: Math.min(210, Math.max(150, available / 2.15)),
  };
}
