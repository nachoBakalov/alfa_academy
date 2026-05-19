/* eslint-disable no-console */
const { URL } = require('url');

const QA_API_BASE_URL = process.env.QA_API_BASE_URL || 'http://localhost:3001/api';
const QA_FRONTEND_URL = process.env.QA_FRONTEND_URL || 'http://localhost:5173';

const WEEK_1_START = '2026-05-04';
const WEEK_1_END = '2026-05-08';
const WEEK_2_START = '2026-05-11';
const WEEK_2_END = '2026-05-15';
const STARTS_ON = '2026-05-04';

const WEEK_1_DATES = ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08'];
const WEEK_2_DATES = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];
const SOFIA_TIME_ZONE = 'Europe/Sofia';
const API_RETRY_DELAYS_MS = [150, 350, 800];

const TRAINER_PRESETS = [
  {
    key: 'trainer1',
    email: process.env.QA_TRAINER1_EMAIL || 'trainer1@test.bg',
    password: process.env.QA_TRAINER1_PASSWORD || 'trainer1',
    markerPrefix: 'qa.trainer1',
    firstNamePrefix: 'QA Trainer1 Дете',
  },
  {
    key: 'trainer2',
    email: process.env.QA_TRAINER2_EMAIL || 'trainer2@test.bg',
    password: process.env.QA_TRAINER2_PASSWORD || 'trainer2',
    markerPrefix: 'qa.trainer2',
    firstNamePrefix: 'QA Trainer2 Дете',
  },
  {
    key: 'trainer3',
    email: process.env.QA_TRAINER3_EMAIL || 'trainer3@test.bg',
    password: process.env.QA_TRAINER3_PASSWORD || 'trainer3',
    markerPrefix: 'qa.trainer3',
    firstNamePrefix: 'QA Trainer3 Дете',
  },
];

function resolveTrainers() {
  const requested = String(process.env.QA_TRAINERS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (requested.length === 0) {
    return TRAINER_PRESETS;
  }

  const byKey = new Map(TRAINER_PRESETS.map((trainer) => [trainer.key, trainer]));
  const resolved = [];
  const seen = new Set();

  for (const key of requested) {
    const trainer = byKey.get(key);

    if (!trainer) {
      throw new Error(
        `Invalid QA_TRAINERS value \"${key}\". Allowed: ${TRAINER_PRESETS.map((item) => item.key).join(', ')}`
      );
    }

    if (seen.has(key)) {
      continue;
    }

    resolved.push(trainer);
    seen.add(key);
  }

  return resolved;
}

const TRAINERS = resolveTrainers();

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getQaChildIndexFromEmail(email, markerPrefix) {
  if (typeof email !== 'string') {
    return null;
  }

  const pattern = new RegExp(`^${markerPrefix.replace('.', '\\.')}\\.child(\\d{2})@example\\.com$`, 'i');
  const match = email.trim().match(pattern);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) ? parsed : null;
}

