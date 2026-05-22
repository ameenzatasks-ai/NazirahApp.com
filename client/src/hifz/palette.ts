/**
 * Hifz 6-color palette — lighter, airy fills with vivid accents.
 *
 *   BLACK  — Listened    (medium navy blue)
 *   RED    — Read        (medium crimson)
 *   AMBER  — Practicing  (medium orange)
 *   GREEN  — Ready       (medium teal)
 *   GOLD   — Memorized   (medium gold)
 *   YELLOW — Re-read     (medium purple)
 */
import type { PageStatus } from '../../../shared/juz-map';
import {
  Headphones, BookOpen, Pencil, CheckCircle2, Star, RotateCw,
  type LucideIcon,
} from 'lucide-react';

export interface PaletteEntry {
  label: string;
  description: string;
  fill: string;
  accent: string;
  iconBg: string;
  iconColor: string;
  text: string;
  icon: LucideIcon;
}

export const PALETTE: Record<PageStatus, PaletteEntry> = {
  // ── Listened — medium navy / sky-blue ──────────────────────────────────
  BLACK: {
    label: 'Listened',
    description: "I've listened to this page at least once",
    fill:      '#1E3F62',
    accent:    '#4DB8FF',
    iconBg:    '#2A5280',
    iconColor: '#93D8FF',
    text:      '#FFFFFF',
    icon: Headphones,
  },
  // ── Read — medium crimson ───────────────────────────────────────────────
  RED: {
    label: 'Read',
    description: "I've recited this page once to the ustadh",
    fill:      '#9B1C1C',
    accent:    '#FF4040',
    iconBg:    '#BC2828',
    iconColor: '#FFB0B0',
    text:      '#FFFFFF',
    icon: BookOpen,
  },
  // ── Practicing — medium orange ─────────────────────────────────────────
  AMBER: {
    label: 'Practicing',
    description: "I'm practicing — about ten reads in, getting ready to read to the ustadh",
    fill:      '#9B4800',
    accent:    '#FF7A1A',
    iconBg:    '#BE5A00',
    iconColor: '#FFB87A',
    text:      '#FFFFFF',
    icon: Pencil,
  },
  // ── Ready — medium teal ────────────────────────────────────────────────
  GREEN: {
    label: 'Ready',
    description: 'Cleared — I can start memorizing this page',
    fill:      '#0F6650',
    accent:    '#00D4A0',
    iconBg:    '#157A62',
    iconColor: '#5DFFD8',
    text:      '#FFFFFF',
    icon: CheckCircle2,
  },
  // ── Memorized — medium gold ────────────────────────────────────────────
  GOLD: {
    label: 'Memorized',
    description: 'Memorized in Sabaq',
    fill:      '#7A5A00',
    accent:    '#FFD700',
    iconBg:    '#9A7200',
    iconColor: '#FFE880',
    text:      '#FFFFFF',
    icon: Star,
  },
  // ── Re-read — medium purple ────────────────────────────────────────────
  YELLOW: {
    label: 'Re-read',
    description: 'Was Ready, but more than 10 days have passed — needs revisiting',
    fill:      '#521A9C',
    accent:    '#B060FF',
    iconBg:    '#6B22C4',
    iconColor: '#D8A8FF',
    text:      '#FFFFFF',
    icon: RotateCw,
  },
};

export const ALL_STATUSES: PageStatus[] = [
  'BLACK', 'RED', 'AMBER', 'GREEN', 'GOLD', 'YELLOW',
];

export const PROGRESSION: PageStatus[] = ['BLACK', 'RED', 'AMBER', 'GREEN', 'GOLD'];
