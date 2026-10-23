import { useState, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  Flame,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useCourses } from '../hooks/useCourses';
import { useTasks } from '../hooks/useTasks';
import {
  prioritizeTasks,
  calculateWeeklyWorkload,
} from '../utils/priorityEngine';
import type { EnrichedTask, EisenhowerQuadrant } from '../utils/priorityEngine';

const QUADRANT_META: Record<
  EisenhowerQuadrant,
  { title: string; subtitle: string; badgeClass: string; borderClass: string }
> = {
  do_first: {
    title: 'דחוף וחשוב – לביצוע מיידי',
    subtitle: 'משקל גבוה בציון ודד-ליין קרוב',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    borderClass: 'border-rose-500/40 bg-rose-950/10',
  },
  schedule: {
    title: 'חשוב אך לא דחוף – לתכנון ביומן',
    subtitle: 'פרויקטים ומטלות כבדות להמשך הסמסטר',
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    borderClass: 'border-indigo-500/30 bg-indigo-950/10',
  },
  quick_task: {
    title: 'דחוף אך משקל נמוך – לתקתק מהר',
    subtitle: 'בחנים קצרים או הגשות שבועיות קטנות',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/30 bg-amber-950/10',
  },
  later: {
    title: 'עדיפות נמוכה – בהמשך',
    subtitle: 'רחוק מהדד-ליין ומשקל נמוך',
    badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    borderClass: 'border-slate-800 bg-slate-900/40',
  },
};