function getQaChildIndex(child, markerPrefix) {
  const fromEmail = getQaChildIndexFromEmail(child && child.parentEmail, markerPrefix);

  if (fromEmail !== null) {
    return fromEmail;
  }

  const firstName = child && typeof child.firstName === 'string' ? child.firstName.trim() : '';
  const firstNameMatch = firstName.match(/(\d{2})$/);

  if (!firstNameMatch) {
    return null;
  }

  const parsed = Number(firstNameMatch[1]);
  return Number.isInteger(parsed) ? parsed : null;
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected=${expected}, actual=${actual}`);
  }
}

function assertAtLeast(actual, expectedMin, label) {
  if (actual < expectedMin) {
    throw new Error(`${label}: expected>=${expectedMin}, actual=${actual}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toDateKeyInTimeZone(dateInput, timeZone) {
  const parsed = new Date(dateInput);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(parsed);
}

function matchesChallengeStartDate(startsOnValue, expectedDateKey) {
  const startsOnDatePart = String(startsOnValue || '').slice(0, 10);

  if (startsOnDatePart === expectedDateKey) {
    return true;
  }

  const sofiaDatePart = toDateKeyInTimeZone(startsOnValue, SOFIA_TIME_ZONE);
  return sofiaDatePart === expectedDateKey;
}

async function collectDailyWeeklyDebug(token, groupId, weekDates) {
  const days = [];

  for (const date of weekDates) {
    const daily = await apiRequest(`/social/groups/${groupId}/daily`, {
      token,
      query: { date },
    });

    const children = Array.isArray(daily.children) ? daily.children : [];
    const qaChildren = children.filter((child) =>
      String(child.firstName || '').startsWith('QA Trainer')
    );

    days.push({
      date,
      participantsCount: children.length,
      qaChildrenCount: qaChildren.length,
    });
  }

  return days;
}

async function apiRequest(path, options = {}) {
  const baseUrl = QA_API_BASE_URL.replace(/\/+$/, '');
  const url = new URL(`${baseUrl}${path}`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Accept: 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };

  let response = null;
  let lastFetchError = null;

  for (let attempt = 0; attempt <= API_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      break;
    } catch (error) {
      lastFetchError = error;

      if (attempt === API_RETRY_DELAYS_MS.length) {
        const requestPath = `${options.method || 'GET'} ${path}`;
        const wrapped = new Error(`${requestPath}: ${error.message}`);
        wrapped.path = requestPath;
        wrapped.cause = error;
        throw wrapped;
      }

      await wait(API_RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!response) {
    throw lastFetchError || new Error(`${options.method || 'GET'} ${path}: fetch failed`);
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data && data.message ? data.message : `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    error.path = `${options.method || 'GET'} ${path}`;
    throw error;
  }

  return data || {};
}

async function checkPreconditions() {
  console.log('Precheck: backend health...');
  await apiRequest('/health');
  console.log('Precheck: backend OK');

  console.log('Precheck: frontend availability...');
  const response = await fetch(QA_FRONTEND_URL, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Frontend not reachable at ${QA_FRONTEND_URL} (status ${response.status})`);
  }

  console.log('Precheck: frontend OK');
}

async function loginTrainer(trainer) {
  const login = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      email: trainer.email,
      password: trainer.password,
    },
  });

  assertCondition(Boolean(login.token), `Login failed for ${trainer.email}: missing token`);
  assertCondition(Boolean(login.user), `Login failed for ${trainer.email}: missing user`);
  assertEqual(login.user.role, 'coach', `Login role check for ${trainer.email}`);

  const me = await apiRequest('/auth/me', {
    token: login.token,
  });

  assertCondition(Boolean(me.user), `GET /auth/me failed for ${trainer.email}: missing user`);
  assertEqual(me.user.email, trainer.email, `GET /auth/me email check for ${trainer.email}`);
  assertEqual(me.user.role, 'coach', `GET /auth/me role check for ${trainer.email}`);

  return {
    token: login.token,
    user: me.user,
  };
}

async function resolveTrainerGroup(token, trainerEmail) {
  const workspace = await apiRequest('/coach-workspace/my-groups', { token });

  let group = null;
  let academy = workspace.selectedAcademy || null;

  const academies = Array.isArray(workspace.academies) ? workspace.academies : [];

  for (const academyItem of academies) {
    const groups = Array.isArray(academyItem.groups) ? academyItem.groups : [];

    if (groups.length > 0) {
      group = groups[0];
      academy = {
        id: Number(academyItem.id),
        name: academyItem.name,
      };
      break;
    }
  }

  if (!group) {
    throw new Error(
      `Trainer ${trainerEmail} няма назначена група. Назначете го към академия и група преди QA теста.`
    );
  }

  return {
    academyId: Number(academy.id),
    academyName: academy.name,
    groupId: Number(group.id),
    groupName: group.name,
  };
}

async function checkActiveDays(token, groupId, warnings) {
  const activeDaysResponse = await apiRequest(`/social/groups/${groupId}/active-days`, { token });
  const activeDays = Array.isArray(activeDaysResponse.activeDays)
    ? activeDaysResponse.activeDays
    : [];

  const required = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const activeLabelSet = new Set(
    activeDays.filter((item) => item.isActive).map((item) => item.label)
  );

  const missing = required.filter((day) => !activeLabelSet.has(day));

  if (missing.length > 0) {
    warnings.push(
      `За коректен weekly summary активните дни трябва да са понеделник-петък. Missing: ${missing.join(', ')}`
    );
  }

  return activeDays;
}

async function listChildrenBySearch(token, groupId, search) {
  const rows = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await apiRequest('/children', {
      token,
      query: {
        groupId,
        search,
        limit,
        offset,
      },
    });

    const pageRows = Array.isArray(response.children) ? response.children : [];
    rows.push(...pageRows);

    if (pageRows.length < limit) {
      break;
    }

    offset += limit;
  }

  return rows;
}

