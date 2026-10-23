import type { SupabaseClient } from '@supabase/supabase-js';
import { parseMoodleIcs } from './moodleIcsParser';

const DEFAULT_COURSE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4'
];

export interface SyncSummary {
  newCoursesCount: number;
  syncedTasksCount: number;
  deadlineChanges: Array<{ title: string; oldDate: string; newDate: string }>;
}

export async function syncMoodleCalendar(
  supabase: SupabaseClient,
  userId: string,
  icsUrl: string
): Promise<SyncSummary> {
  const response = await fetch(icsUrl);
  if (!response.ok) {
    throw new Error('לא ניתן למשוך את הנתונים מקישור המודל. ודא שהקישור תקין.');
  }
  const icsText = await response.text();
  const parsedEvents = parseMoodleIcs(icsText);

  const uniqueCourseCodes = Array.from(
    new Set(parsedEvents.map((e) => e.courseCode))
  );

  const { data: existingCourses, error: coursesFetchErr } = await supabase
    .from('courses')
    .select('id, moodle_course_code')
    .eq('user_id', userId);

  if (coursesFetchErr) throw coursesFetchErr;

  const existingCodeMap = new Map(
    (existingCourses || []).map((c) => [c.moodle_course_code, c.id])
  );

  let newCoursesCount = 0;

  for (const [index, code] of uniqueCourseCodes.entries()) {
    if (!existingCodeMap.has(code)) {
      const color = DEFAULT_COURSE_COLORS[index % DEFAULT_COURSE_COLORS.length];
      const { data: createdCourse, error: insertCourseErr } = await supabase
        .from('courses')
        .insert({
          user_id: userId,
          moodle_course_code: code,
          name: `קורס ${code}`,
          color,
        })
        .select('id')
        .single();

      if (insertCourseErr) throw insertCourseErr;
      if (createdCourse) {
        existingCodeMap.set(code, createdCourse.id);
        newCoursesCount++;
      }
    }
  }

  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('external_uid, due_date, title')
    .eq('user_id', userId)
    .not('external_uid', 'is', null);

  const existingTasksMap = new Map(
    (existingTasks || []).map((t) => [t.external_uid, t])
  );

  const deadlineChanges: SyncSummary['deadlineChanges'] = [];

  const tasksToUpsert = parsedEvents.map((event) => {
    const existingTask = existingTasksMap.get(event.externalUid);
    const newDueDateIso = event.dueDate.toISOString();
    let previousDueDate: string | undefined = undefined;

    if (existingTask) {
      const oldTime = new Date(existingTask.due_date).getTime();
      const newTime = event.dueDate.getTime();
      if (oldTime !== newTime) {
        previousDueDate = existingTask.due_date;
        deadlineChanges.push({
          title: existingTask.title,
          oldDate: existingTask.due_date,
          newDate: newDueDateIso,
        });
      }
    }

    return {
      user_id: userId,
      course_id: existingCodeMap.get(event.courseCode)!,
      external_uid: event.externalUid,
      title: event.cleanTitle,
      description: event.description,
      due_date: newDueDateIso,
      ...(previousDueDate ? { previous_due_date: previousDueDate } : {}),
      source: 'moodle' as const,
      updated_at: new Date().toISOString(),
    };
  });

  if (tasksToUpsert.length > 0) {
    const { error: upsertErr } = await supabase
      .from('tasks')
      .upsert(tasksToUpsert, {
        onConflict: 'user_id,external_uid',
        ignoreDuplicates: false,
      });

    if (upsertErr) throw upsertErr;
  }

  await supabase
    .from('profiles')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', userId);

  return {
    newCoursesCount,
    syncedTasksCount: tasksToUpsert.length,
    deadlineChanges,
  };
}