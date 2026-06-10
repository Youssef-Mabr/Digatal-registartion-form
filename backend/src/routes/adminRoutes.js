const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Application = require('../models/Application');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin._id.toString(), username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAdminToken(admin);
    return res.json({
      message: 'Login successful',
      token,
      admin: { username: admin.username },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  return res.json({ message: 'Logout successful' });
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ username: req.admin.username });
});

router.put('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }

    const admin = await Admin.findById(req.admin.sub);
    if (!admin) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    const currentPasswordMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!currentPasswordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
});

router.get('/dashboard/stats', requireAuth, async (req, res, next) => {
  try {
    const [totalApplications, pendingApplications, approvedApplications, rejectedApplications] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: 'Pending' }),
      Application.countDocuments({ status: 'Approved' }),
      Application.countDocuments({ status: 'Rejected' }),
    ]);

    return res.json({
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/applications', requireAuth, async (req, res, next) => {
  try {
    const applications = await Application.find().sort({ submittedAt: -1 }).lean();
    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

router.get('/applications/:referenceNumber', requireAuth, async (req, res, next) => {
  try {
    const application = await Application.findOne({ referenceNumber: req.params.referenceNumber }).lean();
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

router.patch('/applications/:referenceNumber/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Approved', 'Rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const application = await Application.findOneAndUpdate(
      { referenceNumber: req.params.referenceNumber },
      { status, updatedAt: new Date() },
      { new: true },
    ).lean();

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json({ message: 'Application status updated', application });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;