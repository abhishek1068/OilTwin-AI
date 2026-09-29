const express = require("express");

const {
  runIntegratedOptimization,
} = require("../controllers/integratedController");

const router =
  express.Router();

router.post(
  "/optimize",
  runIntegratedOptimization
);

module.exports = router;