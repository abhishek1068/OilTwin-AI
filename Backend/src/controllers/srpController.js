const {
  optimizeSRP,
} = require("../services/srpOptimizationService");

const {
  wells,
  srpData,
} = require("../data/demoData");

const runSRPOptimization =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      const wellId =
        body.wellId;

      const well =
        wells.find(
          (item) =>
            item.wellId ===
            wellId
        );

      const srp =
        srpData.find(
          (item) =>
            item.wellId ===
            wellId
        );

      const result =
        optimizeSRP({
          currentSpm:
            Number(
              body.currentSpm ??
                srp?.spm ??
                well?.spm ??
                5
            ),

          currentStrokeLength:
            Number(
              body.currentStrokeLength ??
                body.strokeLength ??
                srp?.strokeLength ??
                well?.strokeLength ??
                70
            ),

          pumpEfficiency:
            Number(
              body.pumpEfficiency ??
                srp?.pumpEfficiency ??
                well?.pumpEfficiency ??
                80
            ),

          currentRodLoad:
            Number(
              body.currentRodLoad ??
                body.rodLoad ??
                srp?.rodLoad ??
                well?.rodLoad ??
                65
            ),

          viscosityCp:
            Number(
              body.viscosityCp ??
                3000
            ),

          predictedProductionBopd:
            Number(
              body.predictedProductionBopd ??
                body.currentProduction ??
                well?.currentOilProduction ??
                120
            ),
        });

      res.json({
        success: true,

        message:
          "SRP optimization completed.",

        wellId,

        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message:
          "SRP optimization failed.",

        error:
          error.message,
      });
    }
  };

module.exports = {
  runSRPOptimization,
};