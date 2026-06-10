const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, trim: true },
    vehicleColor: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    staffId: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, trim: true },
    vehicleColor: { type: String, required: true, trim: true },
    vehicles: { type: [vehicleSchema], default: [] },
    parkingType: { type: String, required: true, trim: true },
    subscriptionPeriod: { type: String, required: true, trim: true },
    totalAmount: { type: Number, required: true },
    receiptUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    submittedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

applicationSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Application', applicationSchema);