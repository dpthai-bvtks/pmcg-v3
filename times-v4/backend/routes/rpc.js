const express = require('express');
const router = express.Router();
const legacyAdapter = require('../services/legacyAdapter');

router.post('/', async (req, res) => {
  try {
    const action = req.body.action;
    let args = [];
    if (req.body.args) {
      args = JSON.parse(req.body.args);
    }
    
    if (typeof legacyAdapter[action] !== 'function') {
      console.warn("Hàm API chưa được hỗ trợ:", action);
      // Return empty array or object as a mock fallback to prevent UI crash
      return res.json({ status: "success", data: [] });
    }
    
    const result = await legacyAdapter[action](...args);
    
    res.json({ status: "success", data: result });
  } catch (error) {
    console.error("RPC Error:", error);
    res.json({ status: "error", error: error.message || error.toString() });
  }
});

module.exports = router;