function buildChildPayload(trainer, groupId, childIndex) {
  const idPart = pad2(childIndex);
  const isOdd = childIndex % 2 === 1;

  return {
    firstName: `${trainer.firstNamePrefix} ${idPart}`,
    lastName: 'Тестово',
    birthDate: '2017-05-12',
    gender: isOdd ? 'male' : 'female',
    parentName: `QA Родител ${idPart}`,
    parentEmail: `${trainer.markerPrefix}.child${idPart}@example.com`,
    parentPhone: `08880000${idPart}`,
    medicalNotes: '',
    generalNotes: 'QA тестово дете за ръчен тест.',
    groupId,
    startsOn: STARTS_ON,
  };
}

async function ensureQaChildren(token, trainer, groupId) {
  const existing = await listChildrenBySearch(token, groupId, trainer.firstNamePrefix);
  const existingMap = new Map();

  for (const child of existing) {
    const key = `${child.firstName}|${child.parentEmail}`;
    existingMap.set(key, child);
  }

  const children = [];
  let createdCount = 0;
  let reusedCount = 0;

  for (let i = 1; i <= 15; i += 1) {
    const payload = buildChildPayload(trainer, groupId, i);
    const key = `${payload.firstName}|${payload.parentEmail}`;
    const existingChild = existingMap.get(key);

    if (existingChild) {
      children.push(existingChild);
      reusedCount += 1;
      continue;
    }

    const created = await apiRequest('/children', {
      method: 'POST',
      token,
      body: payload,
    });

    assertCondition(Boolean(created.child), `Child create failed for ${payload.parentEmail}`);
    children.push(created.child);
    createdCount += 1;
  }

  children.sort((a, b) => {
    const aIndex = getQaChildIndex(a, trainer.markerPrefix) || 999;
    const bIndex = getQaChildIndex(b, trainer.markerPrefix) || 999;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return String(a.firstName).localeCompare(String(b.firstName), 'bg');
  });

  const dailyScreen = await apiRequest(`/social/groups/${groupId}/daily`, {
    token,
    query: {
      date: STARTS_ON,
    },
  });

  const screenChildIds = new Set((dailyScreen.children || []).map((item) => Number(item.id)));

  for (const child of children) {
    assertCondition(
      screenChildIds.has(Number(child.id)),
      `Child ${child.firstName} is missing on ${STARTS_ON}. startsOn check failed.`
    );
  }

  return {
    children: children.map((child) => ({
      id: Number(child.id),
      firstName: child.firstName,
      lastName: child.lastName,
      parentEmail: child.parentEmail,
    })),
    createdCount,
    reusedCount,
  };
}

async function getGroupParticipantsForDate(token, groupId, date) {
  const screen = await apiRequest(`/social/groups/${groupId}/daily`, {
    token,
    query: { date },
  });

  return Array.isArray(screen.children)
    ? screen.children.map((item) => ({
        id: Number(item.id),
        firstName: item.firstName || '',
        lastName: item.lastName || '',
      }))
    : [];
}

function buildWeek1Evaluations(children) {
  return children.map((child) => ({
    childId: child.id,
    coachRelationColor: 'green',
    childrenRelationColor: 'green',
    rulesColor: 'green',
    optionalComment: 'QA дневна оценка.',
  }));
}

