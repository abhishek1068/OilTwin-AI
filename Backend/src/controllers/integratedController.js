const {
  optimizeIntegratedSchedule,
} = require("../services/integratedOptimizationService");

const {
  wells,
  cssCycles,
  srpData,
} = require("../data/demoData");

function getNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

async function runIntegratedOptimization(
  req,
  res
) {
  try {
    const body = req.body || {};

    const wellId =
      body.wellId || "BGW-001";

    const well =
      wells.find(
        (item) =>
          item.wellId === wellId
      ) || wells[0];

    const srp =
      srpData.find(
        (item) =>
          item.wellId === well.wellId
      ) || {};

    const previousCycle =
      cssCycles
        .filter(
          (item) =>
            item.wellId ===
            well.wellId
        )
        .sort(
          (a, b) =>
            String(b.cycleId).localeCompare(
              String(a.cycleId)
            )
        )[0] || null;

    const currentProduction =
      getNumber(
        body.currentOilProductionBopd ??
          body.currentProduction,
        well.currentOilProduction
      );

    const input = {
      wellId:
        well.wellId,

      oilTemperatureC:
        getNumber(
          body.oilTemperatureC ??
            body.reservoirTemperature,
          well.reservoirTemperature
        ),

      reservoirPressureBar:
        getNumber(
          body.reservoirPressureBar ??
            body.reservoirPressure,
          well.reservoirPressure
        ),

      apiGravity:
        getNumber(
          body.apiGravity,
          well.apiGravity
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
          0.80
        ),

      availableSteamRateTpd:
        getNumber(
          body.availableSteamRateTpd ??
            body.steamInjectionRate,
          well.steamInjectionRate
        ),

      injectionPressureBar:
        getNumber(
          body.injectionPressureBar ??
            body.steamPressure,
          well.steamPressure
        ),

      productionCutoffBopd:
        getNumber(
          body.productionCutoffBopd,
          Math.max(
            30,
            currentProduction * 0.45
          )
        ),

      previousCycle,

      currentSpm:
        getNumber(
          body.currentSpm ??
            body.spm,
          srp.spm ??
            well.spm
        ),

      currentStrokeLength:
        getNumber(
          body.currentStrokeLength ??
            body.strokeLength,
          srp.strokeLength ??
            well.strokeLength
        ),

      pumpEfficiency:
        getNumber(
          body.pumpEfficiency,
          srp.pumpEfficiency ??
            well.pumpEfficiency
        ),

      currentRodLoad:
        getNumber(
          body.currentRodLoad ??
            body.rodLoad,
          srp.rodLoad ??
            well.rodLoad
        ),
    };

    const result =
      optimizeIntegratedSchedule(
        input
      );

    return res.status(200).json({
      success: true,

      message:
        "Integrated CSS + SRP digital twin optimization completed.",

      wellId:
        well.wellId,

      data:
        result,
    });

  } catch (error) {

    console.error(
      "Integrated optimization error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Integrated optimization failed.",

      error:
        error.message,
    });
  }
}

module.exports = {
  runIntegratedOptimization,
};