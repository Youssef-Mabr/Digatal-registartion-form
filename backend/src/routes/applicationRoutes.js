const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Application = require('../models/Application');
const { generateReferenceNumber } = require('../utils/reference');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function buildVehicles(payload) {
  if (Array.isArray(payload.vehicles) && payload.vehicles.length > 0) {
    return payload.vehicles;
  }

  if (payload.vehicleNumber || payload.vehicleModel || payload.vehicleType || payload.vehicleColor) {
    return [
      {
        vehicleNumber: payload.vehicleNumber,
        vehicleModel: payload.vehicleModel,
        vehicleType: payload.vehicleType,
        vehicleColor: payload.vehicleColor,
      },
    ];
  }

  return [];
}

function normalizeApplication(payload) {
  const vehicles = buildVehicles(payload);
  const firstVehicle = vehicles[0] || {};
  const totalAmountFromClient = Number(payload.totalAmount);

  const parkingPrices = {
    'Non Reserved': 150,
    Reserved: 200,
    Premium: 300,
  };

  const subscriptionMultipliers = {
    Monthly: 1,
    Quarterly: 3,
    Yearly: 12,
  };

  const fallbackAmount =
    (parkingPrices[payload.parkingType] || 0) * (subscriptionMultipliers[payload.subscriptionPeriod] || 1) * Math.max(vehicles.length, 1);

  return {
    fullName: payload.fullName,
    phoneNumber: payload.phoneNumber,
    companyName: payload.companyName,
    staffId: payload.staffId,
    vehicleNumber: firstVehicle.vehicleNumber || payload.vehicleNumber,
    vehicleModel: firstVehicle.vehicleModel || payload.vehicleModel,
    vehicleType: firstVehicle.vehicleType || payload.vehicleType,
    vehicleColor: firstVehicle.vehicleColor || payload.vehicleColor,
    vehicles,
    parkingType: payload.parkingType,
    subscriptionPeriod: payload.subscriptionPeriod,
    totalAmount: Number.isFinite(totalAmountFromClient) && totalAmountFromClient > 0 ? totalAmountFromClient : fallbackAmount,
  };
}

async function uploadReceiptBuffer(file) {
  if (!file) {
    throw new Error('Payment receipt is required');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'hispeedcity/receipts',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
}

router.post('/', upload.single('receipt'), async (req, res, next) => {
  try {
    const applicationDataRaw = req.body.applicationData;
    const payload = applicationDataRaw ? JSON.parse(applicationDataRaw) : req.body;
    const normalized = normalizeApplication(payload);

    const requiredFields = [
      'fullName',
      'phoneNumber',
      'companyName',
      'staffId',
      'parkingType',
      'subscriptionPeriod',
    ];

    for (const field of requiredFields) {
      if (!normalized[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    if (!normalized.vehicles.length) {
      return res.status(400).json({ message: 'At least one vehicle is required' });
    }

    const missingVehicle = normalized.vehicles.find(
      (vehicle) => !vehicle.vehicleNumber || !vehicle.vehicleModel || !vehicle.vehicleType || !vehicle.vehicleColor,
    );

    if (missingVehicle) {
      return res.status(400).json({ message: 'All vehicle fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Payment receipt is required' });
    }

    const receiptUrl = await uploadReceiptBuffer(req.file);
    const referenceNumber = await generateReferenceNumber();

    const application = await Application.create({
      referenceNumber,
      ...normalized,
      receiptUrl,
      status: 'Pending',
    });

    return res.status(201).json({
      message: 'Application submitted successfully',
      referenceNumber: application.referenceNumber,
      status: application.status,
      submittedAt: application.submittedAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/reference/:referenceNumber', async (req, res, next) => {
  try {
    const application = await Application.findOne({ referenceNumber: req.params.referenceNumber }).lean();
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json(application);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;