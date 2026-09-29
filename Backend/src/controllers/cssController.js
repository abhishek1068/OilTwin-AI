const {
  optimizeCSSSchedule,
} = require("../services/optimizationService");

const {
  wells,
} = require("../data/demoData");

const getNumber = (
  value,
  fallback
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const runCSSOptimization =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      let well = null;

      if (body.wellId) {
        well =
          wells.find(
            (item) =>
              item.wellId ===
              body.wellId
          ) || null;
      }

      const currentProduction =
        getNumber(
          body.currentOilProductionBopd ??
            body.currentProduction,
          well?.currentOilProduction ??
            128
        );

      const input = {
        oilTemperatureC:
          getNumber(
            body.oilTemperatureC ??
              body.reservoirTemperature,
            well?.reservoirTemperature ??
              47
          ),

        reservoirPressureBar:
          getNumber(
            body.reservoirPressureBar ??
              body.reservoirPressure,
            well?.reservoirPressure ??
              42
          ),

        apiGravity:
          getNumber(
            body.apiGravity,
            well?.apiGravity ??
              18.2
          ),

        currentOilProductionBopd:
          currentProduction,

        steamTemperatureC:
          getNumber(
            body.steamTemperatureC,
            280
          ),

        steamQuality:
          getNumber(
            body.steamQuality,
            0.8
          ),

        availableSteamRateTpd:
          getNumber(
            body.availableSteamRateTpd ??
              body.steamInjectionRate,
            well?.steamInjectionRate ??
              45
          ),

        injectionPressureBar:
          getNumber(
            body.injectionPressureBar ??
              body.steamPressure,
            well?.steamPressure ??
              8.5
          ),

        productionCutoffBopd:
          getNumber(
            body.productionCutoffBopd,
            Math.max(
              30,
              currentProduction *
                0.45
            )
          ),

        previousCycle:
          body.previousCycle || {
            steamInjectionRateTpd:
              well?.steamInjectionRate ??
              42,

            injectionDays:
              3,

            soakDays:
              well?.soakDays ??
              5,

            steamPressureBar:
              well?.steamPressure ??
              8.5,
          },
      };

      const result =
        optimizeCSSSchedule(
          input
        );

      res.json({
        success: true,

        message:
          "CSS digital twin optimization completed.",

        wellId:
          body.wellId ||
          null,

        data: result,
      });
    } catch (error) {
      console.error(
        "CSS optimization error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "CSS digital twin optimization failed.",

        error:
          error.message,
      });
    }
  };

module.exports = {
  runCSSOptimization,
};