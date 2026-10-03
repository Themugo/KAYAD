export interface HeroShowcaseVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  image: string;
  eyebrow?: string;
  tagline?: string;
  enabled: boolean;
}

export interface HeroFloatingCard {
  id: string;
  enabled: boolean;
  title: string;
  body?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaLink?: string;
  leftPct?: number;
  topPct?: number;
  widthPct?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  opacityPct?: number;
  blurPx?: number;
}

export interface HeroPresentationConfig {
  stageHeightPct: number;
  stageMaxWidthPct: number;
  cardScalePct: number;
  cardWidthPct: number;
  cardOffsetXPct: number;
  cardOffsetYPct: number;
  cardBgOpacityPct: number;
  cardBlurPx: number;
  cardBorderColor: string;
  cardTextColor: string;
  backgroundUrl: string;
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundScalePct: number;
  overlayColor: string;
  overlayOpacityPct: number;
  secondaryOverlayColor: string;
  secondaryOverlayOpacityPct: number;
  leftOffsetPct: number;
  rightOffsetPct: number;
  leftVehicleNudgePct: number;
  rightVehicleNudgePct: number;
  vehicleScalePct: number;
  vehicleTopPct: number;
  vehicleWidthPct: number;
  showVehicleInfoCards: boolean;
  showVehicleLabels: boolean;
  primaryButtonColor: string;
  secondaryButtonBorderColor: string;
  arrowEnabled: boolean;
  dotsEnabled: boolean;
  tickerEnabled: boolean;
  tickerFallbackText: string;
  tickerBackgroundColor: string;
  tickerTextColor: string;
  tickerHeightPx: number;
  tickerScrollSeconds: number;
  vehicleSource: 'showcase' | 'featured' | 'selected';
  showcaseVehicles: HeroShowcaseVehicle[];
  floatingCards: HeroFloatingCard[];
}
