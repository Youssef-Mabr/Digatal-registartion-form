const Counter = require('../models/Counter');

async function generateReferenceNumber() {
  const year = new Date().getFullYear();
  const counterId = `applications-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return `SP-${year}-${String(counter.seq).padStart(6, '0')}`;
}

module.exports = { generateReferenceNumber };