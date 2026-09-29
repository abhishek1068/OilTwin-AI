const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const round = (value, decimals = 2) =>
  Number(Number(value).toFixed(decimals));

const DEFAULTS = {
  referenceTemperatureC: 47,
  referenceViscosityCp: 4200,
  viscosityTemperatureConstant: 4500,

  steamHeatMjPerTon: 2100,
  heatTransferEfficiency: 0.12,
  effectiveThermalCapacityMjPerC: 4500,

  injectionCoolingCPerDay: 0.35,
  soakCoolingCPerDay: 0.65,
  productionCoolingCPerDay: 0.35,

  minimumInjectionDays: 1,
  maximumInjectionDays: 5,

  minimumSoakDays: 2,
  maximumSoakDays: 7,

  maximumProductionDays: 120,

  productionDeclineFactor: 0.012,
  mobilityExponent: 0.55,

  defaultProductionCutoffBopd: 60,
};

const estimateViscosity = ({
  temperatureC,
  apiGravity,
  referenceTemperatureC =
    DEFAULTS.referenceTemperatureC,
  referenceViscosityCp =
    DEFAULTS.referenceViscosityCp,
}) => {
  const temperature = clamp(
    Number(temperatureC),
    20,
    180
  );

  const api = clamp(
    Number(apiGravity),
    10,
    30
  );

  const apiAdjustment =
    Math.exp((18 - api) * 0.08);

  const adjustedReferenceViscosity =
    referenceViscosityCp *
    apiAdjustment;

  const temperatureFactor =
    Math.exp(
      DEFAULTS.viscosityTemperatureConstant *
        (
          1 / (temperature + 273.15) -
          1 /
            (referenceTemperatureC +
              273.15)
        )
    );

  return Math.max(
    1,
    adjustedReferenceViscosity *
      temperatureFactor
  );
};

const calculateSteamHeat = ({
  totalSteamTons,
  steamTemperatureC,
  steamQuality,
}) => {
  const quality = clamp(
    Number(steamQuality),
    0.3,
    1
  );

  const temperature = clamp(
    Number(steamTemperatureC),
    150,
    350
  );

  const temperatureFactor = clamp(
    0.9 +
      ((temperature - 200) / 100) *
        0.1,
    0.9,
    1.05
  );

  return (
    totalSteamTons *
    DEFAULTS.steamHeatMjPerTon *
    quality *
    temperatureFactor *
    DEFAULTS.heatTransferEfficiency
  );
};

const calculatePressureFactor = ({
  reservoirPressureBar,
  injectionPressureBar,
}) => {
  const reservoirPressure =
    Math.max(
      1,
      Number(reservoirPressureBar)
    );

  const injectionPressure =
    Math.max(
      0,
      Number(injectionPressureBar)
    );

  const referencePressure =
    reservoirPressure * 0.15;

  const pressureSupport =
    (injectionPressure -
      referencePressure) /
    20;

  return clamp(
    1 +
      pressureSupport * 0.08,
    0.95,
    1.08
  );
};

const simulateProduction = ({
  startTemperatureC,
  peakProductionBopd,
  finalViscosityCp,
  apiGravity,
  productionCutoffBopd,
  maxProductionDays =
    DEFAULTS.maximumProductionDays,
}) => {
  const productionCutoff =
    Math.max(
      1,
      Number(productionCutoffBopd)
    );

  const dailyProfile = [];

  let temperature =
    Number(startTemperatureC);

  let production =
    Number(peakProductionBopd);

  for (
    let day = 1;
    day <= maxProductionDays;
    day++
  ) {
    temperature = Math.max(
      30,
      temperature -
        DEFAULTS.productionCoolingCPerDay
    );

    const viscosity =
      estimateViscosity({
        temperatureC:
          temperature,
        apiGravity,
      });

    const viscosityMobilityFactor =
      clamp(
        Math.pow(
          finalViscosityCp /
            Math.max(
              viscosity,
              1
            ),
          0.35
        ),
        0.35,
        1.2
      );

    const naturalDecline =
      Math.exp(
        -DEFAULTS.productionDeclineFactor *
          day
      );

    production =
      peakProductionBopd *
      viscosityMobilityFactor *
      naturalDecline;

    production =
      Math.max(
        0,
        production
      );

    dailyProfile.push({
      day,
      temperatureC:
        round(
          temperature,
          2
        ),
      viscosityCp:
        round(
          viscosity,
          2
        ),
      productionBopd:
        round(
          production,
          2
        ),
    });

    if (
      production <=
      productionCutoff
    ) {
      break;
    }
  }

  return {
    productionDays:
      dailyProfile.length,

    cumulativeProductionBbl:
      dailyProfile.reduce(
        (sum, item) =>
          sum +
          item.productionBopd,
        0
      ),

    cutoffReached:
      dailyProfile.length <
      maxProductionDays,

    dailyProfile,
  };
};

