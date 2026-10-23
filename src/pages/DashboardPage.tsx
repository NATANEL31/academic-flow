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
  Plus,
  SlidersHorizontal,
  Link2,
  RotateCcw,
  Trash2,
  Pencil,
  Check,
  Filter,
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
import { OnboardingWizard } from './OnboardingWizard';

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
  const {
    courses,
    addCourse,
    useSlipDay,
    renameCourse,
    deleteCourse,
    mergeImportedCourses,
    resetCoursesToDemo,
  } = useCourses();
  const {
    tasks,
    lastSyncedAt,
    syncAlert,
    setSyncAlert,
    toggleTaskStatus,
    deleteTask,
    deleteTasksByCourse,
    updateTask,
    addManualTask,
    mergeImportedTasks,
    simulateMoodleSync,
    resetTasksToDemo,
  } = useTasks();

  const [activeView, setActiveView] = useState<'list' | 'matrix'>('list');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // מצב לעריכת שם קורס ישירות מהדשבורד
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseName, setEditingCourseName] = useState<string>('');

  // מצב להוספת קורס חדש עצמאית
  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [standaloneCourseForm, setStandaloneCourseForm] = useState({
    name: '',
    credits: 3.5,
    slip_days_total: 2,
  });

  // מצב לעריכת משימה קיימת
  const [editingTask, setEditingTask] = useState<EnrichedTask | null>(null);

  // מצב להוספת משימה ידנית חדשה (כולל אפשרות ליצירת קורס חדש במקום!)
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    course_id: courses[0]?.id || '__new__',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    weight_percentage: 10,
    estimated_hours: 6,
    description: '',
    new_course_name: '',
    new_course_credits: 3.5,
    new_course_slip_days: 2,
  });

  const enrichedTasks = useMemo(
    () => prioritizeTasks(tasks, courses),
    [tasks, courses]
  );

  const filteredTasks = useMemo(() => {
    if (selectedCourseFilter === 'all') return enrichedTasks;
    return enrichedTasks.filter((t) => t.course_id === selectedCourseFilter);
  }, [enrichedTasks, selectedCourseFilter]);

  const weeklyWorkload = useMemo(
    () => calculateWeeklyWorkload(tasks, 25, 5),
    [tasks]
  );

  const openTasks = enrichedTasks.filter((t) => t.status !== 'submitted');
  const filteredOpenTasks = filteredTasks.filter((t) => t.status !== 'submitted');
  const criticalTasksCount = openTasks.filter(
    (t) => t.quadrant === 'do_first'
  ).length;
  const currentWeekHours = weeklyWorkload[0]?.totalEstimatedHours ?? 0;

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      simulateMoodleSync();
      setIsSyncing(false);
    }, 500);
  };

  const handleResetDemo = () => {
    resetCoursesToDemo();
    resetTasksToDemo();
    setSelectedCourseFilter('all');
    setSyncAlert('הנתונים אופסו חזרה למצב הדמו ההתחלתי.');
  };

  const handleDeleteCourse = (courseId: string) => {
    deleteCourse(courseId);
    deleteTasksByCourse(courseId);
    if (selectedCourseFilter === courseId) {
      setSelectedCourseFilter('all');
    }
  };

  const handleOpenNewTaskModal = () => {
    setNewTaskForm((prev) => ({
      ...prev,
      course_id: courses.length > 0 ? courses[0].id : '__new__',
    }));
    setIsNewTaskOpen(true);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    let targetCourseId = newTaskForm.course_id;

    // אם המשתמש בחר ליצור קורס חדש תוך כדי הוספת המטלה
    if (targetCourseId === '__new__' || courses.length === 0) {
      if (!newTaskForm.new_course_name.trim()) return;
      const createdCourse = addCourse({
        name: newTaskForm.new_course_name,
        credits: newTaskForm.new_course_credits,
        slip_days_total: newTaskForm.new_course_slip_days,
      });
      targetCourseId = createdCourse.id;
    }

    addManualTask({
      title: newTaskForm.title,
      course_id: targetCourseId,
      due_date: newTaskForm.due_date,
      weight_percentage: newTaskForm.weight_percentage,
      estimated_hours: newTaskForm.estimated_hours,
      description: newTaskForm.description,
    });

    setIsNewTaskOpen(false);
    setNewTaskForm({
      title: '',
      course_id: targetCourseId,
      due_date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      weight_percentage: 10,
      estimated_hours: 6,
      description: '',
      new_course_name: '',
      new_course_credits: 3.5,
      new_course_slip_days: 2,
    });
  };

  const handleCreateStandaloneCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standaloneCourseForm.name.trim()) return;
    addCourse(standaloneCourseForm);
    setStandaloneCourseForm({ name: '', credits: 3.5, slip_days_total: 2 });
    setIsNewCourseOpen(false);
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
                  פעיל
                </span>
              </div>
              <p className="text-xs text-slate-400">
                מנוע חכם לניהול עומסים אקדמיים וסנכרון Moodle אוטומטי
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-400 hidden md:inline ml-2">
              סנכרון אחרון: <strong className="text-slate-200">{lastSyncedAt}</strong>
            </span>

            <button
              onClick={handleOpenNewTaskModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition text-xs font-medium text-slate-100 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>מטלה חדשה</span>
            </button>

            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-xs font-medium text-slate-100 cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span>חיבור קישור Moodle (.ics)</span>
            </button>

            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>הדמיית סנכרון חי</span>
            </button>

            <button
              onClick={handleResetDemo}
              title="איפוס לנתוני הדמו ההתחלתיים"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
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
              <p className="text-xs text-slate-400">קורסים פעילים</p>
              <p className="text-3xl font-bold mt-1 text-emerald-400">{courses.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* גריד מרכזי */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  תעדוף משימות חכם (Priority Engine)
                </h2>
                <p className="text-xs text-slate-400">
                  סנן לפי קורס, כייל משקלים או מחק מטלות שאינן רלוונטיות
                </p>
              </div>
              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 shrink-0">
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
                  מטריצת אייזנהאואר
                </button>
              </div>
            </div>

            {/* סרגל סינון לפי קורס */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>קורס:</span>
              </div>
              <button
                onClick={() => setSelectedCourseFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                  selectedCourseFilter === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                הכל ({enrichedTasks.length})
              </button>
              {courses.map((course) => {
                const count = enrichedTasks.filter(
                  (t) => t.course_id === course.id
                ).length;
                const isSelected = selectedCourseFilter === course.id;
                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseFilter(course.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                    <span>{course.name}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {activeView === 'list' ? (
              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-sm text-slate-400">
                    אין משימות להצגה בקורס זה.
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTaskStatus(task.id)}
                      onEdit={() => setEditingTask(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  ['do_first', 'schedule', 'quick_task', 'later'] as EisenhowerQuadrant[]
                ).map((quadKey) => {
                  const meta = QUADRANT_META[quadKey];
                  const quadTasks = filteredOpenTasks.filter(
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
                              onEdit={() => setEditingTask(task)}
                              onDelete={() => deleteTask(task.id)}
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

          {/* עמודה שמאלית: רדאר עומסים + קורסים */}
          <div className="space-y-6">
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

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">
                    ניהול קורסים וימי חסד
                  </h3>
                  <p className="text-xs text-slate-400">
                    ערוך שם קורס או הוסף קורס חדש
                  </p>
                </div>
                <button
                  onClick={() => setIsNewCourseOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>קורס חדש</span>
                </button>
              </div>

              <div className="space-y-3">
                {courses.map((course) => {
                  const remainingSlip =
                    course.slip_days_total - course.slip_days_used;
                  const isEditingThis = editingCourseId === course.id;

                  return (
                    <div
                      key={course.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span
                            className="w-2.5 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: course.color }}
                          />
                          {isEditingThis ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingCourseName}
                                onChange={(e) =>
                                  setEditingCourseName(e.target.value)
                                }
                                autoFocus
                                className="w-full bg-slate-900 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  renameCourse(course.id, editingCourseName);
                                  setEditingCourseId(null);
                                }}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                                title="שמור שם קורס"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-white truncate">
                                  {course.name}
                                </p>
                                <button
                                  onClick={() => {
                                    setEditingCourseId(course.id);
                                    setEditingCourseName(course.name);
                                  }}
                                  title="שנה שם קורס"
                                  className="text-slate-500 hover:text-indigo-400 transition cursor-pointer shrink-0"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-400">
                                קוד: {course.moodle_course_code} • {course.credits}{' '}
                                נק&quot;ז
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          title="מחק קורס ומטלותיו"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {course.slip_days_total > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                          <span className="text-slate-400">
                            נותרו {remainingSlip} מתוך {course.slip_days_total} ימי
                            חסד
                          </span>
                          <button
                            onClick={() => useSlipDay(course.id)}
                            disabled={remainingSlip === 0}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                          >
                            נצל יום חסד
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* אשף ייבוא מ-Moodle */}
      <OnboardingWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCompleteImport={(newCourses, newTasks, replaceExisting) => {
          mergeImportedCourses(newCourses, replaceExisting);
          mergeImportedTasks(newTasks, replaceExisting);
          setSelectedCourseFilter('all');
          setSyncAlert(
            `ייבוא Moodle הושלם! נטענו ${newCourses.length} קורסים ו-${newTasks.length} מטלות.`
          );
        }}
      />

      {/* מודאל עריכת משקל ושעות למשימה קיימת */}
      {editingTask && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              כיול מדדי משימה: {editingTask.title}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  משקל המטלה בציון הסופי של הקורס (%):{' '}
                  <strong className="text-white">
                    {editingTask.weight_percentage}%
                  </strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={editingTask.weight_percentage}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditingTask({ ...editingTask, weight_percentage: val });
                    updateTask(editingTask.id, { weight_percentage: val });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  הערכת שעות עבודה נדרשות:{' '}
                  <strong className="text-white">
                    {editingTask.estimated_hours} שעות
                  </strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={editingTask.estimated_hours}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditingTask({ ...editingTask, estimated_hours: val });
                    updateTask(editingTask.id, { estimated_hours: val });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  deleteTask(editingTask.id);
                  setEditingTask(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>מחק מטלה</span>
              </button>

              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
              >
                שמור וסגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל הוספת מטלה ידנית (כולל יצירת קורס חדש במקום!) */}
      {isNewTaskOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCreateTaskSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">הוספת מטלה חדשה</h3>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">שם המטלה</label>
              <input
                type="text"
                required
                value={newTaskForm.title}
                onChange={(e) =>
                  setNewTaskForm({ ...newTaskForm, title: e.target.value })
                }
                placeholder="למשל: הכנה לבוחן אמצע / הגשת תרגיל 3"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">שיוך לקורס</label>
              <select
                value={newTaskForm.course_id}
                onChange={(e) =>
                  setNewTaskForm({ ...newTaskForm, course_id: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__" className="font-bold text-indigo-400">
                  + הוסף קורס חדש שלא ברשימה...
                </option>
              </select>
            </div>

            {/* שדות שנפתחים אוטומטית אם בוחרים "+ הוסף קורס חדש" */}
            {(newTaskForm.course_id === '__new__' || courses.length === 0) && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                <p className="text-xs font-semibold text-indigo-300">
                  פרטי הקורס החדש:
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">שם הקורס</label>
                  <input
                    type="text"
                    required
                    value={newTaskForm.new_course_name}
                    onChange={(e) =>
                      setNewTaskForm({
                        ...newTaskForm,
                        new_course_name: e.target.value,
                      })
                    }
                    placeholder="למשל: מבוא להסתברות / מערכות הפעלה"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      נקודות זכות (נק&quot;ז)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={newTaskForm.new_course_credits}
                      onChange={(e) =>
                        setNewTaskForm({
                          ...newTaskForm,
                          new_course_credits: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      ימי חסד בסמסטר
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={newTaskForm.new_course_slip_days}
                      onChange={(e) =>
                        setNewTaskForm({
                          ...newTaskForm,
                          new_course_slip_days: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">תאריך הגשה</label>
                <input
                  type="date"
                  required
                  value={newTaskForm.due_date}
                  onChange={(e) =>
                    setNewTaskForm({ ...newTaskForm, due_date: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">משקל בציון (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newTaskForm.weight_percentage}
                  onChange={(e) =>
                    setNewTaskForm({
                      ...newTaskForm,
                      weight_percentage: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">שעות עבודה</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newTaskForm.estimated_hours}
                  onChange={(e) =>
                    setNewTaskForm({
                      ...newTaskForm,
                      estimated_hours: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
              >
                שמור והוסף
              </button>
            </div>
          </form>
        </div>
      )}

      {/* מודאל הוספת קורס חדש עצמאית */}
      {isNewCourseOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCreateStandaloneCourse}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">הוספת קורס חדש</h3>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">שם הקורס</label>
              <input
                type="text"
                required
                value={standaloneCourseForm.name}
                onChange={(e) =>
                  setStandaloneCourseForm({
                    ...standaloneCourseForm,
                    name: e.target.value,
                  })
                }
                placeholder="למשל: הוגנות אלגוריתמית"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">נקודות זכות (נק&quot;ז)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={standaloneCourseForm.credits}
                  onChange={(e) =>
                    setStandaloneCourseForm({
                      ...standaloneCourseForm,
                      credits: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">ימי חסד בסמסטר</label>
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={standaloneCourseForm.slip_days_total}
                  onChange={(e) =>
                    setStandaloneCourseForm({
                      ...standaloneCourseForm,
                      slip_days_total: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCourseOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
              >
                צור קורס
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  compact = false,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: EnrichedTask;
  compact?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
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

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onEdit}
            title="כייל משקל ושעות עבודה"
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onDelete}
            title="מחק מטלה"
            className="p-2 rounded-xl bg-slate-950 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
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
    </div>
  );
}