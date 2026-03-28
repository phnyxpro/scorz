import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface OfflineDBSchema extends DBSchema {
  cached_queries: {
    key: string;
    value: {
      queryKey: string;
      data: unknown;
      timestamp: number;
    };
  };
  offline_mutations: {
    key: number;
    value: {
      mutationType: string;
      payload: Record<string, unknown>;
      createdAt: number;
      status: "pending" | "synced" | "failed";
      error?: string;
    };
    indexes: { "by-status": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>("scorz-offline", 1, {
      upgrade(db) {
        db.createObjectStore("cached_queries", { keyPath: "queryKey" });
        const mutations = db.createObjectStore("offline_mutations", {
          keyPath: undefined,
          autoIncrement: true,
        });
        mutations.createIndex("by-status", "status");
      },
    });
  }
  return dbPromise;
}

// Cache helpers
export async function setCachedQuery(queryKey: string, data: unknown) {
  const db = await getOfflineDB();
  await db.put("cached_queries", { queryKey, data, timestamp: Date.now() });
}

export async function getCachedQuery(queryKey: string) {
  const db = await getOfflineDB();
  return db.get("cached_queries", queryKey);
}

export async function getAllCachedQueries() {
  const db = await getOfflineDB();
  return db.getAll("cached_queries");
}

// Mutation queue helpers
export async function queueMutation(mutationType: string, payload: Record<string, unknown>) {
  const db = await getOfflineDB();
  return db.add("offline_mutations", {
    mutationType,
    payload,
    createdAt: Date.now(),
    status: "pending",
  });
}

export async function getPendingMutations() {
  const db = await getOfflineDB();
  return db.getAllFromIndex("offline_mutations", "by-status", "pending");
}

export async function updateMutationStatus(key: number, status: "synced" | "failed", error?: string) {
  const db = await getOfflineDB();
  const tx = db.transaction("offline_mutations", "readwrite");
  const store = tx.objectStore("offline_mutations");
  const record = await store.get(key);
  if (record) {
    record.status = status;
    if (error) record.error = error;
    await store.put(record, key);
  }
  await tx.done;
}

export async function clearSyncedMutations() {
  const db = await getOfflineDB();
  const tx = db.transaction("offline_mutations", "readwrite");
  const store = tx.objectStore("offline_mutations");
  const index = store.index("by-status");
  let cursor = await index.openCursor("synced");
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function getPendingCount() {
  const db = await getOfflineDB();
  const all = await db.getAllFromIndex("offline_mutations", "by-status", "pending");
  return all.length;
}

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isStale(timestamp: number) {
  return Date.now() - timestamp > STALE_MS;
}
