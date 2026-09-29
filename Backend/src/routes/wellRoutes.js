const express =
  require("express");

const {
  getWells,
  getWellById,
} = require("../controllers/wellController");

const router =
  express.Router();

router.get(
  "/",
  getWells
);

router.get(
  "/:wellId",
  getWellById
);

module.exports =
  router;