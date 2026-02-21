/**
 * Auto-populates required schema fields with sensible defaults before validation.
 * This allows the create form to send only user-provided fields while the API
 * fills in the rest so Zod validation passes.
 *
 * Design decision: Option 1 from the plan — auto-generate defaults on create.
 * Fields like links, authorship.contributors, related_entities default to [].
 * body_mdx_id is generated as `{entityId}.body` and an MDX stub is created by the caller.
 */

const EMPTY_BILINGUAL = { en: '', 'zh-Hans': '' };

function defaults<T extends Record<string, unknown>>(
  entity: Record<string, unknown>,
  fallbacks: T,
): void {
  for (const [key, value] of Object.entries(fallbacks)) {
    if (entity[key] === undefined || entity[key] === null) {
      entity[key] = value;
    }
  }
}

function defaultsNested(
  entity: Record<string, unknown>,
  key: string,
  fallbacks: Record<string, unknown>,
): void {
  const existing = (entity[key] as Record<string, unknown>) || {};
  for (const [k, v] of Object.entries(fallbacks)) {
    if (existing[k] === undefined || existing[k] === null) {
      existing[k] = v;
    }
  }
  entity[key] = existing;
}

/**
 * Mutates `entity` in place, filling in required fields that the form didn't provide.
 * Returns the entity ID (may have been generated).
 */
export function applyEntityDefaults(entity: Record<string, unknown>): void {
  // ── Base fields (all types) ──────────────────────────────────────────────
  if (!Array.isArray(entity.links)) {
    entity.links = [];
  }
  defaultsNested(entity, 'authorship', {
    owner_role: 'owner',
    contributors: [],
  });
  if (!Array.isArray((entity.authorship as Record<string, unknown>)?.contributors)) {
    (entity.authorship as Record<string, unknown>).contributors = [];
  }
  defaults(entity, {
    tags: [],
    source_of_truth: { kind: 'file', pointer: '' },
  });

  // ── Type-specific defaults ───────────────────────────────────────────────
  switch (entity.type) {
    case 'project':
      defaults(entity, {
        project_kind: 'side',
        research_area: '',
        problem_statement: { ...EMPTY_BILINGUAL },
        contributions: { ...EMPTY_BILINGUAL },
        methods: [],
        material_systems: [],
        key_results: [],
        timeline: { start_date: '' },
        artifacts: {
          repos: [],
          datasets: [],
          experiments: [],
          publications: [],
          notes: [],
        },
      });
      break;

    case 'publication':
      defaults(entity, {
        publication_type: 'preprint',
        venue: { ...EMPTY_BILINGUAL },
        date: '',
        authors: [],
        abstract: { ...EMPTY_BILINGUAL },
        identifiers: {},
        associated_projects: [],
      });
      break;

    case 'experiment':
      defaults(entity, {
        experiment_type: 'computational',
        hypothesis: { ...EMPTY_BILINGUAL },
        protocol: { ...EMPTY_BILINGUAL },
        inputs: [],
        outputs: [],
        run_registry: [],
        results: [],
        reproducibility: { level: 'not_tested' },
      });
      break;

    case 'dataset':
      defaults(entity, {
        dataset_kind: 'raw',
        description: { ...EMPTY_BILINGUAL },
        schema_def: null,
        license: '',
        provenance: { source: '', transformations: [] },
        storage: { location: '', format: '', size_bytes: 0, checksum: '' },
      });
      break;

    case 'model':
      defaults(entity, {
        model_kind: 'other',
        task: '',
        architecture: { ...EMPTY_BILINGUAL },
        training_data: [],
        evaluation: [],
        model_artifacts: { weights_location: '', checksum: '', version: '' },
      });
      break;

    case 'repo':
      defaults(entity, {
        repo_kind: 'application',
        local_path: '',
        default_branch: 'main',
        license: '',
        related_entities: [],
      });
      break;

    case 'note':
      defaults(entity, {
        note_type: 'technical',
        body_mdx_id: `${entity.id}.body`,
        related_entities: [],
      });
      break;

    case 'lit_review':
      defaults(entity, {
        scope: { ...EMPTY_BILINGUAL },
        papers: [],
        synthesis: { ...EMPTY_BILINGUAL },
        takeaways: { ...EMPTY_BILINGUAL },
      });
      break;

    case 'meeting':
      defaults(entity, {
        date_time: new Date().toISOString(),
        attendees: [],
        agenda: { ...EMPTY_BILINGUAL },
        notes_content: { ...EMPTY_BILINGUAL },
        action_items: [],
      });
      break;

    case 'idea':
      defaults(entity, {
        idea_kind: 'research_question',
        problem: { ...EMPTY_BILINGUAL },
        proposed_approach: { ...EMPTY_BILINGUAL },
        expected_value: { impact: 0, novelty: 0, feasibility: 0, learning_value: 0 },
        dependencies: [],
        idea_status: 'new',
      });
      break;

    case 'skill':
      defaults(entity, {
        name: { ...EMPTY_BILINGUAL },
        category: '',
        proficiency: 'beginner',
        evidence_links: [],
      });
      break;

    case 'method':
      defaults(entity, {
        name: { ...EMPTY_BILINGUAL },
        domain: '',
        description: { ...EMPTY_BILINGUAL },
        canonical_refs: [],
      });
      break;

    case 'material_system':
      defaults(entity, {
        name: { ...EMPTY_BILINGUAL },
        composition: '',
        structure_type: '',
        domain_tags: [],
      });
      break;

    case 'metric':
      defaults(entity, {
        name: { ...EMPTY_BILINGUAL },
        definition: { ...EMPTY_BILINGUAL },
        unit: '',
        higher_is_better: true,
        references: [],
      });
      break;

    case 'collaborator':
      defaults(entity, {
        name: '',
        role: '',
        affiliation: '',
        contact_links: {},
      });
      break;

    case 'institution':
      defaults(entity, {
        name: '',
        location: '',
      });
      break;

    case 'media':
      defaults(entity, {
        media_type: 'document',
        source_path: '',
        checksum: '',
        size_bytes: 0,
      });
      break;
  }
}
