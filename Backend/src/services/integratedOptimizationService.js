const {
  optimizeCSSSchedule,
} = require("./optimizationService");

const {
  optimizeSRP,
} = require("./srpOptimizationService");

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function optimizeIntegratedSchedule(input) {
  const {
    wellId,

    oilTemperatureC,
    reservoirPressureBar,
    apiGravity,
    currentOilProductionBopd,

    steamTemperatureC,
    steamQuality,
    availableSteamRateTpd,
    injectionPressureBar,

    productionCutoffBopd,
    previousCycle,

    currentSpm,
    currentStrokeLength,
    pumpEfficiency,
    currentRodLoad,
  } = input;

  // =========================================================
  // STEP 1 — CSS OPTIMIZATION
  // =========================================================

  const cssResult =
    optimizeCSSSchedule({
      wellId,

      oilTemperatureC,
      reservoirPressureBar,
      apiGravity,
      currentOilProductionBopd,

      steamTemperatureC,
      steamQuality,
      availableSteamRateTpd,
      injectionPressureBar,

      productionCutoffBopd,
      previousCycle,
    });

  // =========================================================
  // STEP 2 — GET POST-CSS CONDITIONS
  // =========================================================

  const restartTemperature =
    cssResult.schedule?.pumpRestartTemperatureC ??
    cssResult.pumpRestartTemperatureC ??
    cssResult.schedule?.estimatedRestartTemperatureC ??
    oilTemperatureC;

  const restartViscosity =
    cssResult.viscosity?.atPumpRestartCp ??
    cssResult.viscosityAtPumpRestartCp ??
    cssResult.schedule?.restartViscosityCp ??
    cssResult.viscosityAfterCycleCp ??
    cssResult.viscosity?.afterCp ??
    0;

  const predictedProduction =
    cssResult.production?.predictedAverageBopd ??
    cssResult.production?.predictedPeakProductionBopd ??
    cssResult.predictedProductionBopd ??
    currentOilProductionBopd;

  // =========================================================
  // STEP 3 — SRP OPTIMIZATION
  // =========================================================

  const srpResult =
    optimizeSRP({
      currentSpm,
      currentStrokeLength,
      pumpEfficiency,
      currentRodLoad,

      viscosityCp:
        restartViscosity > 0
          ? restartViscosity
          : undefined,

      predictedProductionBopd:
        predictedProduction,
    });

  // =========================================================
  // STEP 4 — PRODUCTION IMPROVEMENT
  // =========================================================

  const productionGain =
    (
      (
        predictedProduction -
        currentOilProductionBopd
      ) /
      Math.max(
        currentOilProductionBopd,
        1
      )
    ) * 100;

  // =========================================================
  // STEP 5 — ROD LOAD RISK
  // =========================================================

  const rodRisk =
    srpResult.risk?.score ??
    srpResult.riskScore ??
    0;

  // =========================================================
  // STEP 6 — PUMP EFFICIENCY
  // =========================================================

  const pumpEfficiencyRecommended =
    srpResult.recommended?.pumpEfficiency ??
    srpResult.recommendedPumpEfficiency ??
    pumpEfficiency;

  // =========================================================
  // STEP 7 — ENERGY EFFICIENCY INDEX
  // =========================================================

  const energyIndex =
    clamp(
      100 -
        availableSteamRateTpd * 0.55 -
        rodRisk * 0.25 +
        pumpEfficiencyRecommended * 0.35,
      0,
      100
    );

  // =========================================================
  // STEP 8 — INTEGRATED SCORE
  // =========================================================

  const integratedScore =
    clamp(
      50 +
        productionGain * 1.2 +
        energyIndex * 0.25 -
        rodRisk * 0.35,
      0,
      100
    );

  // =========================================================
  // STEP 9 — EXTRACT SCHEDULE
  // =========================================================

  const cssSchedule =
    cssResult.schedule ||
    cssResult.recommendedSchedule ||
    cssResult;

  const srpSchedule =
    srpResult.recommended ||
    srpResult.schedule ||
    srpResult;

  // =========================================================
  // FINAL INTEGRATED RESULT
  // =========================================================

  return {
    wellId,

    optimizationType:
      "Integrated CSS + SRP Digital Twin",

    currentState: {
      oilTemperatureC,

      reservoirPressureBar,

      apiGravity,

      currentOilProductionBopd,

      currentSpm,

      currentStrokeLength,

      pumpEfficiency,

      currentRodLoad,
    },

    css: cssResult,

    srp: srpResult,

    integratedDecision: {
      injection: {
        steamRateTpd:
          cssSchedule.steamInjectionRateTpd ??
          cssSchedule.steamRateTpd ??
          availableSteamRateTpd,

        totalSteamVolumeTons:
          cssSchedule.totalSteamVolumeTons ??
          cssSchedule.totalSteamTons,

        durationDays:
          cssSchedule.injectionDurationDays ??
          cssSchedule.injectionDays,

        pressureBar:
          cssSchedule.injectionPressureBar ??
          injectionPressureBar,
      },

      soak: {
        durationDays:
          cssSchedule.soakDays ??
          cssSchedule.soakDurationDays,

        pumpRestartAfterHours:
          cssSchedule.pumpRestartAfterHours ??
          (
            (
              cssSchedule.injectionDays || 0
            ) +
            (
              cssSchedule.soakDays || 0
            )
          ) * 24,
      },

      production: {
        predictedBopd:
          Number(
            predictedProduction.toFixed(2)
          ),

        increasePercent:
          Number(
            productionGain.toFixed(2)
          ),

        cutoffBopd:
          cssSchedule.productionCutoffBopd ??
          productionCutoffBopd,

        expectedProductionDays:
          cssSchedule.productionDurationDays ??
          cssSchedule.productionDays,
      },

      srp: {
        recommendedSpm:
          srpSchedule.spm ??
          srpSchedule.recommendedSpm ??
          currentSpm,

        recommendedStrokeLength:
          srpSchedule.strokeLength ??
          srpSchedule.recommendedStrokeLength ??
          currentStrokeLength,

        pumpEfficiency:
          srpSchedule.pumpEfficiency ??
          srpSchedule.recommendedPumpEfficiency ??
          pumpEfficiency,
      },
    },

    performance: {
      predictedProductionBopd:
        Number(
          predictedProduction.toFixed(2)
        ),

      productionIncreasePercent:
        Number(
          productionGain.toFixed(2)
        ),

      integratedOptimizationScore:
        Number(
          integratedScore.toFixed(2)
        ),

      energyEfficiencyIndex:
        Number(
          energyIndex.toFixed(2)
        ),

      rodLoadRiskScore:
        Number(
          rodRisk.toFixed(2)
        ),
    },

    pumpRestart: {
      temperatureC:
        Number(
          restartTemperature.toFixed(2)
        ),

      viscosityCp:
        Number(
          restartViscosity.toFixed(2)
        ),
    },

    explanation: [
      "Reservoir temperature is used to estimate heavy-oil viscosity.",
      "CSS heating is evaluated before SRP operation is optimized.",
      "The SRP recommendation uses the predicted post-CSS production condition.",
      "Steam consumption, production response and rod-load risk are considered together.",
      "The final schedule is a reduced-order digital-twin prototype and requires field calibration before operational use.",
    ],
  };
}

module.exports = {
  optimizeIntegratedSchedule,
};