const simulateCSSCycle = ({
  oilTemperatureC,
  reservoirPressureBar,
  apiGravity,
  currentOilProductionBopd,
  steamTemperatureC,
  steamQuality,
  steamInjectionRateTpd,
  injectionDays,
  injectionPressureBar,
  soakDays,
  productionCutoffBopd =
    DEFAULTS.defaultProductionCutoffBopd,
}) => {
  const initialTemperature =
    Number(oilTemperatureC);

  const currentProduction =
    Number(
      currentOilProductionBopd
    );

  const steamRate =
    Number(
      steamInjectionRateTpd
    );

  const injectionDuration =
    Number(injectionDays);

  const soakDuration =
    Number(soakDays);

  const totalSteamTons =
    steamRate *
    injectionDuration;

  const initialViscosity =
    estimateViscosity({
      temperatureC:
        initialTemperature,
      apiGravity,
    });

  const usefulSteamHeatMj =
    calculateSteamHeat({
      totalSteamTons,
      steamTemperatureC,
      steamQuality,
    });

  const temperatureRise =
    usefulSteamHeatMj /
    DEFAULTS.effectiveThermalCapacityMjPerC;

  const injectionCooling =
    DEFAULTS.injectionCoolingCPerDay *
    injectionDuration;

  const temperatureAfterInjection =
    initialTemperature +
    temperatureRise -
    injectionCooling;

  const soakCooling =
    DEFAULTS.soakCoolingCPerDay *
    soakDuration;

  const temperatureAtPumpRestart =
    Math.max(
      30,
      temperatureAfterInjection -
        soakCooling
    );

  const viscosityAfterInjection =
    estimateViscosity({
      temperatureC:
        temperatureAfterInjection,
      apiGravity,
    });

  const viscosityAtPumpRestart =
    estimateViscosity({
      temperatureC:
        temperatureAtPumpRestart,
      apiGravity,
    });

  const mobilityGain =
    clamp(
      Math.pow(
        initialViscosity /
          Math.max(
            viscosityAtPumpRestart,
            1
          ),
        DEFAULTS.mobilityExponent
      ),
      0.5,
      2.5
    );

  const thermalGain =
    1 +
    Math.max(
      0,
      temperatureAtPumpRestart -
        initialTemperature
    ) *
      0.012;

  const pressureFactor =
    calculatePressureFactor({
      reservoirPressureBar,
      injectionPressureBar,
    });

  let predictedPeakProduction =
    currentProduction *
    mobilityGain *
    thermalGain *
    pressureFactor;

  predictedPeakProduction =
    clamp(
      predictedPeakProduction,
      currentProduction * 0.8,
      currentProduction * 2.5
    );

  const productionSimulation =
    simulateProduction({
      startTemperatureC:
        temperatureAtPumpRestart,

      peakProductionBopd:
        predictedPeakProduction,

      finalViscosityCp:
        viscosityAtPumpRestart,

      apiGravity,

      productionCutoffBopd,
    });

  const injectionSoakHours =
    (injectionDuration +
      soakDuration) *
    24;

  const productionDays =
    productionSimulation.productionDays;

  const estimatedSOR =
    productionSimulation
      .cumulativeProductionBbl >
    0
      ? totalSteamTons /
        productionSimulation
          .cumulativeProductionBbl
      : 999;

  return {
    thermalState: {
      initialTemperatureC:
        round(
          initialTemperature,
          2
        ),

      temperatureAfterInjectionC:
        round(
          temperatureAfterInjection,
          2
        ),

      temperatureAtPumpRestartC:
        round(
          temperatureAtPumpRestart,
          2
        ),

      temperatureGainC:
        round(
          temperatureAtPumpRestart -
            initialTemperature,
          2
        ),

      initialViscosityCp:
        round(
          initialViscosity,
          2
        ),

      viscosityAfterInjectionCp:
        round(
          viscosityAfterInjection,
          2
        ),

      viscosityAtPumpRestartCp:
        round(
          viscosityAtPumpRestart,
          2
        ),
    },

    steam: {
      steamInjectionRateTpd:
        round(
          steamRate,
          2
        ),

      totalSteamTons:
        round(
          totalSteamTons,
          2
        ),

      injectionDurationDays:
        injectionDuration,

      injectionDurationHours:
        injectionDuration * 24,

      injectionPressureBar:
        round(
          injectionPressureBar,
          2
        ),

      usefulHeatMj:
        round(
          usefulSteamHeatMj,
          2
        ),
    },

    schedule: {
      pumpOffAt:
        "Start of steam injection",

      pumpOffDuring:
        "Steam injection and soak",

      pumpRestartAfterHours:
        injectionSoakHours,

      pumpRestartAfterDays:
        injectionDuration +
        soakDuration,

      productionDurationDays:
        productionDays,

      nextCyclePumpOffAfterHours:
        injectionSoakHours +
        productionDays * 24,
    },

    production: {
      predictedPeakProductionBopd:
        round(
          predictedPeakProduction,
          2
        ),

      productionIncreaseBopd:
        round(
          predictedPeakProduction -
            currentProduction,
          2
        ),

      productionIncreasePercent:
        round(
          (
            (
              predictedPeakProduction -
              currentProduction
            ) /
            currentProduction
          ) *
            100,
          2
        ),

      cumulativeProductionBbl:
        round(
          productionSimulation
            .cumulativeProductionBbl,
          2
        ),

      productionCutoffBopd:
        round(
          productionCutoffBopd,
          2
        ),

      cutoffReached:
        productionSimulation
          .cutoffReached,

      estimatedSOR:
        round(
          estimatedSOR,
          3
        ),
    },

    timeline:
      productionSimulation.dailyProfile,
  };
};

