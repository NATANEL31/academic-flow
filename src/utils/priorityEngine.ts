import { startOfWeek, endOfWeek, format, addWeeks, isWithinInterval } from 'date-fns';
import type { Course, Task } from '../types/database';

export type EisenhowerQuadrant =
  | 'do_first'      // דחוף וחשוב (רביע 1 - לביצוע מיידי)
  | 'schedule'      // חשוב אך לא דחוף (רביע 2 - לתכנון ביומן)
  | 'quick_task'    // דחוף אך פחות חשוב (רביע 3 - לתקתק מהר)
  | 'later';        // לא דחוף ופחות חשוב (רביע 4 - בהמשך)

export interface EnrichedTask extends Task {
  course?: Course;
  daysRemaining: number;
  urgencyScore: number;     // 0 - 100
  importanceScore: number;  // 0 - 100
  priorityScore: number;    // 0 - 100 (הציון המשוקלל)
  quadrant: EisenhowerQuadrant;
  isOverdue: boolean;
}

export interface WeeklyWorkload {
  weekLabel: string;        // למשל: "25/10 - 31/10"
  weekStartIso: string;
  totalEstimatedHours: number;
  capacityHours: number;
  tasksCount: number;
  isCrunchWeek: boolean;    // האם השבוע חורג מקיבולת השעות של הסטודנט
  overloadPercentage: number;
}

/**
 * 1. חישוב מדד הדחיפות (0-100) לפי הזמן שנותר ביחס להערכת שעות העבודה
 */
function calculateUrgency(dueDateIso: string, estimatedHours: number, now: Date = new Date()): {
  urgencyScore: number;
  daysRemaining: number;
  isOverdue: boolean;
} {
  const dueTime = new Date(dueDateIso).getTime();
  const diffHours = (dueTime - now.getTime()) / (1000 * 60 * 60);
  const daysRemaining = Math.ceil(diffHours / 24);
  const isOverdue = diffHours < 0;

  if (isOverdue) {
    return { urgencyScore: 100, daysRemaining, isOverdue: true };
  }

  // ציון בסיס לפי ימים שנותרו (דעיכה מעריכית - ככל שמתקרבים לדד-ליין הדחיפות קופצת)
  let timeScore = 0;
  if (daysRemaining <= 1) timeScore = 95;
  else if (daysRemaining <= 3) timeScore = 80;
  else if (daysRemaining <= 7) timeScore = 60;
  else if (daysRemaining <= 14) timeScore = 35;
  else timeScore = Math.max(10, 30 - (daysRemaining - 14));

  // בונוס לחץ עבודה: אם המטלה דורשת הרבה שעות ביחס לימים שנותרו (למשל יותר מ-3 שעות עבודה ליום)
  const effectiveDays = Math.max(1, daysRemaining);
  const hoursPerDayNeeded = estimatedHours / effectiveDays;
  const effortPressureBonus = Math.min(25, Math.round(hoursPerDayNeeded * 6));

  const urgencyScore = Math.min(100, timeScore + effortPressureBonus);
  return { urgencyScore, daysRemaining, isOverdue: false };
}

/**
 * 2. חישוב מדד החשיבות (0-100) לפי משקל המטלה בציון ונקודות הזכות של הקורס
 */
function calculateImportance(weightPercentage: number, courseCredits: number = 3.0): number {
  // משקל המטלה: מטלה של 15% ומעלה נחשבת למשמעותית מאוד לאורך הסמסטר
  const weightNormalized = Math.min(70, (weightPercentage / 15) * 70);

  // משקל הקורס בתואר: קורס של 5 נק"ז מקבל תעדוף גבוה יותר מקורס של 2 נק"ז
  const creditsNormalized = Math.min(30, (courseCredits / 5) * 30);

  // אם הסטודנט טרם הזין משקל למטלה (0%), נותנים חשיבות בסיסית של 40 כדי שלא תיעלם
  const baseWeightScore = weightPercentage > 0 ? weightNormalized : 25;

  return Math.min(100, Math.round(baseWeightScore + creditsNormalized));
}

/**
 * 3. סיווג המשימה לאחד מ-4 הרביעים של מטריצת אייזנהאואר
 */
function determineQuadrant(urgency: number, importance: number): EisenhowerQuadrant {
  const isUrgent = urgency >= 60;
  const isImportant = importance >= 55;

  if (isUrgent && isImportant) return 'do_first';
  if (!isUrgent && isImportant) return 'schedule';
  if (isUrgent && !isImportant) return 'quick_task';
  return 'later';
}

/**
 * פונקציה ראשית א': מקבלת רשימת משימות וקורסים ומחזירה אותן מדורגות וממוינות לפי עדיפות
 */
export function prioritizeTasks(tasks: Task[], courses: Course[]): EnrichedTask[] {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const now = new Date();

  const enriched = tasks.map((task): EnrichedTask => {
    const course = courseMap.get(task.course_id);
    const { urgencyScore, daysRemaining, isOverdue } = calculateUrgency(
      task.due_date,
      task.estimated_hours,
      now
    );
    const importanceScore = calculateImportance(
      task.weight_percentage,
      course?.credits ?? 3.0
    );

    // ציון עדיפות משוקלל (55% דחיפות, 45% חשיבות)
    const priorityScore =
      task.status === 'submitted'
        ? 0
        : Math.round(urgencyScore * 0.55 + importanceScore * 0.45);

    const quadrant = determineQuadrant(urgencyScore, importanceScore);

    return {
      ...task,
      course,
      daysRemaining,
      urgencyScore,
      importanceScore,
      priorityScore,
      quadrant,
      isOverdue,
    };
  });

  // מיון: משימות פתוחות קודם (מהציון הגבוה לנמוך), ומשימות שהוגשו בסוף
  return enriched.sort((a, b) => {
    if (a.status === 'submitted' && b.status !== 'submitted') return 1;
    if (a.status !== 'submitted' && b.status === 'submitted') return -1;
    return b.priorityScore - a.priorityScore;
  });
}

/**
 * פונקציה ראשית ב': רדאר עומסים שבועי (Crunch-Time Heatmap) ל-6 השבועות הקרובים
 */
export function calculateWeeklyWorkload(
  tasks: Task[],
  weeklyCapacityHours: number = 25,
  weeksAhead: number = 6
): WeeklyWorkload[] {
  const now = new Date();
  const openTasks = tasks.filter((t) => t.status !== 'submitted');
  const weeks: WeeklyWorkload[] = [];

  for (let i = 0; i < weeksAhead; i++) {
    const targetDate = addWeeks(now, i);
    // שבוע אקדמי בישראל מתחיל ביום ראשון (weekStartsOn: 0)
    const start = startOfWeek(targetDate, { weekStartsOn: 0 });
    const end = endOfWeek(targetDate, { weekStartsOn: 0 });

    const tasksInWeek = openTasks.filter((task) => {
      const due = new Date(task.due_date);
      return isWithinInterval(due, { start, end });
    });

    const totalEstimatedHours = tasksInWeek.reduce(
      (sum, task) => sum + Number(task.estimated_hours || 0),
      0
    );

    const overloadPercentage = Math.round(
      (totalEstimatedHours / weeklyCapacityHours) * 100
    );

    weeks.push({
      weekLabel: `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`,
      weekStartIso: start.toISOString(),
      totalEstimatedHours: Number(totalEstimatedHours.toFixed(1)),
      capacityHours: weeklyCapacityHours,
      tasksCount: tasksInWeek.length,
      isCrunchWeek: totalEstimatedHours > weeklyCapacityHours,
      overloadPercentage,
    });
  }

  return weeks;
}