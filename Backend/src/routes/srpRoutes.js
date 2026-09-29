const express =
  require("express");

const {
  runSRPOptimization,
} = require("../controllers/srpController");

const router =
  express.Router();

router.post(
  "/optimize",
  runSRPOptimization
);

module.exports =
  router;