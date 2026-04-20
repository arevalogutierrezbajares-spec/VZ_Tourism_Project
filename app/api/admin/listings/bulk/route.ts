import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdate, loadAll } from '@/lib/admin-store';
import { requireAdmin } from '@/lib/api/require-auth';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { ids, action, value, preview } = body as {
    ids: string[];
    action: string;
    value?: string;
    preview?: boolean;
  };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const all = loadAll();
  const idSet = new Set(ids);
  const targets = all.filter((l) => idSet.has(l.id));

  if (preview) {
    // Return what would change without applying
    const changes = targets.map((l) => {
      let newValue: Record<string, unknown> = {};
      if (action === 'set_category') newValue = { type: value, category: value };
      if (action === 'set_region') newValue = { region: value };
      if (action === 'set_status') newValue = { status: value };
      if (action === 'feature') newValue = { featured: true, status: 'featured' };
      if (action === 'unfeature') newValue = { featured: false, status: 'published' };
      if (action === 'archive') newValue = { status: 'archived' };
      if (action === 'publish') newValue = { status: 'published' };
      return { id: l.id, name: l.name, before: l, after: { ...l, ...newValue } };
    });
    return NextResponse.json({ preview: true, changes, count: changes.length });
  }

  const { field } = body as { field?: string };

  let fields: Record<string, unknown> = {};
  switch (action) {
    case 'set_category':
      fields = { type: value, category: value };
      break;
    case 'set_region':
      fields = { region: value };
      break;
    case 'set_status':
      fields = { status: value };
      break;
    case 'set_field':
      if (!field) return NextResponse.json({ error: 'field required for set_field' }, { status: 400 });
      fields = { [field]: value };
      break;
    case 'feature':
      fields = { featured: true, status: 'featured' };
      break;
    case 'unfeature':
      fields = { featured: false, status: 'published' };
      break;
    case 'archive':
      fields = { status: 'archived' };
      break;
    case 'publish':
      fields = { status: 'published' };
      break;
    default:
      return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  }

  const count = await bulkUpdate(ids, fields);
  return NextResponse.json({ ok: true, count });
}
