import type { Database } from "@lab-ai/db";
import { schema } from "@lab-ai/db";
import type {
  ColumnDefinition,
  CreateExperimentRequest,
  ExperimentDetail,
  ExperimentMeta,
  ExperimentRow,
  UpdateExperimentRequest,
} from "@lab-ai/shared";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

function nowIso(): string {
  return new Date().toISOString();
}

function toMeta(
  row: typeof schema.experiments.$inferSelect,
  tagNames: readonly string[],
): ExperimentMeta {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: [...tagNames],
    sourceFormat: row.sourceFormat as ExperimentMeta["sourceFormat"],
    sourceFilename: row.sourceFilename,
    sourceHash: row.sourceHash,
    sourceSize: row.sourceSize,
    rowCount: row.rowCount,
    archived: Boolean(row.archived),
    registeredAt: row.registeredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listExperiments(
  db: Database,
  opts: { limit: number; offset: number; includeArchived: boolean },
): ExperimentMeta[] {
  const rows = db
    .select()
    .from(schema.experiments)
    .where(opts.includeArchived ? undefined : eq(schema.experiments.archived, false))
    .orderBy(desc(schema.experiments.createdAt))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const tagLinks = db
    .select({ experimentId: schema.experimentTags.experimentId, name: schema.tags.name })
    .from(schema.experimentTags)
    .innerJoin(schema.tags, eq(schema.experimentTags.tagId, schema.tags.id))
    .where(inArray(schema.experimentTags.experimentId, ids))
    .all();

  const byId = new Map<string, string[]>();
  for (const link of tagLinks) {
    const existing = byId.get(link.experimentId);
    if (existing) {
      existing.push(link.name);
    } else {
      byId.set(link.experimentId, [link.name]);
    }
  }

  return rows.map((r) => toMeta(r, byId.get(r.id) ?? []));
}

export function getExperimentDetail(db: Database, id: string): ExperimentDetail | null {
  const row = db.select().from(schema.experiments).where(eq(schema.experiments.id, id)).get();
  if (!row) return null;

  const tagNames = db
    .select({ name: schema.tags.name })
    .from(schema.experimentTags)
    .innerJoin(schema.tags, eq(schema.experimentTags.tagId, schema.tags.id))
    .where(eq(schema.experimentTags.experimentId, id))
    .all()
    .map((r) => r.name);

  const cols = db
    .select()
    .from(schema.experimentColumns)
    .where(eq(schema.experimentColumns.experimentId, id))
    .orderBy(asc(schema.experimentColumns.position))
    .all();

  const columns: ColumnDefinition[] = cols.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as ColumnDefinition["type"],
    unit: c.unit,
    position: c.position,
  }));

  return { ...toMeta(row, tagNames), columns };
}

export function getExperimentRows(
  db: Database,
  id: string,
  opts: { limit: number; offset: number },
): ExperimentRow[] {
  const rows = db
    .select()
    .from(schema.experimentRows)
    .where(eq(schema.experimentRows.experimentId, id))
    .orderBy(asc(schema.experimentRows.rowIndex))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();
  return rows.map((r) => r.data);
}

export interface RowWithMeta {
  id: string;
  rowIndex: number;
  data: ExperimentRow;
}

export function getExperimentRowsWithIds(
  db: Database,
  id: string,
  opts: { limit: number; offset: number },
): RowWithMeta[] {
  const rows = db
    .select()
    .from(schema.experimentRows)
    .where(eq(schema.experimentRows.experimentId, id))
    .orderBy(asc(schema.experimentRows.rowIndex))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();
  return rows.map((r) => ({ id: r.id, rowIndex: r.rowIndex, data: r.data }));
}

export function updateExperimentRow(
  db: Database,
  experimentId: string,
  rowId: string,
  data: ExperimentRow,
): RowWithMeta | null {
  const existing = db
    .select()
    .from(schema.experimentRows)
    .where(
      and(
        eq(schema.experimentRows.id, rowId),
        eq(schema.experimentRows.experimentId, experimentId),
      ),
    )
    .get();
  if (!existing) return null;
  db.update(schema.experimentRows).set({ data }).where(eq(schema.experimentRows.id, rowId)).run();
  const now = nowIso();
  db.update(schema.experiments)
    .set({ updatedAt: now })
    .where(eq(schema.experiments.id, experimentId))
    .run();
  return { id: existing.id, rowIndex: existing.rowIndex, data };
}

export function deleteExperimentRow(db: Database, experimentId: string, rowId: string): boolean {
  const result = db
    .delete(schema.experimentRows)
    .where(
      and(
        eq(schema.experimentRows.id, rowId),
        eq(schema.experimentRows.experimentId, experimentId),
      ),
    )
    .run();
  if (result.changes === 0) return false;
  const remaining = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.experimentRows)
    .where(eq(schema.experimentRows.experimentId, experimentId))
    .get();
  db.update(schema.experiments)
    .set({ rowCount: remaining?.count ?? 0, updatedAt: nowIso() })
    .where(eq(schema.experiments.id, experimentId))
    .run();
  return true;
}

function upsertTags(db: Database, tagNames: readonly string[]): string[] {
  if (tagNames.length === 0) return [];
  const ids: string[] = [];
  for (const name of tagNames) {
    const existing = db.select().from(schema.tags).where(eq(schema.tags.name, name)).get();
    if (existing) {
      ids.push(existing.id);
    } else {
      const id = nanoid();
      db.insert(schema.tags).values({ id, name }).run();
      ids.push(id);
    }
  }
  return ids;
}

