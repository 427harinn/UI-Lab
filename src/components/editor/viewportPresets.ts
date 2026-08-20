import type { Viewport } from '../../schemas/project'

export type ViewportPreset = Viewport & { label: string }

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { label: '375 × 667', width: 375, height: 667 },
  { label: '375 × 812', width: 375, height: 812 },
  { label: '390 × 844', width: 390, height: 844 },
  { label: '393 × 852', width: 393, height: 852 },
  { label: '430 × 932', width: 430, height: 932 },
]
