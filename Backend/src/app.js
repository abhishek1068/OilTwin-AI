const express = require("express");
const cors = require("cors");

const wellRoutes =
  require("./routes/wellRoutes");

const cssRoutes =
  require("./routes/cssRoutes");

const srpRoutes =
  require("./routes/srpRoutes");

const integratedRoutes =
  require("./routes/integratedRoutes");

const app =
  express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  express.json()
);

// =========================================================
// ROOT
// =========================================================

app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,

      name:
        "OilTwin AI",

      message:
        "Baghewala Well-to-Surface Digital Twin API",

      version:
        "1.0.0",

      status:
        "online",
    });
  }
);

// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,

      status:
        "healthy",

      service:
        "OilTwin AI Backend",
    });
  }
);

// =========================================================
// WELL ROUTES
// =========================================================

app.use(
  "/api/wells",
  wellRoutes
);

// =========================================================
// CSS ROUTES
// =========================================================

app.use(
  "/api/css",
  cssRoutes
);

// =========================================================
// SRP ROUTES
// =========================================================

app.use(
  "/api/srp",
  srpRoutes
);

// =========================================================
// INTEGRATED CSS + SRP ROUTES
// =========================================================

app.use(
  "/api/integrated",
  integratedRoutes
);

// =========================================================
// 404
// =========================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,

      message:
        "API route not found",
    });
  }
);

// =========================================================
// ERROR HANDLER
// =========================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(err);

    res.status(
      err.status || 500
    ).json({
      success: false,

      message:
        err.message ||
        "Internal server error",
    });
  }
);

module.exports =
  app;