function buildWeek2Evaluations(qaChildren, participants, trainer) {
  const qaById = new Map(qaChildren.map((child) => [Number(child.id), child]));
  const entries = participants.map((participant) => ({
    childId: participant.id,
    source: qaById.has(Number(participant.id)) ? 'qa' : 'other',
    qaIndex: qaById.has(Number(participant.id))
      ? getQaChildIndex(qaById.get(Number(participant.id)), trainer.markerPrefix)
      : null,
  }));

  const orderedQa = entries
    .filter((entry) => entry.source === 'qa' && entry.qaIndex !== null)
    .sort((a, b) => a.qaIndex - b.qaIndex);

  const qaScoreMap = new Map();

  for (const entry of orderedQa) {
    if (entry.qaIndex <= 10) {
      qaScoreMap.set(entry.childId, 1);
    } else if (entry.qaIndex <= 13) {
      qaScoreMap.set(entry.childId, 0);
    } else if (entry.qaIndex <= 15) {
      qaScoreMap.set(entry.childId, -1);
    } else {
      qaScoreMap.set(entry.childId, 0);
    }
  }

  const nonQa = entries.filter((entry) => entry.source === 'other');
  const baseDailyPoints = Array.from(qaScoreMap.values()).reduce((sum, value) => sum + value, 0);
  const participantsCount = entries.length;
  const targetDailyPoints = Math.max(
    baseDailyPoints,
    Math.min(participantsCount - 1, Math.floor(participantsCount * 0.55))
  );

  let neededExtra = targetDailyPoints - baseDailyPoints;
  const nonQaScoreMap = new Map(nonQa.map((entry) => [entry.childId, 0]));

  for (const entry of nonQa) {
    if (neededExtra <= 0) {
      break;
    }

    nonQaScoreMap.set(entry.childId, 1);
    neededExtra -= 1;
  }

  return entries.map((entry) => {
    const score = qaScoreMap.has(entry.childId)
      ? qaScoreMap.get(entry.childId)
      : nonQaScoreMap.get(entry.childId) || 0;

    if (score > 0) {
      return {
        childId: entry.childId,
        coachRelationColor: 'green',
        childrenRelationColor: 'green',
        rulesColor: 'green',
        optionalComment: 'QA дневна оценка.',
      };
    }

    if (score < 0) {
      return {
        childId: entry.childId,
        coachRelationColor: 'red',
        childrenRelationColor: 'red',
        rulesColor: 'red',
        optionalComment: 'QA дневна оценка.',
      };
    }

    return {
      childId: entry.childId,
      coachRelationColor: 'orange',
      childrenRelationColor: 'orange',
      rulesColor: 'orange',
      optionalComment: 'QA дневна оценка.',
    };
  });
}

async function fillSocialForDatesByParticipants(token, groupId, dates, buildEvaluationsForDate) {
  for (const date of dates) {
    const participants = await getGroupParticipantsForDate(token, groupId, date);
    const evaluations = buildEvaluationsForDate(participants);

    await apiRequest(`/social/groups/${groupId}/daily`, {
      method: 'PUT',
      token,
      body: {
        date,
        evaluations,
      },
    });
  }
}

async function recalcAndVerifyWeekly(token, groupId, weekStartDate, expected, warnings, qaChildrenCount) {
  await apiRequest(`/social/groups/${groupId}/weekly/recalculate`, {
    method: 'POST',
    token,
    body: {
      weekStartDate,
    },
  });

  const weekly = await apiRequest(`/social/groups/${groupId}/weekly`, {
    token,
    query: {
      weekStartDate,
    },
  });

  const summary = weekly.summary || {};
  const activeDaysCount = Number(summary.activeDaysCount || 0);

  if (activeDaysCount !== 5) {
    warnings.push(
      `weekStartDate=${weekStartDate}: activeDaysCount=${activeDaysCount}, затова weeklyMaximum може да се различава.`
    );

    return {
      activeDaysCount,
      weeklyAlphaBalls: Number(summary.weeklyAlphaBalls),
      weeklyStatus: summary.weeklyStatus,
      weeklySocialResult: Number(summary.weeklySocialResult),
      weeklyMaximum: Number(summary.weeklyMaximum),
    };
  }

  if (Number(summary.numberOfChildren || 0) !== qaChildrenCount) {
    warnings.push(
      `weekStartDate=${weekStartDate}: group participants=${summary.numberOfChildren}, QA children=${qaChildrenCount}.`
    );
  }

  try {
    assertEqual(Number(summary.weeklyAlphaBalls), expected.alphaBalls, `Social alpha balls for ${weekStartDate}`);
    assertEqual(summary.weeklyStatus, expected.status, `Social weekly status for ${weekStartDate}`);

    if (activeDaysCount === 5 && Number(summary.numberOfChildren || 0) === qaChildrenCount) {
      assertEqual(Number(summary.weeklySocialResult), expected.weeklySocialResult, `Social weekly result for ${weekStartDate}`);
      assertEqual(Number(summary.weeklyMaximum), expected.weeklyMaximum, `Social weekly maximum for ${weekStartDate}`);
    }
  } catch (error) {
    const weekDates =
      weekStartDate === WEEK_1_START
        ? WEEK_1_DATES
        : weekStartDate === WEEK_2_START
        ? WEEK_2_DATES
        : [];

    const dailyDebug = weekDates.length > 0 ? await collectDailyWeeklyDebug(token, groupId, weekDates) : [];
    const debugInfo = {
      expected,
      summary: {
        weeklyAlphaBalls: Number(summary.weeklyAlphaBalls),
        weeklyStatus: summary.weeklyStatus,
        weeklySocialResult: Number(summary.weeklySocialResult),
        weeklyMaximum: Number(summary.weeklyMaximum),
        activeDaysCount,
        numberOfChildren: Number(summary.numberOfChildren || 0),
      },
      dailyDebug,
    };

    throw new Error(`${error.message}; debug=${JSON.stringify(debugInfo)}`);
  }

  return {
    activeDaysCount,
    weeklyAlphaBalls: Number(summary.weeklyAlphaBalls),
    weeklyStatus: summary.weeklyStatus,
    weeklySocialResult: Number(summary.weeklySocialResult),
    weeklyMaximum: Number(summary.weeklyMaximum),
  };
}

