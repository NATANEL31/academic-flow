import { useState } from 'react';
import type { Course } from '../types/database';

export const INITIAL_DEMO_COURSES: Course[] = [
  {
    id: 'course-dl',
    user_id: 'demo-user',
    moodle_course_code: '202.1.4051',
    name: 'למידה עמוקה (Deep Learning)',
    credits: 4.0,
    color: '#8B5CF6',
    slip_days_total: 3,
    slip_days_used: 1,
    is_setup_complete: true,
  },
  {
    id: 'course-nlp',
    user_id: 'demo-user',
    moodle_course_code: '202.1.4081',
    name: 'עיבוד שפה טבעית (NLP)',
    credits: 3.5,
    color: '#3B82F6',
    slip_days_total: 2,
    slip_days_used: 0,
    is_setup_complete: true,
  },
  {
    id: 'course-sys',
    user_id: 'demo-user',
    moodle_course_code: '202.1.2031',
    name: 'תכנות מערכות (SPL)',
    credits: 5.0,
    color: '#10B981',
    slip_days_total: 3,
    slip_days_used: 2,
    is_setup_complete: true,
  },
  {
    id: 'course-algo',
    user_id: 'demo-user',
    moodle_course_code: '202.1.3011',
    name: 'אלגוריתמים',
    credits: 4.5,
    color: '#F59E0B',
    slip_days_total: 0,
    slip_days_used: 0,
    is_setup_complete: true,
  },
];

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_DEMO_COURSES);

  const useSlipDay = (courseId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (
          course.id === courseId &&
          course.slip_days_used < course.slip_days_total
        ) {
          return { ...course, slip_days_used: course.slip_days_used + 1 };
        }
        return course;
      })
    );
  };

  return {
    courses,
    setCourses,
    useSlipDay,
  };
}