export function createExperiment(db: Database, input: CreateExperimentRequest): ExperimentDetail {
  const id = nanoid();
  const now = nowIso();

  db.transaction((tx) => {
    tx.insert(schema.experiments)
      .values({
        id,
        name: input.name,
        description: input.description ?? null,
        sourceFormat: input.sourceFormat,
        sourceFilename: input.source?.filename ?? null,
        sourceHash: input.source?.hash ?? null,
        sourceSize: input.source?.size ?? null,
        rowCount: input.rows.length,
        archived: false,
        registeredAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const columns = input.columns.map((col, idx) => ({
      id: col.id ?? nanoid(),
      experimentId: id,
      name: col.name,
      type: col.type,
      unit: col.unit ?? null,
      position: col.position ?? idx,
    }));
    if (columns.length > 0) {
      tx.insert(schema.experimentColumns).values(columns).run();
    }

    if (input.rows.length > 0) {
      const rowValues = input.rows.map((row, index) => ({
        id: nanoid(),
        experimentId: id,
        rowIndex: index,
        data: row,
      }));
      // insert in chunks to stay under SQLite variable limit
      const chunkSize = 200;
      for (let i = 0; i < rowValues.length; i += chunkSize) {
        tx.insert(schema.experimentRows)
          .values(rowValues.slice(i, i + chunkSize))
          .run();
      }
    }

    const tagIds = upsertTags(tx as unknown as Database, input.tags);
    if (tagIds.length > 0) {
      tx.insert(schema.experimentTags)
        .values(tagIds.map((tagId) => ({ experimentId: id, tagId })))
        .run();
    }
  });

  const detail = getExperimentDetail(db, id);
  if (!detail) throw new Error("Failed to load experiment after insert");
  return detail;
}

export function updateExperiment(
  db: Database,
  id: string,
  input: UpdateExperimentRequest,
): ExperimentDetail | null {
  const existing = db.select().from(schema.experiments).where(eq(schema.experiments.id, id)).get();
  if (!existing) return null;

  db.transaction((tx) => {
    const patch: Partial<typeof schema.experiments.$inferInsert> = { updatedAt: nowIso() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description ?? null;
    if (input.archived !== undefined) patch.archived = input.archived;
    tx.update(schema.experiments).set(patch).where(eq(schema.experiments.id, id)).run();

    if (input.tags) {
      tx.delete(schema.experimentTags).where(eq(schema.experimentTags.experimentId, id)).run();
      const tagIds = upsertTags(tx as unknown as Database, input.tags);
      if (tagIds.length > 0) {
        tx.insert(schema.experimentTags)
          .values(tagIds.map((tagId) => ({ experimentId: id, tagId })))
          .run();
      }
    }
  });

  return getExperimentDetail(db, id);
}

export function archiveExperiment(db: Database, id: string): boolean {
  const result = db
    .update(schema.experiments)
    .set({ archived: true, updatedAt: nowIso() })
    .where(and(eq(schema.experiments.id, id), eq(schema.experiments.archived, false)))
    .run();
  return result.changes > 0;
}

export function duplicateExperiment(db: Database, sourceId: string): ExperimentDetail | null {
  const existing = getExperimentDetail(db, sourceId);
  if (!existing) return null;

  const rows = db
    .select()
    .from(schema.experimentRows)
    .where(eq(schema.experimentRows.experimentId, sourceId))
    .orderBy(asc(schema.experimentRows.rowIndex))
    .all();

  const tagRows = db
    .select()
    .from(schema.experimentTags)
    .where(eq(schema.experimentTags.experimentId, sourceId))
    .all();

  const newId = nanoid();
  const now = nowIso();

  db.transaction((tx) => {
    tx.insert(schema.experiments)
      .values({
        id: newId,
        name: `${existing.name} (copy)`,
        description: existing.description ?? null,
        sourceFormat: existing.sourceFormat,
        sourceFilename: existing.sourceFilename ?? null,
        sourceHash: existing.sourceHash ?? null,
        sourceSize: existing.sourceSize ?? null,
        rowCount: rows.length,
        archived: false,
        registeredAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (existing.columns.length > 0) {
      tx.insert(schema.experimentColumns)
        .values(
          existing.columns.map((col) => ({
            id: nanoid(),
            experimentId: newId,
            name: col.name,
            type: col.type,
            unit: col.unit ?? null,
            position: col.position,
          })),
        )
        .run();
    }

    if (rows.length > 0) {
      const chunkSize = 200;
      const values = rows.map((row) => ({
        id: nanoid(),
        experimentId: newId,
        rowIndex: row.rowIndex,
        data: row.data,
      }));
      for (let i = 0; i < values.length; i += chunkSize) {
        tx.insert(schema.experimentRows)
          .values(values.slice(i, i + chunkSize))
          .run();
      }
    }

    if (tagRows.length > 0) {
      tx.insert(schema.experimentTags)
        .values(tagRows.map((t) => ({ experimentId: newId, tagId: t.tagId })))
        .run();
    }
  });

  const detail = getExperimentDetail(db, newId);
  if (!detail) throw new Error("duplicate failed");
  return detail;
}

export function archiveExperiments(db: Database, ids: readonly string[]): number {
  if (ids.length === 0) return 0;
  const mutableIds = [...ids];
  const result = db
    .update(schema.experiments)
    .set({ archived: true, updatedAt: nowIso() })
    .where(and(inArray(schema.experiments.id, mutableIds), eq(schema.experiments.archived, false)))
    .run();
  return result.changes;
}

export function countExperiments(db: Database, includeArchived: boolean): number {
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.experiments)
    .where(includeArchived ? undefined : eq(schema.experiments.archived, false))
    .get();
  return row?.count ?? 0;
}
