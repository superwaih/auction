import { createHash } from "node:crypto";
import dns from "node:dns";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { BSON, MongoClient } from "mongodb";

const root = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(root);
const sourceUri = process.env.MONGODB_URI;
const targetUri = process.env.MONGODB_NEW_URI;
const sourceName = process.env.MONGODB_DB ?? "auction";
const targetName = process.env.MONGODB_NEW_DB ?? sourceName;
const apply = process.argv.includes("--apply");
const switchEnv = process.argv.includes("--switch-env");
const pausePid = Number(process.env.MIGRATION_PAUSE_PID) || null;
let paused = false;
let switched = false;

function digest(documents) {
  const hash = createHash("sha256");
  for (const doc of documents) hash.update(BSON.serialize(doc));
  return hash.digest("hex");
}
function indexSpec(index) {
  const spec = { ...index };
  delete spec.v;
  delete spec.ns;
  delete spec.background;
  return spec;
}
function indexesMatch(a, b) {
  const normal = (indexes) => indexes.map(indexSpec).sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(normal(a)) === JSON.stringify(normal(b));
}

if (!sourceUri || !targetUri) throw new Error("Set MONGODB_URI and MONGODB_NEW_URI before migrating.");
if (sourceUri === targetUri && sourceName === targetName) throw new Error("Source and destination must be different.");
const connectionOptions = { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 10000, maxPoolSize: 3 };
// Optional process-local DNS workaround; never changes the machine's resolver settings.
if (process.env.MIGRATION_DNS_SERVERS) {
  dns.setServers(process.env.MIGRATION_DNS_SERVERS.split(","));
  connectionOptions.lookup = (hostname, options, callback) => dns.resolve4(hostname, (error, addresses) => {
    if (error) return callback(error);
    if (options?.all) callback(null, addresses.map((address) => ({ address, family: 4 })));
    else callback(null, addresses[0], 4);
  });
}
const clients = [sourceUri, targetUri].map((uri) => new MongoClient(uri, connectionOptions));
try {
  await Promise.all(clients.map((client) => client.connect()));
  const source = clients[0].db(sourceName);
  const target = clients[1].db(targetName);
  const collections = (await source.listCollections().toArray()).filter((item) => !item.name.startsWith("system."));
  if (collections.some((item) => item.type !== "collection")) throw new Error("Nonstandard collection detected; use MongoDB Database Tools for this migration.");
  if ((await target.listCollections().toArray()).length) throw new Error("Destination is not empty. No existing collections will be overwritten.");
  if (!apply) {
    for (const item of collections) console.log(`${item.name}: ${await source.collection(item.name).countDocuments()} documents`);
    console.log("Dry run complete. Use --apply to copy and --switch-env to switch .env.local after verification.");
  } else {
    if (pausePid) { process.kill(pausePid, "SIGSTOP"); paused = true; }
    const snapshots = [];
    for (const item of collections) {
      const collection = source.collection(item.name);
      const documents = await collection.find({}, { promoteValues: false }).sort({ _id: 1 }).toArray();
      const indexes = await collection.listIndexes().toArray();
      snapshots.push({ name: item.name, options: item.options ?? {}, documents, indexes, hash: digest(documents) });
    }
    for (const snapshot of snapshots) {
      const collection = await target.createCollection(snapshot.name, snapshot.options);
      for (let offset = 0; offset < snapshot.documents.length; offset += 100) {
        await collection.insertMany(snapshot.documents.slice(offset, offset + 100), { ordered: true, writeConcern: { w: "majority" } });
      }
      const indexes = snapshot.indexes.filter((index) => index.name !== "_id_").map(indexSpec);
      if (indexes.length) await collection.createIndexes(indexes);
      console.log(`Copied ${snapshot.name}: ${snapshot.documents.length} documents, ${snapshot.indexes.length} indexes.`);
    }
    for (const snapshot of snapshots) {
      const [original, copied, indexes] = await Promise.all([
        source.collection(snapshot.name).find({}, { promoteValues: false }).sort({ _id: 1 }).toArray(),
        target.collection(snapshot.name).find({}, { promoteValues: false }).sort({ _id: 1 }).toArray(),
        target.collection(snapshot.name).listIndexes().toArray(),
      ]);
      if (digest(original) !== snapshot.hash) throw new Error(`Source changed during migration: ${snapshot.name}. Configuration was not switched.`);
      if (digest(copied) !== snapshot.hash || copied.length !== snapshot.documents.length) throw new Error(`Data verification failed: ${snapshot.name}. Configuration was not switched.`);
      if (!indexesMatch(snapshot.indexes, indexes)) throw new Error(`Index verification failed: ${snapshot.name}. Configuration was not switched.`);
      console.log(`Verified ${snapshot.name}: exact BSON contents and indexes match.`);
    }
    if (switchEnv) {
      const path = `${root}.env.local`;
      const before = await readFile(path, "utf8");
      let updated = before;
      const set = (key, value) => {
        const line = `${key}=${JSON.stringify(value)}`;
        const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
        updated = pattern.test(updated) ? updated.replace(pattern, () => line) : `${updated.trimEnd()}\n${line}\n`;
      };
      set("MONGODB_PREVIOUS_URI", sourceUri);
      set("MONGODB_PREVIOUS_DB", sourceName);
      set("MONGODB_URI", targetUri);
      set("MONGODB_DB", targetName);
      await writeFile(`${path}.migration-tmp`, updated, { mode: 0o600 });
      await rename(`${path}.migration-tmp`, path);
      switched = true;
      console.log("Switched .env.local to the verified destination. Previous connection retained locally. Restart the app.");
    }
    console.log("Migration verified. The source database was not modified.");
  }
} catch (error) {
  // Driver messages can include connection details; print only controlled messages and error codes.
  if (error.constructor === Error && !error.code) console.error(error.message);
  else console.error(`Migration failed (${error.name}, code ${error.code ?? "unknown"}). Configuration was not switched unless success was reported above.`);
  process.exitCode = 1;
} finally {
  if (paused) {
    // Stop the old server before it can accept writes after a verified cutover.
    if (switched && process.env.MIGRATION_STOP_AFTER_SWITCH === "1") process.kill(pausePid, "SIGTERM");
    process.kill(pausePid, "SIGCONT");
  }
  await Promise.allSettled(clients.map((client) => client.close()));
}
