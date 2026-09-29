const clamp = (
  value,
  min,
  max
) =>
  Math.min(
    Math.max(value, min),
    max
  );

const round = (
  value,
  decimals = 2
) =>
  Number(
    Number(value).toFixed(
      decimals
    )
  );

const calculatePumpCapacity = ({
  strokeLength,
  spm,
  pumpEfficiency,
}) => {
  const stroke =
    Number(strokeLength);

  const speed =
    Number(spm);

  const efficiency =
    Number(pumpEfficiency) /
    100;

  const displacementFactor =
    0.018;

  return (
    stroke *
    speed *
    efficiency *
    displacementFactor *
    100
  );
};

const calculateRodLoadRisk = ({
  rodLoad,
  spm,
  viscosityCp,
  pumpEfficiency,
}) => {
  let riskScore = 0;

  if (rodLoad >= 75) {
    riskScore += 35;
  } else if (rodLoad >= 65) {
    riskScore += 20;
  } else {
    riskScore += 5;
  }

  if (spm >= 6) {
    riskScore += 25;
  } else if (spm >= 5) {
    riskScore += 15;
  }

  if (viscosityCp >= 4000) {
    riskScore += 25;
  } else if (viscosityCp >= 2500) {
    riskScore += 15;
  }

  if (pumpEfficiency < 70) {
    riskScore += 20;
  } else if (pumpEfficiency < 80) {
    riskScore += 10;
  }

  riskScore =
    clamp(
      riskScore,
      0,
      100
    );

  let level =
    "Low";

  if (riskScore >= 70) {
    level = "High";
  } else if (riskScore >= 40) {
    level = "Moderate";
  }

  return {
    score:
      round(
        riskScore,
        1
      ),

    level,
  };
};

const optimizeSRP = ({
  currentSpm,
  currentStrokeLength,
  pumpEfficiency,
  currentRodLoad,
  viscosityCp,
  predictedProductionBopd,
}) => {
  const currentSpeed =
    Number(currentSpm);

  const currentStroke =
    Number(
      currentStrokeLength
    );

  const efficiency =
    Number(pumpEfficiency);

  const rodLoad =
    Number(currentRodLoad);

  const viscosity =
    Number(viscosityCp);

  const targetProduction =
    Number(
      predictedProductionBopd
    );

  let speedFactor = 1;

  if (viscosity >= 4000) {
    speedFactor = 0.75;
  } else if (viscosity >= 2500) {
    speedFactor = 0.9;
  }

  const recommendedSpm =
    clamp(
      currentSpeed *
        speedFactor,
      2.5,
      6
    );

  const recommendedStroke =
    clamp(
      currentStroke *
        (
          efficiency < 75
            ? 0.95
            : 1
        ),
      55,
      80
    );

  const estimatedPumpCapacity =
    calculatePumpCapacity({
      strokeLength:
        recommendedStroke,

      spm:
        recommendedSpm,

      pumpEfficiency:
        efficiency,
    });

  const expectedSurfaceProduction =
    Math.min(
      targetProduction,
      estimatedPumpCapacity
    );

  const risk =
    calculateRodLoadRisk({
      rodLoad,
      spm:
        recommendedSpm,
      viscosityCp:
        viscosity,
      pumpEfficiency:
        efficiency,
    });

  return {
    recommended: {
      spm:
        round(
          recommendedSpm,
          2
        ),

      strokeLength:
        round(
          recommendedStroke,
          2
        ),

      pumpEfficiency:
        round(
          Math.max(
            efficiency,
            70
          ),
          1
        ),
    },

    current: {
      spm:
        round(
          currentSpeed,
          2
        ),

      strokeLength:
        round(
          currentStroke,
          2
        ),

      pumpEfficiency:
        round(
          efficiency,
          1
        ),

      rodLoad:
        round(
          rodLoad,
          1
        ),
    },

    performance: {
      estimatedPumpCapacityBopd:
        round(
          estimatedPumpCapacity,
          2
        ),

      expectedSurfaceProductionBopd:
        round(
          expectedSurfaceProduction,
          2
        ),
    },

    risk,

    recommendation:
      risk.level === "High"
        ? "Reduce pumping intensity and review rod-load conditions."
        : risk.level === "Moderate"
        ? "Operate within the recommended SPM and stroke range."
        : "Predicted conditions support the recommended SRP operating range.",
  };
};

module.exports = {
  optimizeSRP,
};