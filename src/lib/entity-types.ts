/**
 * Centralized entity type constants shared across client components.
 */

// Tailwind CSS class colors for dots/badges
export const TYPE_BG_COLORS: Record<string, string> = {
  project: 'bg-blue-500',
  publication: 'bg-purple-500',
  experiment: 'bg-amber-500',
  dataset: 'bg-emerald-500',
  model: 'bg-red-500',
  note: 'bg-gray-500',
  idea: 'bg-pink-500',
  repo: 'bg-orange-500',
  lit_review: 'bg-violet-500',
  meeting: 'bg-cyan-500',
  skill: 'bg-teal-500',
  method: 'bg-indigo-500',
  material_system: 'bg-lime-500',
  metric: 'bg-yellow-500',
  collaborator: 'bg-rose-500',
  institution: 'bg-sky-500',
  media: 'bg-slate-500',
};

// Hex colors for D3/canvas rendering
export const TYPE_HEX_COLORS: Record<string, string> = {
  project: '#3b82f6',
  publication: '#8b5cf6',
  experiment: '#f59e0b',
  dataset: '#10b981',
  model: '#ef4444',
  note: '#6b7280',
  idea: '#ec4899',
  repo: '#f97316',
  lit_review: '#7c3aed',
  meeting: '#06b6d4',
  skill: '#14b8a6',
  method: '#6366f1',
  material_system: '#84cc16',
  metric: '#eab308',
  collaborator: '#f43f5e',
  institution: '#0ea5e9',
  media: '#64748b',
};

// Ring colors for timeline dots
export const TYPE_RING_COLORS: Record<string, string> = {
  project: 'ring-blue-200 dark:ring-blue-800',
  publication: 'ring-purple-200 dark:ring-purple-800',
  experiment: 'ring-amber-200 dark:ring-amber-800',
  dataset: 'ring-emerald-200 dark:ring-emerald-800',
  model: 'ring-red-200 dark:ring-red-800',
  note: 'ring-gray-200 dark:ring-gray-700',
  idea: 'ring-pink-200 dark:ring-pink-800',
  repo: 'ring-orange-200 dark:ring-orange-800',
  lit_review: 'ring-violet-200 dark:ring-violet-800',
  meeting: 'ring-cyan-200 dark:ring-cyan-800',
  skill: 'ring-teal-200 dark:ring-teal-800',
  method: 'ring-indigo-200 dark:ring-indigo-800',
  material_system: 'ring-lime-200 dark:ring-lime-800',
  metric: 'ring-yellow-200 dark:ring-yellow-800',
  collaborator: 'ring-rose-200 dark:ring-rose-800',
  institution: 'ring-sky-200 dark:ring-sky-800',
  media: 'ring-slate-200 dark:ring-slate-800',
};

// Entity type → URL path segment
export const TYPE_PATH_MAP: Record<string, string> = {
  project: 'projects',
  publication: 'publications',
  experiment: 'experiments',
  dataset: 'datasets',
  model: 'models',
  repo: 'repos',
  note: 'notes',
  lit_review: 'literature',
  meeting: 'meetings',
  idea: 'ideas',
  skill: 'skills',
  method: 'methods',
  material_system: 'materials',
  metric: 'metrics',
  collaborator: 'collaborators',
  institution: 'institutions',
  media: 'media',
};
