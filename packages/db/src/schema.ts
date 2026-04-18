import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const experiments = sqliteTable("experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sourceFormat: text("source_format").notNull(),
  sourceFilename: text("source_filename"),
  sourceHash: text("source_hash"),
  sourceSize: integer("source_size"),
  rowCount: integer("row_count").notNull().default(0),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  registeredAt: text("registered_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const experimentColumns = sqliteTable("experiment_columns", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id")
    .notNull()
    .references(() => experiments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  unit: text("unit"),
  position: integer("position").notNull(),
});

export const experimentRows = sqliteTable("experiment_rows", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id")
    .notNull()
    .references(() => experiments.id, { onDelete: "cascade" }),
  rowIndex: integer("row_index").notNull(),
  data: text("data", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const experimentTags = sqliteTable(
  "experiment_tags",
  {
    experimentId: text("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.experimentId, table.tagId] }),
  }),
);

export const contextDocuments = sqliteTable("context_documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  sourceUrl: text("source_url"),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const adviceNotes = sqliteTable("advice_notes", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id")
    .notNull()
    .references(() => experiments.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const experimentsRelations = relations(experiments, ({ many }) => ({
  columns: many(experimentColumns),
  rows: many(experimentRows),
  tagLinks: many(experimentTags),
  adviceNotes: many(adviceNotes),
}));

export const experimentColumnsRelations = relations(experimentColumns, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentColumns.experimentId],
    references: [experiments.id],
  }),
}));

export const experimentRowsRelations = relations(experimentRows, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentRows.experimentId],
    references: [experiments.id],
  }),
}));

export const experimentTagsRelations = relations(experimentTags, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentTags.experimentId],
    references: [experiments.id],
  }),
  tag: one(tags, {
    fields: [experimentTags.tagId],
    references: [tags.id],
  }),
}));

export const adviceNotesRelations = relations(adviceNotes, ({ one }) => ({
  experiment: one(experiments, {
    fields: [adviceNotes.experimentId],
    references: [experiments.id],
  }),
}));
