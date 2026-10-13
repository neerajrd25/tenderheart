import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { requireFields, isValidEmail, GENDERS, ValidationError } from '../utils/validation.js';

function toObjectId(id) {
  if (!ObjectId.isValid(id)) {
    throw new ValidationError('Invalid id format');
  }
  return new ObjectId(id);
}

function validateChildInput(input, { partial = false } = {}) {
  if (!partial) {
    requireFields(input, ['name', 'dateOfBirth', 'gender', 'parentName', 'parentEmail']);
  }

  if (input.gender !== undefined && !GENDERS.includes(input.gender)) {
    throw new ValidationError(`gender must be one of: ${GENDERS.join(', ')}`);
  }

  if (input.parentEmail !== undefined && !isValidEmail(input.parentEmail)) {
    throw new ValidationError('parentEmail must be a valid email address');
  }

  if (input.dateOfBirth !== undefined && Number.isNaN(Date.parse(input.dateOfBirth))) {
    throw new ValidationError('dateOfBirth must be a valid date');
  }
}

export async function listChildren(userId, { includeInactive = false } = {}) {
  const db = await getDb();
  const filter = { userId: userId.toString() };
  if (!includeInactive) filter.active = true;

  return db.collection('children').find(filter).sort({ name: 1 }).toArray();
}

export async function createChild(userId, input) {
  validateChildInput(input);
  const db = await getDb();
  const now = new Date();

  const doc = {
    userId: userId.toString(),
    name: input.name,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    photo: input.photo || null,
    parentName: input.parentName,
    parentEmail: input.parentEmail,
    active: input.active === undefined ? true : Boolean(input.active),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('children').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function getChildById(userId, childId) {
  const db = await getDb();
  const child = await db
    .collection('children')
    .findOne({ _id: toObjectId(childId), userId: userId.toString() });

  if (!child) {
    const err = new Error('Child not found');
    err.statusCode = 404;
    throw err;
  }

  return child;
}

export async function updateChild(userId, childId, input) {
  validateChildInput(input, { partial: true });

  const db = await getDb();
  const allowedFields = [
    'name',
    'dateOfBirth',
    'gender',
    'photo',
    'parentName',
    'parentEmail',
    'active',
  ];

  const update = { updatedAt: new Date() };
  for (const field of allowedFields) {
    if (input[field] !== undefined) update[field] = input[field];
  }

  const result = await db
    .collection('children')
    .findOneAndUpdate(
      { _id: toObjectId(childId), userId: userId.toString() },
      { $set: update },
      { returnDocument: 'after' }
    );

  if (!result) {
    const err = new Error('Child not found');
    err.statusCode = 404;
    throw err;
  }

  return result;
}