const calculateCandidateScore = ({
  simulation,
  currentOilProductionBopd,
}) => {
  const baselineProduction =
    currentOilProductionBopd *
    simulation.schedule
      .productionDurationDays;

  const incrementalProduction =
    Math.max(
      0,
      simulation.production
        .cumulativeProductionBbl -
        baselineProduction
    );

  const steamPenalty =
    simulation.steam
      .totalSteamTons *
    0.35;

  const sorPenalty =
    Math.max(
      0,
      simulation.production
        .estimatedSOR -
        3
    ) *
    25;

  const temperatureBonus =
    Math.max(
      0,
      simulation.thermalState
        .temperatureGainC
    ) *
    8;

  return (
    incrementalProduction +
    temperatureBonus -
    steamPenalty -
    sorPenalty
  );
};

const optimizeCSSSchedule = (
  input
) => {
  const availableSteamRateTpd =
    Math.max(
      1,
      Number(
        input.availableSteamRateTpd
      )
    );

  const currentProductionBopd =
    Math.max(
      1,
      Number(
        input.currentOilProductionBopd
      )
    );

  const minimumRate =
    Math.max(
      5,
      Math.round(
        availableSteamRateTpd *
          0.5
      )
    );

  const maximumRate =
    Math.max(
      minimumRate,
      Math.round(
        availableSteamRateTpd
      )
    );

  const rateStep =
    Math.max(
      1,
      Math.round(
        (
          maximumRate -
          minimumRate
        ) / 5
      )
    );

  const candidateRates = [];

  for (
    let rate = minimumRate;
    rate <= maximumRate;
    rate += rateStep
  ) {
    candidateRates.push(
      rate
    );
  }

  if (
    !candidateRates.includes(
      maximumRate
    )
  ) {
    candidateRates.push(
      maximumRate
    );
  }

  const candidates = [];

  for (
    const steamRate of candidateRates
  ) {
    for (
      let injectionDays = 1;
      injectionDays <= 5;
      injectionDays++
    ) {
      for (
        let soakDays = 2;
        soakDays <= 7;
        soakDays++
      ) {
        const simulation =
          simulateCSSCycle({
            ...input,
            steamInjectionRateTpd:
              steamRate,

            injectionDays,

            soakDays,

            currentOilProductionBopd:
              currentProductionBopd,
          });

        const score =
          calculateCandidateScore({
            simulation,
            currentOilProductionBopd:
              currentProductionBopd,
          });

        candidates.push({
          score,
          simulation,
        });
      }
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const best =
    candidates[0];

  if (!best) {
    throw new Error(
      "Unable to generate CSS schedule."
    );
  }

  const result =
    best.simulation;

  return {
    optimized: true,

    recommendedSchedule: {
      steamInjectionRateTpd:
        result.steam
          .steamInjectionRateTpd,

      totalSteamTons:
        result.steam
          .totalSteamTons,

      injectionDurationDays:
        result.steam
          .injectionDurationDays,

      injectionDurationHours:
        result.steam
          .injectionDurationHours,

      injectionPressureBar:
        result.steam
          .injectionPressureBar,

      soakDays:
        result.schedule
          .pumpRestartAfterDays -
        result.steam
          .injectionDurationDays,

      soakHours:
        (
          result.schedule
            .pumpRestartAfterDays -
          result.steam
            .injectionDurationDays
        ) * 24,

      pumpOffAt:
        result.schedule
          .pumpOffAt,

      pumpRestartAfterHours:
        result.schedule
          .pumpRestartAfterHours,

      pumpRestartAfterDays:
        result.schedule
          .pumpRestartAfterDays,

      productionDurationDays:
        result.schedule
          .productionDurationDays,

      nextCyclePumpOffAfterHours:
        result.schedule
          .nextCyclePumpOffAfterHours,

      productionCutoffBopd:
        result.production
          .productionCutoffBopd,
    },

    thermalState:
      result.thermalState,

    production:
      result.production,

    steam:
      result.steam,

    timeline:
      result.timeline,

    optimization: {
      candidatesEvaluated:
        candidates.length,

      score:
        round(
          best.score,
          2
        ),
    },

    model: {
      type:
        "Physics-informed reduced-order CSS digital twin",

      note:
        "Prototype model requiring field calibration before operational use.",
    },
  };
};

const optimizeCSS = (
  input
) =>
  optimizeCSSSchedule(
    input
  );

module.exports = {
  estimateViscosity,
  simulateCSSCycle,
  optimizeCSSSchedule,
  optimizeCSS,
};