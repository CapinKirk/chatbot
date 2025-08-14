export type FeatureFlags = {
  canaryPercent: number;
};

const initialFlags: FeatureFlags = {
  canaryPercent: Number.parseInt(process.env.CANARY_PERCENT || '5', 10) || 0,
};

let flags: FeatureFlags = { ...initialFlags };

export function getCanaryPercent(): number {
  return flags.canaryPercent;
}

export function setCanaryPercent(nextPercent: number): FeatureFlags {
  const clamped = Math.max(0, Math.min(100, Math.floor(nextPercent)));
  flags = { ...flags, canaryPercent: clamped };
  return flags;
}

export function getFlags(): FeatureFlags {
  return { ...flags };
}