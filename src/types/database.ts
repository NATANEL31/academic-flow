export type TaskStatus = 'todo' | 'in_progress' | 'submitted';
export type TaskSource = 'moodle' | 'manual';

export interface Course {
  id: string;
  user_id: string;
  moodle_course_code: string;
  name: string;
  credits: number;
  color: string;
  slip_days_total: number;
  slip_days_used: number;
  is_setup_complete: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  course_id: string;
  external_uid: string | null;
  title: string;
  description: string | null;
  due_date: string;
  previous_due_date: string | null;
  source: TaskSource;
  status: TaskStatus;
  weight_percentage: number;
  estimated_hours: number;
  used_slip_days: number;
  notes: string | null;
}