async function resolveSportsDefinition(token) {
  const response = await apiRequest('/sports/definitions', {
    token,
    query: {
      isActive: true,
    },
  });

  const definitions = Array.isArray(response.definitions) ? response.definitions : [];
  assertCondition(definitions.length > 0, 'Няма активни sports definitions.');

  const longJump = definitions.find((item) => item.code === 'long_jump');

  if (longJump) {
    return longJump;
  }

  const higherIsBetter = definitions.find((item) => item.resultDirection === 'higher_is_better');

  assertCondition(
    Boolean(higherIsBetter),
    'Няма активна definition с resultDirection=higher_is_better.'
  );

  return higherIsBetter;
}

async function listAllGroupChallenges(token, groupId) {
  const rows = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await apiRequest(`/sports/groups/${groupId}/challenges`, {
      token,
      query: { limit, offset },
    });

    const pageRows = Array.isArray(response.challenges) ? response.challenges : [];
    rows.push(...pageRows);

    if (pageRows.length < limit) {
      break;
    }

    offset += limit;
  }

  return rows;
}

async function ensureChallenge(token, groupId, definition, data) {
  try {
    const created = await apiRequest(`/sports/groups/${groupId}/challenges`, {
      method: 'POST',
      token,
      body: {
        definitionCode: definition.code,
        title: data.title,
        startsOn: data.startsOn,
        endsOn: data.endsOn,
        targetReductionPercent: 0.1,
        failSafeThresholdPercent: 0.5,
      },
    });

    return {
      challenge: created.challenge,
      reused: false,
    };
  } catch (error) {
    if (error.status !== 409) {
      throw error;
    }

    const duplicateMessage = String(error.message || '').toLowerCase();

    if (!duplicateMessage.includes('already exists')) {
      throw error;
    }

    const all = await listAllGroupChallenges(token, groupId);
    const reused = all.find(
      (item) =>
        item.definition &&
        item.definition.code === definition.code &&
        matchesChallengeStartDate(item.startsOn, data.startsOn)
    );

    assertCondition(
      Boolean(reused),
      `Challenge duplicate returned 409 but no reusable challenge found for ${data.startsOn}`
    );

    return {
      challenge: reused,
      reused: true,
    };
  }
}

function buildSportsResults(children, mode) {
  return children.map((child, index) => {
    const childIndex = index + 1;
    const baselineValue = 100 + childIndex;
    const finalValue = mode === 'week1' ? baselineValue + 5 : baselineValue - 30;

    return {
      childId: child.id,
      baselineValue,
      finalValue,
      notes: 'QA спортен резултат.',
    };
  });
}

