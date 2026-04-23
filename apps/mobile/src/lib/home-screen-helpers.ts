import type { PracticeSessionRecord, ThemeRecord } from "@kotoba-gym/core";

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TIME_OF_DAY_LABELS = [
  { startHour: 5, label: "朝", greeting: "おはようございます" },
  { startHour: 11, label: "昼", greeting: "今日も1本いきましょう" },
  { startHour: 17, label: "夜", greeting: "こんばんは" },
  { startHour: 22, label: "深夜", greeting: "遅い時間の軽い1本" },
] as const;

type EvaluatedSession = PracticeSessionRecord & {
  evaluation: NonNullable<PracticeSessionRecord["evaluation"]>;
};

export type HomeFeed = ReturnType<typeof buildHomeFeed>;

export function buildHomeFeed(params: {
  themes: ThemeRecord[];
  sessions: PracticeSessionRecord[];
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const evaluatedSessions = params.sessions
    .filter(hasEvaluation)
    .sort((a, b) => getSessionTime(b) - getSessionTime(a));
  const latestEvaluatedSession = evaluatedSessions[0] ?? null;
  const latestTheme = params.themes[0] ?? null;
  const todaysRunTheme = latestEvaluatedSession?.theme ?? latestTheme;
  const previousScore = latestEvaluatedSession
    ? getAverageScore(latestEvaluatedSession)
    : null;

  return {
    header: buildHeader(now),
    stats: buildPracticeStats(evaluatedSessions, now),
    todaysRun: todaysRunTheme
      ? {
          theme: todaysRunTheme,
          previousScore,
          targetScore:
            previousScore === null ? null : Math.min(previousScore + 2, 100),
          latestSession: latestEvaluatedSession,
        }
      : null,
    themeRows: buildThemeRows(params.themes, evaluatedSessions),
    shouldShowEmptyState:
      params.themes.length === 0 && params.sessions.length === 0,
    sessionCount: params.sessions.length,
  };
}

function hasEvaluation(
  session: PracticeSessionRecord,
): session is EvaluatedSession {
  return session.evaluation !== null;
}

function buildHeader(now: Date) {
  const weekdayIndex = toMondayWeekdayIndex(now);
  const timeOfDay = getTimeOfDay(now);

  return {
    greeting: timeOfDay.greeting,
    label: `${WEEKDAY_LABELS[weekdayIndex]} · ${timeOfDay.label}`,
  };
}

function buildPracticeStats(sessions: EvaluatedSession[], now: Date) {
  const today = startOfLocalDay(now);
  const yesterday = addDays(today, -1);
  const practicedDays = new Set(
    sessions.map((session) => toDayKey(new Date(getSessionTime(session)))),
  );
  const anchor = practicedDays.has(toDayKey(today))
    ? today
    : practicedDays.has(toDayKey(yesterday))
      ? yesterday
      : today;
  const thisWeekStart = startOfLocalWeek(now);
  const nextWeekStart = addDays(thisWeekStart, 7);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisWeekSessions = sessions.filter((session) =>
    isWithinRange(
      new Date(getSessionTime(session)),
      thisWeekStart,
      nextWeekStart,
    ),
  );
  const lastWeekSessionCount = sessions.filter((session) =>
    isWithinRange(
      new Date(getSessionTime(session)),
      lastWeekStart,
      thisWeekStart,
    ),
  ).length;
  const practicedWeekdays = WEEKDAY_LABELS.map((_, index) =>
    thisWeekSessions.some(
      (session) =>
        toMondayWeekdayIndex(new Date(getSessionTime(session))) === index,
    ),
  );
  const practicedWeekdayCount = practicedWeekdays.filter(Boolean).length;

  return {
    streakDays: countStreakDays(practicedDays, anchor),
    weeklySessionCount: thisWeekSessions.length,
    weekOverWeekDiff: thisWeekSessions.length - lastWeekSessionCount,
    practicedWeekdays,
    practicedWeekdayCount,
    daysUntilWeeklyGoal: Math.max(7 - practicedWeekdayCount, 0),
  };
}

function buildThemeRows(themes: ThemeRecord[], sessions: EvaluatedSession[]) {
  return themes.map((theme) => {
    const latestSession =
      sessions.find((session) => session.theme.id === theme.id) ?? null;
    const previousScore = latestSession ? getAverageScore(latestSession) : null;

    return {
      theme,
      previousScore,
      lastPracticedAt: latestSession
        ? new Date(getSessionTime(latestSession)).toISOString()
        : null,
    };
  });
}

export function getAverageScore(session: EvaluatedSession) {
  return Math.round(
    (session.evaluation.scores.reduce((sum, item) => sum + item.score, 0) /
      session.evaluation.scores.length) *
      20,
  );
}

function countStreakDays(practicedDays: Set<string>, anchor: Date) {
  let streak = 0;
  let cursor = anchor;

  while (practicedDays.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getTimeOfDay(now: Date) {
  const hour = now.getHours();
  const matched = [...TIME_OF_DAY_LABELS]
    .reverse()
    .find((item) => hour >= item.startHour);
  return matched ?? TIME_OF_DAY_LABELS[TIME_OF_DAY_LABELS.length - 1];
}

function getSessionTime(session: PracticeSessionRecord) {
  return new Date(session.recordedAt ?? session.updatedAt).getTime();
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date: Date) {
  const day = startOfLocalDay(date);
  return addDays(day, -toMondayWeekdayIndex(day));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDayKey(date: Date) {
  const day = startOfLocalDay(date);
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

function toMondayWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}
