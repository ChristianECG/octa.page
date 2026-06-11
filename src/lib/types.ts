export const ALL_TYPES = ['architecture', 'runtime', 'systems', 'notes', 'timezone'] as const;
export type DocType = typeof ALL_TYPES[number];

export const NAV_TYPES = ['architecture', 'runtime', 'systems', 'notes', 'timezone'] as const;
export type NavType = typeof NAV_TYPES[number];