async function saveAndVerifyChallengeByChildren(token, challengeId, children, mode, warnings) {
  const challengeDetailsBefore = await apiRequest(`/sports/challenges/${challengeId}`, { token });
  const participants = Array.isArray(challengeDetailsBefore.challenge && challengeDetailsBefore.challenge.results)
    ? challengeDetailsBefore.challenge.results.map((item) => item.child)
    : [];

  if (participants.length !== children.length) {
    warnings.push(
      `sports challengeId=${challengeId}: participants=${participants.length}, QA children=${children.length}.`
    );
  }

  const resultChildren = participants.length > 0 ? participants : children;

  await apiRequest(`/sports/challenges/${challengeId}/results`, {
    method: 'PUT',
    token,
    body: {
      results: buildSportsResults(resultChildren, mode),
    },
  });

  await apiRequest(`/sports/challenges/${challengeId}/recalculate`, {
    method: 'POST',
    token,
  });

  const details = await apiRequest(`/sports/challenges/${challengeId}`, { token });
  const summary = details.challenge && details.challenge.summary ? details.challenge.summary : null;

  assertCondition(Boolean(summary), `Missing challenge summary for challengeId=${challengeId}`);

  assertAtLeast(Number(summary.participantsCount), 15, `Sports participantsCount challenge=${challengeId}`);

  if (Number(summary.participantsCount) === 15) {
    assertEqual(Number(summary.finalResultsCount), 15, `Sports finalResultsCount challenge=${challengeId}`);
  } else {
    assertEqual(
      Number(summary.finalResultsCount),
      Number(summary.participantsCount),
      `Sports finalResultsCount challenge=${challengeId}`
    );
  }

  if (mode === 'week1') {
    assertEqual(summary.finalStatus, 'passed', `Sports finalStatus week1 challenge=${challengeId}`);
    assertEqual(
      Number(summary.repeatedOrImprovedCount),
      Number(summary.participantsCount),
      `Sports repeatedOrImprovedCount week1 challenge=${challengeId}`
    );
    assertEqual(Boolean(summary.groupTargetReached), true, `Sports groupTargetReached week1 challenge=${challengeId}`);
    assertEqual(Boolean(summary.failSafeReached), true, `Sports failSafeReached week1 challenge=${challengeId}`);
  } else {
    assertEqual(summary.finalStatus, 'not_passed', `Sports finalStatus week2 challenge=${challengeId}`);
    assertEqual(Number(summary.repeatedOrImprovedCount), 0, `Sports repeatedOrImprovedCount week2 challenge=${challengeId}`);
    assertEqual(Boolean(summary.groupTargetReached), false, `Sports groupTargetReached week2 challenge=${challengeId}`);
    assertEqual(Boolean(summary.failSafeReached), false, `Sports failSafeReached week2 challenge=${challengeId}`);
  }

  return {
    participantsCount: Number(summary.participantsCount),
    finalResultsCount: Number(summary.finalResultsCount),
    finalStatus: summary.finalStatus,
    repeatedOrImprovedCount: Number(summary.repeatedOrImprovedCount),
    groupTargetReached: Boolean(summary.groupTargetReached),
    failSafeReached: Boolean(summary.failSafeReached),
  };
}

