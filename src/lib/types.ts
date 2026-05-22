export const ALL_TYPES = ['architecture', 'runtime', 'pulse', 'systems', 'notes', 'investigations'] as const;
export type DocType = typeof ALL_TYPES[number];

export const NAV_TYPES = ['architecture', 'runtime', 'pulse', 'systems', 'notes'] as const;
export type NavType = typeof NAV_TYPES[number];
