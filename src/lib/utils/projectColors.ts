/**
 * Project Color Utility
 * Generates consistent HSL colors from project names
 * Used for visual differentiation in schedule views
 */

// Predefined palette of pleasant, accessible colors
const COLOR_PALETTE = [
  { h: 210, s: 70, l: 50 },  // Blue
  { h: 160, s: 60, l: 45 },  // Teal
  { h: 280, s: 55, l: 55 },  // Purple
  { h: 35, s: 75, l: 50 },   // Orange
  { h: 340, s: 65, l: 55 },  // Pink
  { h: 120, s: 45, l: 45 },  // Green
  { h: 190, s: 70, l: 45 },  // Cyan
  { h: 45, s: 80, l: 50 },   // Yellow-Orange
  { h: 260, s: 50, l: 60 },  // Lavender
  { h: 10, s: 70, l: 55 },   // Coral
];

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a project based on its name
 * Returns an HSL color string
 */
export function getProjectColor(projectName: string): string {
  if (!projectName) return 'hsl(0, 0%, 60%)';
  
  const hash = hashString(projectName.toLowerCase().trim());
  const colorIndex = hash % COLOR_PALETTE.length;
  const { h, s, l } = COLOR_PALETTE[colorIndex];
  
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Get a lighter version of the project color (for backgrounds)
 */
export function getProjectColorLight(projectName: string): string {
  if (!projectName) return 'hsl(0, 0%, 95%)';
  
  const hash = hashString(projectName.toLowerCase().trim());
  const colorIndex = hash % COLOR_PALETTE.length;
  const { h, s } = COLOR_PALETTE[colorIndex];
  
  return `hsl(${h}, ${s}%, 92%)`;
}

/**
 * Get project color as RGB values (useful for opacity manipulation)
 */
export function getProjectColorRGB(projectName: string): { r: number; g: number; b: number } {
  if (!projectName) return { r: 150, g: 150, b: 150 };
  
  const hash = hashString(projectName.toLowerCase().trim());
  const colorIndex = hash % COLOR_PALETTE.length;
  const { h, s, l } = COLOR_PALETTE[colorIndex];
  
  // Convert HSL to RGB
  const hue = h / 360;
  const sat = s / 100;
  const light = l / 100;
  
  let r, g, b;
  
  if (sat === 0) {
    r = g = b = light;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    r = hue2rgb(p, q, hue + 1/3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}