async function verifyReports(token, groupId, challengeIds, markerPrefix) {
  const week1 = await apiRequest(`/reports/groups/${groupId}/dashboard`, {
    token,
    query: {
      weekStartDate: WEEK_1_START,
    },
  });

  const week2 = await apiRequest(`/reports/groups/${groupId}/dashboard`, {
    token,
    query: {
      weekStartDate: WEEK_2_START,
    },
  });

  const groupDashboardWeek1 = week1.groupDashboard;
  const groupDashboardWeek2 = week2.groupDashboard;

  assertCondition(Boolean(groupDashboardWeek1), 'Missing groupDashboard for reports week 1');
  assertCondition(Boolean(groupDashboardWeek2), 'Missing groupDashboard for reports week 2');

  assertAtLeast(Number(groupDashboardWeek1.children.activeChildren || 0), 15, 'Reports week1 active children');

  assertEqual(Boolean(groupDashboardWeek1.social.hasWeeklySummary), true, 'Reports week1 social.hasWeeklySummary');
  assertEqual(Number(groupDashboardWeek1.social.weeklyAlphaBalls), 10, 'Reports week1 social.weeklyAlphaBalls');
  assertEqual(groupDashboardWeek1.social.weeklyStatus, 'target_reached', 'Reports week1 social.weeklyStatus');

  assertEqual(Boolean(groupDashboardWeek2.social.hasWeeklySummary), true, 'Reports week2 social.hasWeeklySummary');
  assertEqual(Number(groupDashboardWeek2.social.weeklyAlphaBalls), 5, 'Reports week2 social.weeklyAlphaBalls');
  assertEqual(groupDashboardWeek2.social.weeklyStatus, 'target_not_reached', 'Reports week2 social.weeklyStatus');

  const latestChallenges = Array.isArray(groupDashboardWeek1.sports.latestChallenges)
    ? groupDashboardWeek1.sports.latestChallenges
    : [];
  const latestChallengeIds = new Set(latestChallenges.map((item) => Number(item.id)));

  const hasAtLeastOneQaChallenge = challengeIds.some((id) => latestChallengeIds.has(Number(id)));
  assertCondition(
    hasAtLeastOneQaChallenge || Number(groupDashboardWeek1.sports.activeChallenges || 0) > 0,
    'Reports week1 sports summary does not include expected QA challenge/activity'
  );

  const childrenOverview = await apiRequest(`/reports/groups/${groupId}/children-overview`, {
    token,
    query: {
      search: markerPrefix.replace('.', ' '),
      limit: 100,
      offset: 0,
    },
  });

  const overviewChildren = Array.isArray(childrenOverview.children) ? childrenOverview.children : [];
  const qaChildren = overviewChildren.filter((child) =>
    String(child.firstName || '').startsWith('QA Trainer')
  );

  assertAtLeast(qaChildren.length, 15, 'Reports children-overview QA children count');

  for (const child of qaChildren) {
    assertCondition(!Object.prototype.hasOwnProperty.call(child, 'parentEmail'), 'children-overview leaks parentEmail');
    assertCondition(!Object.prototype.hasOwnProperty.call(child, 'parentPhone'), 'children-overview leaks parentPhone');
    assertCondition(!Object.prototype.hasOwnProperty.call(child, 'medicalNotes'), 'children-overview leaks medicalNotes');
  }

  const dashboardWeek1 = await apiRequest('/reports/dashboard', {
    token,
    query: {
      groupId,
      weekStartDate: WEEK_1_START,
    },
  });

  const dashboardWeek2 = await apiRequest('/reports/dashboard', {
    token,
    query: {
      groupId,
      weekStartDate: WEEK_2_START,
    },
  });

  assertCondition(Boolean(dashboardWeek1.dashboard), 'Missing global dashboard week1');
  assertCondition(Boolean(dashboardWeek2.dashboard), 'Missing global dashboard week2');

  assertAtLeast(Number(dashboardWeek1.dashboard.counts.activeChildren || 0), 15, 'Global dashboard week1 activeChildren');
  assertAtLeast(Number(dashboardWeek1.dashboard.counts.activeGroups || 0), 1, 'Global dashboard week1 activeGroups');

  return {
    week1: {
      hasWeeklySummary: Boolean(groupDashboardWeek1.social.hasWeeklySummary),
      weeklyAlphaBalls: Number(groupDashboardWeek1.social.weeklyAlphaBalls),
      weeklyStatus: groupDashboardWeek1.social.weeklyStatus,
    },
    week2: {
      hasWeeklySummary: Boolean(groupDashboardWeek2.social.hasWeeklySummary),
      weeklyAlphaBalls: Number(groupDashboardWeek2.social.weeklyAlphaBalls),
      weeklyStatus: groupDashboardWeek2.social.weeklyStatus,
    },
  };
}

async function runTrainerQa(trainer) {
  const warnings = [];

  console.log(`\n=== Trainer QA start: ${trainer.email} ===`);

  const session = await loginTrainer(trainer);
  const workspace = await resolveTrainerGroup(session.token, trainer.email);
  await checkActiveDays(session.token, workspace.groupId, warnings);

  const childrenResult = await ensureQaChildren(session.token, trainer, workspace.groupId);
  const children = childrenResult.children;
  assertEqual(children.length, 15, `${trainer.email} children count`);

  const participants = await getGroupParticipantsForDate(session.token, workspace.groupId, STARTS_ON);
  assertAtLeast(participants.length, 15, `${trainer.email} participants on ${STARTS_ON}`);

  if (participants.length !== 15) {
    warnings.push(
      `Group ${workspace.groupName} има ${participants.length} активни деца за ${STARTS_ON} (очаквани QA=15).`
    );
  }

  await fillSocialForDatesByParticipants(session.token, workspace.groupId, WEEK_1_DATES, (dayParticipants) =>
    buildWeek1Evaluations(dayParticipants)
  );

  await fillSocialForDatesByParticipants(session.token, workspace.groupId, WEEK_2_DATES, (dayParticipants) =>
    buildWeek2Evaluations(children, dayParticipants, trainer)
  );

  const socialWeek1 = await recalcAndVerifyWeekly(
    session.token,
    workspace.groupId,
    WEEK_1_START,
    {
      alphaBalls: 10,
      status: 'target_reached',
      weeklySocialResult: 75,
      weeklyMaximum: 75,
    },
    warnings,
    children.length
  );

  const socialWeek2 = await recalcAndVerifyWeekly(
    session.token,
    workspace.groupId,
    WEEK_2_START,
    {
      alphaBalls: 5,
      status: 'target_not_reached',
      weeklySocialResult: 40,
      weeklyMaximum: 75,
    },
    warnings,
    children.length
  );

  const definition = await resolveSportsDefinition(session.token);

  const challengeWeek1 = await ensureChallenge(session.token, workspace.groupId, definition, {
    title: `QA Дълъг скок - седмица 1 - ${workspace.groupName}`,
    startsOn: WEEK_1_START,
    endsOn: WEEK_1_END,
  });

  const challengeWeek2 = await ensureChallenge(session.token, workspace.groupId, definition, {
    title: `QA Дълъг скок - седмица 2 - ${workspace.groupName}`,
    startsOn: WEEK_2_START,
    endsOn: WEEK_2_END,
  });

  const sportsWeek1 = await saveAndVerifyChallengeByChildren(
    session.token,
    Number(challengeWeek1.challenge.id),
    children,
    'week1',
    warnings
  );

  const sportsWeek2 = await saveAndVerifyChallengeByChildren(
    session.token,
    Number(challengeWeek2.challenge.id),
    children,
    'week2',
    warnings
  );

  const reports = await verifyReports(
    session.token,
    workspace.groupId,
    [Number(challengeWeek1.challenge.id), Number(challengeWeek2.challenge.id)],
    trainer.markerPrefix
  );

  return {
    trainerEmail: trainer.email,
    academyName: workspace.academyName,
    groupName: workspace.groupName,
    groupId: workspace.groupId,
    childrenCreated: childrenResult.createdCount,
    childrenReused: childrenResult.reusedCount,
    childrenTotal: children.length,
    socialWeek1,
    socialWeek2,
    sportsWeek1,
    sportsWeek2,
    reports,
    warnings,
  };
}