export function DashboardPage() {
  const { courses, useSlipDay } = useCourses();
  const {
    tasks,
    lastSyncedAt,
    syncAlert,
    setSyncAlert,
    toggleTaskStatus,
    simulateMoodleSync,
  } = useTasks();

  const [activeView, setActiveView] = useState<'list' | 'matrix'>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  const enrichedTasks = useMemo(
    () => prioritizeTasks(tasks, courses),
    [tasks, courses]
  );

  const weeklyWorkload = useMemo(
    () => calculateWeeklyWorkload(tasks, 25, 5),
    [tasks]
  );

  const openTasks = enrichedTasks.filter((t) => t.status !== 'submitted');
  const criticalTasksCount = openTasks.filter(
    (t) => t.quadrant === 'do_first'
  ).length;
  const currentWeekHours = weeklyWorkload[0]?.totalEstimatedHours ?? 0;

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      simulateMoodleSync();
      setIsSyncing(false);
    }, 600);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* סרגל עליון */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  AcademicFlow
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Demo Mode פעיל
                </span>
              </div>
              <p className="text-xs text-slate-400">
                מנוע חכם לניהול עומסים אקדמיים וסנכרון Moodle אוטומטי
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">
              סנכרון אחרון מול Moodle: <strong className="text-slate-200">{lastSyncedAt}</strong>
            </span>
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition text-sm font-medium text-white shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>סנכרן עכשיו מול Moodle</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* התראת סנכרון חכמה */}
        {syncAlert && (
          <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-between text-indigo-200 text-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>{syncAlert}</span>
            </div>
            <button
              onClick={() => setSyncAlert(null)}
              className="text-xs text-indigo-300 hover:text-white underline cursor-pointer"
            >
              סגור
            </button>
          </div>
        )}

        {/* שורת מדדים (KPIs) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">משימות פתוחות הסמסטר</p>
              <p className="text-3xl font-bold mt-1 text-white">{openTasks.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">ברביע קריטי (דחוף וחשוב)</p>
              <p className="text-3xl font-bold mt-1 text-rose-400">{criticalTasksCount}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">עומס עבודה השבוע</p>
              <p className="text-3xl font-bold mt-1 text-amber-400">
                {currentWeekHours} <span className="text-sm font-normal text-slate-400">/ 25 שעות</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">קורסים מסונכרנים ממודל</p>
              <p className="text-3xl font-bold mt-1 text-emerald-400">{courses.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* גריד מרכזי: משימות ומטריצה (2 עמודות) + רדאר עומסים וקורסים (עמודה 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* אזור המשימות והמטריצה */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                תעדוף משימות חכם (Priority Engine)
              </h2>
              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                <button
                  onClick={() => setActiveView('list')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeView === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  תור עדיפויות (Score)
                </button>
                <button
                  onClick={() => setActiveView('matrix')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeView === 'matrix'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  מטריצת אייזנהאואר (4 רביעים)
                </button>
              </div>
            </div>

            {activeView === 'list' ? (
              <div className="space-y-3">
                {enrichedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskStatus(task.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  ['do_first', 'schedule', 'quick_task', 'later'] as EisenhowerQuadrant[]
                ).map((quadKey) => {
                  const meta = QUADRANT_META[quadKey];
                  const quadTasks = openTasks.filter(
                    (t) => t.quadrant === quadKey
                  );
                  return (
                    <div
                      key={quadKey}
                      className={`p-4 rounded-2xl border ${meta.borderClass} flex flex-col gap-3`}
                    >
                      <div>
                        <h3 className="font-bold text-sm text-white">
                          {meta.title}
                        </h3>
                        <p className="text-xs text-slate-400">{meta.subtitle}</p>
                      </div>
                      <div className="space-y-2.5">
                        {quadTasks.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">
                            אין משימות ברביע זה
                          </p>
                        ) : (
                          quadTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              compact
                              onToggle={() => toggleTaskStatus(task.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* עמודה שמאלית: רדאר עומסים שבועי + מעקב קורסים וימי חסד */}
          <div className="space-y-6">
            {/* רדאר עומסים שבועי */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">
                    רדאר עומסים שבועי
                  </h3>
                  <p className="text-xs text-slate-400">
                    חיזוי שעות עבודה מול סף קיבולת (25 ש&apos; לשבוע)
                  </p>
                </div>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>

              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyWorkload}>
                    <XAxis
                      dataKey="weekLabel"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <ReferenceLine
                      y={25}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                    />
                    <Bar dataKey="totalEstimatedHours" radius={[6, 6, 0, 0]}>
                      {weeklyWorkload.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isCrunchWeek ? '#f43f5e' : '#6366f1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* קורסים וניהול ימי חסד (Slip Days) */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
              <div>
                <h3 className="font-bold text-base text-white">
                  קורסים ומכסת ימי חסד (Slip Days)
                </h3>
                <p className="text-xs text-slate-400">
                  מעקב אחרי ימי איחור מאושרים ללא קנס בכל קורס
                </p>
              </div>

              <div className="space-y-3">
                {courses.map((course) => {
                  const remainingSlip =
                    course.slip_days_total - course.slip_days_used;
                  return (
                    <div
                      key={course.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: course.color }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {course.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            קוד מודל: {course.moodle_course_code} • {course.credits}{' '}
                            נק&quot;ז
                          </p>
                        </div>
                      </div>

                      {course.slip_days_total > 0 ? (
                        <div className="text-left shrink-0">
                          <span className="block text-xs text-slate-400 mb-1">
                            נותרו {remainingSlip} מתוך {course.slip_days_total} ימי חסד
                          </span>
                          <button
                            onClick={() => useSlipDay(course.id)}
                            disabled={remainingSlip === 0}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                          >
                            נצל יום חסד
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          ללא ימי חסד
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TaskCard({
  task,
  compact = false,
  onToggle,
}: {
  task: EnrichedTask;
  compact?: boolean;
  onToggle: () => void;
}) {
  const isDone = task.status === 'submitted';
  const quadMeta = QUADRANT_META[task.quadrant];

  return (
    <div
      className={`p-4 rounded-2xl border transition ${
        isDone
          ? 'bg-slate-900/30 border-slate-800/50 opacity-55'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
            title="סמן כהוגש"
          >
            <CheckCircle2
              className={`w-5 h-5 ${
                isDone ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
          </button>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {task.course && (
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: `${task.course.color}20`,
                    color: task.course.color,
                  }}
                >
                  {task.course.name}
                </span>
              )}
              {!compact && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border ${quadMeta.badgeClass}`}
                >
                  {quadMeta.title.split('–')[0]}
                </span>
              )}
            </div>

            <h4
              className={`font-semibold text-sm ${
                isDone ? 'line-through text-slate-400' : 'text-white'
              }`}
            >
              {task.title}
            </h4>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                הגשה בעוד{' '}
                <strong
                  className={
                    task.daysRemaining <= 2 && !isDone
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }
                >
                  {task.daysRemaining} ימים
                </strong>
              </span>
              <span>•</span>
              <span>משקל בציון: {task.weight_percentage}%</span>
              <span>•</span>
              <span>הערכת עבודה: {task.estimated_hours} שעות</span>
            </div>
          </div>
        </div>

        {/* ציון תעדוף משוקלל */}
        <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
          <span className="text-[10px] text-slate-400">ציון דחיפות</span>
          <span
            className={`text-base font-bold ${
              task.priorityScore >= 75
                ? 'text-rose-400'
                : task.priorityScore >= 55
                ? 'text-amber-400'
                : 'text-indigo-400'
            }`}
          >
            {task.priorityScore}
          </span>
        </div>
      </div>
    </div>
  );
}