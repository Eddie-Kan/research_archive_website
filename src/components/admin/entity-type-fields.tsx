'use client';

import { useI18n } from '@/lib/i18n/provider';
import { optionLabel } from '@/lib/admin/label-helpers';
import { BilingualInput } from './bilingual-input';
import { JsonArrayEditor } from './json-array-editor';
import { EntityPicker } from './entity-picker';

interface EntityTypeFieldsProps {
  entity: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

// ─── Shared field primitives ────────────────────────────────────────────────

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
      >
        <option value="">—</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Bilingual helpers ──────────────────────────────────────────────────────

function getBilingual(entity: Record<string, any>, field: string) {
  const val = entity[field];
  if (typeof val === 'object' && val !== null) {
    return { en: val.en || '', zh: val['zh-Hans'] || '' };
  }
  return { en: '', zh: '' };
}

function setBilingual(entity: Record<string, any>, field: string, locale: 'en' | 'zh-Hans', value: string, onChange: (u: Record<string, any>) => void) {
  const current = entity[field] || { en: '', 'zh-Hans': '' };
  onChange({ [field]: { ...current, [locale]: value } });
}

// ─── Option builders (maps raw values → { value, label } via i18n) ──────────

function opts(group: string, values: string[], t: (k: string) => string) {
  return values.map(v => ({ value: v, label: optionLabel(group, v, t) }));
}

// ─── Main component ─────────────────────────────────────────────────────────

export function EntityTypeFields({ entity, onChange }: EntityTypeFieldsProps) {
  const { t } = useI18n();
  const type = entity.type;
  const f = (key: string) => t(`admin.fields.${key}`);

  switch (type) {
    case 'project': {
      const ps = getBilingual(entity, 'problem_statement');
      const ct = getBilingual(entity, 'contributions');
      const hl = getBilingual(entity, 'headline');
      const is = getBilingual(entity, 'impact_story');
      return (
        <div className="space-y-4">
          <SelectField label={f('projectKind')} value={entity.project_kind} onChange={v => onChange({ project_kind: v })}
            options={opts('projectKind', ['thesis', 'funded', 'side', 'collaboration', 'course'], t)} />
          <TextField label={f('researchArea')} value={entity.research_area} onChange={v => onChange({ research_area: v })} />
          <BilingualInput label={f('problemStatement')} valueEn={ps.en} valueZh={ps.zh}
            onChangeEn={v => setBilingual(entity, 'problem_statement', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'problem_statement', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('contributions')} valueEn={ct.en} valueZh={ct.zh}
            onChangeEn={v => setBilingual(entity, 'contributions', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'contributions', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('headline')} valueEn={hl.en} valueZh={hl.zh}
            onChangeEn={v => setBilingual(entity, 'headline', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'headline', 'zh-Hans', v, onChange)} />
          <BilingualInput label={f('impactStory')} valueEn={is.en} valueZh={is.zh}
            onChangeEn={v => setBilingual(entity, 'impact_story', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'impact_story', 'zh-Hans', v, onChange)} multiline />
          <JsonArrayEditor label={f('methods')} values={entity.methods || []} onChange={v => onChange({ methods: v })} placeholder={t('admin.form.addItem')} />
          <JsonArrayEditor label={f('materialSystems')} values={entity.material_systems || []} onChange={v => onChange({ material_systems: v })} placeholder={t('admin.form.addItem')} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label={f('startDate')} value={entity.timeline?.start_date} onChange={v => onChange({ timeline: { ...entity.timeline, start_date: v } })} placeholder="YYYY-MM-DD" />
            <TextField label={f('endDate')} value={entity.timeline?.end_date} onChange={v => onChange({ timeline: { ...entity.timeline, end_date: v } })} placeholder="YYYY-MM-DD" />
          </div>
          <EntityPicker label={f('advisor')} value={entity.advisor_id || ''} onChange={v => onChange({ advisor_id: v || undefined })} entityType="collaborator" />
          <EntityPicker label={f('institution')} value={entity.institution_id || ''} onChange={v => onChange({ institution_id: v || undefined })} entityType="institution" />
        </div>
      );
    }

    case 'publication': {
      const venue = getBilingual(entity, 'venue');
      const abs = getBilingual(entity, 'abstract');
      return (
        <div className="space-y-4">
          <SelectField label={f('publicationType')} value={entity.publication_type} onChange={v => onChange({ publication_type: v })}
            options={opts('publicationType', ['journal', 'conference', 'preprint', 'thesis', 'report', 'book_chapter'], t)} />
          <BilingualInput label={f('venue')} valueEn={venue.en} valueZh={venue.zh}
            onChangeEn={v => setBilingual(entity, 'venue', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'venue', 'zh-Hans', v, onChange)} />
          <TextField label={f('date')} value={entity.date} onChange={v => onChange({ date: v })} placeholder="YYYY-MM-DD" />
          <BilingualInput label={f('abstract')} valueEn={abs.en} valueZh={abs.zh}
            onChangeEn={v => setBilingual(entity, 'abstract', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'abstract', 'zh-Hans', v, onChange)} multiline />
          <TextField label={f('doi')} value={entity.identifiers?.doi} onChange={v => onChange({ identifiers: { ...entity.identifiers, doi: v } })} />
          <TextField label={f('arxiv')} value={entity.identifiers?.arxiv} onChange={v => onChange({ identifiers: { ...entity.identifiers, arxiv: v } })} />
          <SelectField label={f('peerReviewStatus')} value={entity.peer_review_status} onChange={v => onChange({ peer_review_status: v })}
            options={opts('peerReviewStatus', ['submitted', 'under_review', 'accepted', 'published', 'rejected'], t)} />
          <JsonArrayEditor label={f('associatedProjects')} values={entity.associated_projects || []} onChange={v => onChange({ associated_projects: v })} placeholder={t('admin.form.addItem')} />
        </div>
      );
    }

    case 'experiment': {
      const hyp = getBilingual(entity, 'hypothesis');
      const prot = getBilingual(entity, 'protocol');
      return (
        <div className="space-y-4">
          <SelectField label={f('experimentType')} value={entity.experiment_type} onChange={v => onChange({ experiment_type: v })}
            options={opts('experimentType', ['computational', 'wet_lab', 'simulation', 'field', 'survey'], t)} />
          <BilingualInput label={f('hypothesis')} valueEn={hyp.en} valueZh={hyp.zh}
            onChangeEn={v => setBilingual(entity, 'hypothesis', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'hypothesis', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('protocol')} valueEn={prot.en} valueZh={prot.zh}
            onChangeEn={v => setBilingual(entity, 'protocol', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'protocol', 'zh-Hans', v, onChange)} multiline />
        </div>
      );
    }

    case 'dataset': {
      const desc = getBilingual(entity, 'description');
      return (
        <div className="space-y-4">
          <SelectField label={f('datasetKind')} value={entity.dataset_kind} onChange={v => onChange({ dataset_kind: v })}
            options={opts('datasetKind', ['raw', 'processed', 'curated', 'synthetic', 'benchmark'], t)} />
          <BilingualInput label={f('description')} valueEn={desc.en} valueZh={desc.zh}
            onChangeEn={v => setBilingual(entity, 'description', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'description', 'zh-Hans', v, onChange)} multiline />
          <TextField label={f('license')} value={entity.license} onChange={v => onChange({ license: v })} />
        </div>
      );
    }

    case 'model': {
      const arch = getBilingual(entity, 'architecture');
      return (
        <div className="space-y-4">
          <SelectField label={f('modelKind')} value={entity.model_kind} onChange={v => onChange({ model_kind: v })}
            options={opts('modelKind', ['classifier', 'regressor', 'generative', 'embedding', 'foundation', 'other'], t)} />
          <TextField label={f('task')} value={entity.task} onChange={v => onChange({ task: v })} />
          <BilingualInput label={f('architecture')} valueEn={arch.en} valueZh={arch.zh}
            onChangeEn={v => setBilingual(entity, 'architecture', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'architecture', 'zh-Hans', v, onChange)} multiline />
        </div>
      );
    }

    case 'repo':
      return (
        <div className="space-y-4">
          <SelectField label={f('repoKind')} value={entity.repo_kind} onChange={v => onChange({ repo_kind: v })}
            options={opts('repoKind', ['application', 'library', 'analysis', 'infrastructure', 'other'], t)} />
          <TextField label={f('remoteUrl')} value={entity.remote_url} onChange={v => onChange({ remote_url: v })} />
          <TextField label={f('localPath')} value={entity.local_path} onChange={v => onChange({ local_path: v })} />
          <TextField label={f('defaultBranch')} value={entity.default_branch} onChange={v => onChange({ default_branch: v })} placeholder="main" />
          <TextField label={f('license')} value={entity.license} onChange={v => onChange({ license: v })} />
        </div>
      );

    case 'note':
      return (
        <div className="space-y-4">
          <SelectField label={f('noteType')} value={entity.note_type} onChange={v => onChange({ note_type: v })}
            options={opts('noteType', ['technical', 'literature', 'meeting', 'idea', 'tutorial', 'reference'], t)} />
          <SelectField label={f('canonicality')} value={entity.canonicality} onChange={v => onChange({ canonicality: v })}
            options={opts('canonicality', ['canonical', 'draft', 'deprecated'], t)} />
        </div>
      );

    case 'idea': {
      const prob = getBilingual(entity, 'problem');
      const approach = getBilingual(entity, 'proposed_approach');
      return (
        <div className="space-y-4">
          <SelectField label={f('ideaKind')} value={entity.idea_kind} onChange={v => onChange({ idea_kind: v })}
            options={opts('ideaKind', ['research_question', 'method', 'application', 'improvement', 'other'], t)} />
          <BilingualInput label={f('problem')} valueEn={prob.en} valueZh={prob.zh}
            onChangeEn={v => setBilingual(entity, 'problem', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'problem', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('proposedApproach')} valueEn={approach.en} valueZh={approach.zh}
            onChangeEn={v => setBilingual(entity, 'proposed_approach', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'proposed_approach', 'zh-Hans', v, onChange)} multiline />
          <SelectField label={f('ideaStatus')} value={entity.idea_status} onChange={v => onChange({ idea_status: v })}
            options={opts('ideaStatus', ['new', 'exploring', 'validated', 'parked', 'rejected'], t)} />
        </div>
      );
    }

    case 'lit_review': {
      const scope = getBilingual(entity, 'scope');
      const syn = getBilingual(entity, 'synthesis');
      const take = getBilingual(entity, 'takeaways');
      return (
        <div className="space-y-4">
          <BilingualInput label={f('scope')} valueEn={scope.en} valueZh={scope.zh}
            onChangeEn={v => setBilingual(entity, 'scope', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'scope', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('synthesis')} valueEn={syn.en} valueZh={syn.zh}
            onChangeEn={v => setBilingual(entity, 'synthesis', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'synthesis', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('takeaways')} valueEn={take.en} valueZh={take.zh}
            onChangeEn={v => setBilingual(entity, 'takeaways', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'takeaways', 'zh-Hans', v, onChange)} multiline />
        </div>
      );
    }

    case 'meeting': {
      const agenda = getBilingual(entity, 'agenda');
      const notes = getBilingual(entity, 'notes_content');
      return (
        <div className="space-y-4">
          <TextField label={f('dateTime')} value={entity.date_time} onChange={v => onChange({ date_time: v })} placeholder="YYYY-MM-DDTHH:MM:SSZ" />
          <BilingualInput label={f('agenda')} valueEn={agenda.en} valueZh={agenda.zh}
            onChangeEn={v => setBilingual(entity, 'agenda', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'agenda', 'zh-Hans', v, onChange)} multiline />
          <BilingualInput label={f('notes')} valueEn={notes.en} valueZh={notes.zh}
            onChangeEn={v => setBilingual(entity, 'notes_content', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'notes_content', 'zh-Hans', v, onChange)} multiline />
        </div>
      );
    }

    case 'skill': {
      const name = getBilingual(entity, 'name');
      return (
        <div className="space-y-4">
          <BilingualInput label={f('skillName')} valueEn={name.en} valueZh={name.zh}
            onChangeEn={v => setBilingual(entity, 'name', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'name', 'zh-Hans', v, onChange)} />
          <TextField label={f('category')} value={entity.category} onChange={v => onChange({ category: v })} />
          <SelectField label={f('proficiency')} value={entity.proficiency} onChange={v => onChange({ proficiency: v })}
            options={opts('proficiency', ['beginner', 'intermediate', 'advanced', 'expert'], t)} />
        </div>
      );
    }

    case 'method': {
      const name = getBilingual(entity, 'name');
      const desc = getBilingual(entity, 'description');
      return (
        <div className="space-y-4">
          <BilingualInput label={f('methodName')} valueEn={name.en} valueZh={name.zh}
            onChangeEn={v => setBilingual(entity, 'name', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'name', 'zh-Hans', v, onChange)} />
          <TextField label={f('domain')} value={entity.domain} onChange={v => onChange({ domain: v })} />
          <BilingualInput label={f('description')} valueEn={desc.en} valueZh={desc.zh}
            onChangeEn={v => setBilingual(entity, 'description', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'description', 'zh-Hans', v, onChange)} multiline />
        </div>
      );
    }

    case 'material_system': {
      const name = getBilingual(entity, 'name');
      return (
        <div className="space-y-4">
          <BilingualInput label={f('materialName')} valueEn={name.en} valueZh={name.zh}
            onChangeEn={v => setBilingual(entity, 'name', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'name', 'zh-Hans', v, onChange)} />
          <TextField label={f('composition')} value={entity.composition} onChange={v => onChange({ composition: v })} />
          <TextField label={f('structureType')} value={entity.structure_type} onChange={v => onChange({ structure_type: v })} />
          <JsonArrayEditor label={f('domainTags')} values={entity.domain_tags || []} onChange={v => onChange({ domain_tags: v })} placeholder={t('admin.form.addItem')} />
        </div>
      );
    }

    case 'metric': {
      const name = getBilingual(entity, 'name');
      const def = getBilingual(entity, 'definition');
      return (
        <div className="space-y-4">
          <BilingualInput label={f('metricName')} valueEn={name.en} valueZh={name.zh}
            onChangeEn={v => setBilingual(entity, 'name', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'name', 'zh-Hans', v, onChange)} />
          <BilingualInput label={f('definition')} valueEn={def.en} valueZh={def.zh}
            onChangeEn={v => setBilingual(entity, 'definition', 'en', v, onChange)}
            onChangeZh={v => setBilingual(entity, 'definition', 'zh-Hans', v, onChange)} multiline />
          <TextField label={f('unit')} value={entity.unit} onChange={v => onChange({ unit: v })} />
        </div>
      );
    }

    case 'collaborator': {
      return (
        <div className="space-y-4">
          <TextField label={f('name')} value={entity.name} onChange={v => onChange({ name: v })} />
          <TextField label={f('role')} value={entity.role} onChange={v => onChange({ role: v })} />
          <TextField label={f('affiliation')} value={entity.affiliation} onChange={v => onChange({ affiliation: v })} />
          <TextField label={f('website')} value={entity.contact_links?.website} onChange={v => onChange({ contact_links: { ...entity.contact_links, website: v } })} />
          <TextField label={f('orcid')} value={entity.contact_links?.orcid} onChange={v => onChange({ contact_links: { ...entity.contact_links, orcid: v } })} />
        </div>
      );
    }

    case 'institution': {
      return (
        <div className="space-y-4">
          <TextField label={f('institutionName')} value={entity.name} onChange={v => onChange({ name: v })} />
          <TextField label={f('location')} value={entity.location} onChange={v => onChange({ location: v })} />
          <TextField label={f('department')} value={entity.department} onChange={v => onChange({ department: v })} />
          <TextField label={f('website')} value={entity.website} onChange={v => onChange({ website: v })} />
        </div>
      );
    }

    case 'media':
      return (
        <div className="space-y-4">
          <SelectField label={f('mediaType')} value={entity.media_type} onChange={v => onChange({ media_type: v })}
            options={opts('mediaType', ['image', 'video', 'audio', 'document', 'other'], t)} />
          <TextField label={f('sourcePath')} value={entity.source_path} onChange={v => onChange({ source_path: v })} />
        </div>
      );

    default:
      return <p className="text-sm text-gray-500">{t('admin.form.noTypeFields')}</p>;
  }
}
