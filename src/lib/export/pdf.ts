// PDF export generates printable HTML and can be converted to PDF
// In local mode, uses the browser's print-to-PDF capability
// In cloud mode, could use puppeteer/playwright for server-side PDF generation

export interface PdfExportOptions {
  entityId?: string;
  viewId?: string;
  locale: 'en' | 'zh-Hans';
  includePrivate: boolean;
  sections?: string[]; // which sections to include
}

export interface PdfExportResult {
  html: string;
  title: string;
  locale: string;
}

// Generate printable HTML for a single entity
export function generateEntityPrintHtml(entity: any, locale: 'en' | 'zh-Hans'): PdfExportResult {
  const title = locale === 'zh-Hans' ? (entity.title_zh || entity.title_en) : (entity.title_en || entity.title_zh);
  const summary = locale === 'zh-Hans' ? (entity.summary_zh || entity.summary_en) : (entity.summary_en || entity.summary_zh);

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 2cm; size: A4; }
    body { font-family: ${locale === 'zh-Hans' ? '"Noto Sans SC", "PingFang SC",' : ''} "Inter", system-ui, sans-serif; line-height: ${locale === 'zh-Hans' ? '1.8' : '1.6'}; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid #0074c5; padding-bottom: 0.5rem; }
    h2 { font-size: 1.1rem; color: #0074c5; margin-top: 1.5rem; }
    .meta { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: #e0effe; color: #015da0; margin-right: 0.5rem; }
    .summary { font-size: 0.95rem; color: #333; margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; border: 1px solid #ddd; text-align: left; font-size: 0.85rem; }
    th { background: #f0f7ff; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <span class="badge">${entity.type}</span>
    <span class="badge">${entity.status}</span>
    ${entity.created_at ? `<span>Created: ${entity.created_at.split('T')[0]}</span>` : ''}
  </div>
  ${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}
  ${entity.body_en || entity.body_zh ? `<div class="content">${escapeHtml(locale === 'zh-Hans' ? (entity.body_zh || entity.body_en || '') : (entity.body_en || entity.body_zh || ''))}</div>` : ''}
</body>
</html>`;

  return { html, title, locale };
}

// Generate printable HTML for a curated view (multiple entities)
export function generateViewPrintHtml(entities: any[], viewName: string, locale: 'en' | 'zh-Hans'): PdfExportResult {
  const entitySections = entities.map(e => {
    const t = locale === 'zh-Hans' ? (e.title_zh || e.title_en) : (e.title_en || e.title_zh);
    const s = locale === 'zh-Hans' ? (e.summary_zh || e.summary_en) : (e.summary_en || e.summary_zh);
    return `<section class="entity"><h2>${escapeHtml(t)}</h2><span class="badge">${e.type}</span><p>${escapeHtml(s || '')}</p></section>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(viewName)}</title>
  <style>
    @page { margin: 2cm; size: A4; }
    body { font-family: ${locale === 'zh-Hans' ? '"Noto Sans SC", "PingFang SC",' : ''} "Inter", system-ui, sans-serif; line-height: ${locale === 'zh-Hans' ? '1.8' : '1.6'}; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #0074c5; padding-bottom: 0.5rem; }
    h2 { font-size: 1.1rem; color: #0074c5; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: #e0effe; color: #015da0; }
    .entity { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
    @media print { body { padding: 0; } .entity { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(viewName)}</h1>
  <p class="meta">${entities.length} items · ${new Date().toISOString().split('T')[0]}</p>
  ${entitySections}
</body>
</html>`;

  return { html, title: viewName, locale };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
