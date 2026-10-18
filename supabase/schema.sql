-- 1. יצירת טיפוסים קבועים (Enums) לשמירה על שלמות הנתונים
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'submitted');
CREATE TYPE task_source AS ENUM ('moodle', 'manual');

-- 2. טבלת פרופיל משתמש והגדרות סנכרון
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  moodle_ics_url TEXT,
  weekly_capacity_hours INTEGER NOT NULL DEFAULT 25, -- סף שעות שבועיות להתרעת עומס
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. טבלת קורסים
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  moodle_course_code TEXT NOT NULL, -- למשל: "202.1.1031" (מגיע משדה CATEGORIES במודל)
  name TEXT NOT NULL,               -- שם קריא שהסטודנט יכול לערוך, למשל: "מבני נתונים"
  credits NUMERIC(3, 1) NOT NULL DEFAULT 3.0, -- נקודות זכות (משפיע על חישוב החשיבות)
  color TEXT NOT NULL DEFAULT '#3B82F6',      -- צבע הקורס בגרפים ובלוח
  slip_days_total INTEGER NOT NULL DEFAULT 0, -- סה"כ ימי חסד (איחור מותר) בסמסטר
  slip_days_used INTEGER NOT NULL DEFAULT 0,  -- כמה ימי חסד נוצלו עד כה
  is_setup_complete BOOLEAN NOT NULL DEFAULT FALSE, -- האם הסטודנט השלים נק"ז ב-Wizard
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- מונע יצירת קורס כפול לאותו משתמש בזמן סנכרון חוזר ממודל
  UNIQUE (user_id, moodle_course_code)
);

-- 4. טבלת משימות ומטלות
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- שדות שמסתנכרנים ממודל
  external_uid TEXT, -- המזהה הייחודי ממודל (למשל "184920@moodle.bgu.ac.il")
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  previous_due_date TIMESTAMPTZ, -- נשמר אוטומטית אם המרצה שינה תאריך הגשה!
  source task_source NOT NULL DEFAULT 'moodle',
  
  -- שדות בניהול הסטודנט (לעולם לא נדרסים בסנכרון!)
  status task_status NOT NULL DEFAULT 'todo',
  weight_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0, -- משקל בציון הסופי (0 עד 100)
  estimated_hours NUMERIC(4, 1) NOT NULL DEFAULT 2.0, -- הערכת שעות עבודה
  used_slip_days INTEGER NOT NULL DEFAULT 0,          -- ימי חסד שהוקצו למטלה זו
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- מונע כפילויות של אותה מטלה ממודל ומאפשר Upsert חכם
  UNIQUE (user_id, external_uid)
);

-- אינדקסים לשליפות מהירות בדשבורד ובגרף העומסים
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_course_id ON tasks(course_id);