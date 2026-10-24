<div align="center">
  <h1>🎓 AcademicFlow</h1>
  <p><b>Smart engine for academic workload management, algorithmic prioritization, and automated Moodle synchronization</b></p>
</div>

> A task management protocol designed for engineering and computer science students. The system dynamically calculates task urgency and importance, predicts crunch weeks in advance, and syncs directly with academic platforms.

---

## 🚀 Core Features

* 🧠 **Smart Priority Engine:** A prioritization algorithm that maps tasks into 4 quadrants (Eisenhower Matrix) based on a weighted calculation of due dates, grade weight, course credits, and estimated effort hours.
* 🔄 **Moodle ICS Synchronization:** Smart import and sync from Moodle. The synchronization engine is idempotent—it fetches dates and identifiers from Moodle without overriding user-defined data (such as estimated hours or grade weight).
* 📊 **Crunch-Time Workload Radar:** A weekly workload prediction system. It aggregates required work hours per academic week and visually alerts users when they exceed their maximum work capacity threshold.
* 🛡️ **Slip Days Manager:** Precise tracking of slip days (penalty-free late submissions) at the course level throughout the semester.

---

## 🛠️ Architecture & Tech Stack

The system is built with a Layered Architecture, strictly separating business logic (pure functions) from the user interface.

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Component-based development with ultra-fast load times. |
| **Type Safety** | **TypeScript** | Strict Interfaces and Enums (no `any`) to prevent runtime errors. |
| **Styling & UI** | **Tailwind CSS + Lucide** | Utility-first modern responsive design with native Dark Mode support. |
| **Data Visualization** | **Recharts** | Interactive graphical display of the weekly workload radar. |
| **Business Logic** | **TypeScript + date-fns** | Algorithmic priority scoring, matrix classification, and timezone management. |
| **Sync Engine** | **Custom ICS Parser** | A custom engine for parsing `iCalendar` (`.ics`) files, including Regex-based text cleanup and smart sync management. |

---

## 🔬 Deep Dive: How Does the Priority Engine Work?

Instead of simple chronological sorting by due date, the `priorityEngine.ts` file calculates a weighted score (0-100) for each task:

1. **Urgency Score:** Based on a decay function calculating remaining time, plus an **Effort Pressure Bonus**. A task requiring 15 hours of work due in two days receives a critical urgency score compared to a 30-minute task due on the same day.
2. **Importance Score:** A function derived from the task's weight in the final grade (0-100%) multiplied by the course credits. A 15% task in a 5-credit course is prioritized over a 15% task in a 2-credit course.
3. **Eisenhower Classification:** The system maps each task on X (Importance) and Y (Urgency) axes, automatically slotting it into one of 4 quadrants: Do First, Schedule, Quick Task, or Later.

---

## ⚙️ Installation & Local Development

To run the system locally:

```bash
# 1. Clone the repository
git clone [https://github.com/YOUR_USERNAME/academic-flow.git](https://github.com/NATANEL31/academic-flow.git)
cd academic-flow

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev