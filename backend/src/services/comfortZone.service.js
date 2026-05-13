function calculateStandardComfortZone(score) {
  if (score >= 1 && score <= 4) {
    return 'red';
  }

  if (score >= 5 && score <= 7) {
    return 'yellow';
  }

  return 'green';
}

function calculateTemperamentInterpretation(score) {
  if (score <= 2) {
    return 'По-пасивно поведение';
  }

  if (score <= 5) {
    return 'Спокойно поведение';
  }

  if (score <= 8) {
    return 'Активно поведение';
  }

  return 'Много висока активност / нужда от насочване на енергията';
}

function calculateEmotionalSensitivityInterpretation(score) {
  if (score <= 4) {
    return 'По-широко скроено / не се засяга лесно';
  }

  if (score <= 7) {
    return 'Понякога се засяга според ситуацията';
  }

  return 'По-силна емоционална реактивност / нужда от внимателен подход';
}

function calculateRulesTendencyInterpretation(score) {
  if (score <= 3) {
    return 'Обикновено спазва правилата';
  }

  if (score <= 6) {
    return 'Понякога тества граници и има нужда от напомняне';
  }

  return 'По-често тества правила / има нужда от ясна структура и подкрепа';
}

function calculateActionResult(score, scaleType) {
  if (scaleType === 'standard_comfort') {
    const zone = calculateStandardComfortZone(score);

    let interpretation = null;

    if (zone === 'red') {
      interpretation = 'Извън комфортната зона';
    } else if (zone === 'yellow') {
      interpretation = 'Зона на развитие';
    } else {
      interpretation = 'Комфортна зона';
    }

    return {
      zone,
      interpretation,
    };
  }

  if (scaleType === 'temperament') {
    return {
      zone: 'behavior_indicator',
      interpretation: calculateTemperamentInterpretation(score),
    };
  }

  if (scaleType === 'emotional_sensitivity') {
    return {
      zone: 'behavior_indicator',
      interpretation: calculateEmotionalSensitivityInterpretation(score),
    };
  }

  if (scaleType === 'rules_tendency') {
    return {
      zone: 'behavior_indicator',
      interpretation: calculateRulesTendencyInterpretation(score),
    };
  }

  if (scaleType === 'text_only') {
    return {
      zone: null,
      interpretation: null,
    };
  }

  return {
    zone: 'neutral',
    interpretation: null,
  };
}

module.exports = {
  calculateStandardComfortZone,
  calculateTemperamentInterpretation,
  calculateEmotionalSensitivityInterpretation,
  calculateRulesTendencyInterpretation,
  calculateActionResult,
};
