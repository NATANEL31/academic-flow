import { useState } from 'react';
import {
  X,
  Link2,
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { addDays } from 'date-fns';
import { parseMoodleIcs } from '../services/moodleIcsParser';
import type { ParsedMoodleEvent } from '../services/moodleIcsParser';
import type { Course, Task } from '../types/database';

const COURSE_COLORS = [
  '#6366F1',
  '#EC4899',
  '#10B981',
  '#F59E0B',
  '#06B6D4',
  '#8B5CF6',
];

interface DiscoveredCourseDraft {
  code: string;
  name: string;
  credits: number;
  slipDaysTotal: number;
  color: string;
  tasksCount: number;
  sampleTasks: string[];
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteImport: (
    newCourses: Course[],
    newTasks: Task[],
    replaceExisting: boolean
  ) => void;
}

export function OnboardingWizard({
  isOpen,
  onClose,
  onCompleteImport,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [icsUrl, setIcsUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaceDemoData, setReplaceDemoData] = useState(true);

  const [parsedEvents, setParsedEvents] = useState<ParsedMoodleEvent[]>([]);
  const [courseDrafts, setCourseDrafts] = useState<DiscoveredCourseDraft[]>([]);

  if (!isOpen) return null;

  const processIcsContent = (rawIcsText: string) => {
    const events = parseMoodleIcs(rawIcsText);
    if (events.length === 0) {
      setErrorMsg(
        'לא נמצאו אירועים או מטלות בקובץ. ודא שהקישור או הקובץ הם בפורמט iCalendar (.ics) תקין ממודל.'
      );
      return;
    }

    const groupedByCourse = new Map<string, string[]>();
    for (const ev of events) {
      const list = groupedByCourse.get(ev.courseCode) || [];
      list.push(ev.cleanTitle);
      groupedByCourse.set(ev.courseCode, list);
    }

    const drafts: DiscoveredCourseDraft[] = Array.from(
      groupedByCourse.entries()
    ).map(([code, titles], idx) => ({
      code,
      name: '', // ריק כדי שהסטודנט יקליד שם אמיתי או ישתמש בקוד כברירת מחדל
      credits: 3.5,
      slipDaysTotal: 2,
      color: COURSE_COLORS[idx % COURSE_COLORS.length],
      tasksCount: titles.length,
      sampleTasks: titles.slice(0, 2),
    }));

    setParsedEvents(events);
    setCourseDrafts(drafts);
    setErrorMsg(null);
    setStep(2);
  };

  const handleFetchFromUrl = async () => {
    if (!icsUrl.trim()) {
      setErrorMsg('נא להדביק את קישור ה-ICS ממודל');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        icsUrl.trim()
      )}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error('שגיאה במשיכת הקישור');
      }
      const text = await response.text();
      processIcsContent(text);
    } catch {
      setErrorMsg(
        'לא הצלחנו למשוך את הקישור ישירות בגלל חסימת רשת. תוכל להוריד את קובץ ה-.ics מהקישור ולהעלות אותו בכפתור למטה.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        processIcsContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleMoodle = () => {
    const now = new Date();
    const d1 =
      addDays(now, 3).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const d2 =
      addDays(now, 6).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const d3 =
      addDays(now, 10).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const sampleIcs = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:bgu-moodle-501@bgu.ac.il',
      'SUMMARY:יש להגיש את תרגיל בית 1: הוגנות אלגוריתמית וניתוח הטיות (Bias)',
      'DESCRIPTION:ניתוח מערך נתונים בפייתון והגשת מחברת Jupyter',
      'CATEGORIES:202.1.4099',
      `DTEND:${d1}`,
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:bgu-moodle-502@bgu.ac.il',
      'SUMMARY:יש להגיש את פרויקט מיני: בניית סוכן למידה מחיזוקים (RL)',
      'DESCRIPTION:מימוש Q-Learning ודו"ח ניסויים',
      'CATEGORIES:202.1.4099',
      `DTEND:${d3}`,
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:bgu-moodle-503@bgu.ac.il',
      'SUMMARY:האירוע בוחן אמצע במודל - שאילתות SQL ואינדקסים מגיע לסיומו',
      'DESCRIPTION:בוחן של שעה במודל',
      'CATEGORIES:202.1.3021',
      `DTEND:${d2}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    processIcsContent(sampleIcs);
  };

  const handleFinishWizard = () => {
    const createdCourses: Course[] = courseDrafts.map((draft) => ({
      id: `course-${draft.code.replace(/[^a-zA-Z0-9]/g, '-')}`,
      user_id: 'demo-user',
      moodle_course_code: draft.code,
      name: draft.name.trim() || `קורס ${draft.code}`,
      credits: Number(draft.credits),
      color: draft.color,
      slip_days_total: Number(draft.slipDaysTotal),
      slip_days_used: 0,
      is_setup_complete: true,
    }));

    const courseIdByCode = new Map(
      createdCourses.map((c) => [c.moodle_course_code, c.id])
    );

    const createdTasks: Task[] = parsedEvents.map((ev, index) => ({
      id: `imported-${Date.now()}-${index}`,
      user_id: 'demo-user',
      course_id: courseIdByCode.get(ev.courseCode) || createdCourses[0].id,
      external_uid: ev.externalUid,
      title: ev.cleanTitle,
      description: ev.description,
      due_date: ev.dueDate.toISOString(),
      previous_due_date: null,
      source: 'moodle',
      status: 'todo',
      weight_percentage: 8,
      estimated_hours: 6,
      used_slip_days: 0,
      notes: null,
    }));

    onCompleteImport(createdCourses, createdTasks, replaceDemoData);
    setStep(1);
    setIcsUrl('');
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
        {/* כותרת האשף */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                אשף סנכרון וחיבור ל-Moodle האוניברסיטאי
              </h2>
              <p className="text-xs text-slate-400">
                שלב {step} מתוך 2:{' '}
                {step === 1
                  ? 'חיבור קישור לוח השנה (.ics)'
                  : 'מתן שמות לקורסים והגדרת נק"ז'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-indigo-400">
                איך מוציאים את הקישור מה-Moodle ב-30 שניות?
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>
                  היכנס ל-Moodle של האוניברסיטה ולחץ על{' '}
                  <strong>לוח שנה (Calendar)</strong>.
                </li>
                <li>
                  גלול לתחתית העמוד ולחץ על{' '}
                  <strong>ייצוא לוח שנה (Export Calendar)</strong>.
                </li>
                <li>
                  בחר &quot;כל האירועים&quot; ו-&quot;60 ימים אחרונים והבאים&quot;,
                  ולחץ על <strong>קבל כתובת URL של לוח השנה</strong> או הורד קובץ.
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                הדבק כאן את קישור ה-ICS ממודל:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  <input
                    type="url"
                    dir="ltr"
                    value={icsUrl}
                    onChange={(e) => setIcsUrl(e.target.value)}
                    placeholder="https://moodle.bgu.ac.il/calendar/export_execute.php?userid=..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={handleFetchFromUrl}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isLoading ? 'שואב נתונים...' : 'נתח קישור'}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">
                {errorMsg}
              </p>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-500">
                או בחר באחת האפשרויות המהירות
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 font-medium cursor-pointer transition">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>העלה קובץ .ics מהמחשב</span>
                <input
                  type="file"
                  accept=".ics,text/calendar"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleLoadSampleMoodle}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 font-medium cursor-pointer transition"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>בדוק עכשיו עם קובץ Moodle לדוגמה</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                המפענח זיהה <strong>{courseDrafts.length} קורסים</strong> ו-
                <strong>{parsedEvents.length} מטלות</strong>! מכיוון שמודל מייצא רק
                מספר קורס, תן לכל קורס שם קריא לפי המטלות שמופיעות תחתיו:
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {courseDrafts.map((draft, index) => (
                <div
                  key={draft.code}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[11px] text-slate-300 font-medium">
                        שם הקורס (מזהה מודל: {draft.code})
                      </label>
                      <input
                        type="text"
                        value={draft.name}
                        placeholder={`הקלד שם לקורס ${draft.code} (למשל: מבני נתונים)`}
                        onChange={(e) => {
                          const updated = [...courseDrafts];
                          updated[index].name = e.target.value;
                          setCourseDrafts(updated);
                        }}
                        className="w-full bg-slate-900 border border-indigo-500/40 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[11px] text-slate-400">
                        נקודות זכות (נק&quot;ז)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="10"
                        value={draft.credits}
                        onChange={(e) => {
                          const updated = [...courseDrafts];
                          updated[index].credits = Number(e.target.value);
                          setCourseDrafts(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[11px] text-slate-400">
                        ימי חסד בסמסטר
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="14"
                        value={draft.slipDaysTotal}
                        onChange={(e) => {
                          const updated = [...courseDrafts];
                          updated[index].slipDaysTotal = Number(e.target.value);
                          setCourseDrafts(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* הצגת מטלות לדוגמה מתוך הקורס כדי לעזור לסטודנט לזהות איזה קורס זה */}
                  <p className="text-[11px] text-slate-400 truncate">
                    <strong className="text-slate-300">מטלות שזוהו בקורס זה:</strong>{' '}
                    {draft.sampleTasks.join(' • ')}
                  </p>
                </div>
              ))}
            </div>

            {/* בחירה האם להחליף את נתוני הדמו */}
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={replaceDemoData}
                onChange={(e) => setReplaceDemoData(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded cursor-pointer"
              />
              <span>
                נקה את קורסי ומטלות ההדגמה (Demo) והצג <strong>רק</strong> את
                הקורסים מהקובץ שהעליתי
              </span>
            </label>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                חזרה לשלב הקודם
              </button>
              <button
                onClick={handleFinishWizard}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                <span>ייבא קורסים ומטלות לדשבורד</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}