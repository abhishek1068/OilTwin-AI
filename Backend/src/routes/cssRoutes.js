const express =
  require("express");

const {
  runCSSOptimization,
} = require("../controllers/cssController");

const router =
  express.Router();

router.post(
  "/optimize",
  runCSSOptimization
);

module.exports =
  router;