/**
 * Centralized label helpers that map raw enum/type values to i18n keys.
 * Every select/dropdown in the admin form should use these instead of
 * rendering raw strings like "technical" or "draft".
 */

type TranslateFn = (key: string) => string;

// ─── Entity type ────────────────────────────────────────────────────────────

// Maps snake_case DB type to the camelCase i18n key under `entity.*`
const TYPE_KEY_MAP: Record<string, string> = {
  project: 'project',
  publication: 'publication',
  experiment: 'experiment',
  dataset: 'dataset',
  model: 'model',
  repo: 'repo',
  note: 'note',
  lit_review: 'litReview',
  meeting: 'meeting',
  idea: 'idea',
  skill: 'skill',
  method: 'method',
  material_system: 'materialSystem',
  metric: 'metric',
  collaborator: 'collaborator',
  institution: 'institution',
  media: 'media',
};

export function entityTypeLabel(type: string, t: TranslateFn): string {
  const key = TYPE_KEY_MAP[type];
  return key ? t(`entity.${key}`) : type;
}

// ─── Status ─────────────────────────────────────────────────────────────────

export function statusLabel(status: string, t: TranslateFn): string {
  return t(`status.${status}`);
}

// ─── Visibility ─────────────────────────────────────────────────────────────

export function visibilityLabel(visibility: string, t: TranslateFn): string {
  return t(`visibility.${visibility}`);
}

// ─── Generic option label (admin.options.<group>.<value>) ───────────────────

export function optionLabel(group: string, value: string, t: TranslateFn): string {
  return t(`admin.options.${group}.${value}`);
}

// ─── Convenience wrappers for common enums ──────────────────────────────────

export function noteTypeLabel(value: string, t: TranslateFn): string {
  return optionLabel('noteType', value, t);
}

export function canonicalityLabel(value: string, t: TranslateFn): string {
  return optionLabel('canonicality', value, t);
}

export function projectKindLabel(value: string, t: TranslateFn): string {
  return optionLabel('projectKind', value, t);
}

export function publicationTypeLabel(value: string, t: TranslateFn): string {
  return optionLabel('publicationType', value, t);
}

export function experimentTypeLabel(value: string, t: TranslateFn): string {
  return optionLabel('experimentType', value, t);
}

export function datasetKindLabel(value: string, t: TranslateFn): string {
  return optionLabel('datasetKind', value, t);
}

export function modelKindLabel(value: string, t: TranslateFn): string {
  return optionLabel('modelKind', value, t);
}

export function repoKindLabel(value: string, t: TranslateFn): string {
  return optionLabel('repoKind', value, t);
}

export function ideaKindLabel(value: string, t: TranslateFn): string {
  return optionLabel('ideaKind', value, t);
}

export function ideaStatusLabel(value: string, t: TranslateFn): string {
  return optionLabel('ideaStatus', value, t);
}

export function proficiencyLabel(value: string, t: TranslateFn): string {
  return optionLabel('proficiency', value, t);
}

export function mediaTypeLabel(value: string, t: TranslateFn): string {
  return optionLabel('mediaType', value, t);
}

export function peerReviewStatusLabel(value: string, t: TranslateFn): string {
  return optionLabel('peerReviewStatus', value, t);
}

// ─── Edge type ─────────────────────────────────────────────────────────────

export function edgeTypeLabel(value: string, t: TranslateFn): string {
  return t(`admin.options.edgeType.${value}`);
}
