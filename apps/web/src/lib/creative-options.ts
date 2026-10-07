/** Banner formats vendors can offer. Shared by the form, its validation and the renderer. */
export const BANNER_SIZES = [
  { value: "300x250", label: "Medium rectangle", width: 300, height: 250 },
  { value: "728x90", label: "Leaderboard", width: 728, height: 90 },
  { value: "160x600", label: "Skyscraper", width: 160, height: 600 },
  { value: "1080x1080", label: "Social square", width: 1080, height: 1080 },
] as const;

export const BANNER_SIZE_VALUES = BANNER_SIZES.map((s) => s.value);
export const bannerSize = (value: string | null) => BANNER_SIZES.find((s) => s.value === value) ?? null;

/** Placeholder in ready-made text that becomes the affiliate's own link. */
export const LINK_PLACEHOLDER = "{link}";
