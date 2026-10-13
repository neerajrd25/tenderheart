import { ObjectId } from 'mongodb';

function cloneDoc(doc) {
  if (doc === null || typeof doc !== 'object') return doc;
  if (doc instanceof ObjectId || doc instanceof Date) return doc;
  if (Array.isArray(doc)) return doc.map(cloneDoc);
  const out = {};
  for (const [key, value] of Object.entries(doc)) out[key] = cloneDoc(value);
  return out;
}

function valuesEqual(a, b) {
  if (a instanceof ObjectId || b instanceof ObjectId) {
    return a?.toString() === b?.toString();
  }
  return a === b;
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    const docValue = doc[key];
    if (condition && typeof condition === 'object' && '$ne' in condition) {
      return !valuesEqual(docValue, condition.$ne);
    }
    return valuesEqual(docValue, condition);
  });
}

function applySet(doc, update) {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$setOnInsert) {
    for (const [key, value] of Object.entries(update.$setOnInsert)) {
      if (doc[key] === undefined) doc[key] = value;
    }
  }
  return doc;
}

class FakeCollection {
  constructor() {
    this.docs = [];
  }

  async createIndex() {
    return true;
  }

  find(filter = {}) {
    const matched = this.docs.filter((doc) => matchesFilter(doc, filter));
    let sortSpec = null;
    const cursor = {
      sort: (spec) => {
        sortSpec = spec;
        return cursor;
      },
      toArray: async () => {
        let results = [...matched];
        if (sortSpec) {
          const [field, dir] = Object.entries(sortSpec)[0];
          results.sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);
        }
        return results.map((doc) => cloneDoc(doc));
      },
    };
    return cursor;
  }

  async findOne(filter = {}) {
    const found = this.docs.find((doc) => matchesFilter(doc, filter));
    return found ? cloneDoc(found) : null;
  }

  async insertOne(doc) {
    const stored = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(stored);
    return { insertedId: stored._id, acknowledged: true };
  }

  async updateOne(filter, update, options = {}) {
    const found = this.docs.find((doc) => matchesFilter(doc, filter));
    if (found) {
      applySet(found, update);
      return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
    }

    if (options.upsert) {
      const base = {};
      for (const [key, value] of Object.entries(filter)) {
        if (typeof value !== 'object') base[key] = value;
      }
      const doc = applySet({ _id: new ObjectId(), ...base }, update);
      this.docs.push(doc);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: doc._id };
    }

    return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
  }

  async findOneAndUpdate(filter, update) {
    const found = this.docs.find((doc) => matchesFilter(doc, filter));
    if (!found) return null;
    applySet(found, update);
    return cloneDoc(found);
  }
}

export function createFakeDb() {
  const collections = new Map();
  return {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new FakeCollection());
      return collections.get(name);
    },
  };
}
