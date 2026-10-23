import { useState, useEffect } from 'react';
import type { Course } from '../types/database';

const STORAGE_KEY = 'academic_flow_courses_v1';

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
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_DEMO_COURSES;
      }
    }
    return INITIAL_DEMO_COURSES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

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

  const renameCourse = (courseId: string, newName: string) => {
    if (!newName.trim()) return;
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, name: newName.trim() } : course
      )
    );
  };

  const deleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
  };

  const mergeImportedCourses = (
    importedCourses: Course[],
    replaceExisting: boolean = true
  ) => {
    if (replaceExisting) {
      setCourses(importedCourses);
      return;
    }

    setCourses((prev) => {
      const existingMap = new Map(prev.map((c) => [c.moodle_course_code, c]));
      for (const incoming of importedCourses) {
        existingMap.set(incoming.moodle_course_code, incoming);
      }
      return Array.from(existingMap.values());
    });
  };

  const resetCoursesToDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCourses(INITIAL_DEMO_COURSES);
  };

  return {
    courses,
    setCourses,
    useSlipDay,
    renameCourse,
    deleteCourse,
    mergeImportedCourses,
    resetCoursesToDemo,
  };
}