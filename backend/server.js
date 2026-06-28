const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/times-v4';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const apiRoutes = require('./routes/api');
const rpcRoutes = require('./routes/rpc');
app.use('/api', apiRoutes);
app.use('/api/rpc', rpcRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'T.I.M.E.S. Backend is running!' });
});

// Serve new UI
const newUiPath = path.join(__dirname, 'frontend', 'dist');
app.use('/app', express.static(newUiPath));
app.get(/^\/app(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(newUiPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
