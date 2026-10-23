import { useState } from 'react';
import { addDays } from 'date-fns';
import type { Task, TaskStatus } from '../types/database';
import { parseMoodleIcs } from '../services/moodleIcsParser';

const now = new Date();

export const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'task-1',
    user_id: 'demo-user',
    course_id: 'course-sys',
    external_uid: 'moodle-101@uni.ac.il',
    title: 'עבודה 2: מנוע אלגברה לינארית במקביליות (C++ Thread Pool)',
    description: 'מימוש מנוע חישוב מטריצות מרובה נימים עם ניהול זיכרון בטוח.',
    due_date: addDays(now, 2).toISOString(),
    previous_due_date: null,
    source: 'moodle',
    status: 'in_progress',
    weight_percentage: 12,
    estimated_hours: 14,
    used_slip_days: 0,
    notes: 'נשאר להשלים בדיקות עומס וולגרינד',
  },
  {
    id: 'task-2',
    user_id: 'demo-user',
    course_id: 'course-dl',
    external_uid: 'moodle-102@uni.ac.il',
    title: 'מטלה 3: אימון רשת CNN וניתוח פונקציית הפסד',
    description: 'השוואת ארכיטקטורות ResNet מול אימון מאפס ב-PyTorch.',
    due_date: addDays(now, 5).toISOString(),
    previous_due_date: null,
    source: 'moodle',
    status: 'todo',
    weight_percentage: 10,
    estimated_hours: 12,
    used_slip_days: 0,
    notes: null,
  },
  {
    id: 'task-3',
    user_id: 'demo-user',
    course_id: 'course-nlp',
    external_uid: 'moodle-103@uni.ac.il',
    title: 'בוחן מודל קצר: Word Embeddings & Attention',
    description: 'בוחן אמריקאי קצר במודל על החומר של שבועות 4-5.',
    due_date: addDays(now, 2).toISOString(),
    previous_due_date: null,
    source: 'moodle',
    status: 'todo',
    weight_percentage: 2,
    estimated_hours: 1.5,
    used_slip_days: 0,
    notes: null,
  },
  {
    id: 'task-4',
    user_id: 'demo-user',
    course_id: 'course-algo',
    external_uid: 'moodle-104@uni.ac.il',
    title: 'גיליון תרגיל 4: תכנון דינמי וזרימה ברשתות',
    description: 'הגשה בזוגות בפורמט PDF.',
    due_date: addDays(now, 4).toISOString(),
    previous_due_date: null,
    source: 'moodle',
    status: 'todo',
    weight_percentage: 4,
    estimated_hours: 6,
    used_slip_days: 0,
    notes: null,
  },
  {
    id: 'task-5',
    user_id: 'demo-user',
    course_id: 'course-nlp',
    external_uid: 'moodle-105@uni.ac.il',
    title: 'פרויקט אמצע: Fine-tuning למודל שפה (Transformers)',
    description: 'אימון והערכת מודל סיווג טקסטים כולל דו"ח ניתוח שגיאות.',
    due_date: addDays(now, 12).toISOString(),
    previous_due_date: null,
    source: 'moodle',
    status: 'todo',
    weight_percentage: 18,
    estimated_hours: 16,
    used_slip_days: 0,
    notes: null,
  },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_DEMO_TASKS);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(
    new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  );
  const [syncAlert, setSyncAlert] = useState<string | null>(null);

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const nextStatus: TaskStatus =
          task.status === 'submitted' ? 'todo' : 'submitted';
        return { ...task, status: nextStatus };
      })
    );
  };

  const updateTaskMetrics = (
    taskId: string,
    weight_percentage: number,
    estimated_hours: number
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, weight_percentage, estimated_hours }
          : task
      )
    );
  };

  /**
   * מדמה שאיבת קובץ .ics חי ממודל כדי להציג למגייס איך המפענח עובד בזמן אמת
   */
  const simulateMoodleSync = () => {
    const futureDate = addDays(new Date(), 3);
    const icsDateStr =
      futureDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const sampleMoodleIcs = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:moodle-999@uni.ac.il',
      'SUMMARY:יש להגיש את מטלה 4: מימוש מנגנון Self-Attention מאפס',
      'DESCRIPTION:מטלה חדשה שנפתחה במודל\\nחובה להגיש קובץ קוד ודו"ח PDF',
      'CATEGORIES:202.1.4081',
      `DTEND:${icsDateStr}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const parsed = parseMoodleIcs(sampleMoodleIcs);
    if (parsed.length > 0) {
      const event = parsed[0];
      setTasks((prev) => {
        const exists = prev.some((t) => t.external_uid === event.externalUid);
        if (exists) return prev;
        const newTask: Task = {
          id: `task-${Date.now()}`,
          user_id: 'demo-user',
          course_id: 'course-nlp',
          external_uid: event.externalUid,
          title: event.cleanTitle,
          description: event.description,
          due_date: event.dueDate.toISOString(),
          previous_due_date: null,
          source: 'moodle',
          status: 'todo',
          weight_percentage: 10,
          estimated_hours: 9,
          used_slip_days: 0,
          notes: null,
        };
        return [newTask, ...prev];
      });

      setLastSyncedAt(
        new Date().toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setSyncAlert(
        'סנכרון Moodle הושלם: נשאבה מטלה חדשה בקורס "עיבוד שפה טבעית (NLP)" ושובצה אוטומטית!'
      );
    }
  };

  return {
    tasks,
    lastSyncedAt,
    syncAlert,
    setSyncAlert,
    toggleTaskStatus,
    updateTaskMetrics,
    simulateMoodleSync,
  };
}