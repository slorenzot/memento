import { getEngine } from '@/lib/engine';
import { ok, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/import — Import data from JSON
 *
 * Accepts multipart form data with:
 * - file: JSON file
 * - projectId: target project (optional, defaults to source project)
 * - conflictStrategy: 'skip' | 'overwrite' | 'fail' (default: 'skip')
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const contentType = request.headers.get('content-type') || '';

    let jsonData: unknown;
    let projectId: string | undefined;
    let conflictStrategy: 'skip' | 'overwrite' | 'fail' = 'skip';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      projectId = formData.get('projectId') as string | undefined;
      conflictStrategy = (formData.get('conflictStrategy') as 'skip' | 'overwrite' | 'fail') || 'skip';

      if (!file || !(file instanceof File)) {
        return badRequest('file is required');
      }

      const text = await file.text();
      try {
        jsonData = JSON.parse(text);
      } catch {
        return badRequest('Invalid JSON file');
      }
    } else {
      const body = await request.json();
      jsonData = body.data;
      projectId = body.projectId;
      conflictStrategy = body.conflictStrategy || 'skip';
    }

    if (!jsonData || typeof jsonData !== 'object') {
      return badRequest('Invalid import data');
    }

    const data = jsonData as Record<string, unknown>;

    // Support both v1.0 (observation-only) and v2.0 (full export)
    if (!data.version) {
      return badRequest('Invalid import data: missing version field');
    }

    const engine = getEngine();

    if (data.version === '2.0' && data.stats) {
      // v2.0 full import
      const result = await engine.importProject(data as any, {
        projectId,
        conflictStrategy,
        dryRun: false,
      });
      return ok(result);
    } else if (data.version === '1.0' && Array.isArray(data.observations)) {
      // v1.0 backward compat — use legacy import
      const result = await engine.importFromJson(data as any, {
        projectId: projectId || (data.project as string) || 'import',
        conflictStrategy,
        dryRun: false,
      });
      return ok({
        imported: { projects: 0, sessions: 0, observations: result.imported, prompts: 0, journalEntries: 0 },
        skipped: { observations: result.skipped, sessions: 0, journalEntries: 0 },
        overwritten: { observations: result.overwritten },
        failed: result.failed,
        errors: result.errors,
      });
    } else {
      return badRequest(`Unsupported import format version: ${data.version}`);
    }
  });
}

/**
 * POST /api/projects/import?preview=true — Preview import data
 *
 * Returns stats about the data to be imported without actually importing.
 */
export async function PATCH(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const data = body.data;

    if (!data || typeof data !== 'object') {
      return badRequest('Invalid import data');
    }

    const d = data as Record<string, unknown>;

    // Return preview stats
    return ok({
      version: d.version,
      stats: d.version === '2.0'
        ? d.stats
        : {
            totalProjects: 0,
            totalSessions: 0,
            totalObservations: Array.isArray(d.observations) ? d.observations.length : 0,
            totalPrompts: 0,
            totalJournalEntries: 0,
          },
      source: d.source || { project: d.project || 'unknown' },
    });
  });
}