function printFinalReport(results) {
  console.log('\nQA completed.\n');

  for (const item of results) {
    if (item.error) {
      console.log(`Trainer: ${item.trainerEmail}`);
      console.log(`Status: FAILED`);
      console.log(`Reason: ${item.error}`);
      console.log('');
      continue;
    }

    console.log(`Trainer: ${item.trainerEmail}`);
    console.log(`Group: ${item.groupName} (academy: ${item.academyName}, groupId: ${item.groupId})`);
    console.log(
      `Children created/reused: ${item.childrenCreated}/${item.childrenReused} (total=${item.childrenTotal})`
    );
    console.log(
      `Social week 1: alphaBalls=${item.socialWeek1.weeklyAlphaBalls}, status=${item.socialWeek1.weeklyStatus}, result=${item.socialWeek1.weeklySocialResult}/${item.socialWeek1.weeklyMaximum}`
    );
    console.log(
      `Social week 2: alphaBalls=${item.socialWeek2.weeklyAlphaBalls}, status=${item.socialWeek2.weeklyStatus}, result=${item.socialWeek2.weeklySocialResult}/${item.socialWeek2.weeklyMaximum}`
    );
    console.log(`Sports week 1: finalStatus=${item.sportsWeek1.finalStatus}`);
    console.log(`Sports week 2: finalStatus=${item.sportsWeek2.finalStatus}`);
    console.log(
      `Reports week 1: alphaBalls=${item.reports.week1.weeklyAlphaBalls}, status=${item.reports.week1.weeklyStatus}`
    );
    console.log(
      `Reports week 2: alphaBalls=${item.reports.week2.weeklyAlphaBalls}, status=${item.reports.week2.weeklyStatus}`
    );

    if (item.warnings.length > 0) {
      console.log('Warnings:');
      for (const warning of item.warnings) {
        console.log(`- ${warning}`);
      }
    }

    console.log('');
  }
}

async function main() {
  const results = [];

  await checkPreconditions();

  for (const trainer of TRAINERS) {
    try {
      const result = await runTrainerQa(trainer);
      results.push(result);
    } catch (error) {
      const message =
        error && error.path
          ? `${error.path}: ${error.message}`
          : error && error.message
          ? error.message
          : String(error);

      results.push({
        trainerEmail: trainer.email,
        error: message,
      });
    }
  }

  printFinalReport(results);

  const failed = results.filter((item) => Boolean(item.error));

  if (failed.length > 0) {
    throw new Error(`${failed.length} trainer QA run(s) failed.`);
  }
}

main().catch((error) => {
  console.error('\nQA script failed.');
  console.error(error.message);
  process.exit(1);
});
