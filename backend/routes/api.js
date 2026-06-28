const express = require('express');
const router = express.Router();

// Import Models
const Machine = require('../models/Machine');
const Procedure = require('../models/Procedure');
const Staff = require('../models/Staff');
const Room = require('../models/Room');
const Patient = require('../models/Patient');

// --- Generic CRUD Factory ---
const createCrudRoutes = (model) => {
  const r = express.Router();

  // GET All
  r.get('/', async (req, res) => {
    try {
      const data = await model.find();
      res.json({ status: 'success', data });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // GET One
  r.get('/:id', async (req, res) => {
    try {
      const data = await model.findById(req.params.id);
      if (!data) return res.status(404).json({ status: 'error', error: 'Not found' });
      res.json({ status: 'success', data });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // CREATE
  r.post('/', async (req, res) => {
    try {
      const doc = new model(req.body);
      await doc.save();
      res.json({ status: 'success', data: doc });
    } catch (err) {
      res.status(400).json({ status: 'error', error: err.message });
    }
  });

  // UPDATE
  r.put('/:id', async (req, res) => {
    try {
      const updated = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ status: 'error', error: 'Not found' });
      res.json({ status: 'success', data: updated });
    } catch (err) {
      res.status(400).json({ status: 'error', error: err.message });
    }
  });

  // DELETE
  r.delete('/:id', async (req, res) => {
    try {
      const deleted = await model.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ status: 'error', error: 'Not found' });
      res.json({ status: 'success', data: { id: req.params.id } });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  return r;
};

// Register routes
router.use('/machines', createCrudRoutes(Machine));
router.use('/procedures', createCrudRoutes(Procedure));
router.use('/staff', createCrudRoutes(Staff));
router.use('/rooms', createCrudRoutes(Room));
router.use('/patients', createCrudRoutes(Patient));

// Dashboard Stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const activeStaff = await Staff.countDocuments({ trangThai: 'Đang làm việc' });
    const waitingPatients = await Patient.countDocuments({ status: { $ne: 'Hoàn thành' } });
    const completedProcedures = await Patient.countDocuments({ status: 'Hoàn thành' });

    res.json({
      status: 'success',
      data: {
        totalPatients,
        activeStaff,
        waitingPatients,
        completedProcedures
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});
// Scheduler Route
const scheduler = require('../services/scheduler');
router.post('/schedule', async (req, res) => {
  try {
    const { date, strategy, skipProcs } = req.body;
    const result = await scheduler.runScheduling(date || new Date().toISOString().split('T')[0], strategy || 'opt_rare', skipProcs || '');
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('Error running scheduler:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;

