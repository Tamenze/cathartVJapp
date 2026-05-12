import Dexie, { type EntityTable } from "dexie";
import type { JournalEntry } from "@/types";

const db = new Dexie("CathartDB") as Dexie & {
  entries: EntityTable<JournalEntry, "id">;
};

db.version(1).stores({
  entries: "++id, userId, createdAt",
});

export { db };
