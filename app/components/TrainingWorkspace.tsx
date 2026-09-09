"use client";

import { useState } from "react";
import { ARCollectionsLab } from "./ARCollectionsLab";
import { BillingLab } from "./BillingLab";
import { PaymentPostingLab } from "./PaymentPostingLab";
import { PdfExportCenter } from "./PdfExportCenter";
import {
  modules,
  startingLogs,
  type ModuleId,
  type Scenario,
  type TrainingModule,
} from "../data/training";
import {
  arScenarios,
  denialScenarios,
  postingScenarios,
} from "../data/exploration";
import { billingScenarios } from "../data/billing";

type Screen = "dashboard" | ModuleId;
type WorkspaceTab = "brief" | "workflow" | "history" | "notes" | "complete";

type CaseProgress = {
  checked: boolean[];
  completedSteps: number[];
  notes: string;
  disposition: string;
};

type PriorityActivityState = {
  order: string[];
  rationale: string;
  finalized: boolean;
  acknowledged: boolean;
  acknowledgedAt: string;
  openedScenarioId: string;
};

type CompletionLog = (typeof startingLogs)[number];

const navItems: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Overview" },
  { id: "billing", label: "Billing" },
  { id: "payment-posting", label: "Payment Posting" },
  { id: "ar-collections", label: "Insurance Follow-up" },
  { id: "denial-management", label: "Denial Management" },
];

const coachCriteria = [
  "Accurate workflow",
  "Clear rationale",
  "Correct escalation",
  "Complete documentation",
];

const defaultProgress = (): CaseProgress => ({
  checked: [false, false, false, false],
  completedSteps: [],
  notes: "",
  disposition: "",
});

const defaultPriorityActivity = (): PriorityActivityState => ({
  order: [],
  rationale: "",
  finalized: false,
  acknowledged: false,
  acknowledgedAt: "",
  openedScenarioId: "",
});

function calculateScore(progress: CaseProgress) {
  const checkedPoints = progress.checked.filter(Boolean).length * 8;
  const stepPoints = progress.completedSteps.length * 4;
  return Math.min(100, 48 + checkedPoints + stepPoints);
}

function moduleScenarioCount(module: TrainingModule) {
  if (module.id === "billing") return billingScenarios.length;
  if (module.id === "payment-posting") return postingScenarios.length;
  if (module.id === "ar-collections") return arScenarios.length;
  if (module.id === "denial-management") return denialScenarios.length;
  return 0;
}

function LearnerWelcome({
  value,
  onChange,
  onStart,
}: {
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
}) {
  return (
    <main className="learner-welcome">
      <section className="learner-welcome-card">
        <span className="brand-mark learner-brand-mark" aria-hidden="true">
          RC
        </span>
        <span className="section-kicker">Revenue Cycle Back End Training Lab</span>
        <h1>Welcome to your practice session.</h1>
        <p>
          Enter your name before opening the workstations. It will appear on
          every PDF activity, decision worksheet, and completion report you
          create.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <label htmlFor="learner-name">Learner name</label>
          <input
            id="learner-name"
            autoComplete="name"
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter your full name"
          />
          <button type="submit" disabled={value.trim().length < 2}>
            Begin learner session <span aria-hidden="true">→</span>
          </button>
        </form>
        <small>All accounts and payer records in this lab are fictional.</small>
      </section>
    </main>
  );
}

export function TrainingWorkspace() {
  const [learnerName, setLearnerName] = useState("");
  const [nameEntry, setNameEntry] = useState("");
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [activeScenario, setActiveScenario] = useState<Record<ModuleId, number>>({
    billing: 0,
    "payment-posting": 0,
    "ar-collections": 0,
    "denial-management": 0,
  });
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("brief");
  const [activeStep, setActiveStep] = useState(0);
  const [progressByCase, setProgressByCase] = useState<
    Record<string, CaseProgress>
  >({});
  const [logs, setLogs] = useState<CompletionLog[]>([]);
  const [priorityActivities, setPriorityActivities] = useState<
    Record<"ar-collections" | "denial-management", PriorityActivityState>
  >({
    "ar-collections": defaultPriorityActivity(),
    "denial-management": defaultPriorityActivity(),
  });
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeModule = modules.find((module) => module.id === screen);
  const scenario = activeModule
    ? activeModule.scenarios[activeScenario[activeModule.id]]
    : undefined;
  const progress = scenario
    ? progressByCase[scenario.id] ?? defaultProgress()
    : defaultProgress();
  const score = calculateScore(progress);

  const scenarioCount = modules.reduce(
    (count, module) => count + moduleScenarioCount(module),
    0,
  );

  const updateProgress = (
    scenarioId: string,
    updater: (current: CaseProgress) => CaseProgress,
  ) => {
    setProgressByCase((current) => ({
      ...current,
      [scenarioId]: updater(current[scenarioId] ?? defaultProgress()),
    }));
  };

  const selectScreen = (next: Screen) => {
    setScreen(next);
    setWorkspaceTab("brief");
    setActiveStep(0);
    setMobileMenu(false);
    setToast("");
  };

  const selectScenario = (module: TrainingModule, index: number) => {
    setActiveScenario((current) => ({ ...current, [module.id]: index }));
    setWorkspaceTab("brief");
    setActiveStep(0);
    setToast("");
  };

  const completeCurrentStep = () => {
    if (!scenario) return;
    updateProgress(scenario.id, (current) => ({
      ...current,
      completedSteps: current.completedSteps.includes(activeStep)
        ? current.completedSteps
        : [...current.completedSteps, activeStep],
    }));
    if (activeStep < scenario.steps.length - 1) {
      setActiveStep((step) => step + 1);
    }
  };

  const saveCompletion = () => {
    if (!scenario || !activeModule || !progress.disposition) return;
    const newLog: CompletionLog = {
      id: `LOG-${8822 + logs.length}`,
      module: activeModule.title,
      scenario: scenario.title,
      learner: learnerName,
      score,
      time: "Just now",
    };
    setLogs((current) => [newLog, ...current]);
    setToast(
      `${scenario.id} completed at ${score}% — the trainer log is ready.`,
    );
  };

  const saveExplorationCompletion = (
    moduleName: string,
    scenarioName: string,
    completionScore: number,
  ) => {
    const newLog: CompletionLog = {
      id: `LOG-${8822 + logs.length}`,
      module: moduleName,
      scenario: scenarioName,
      learner: learnerName,
      score: completionScore,
      time: "Just now",
    };
    setLogs((current) => [newLog, ...current]);
  };

  if (!learnerName) {
    return (
      <LearnerWelcome
        value={nameEntry}
        onChange={setNameEntry}
        onStart={() => {
          const normalized = nameEntry.trim().replace(/\s+/g, " ");
          if (normalized.length >= 2) setLearnerName(normalized);
        }}
      />
    );
  }

  return (
    <div
      className={
        sidebarCollapsed ? "app-shell sidebar-is-collapsed" : "app-shell"
      }
    >
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            RC
          </span>
          <div>
            <strong>Revenue Cycle Back End</strong>
            <span>operations training lab</span>
          </div>
        </div>

        <div className="nav-section-label">Workspace</div>
        <nav className="main-nav" aria-label="Training modules">
          {navItems.map((item) => (
            <button
              className={screen === item.id ? "nav-item nav-item-active" : "nav-item"}
              key={item.id}
              onClick={() => selectScreen(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              type="button"
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="signal-row">
            <span className="live-signal" />
            Practice environment
          </div>
          <strong>Fictional data only</strong>
          <p>Built for coaching—never enter real patient or payer information.</p>
        </div>

        <div className="profile-card">
          <div>
            <strong>{learnerName}</strong>
            <span>Learner session</span>
          </div>
          <span aria-hidden="true">•••</span>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar">
          <button
            className="menu-button"
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu((open) => !open)}
          >
            <span />
            <span />
          </button>
          <button
            className="sidebar-toggle-button"
            type="button"
            aria-label={sidebarCollapsed ? "Show workspace navigation" : "Hide workspace navigation"}
            aria-pressed={sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            <span aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span>
          </button>
          <div className="topbar-copy">
            <span className="eyebrow">Back End training environment</span>
            <strong>
              {activeModule ? activeModule.title : "Revenue Cycle Lab"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="data-pill">Synthetic records</span>
            <button className="icon-button" aria-label="Open help" type="button">
              ?
            </button>
          </div>
        </header>

        {screen === "dashboard" ? (
          <Dashboard
            logs={logs}
            scenarioCount={scenarioCount}
            onOpenModule={(id) => selectScreen(id)}
          />
        ) : activeModule?.id === "billing" ? (
          <BillingLab
            learnerName={learnerName}
            scenarioIndex={activeScenario.billing}
            onSelectScenario={(index) => selectScenario(activeModule, index)}
            onComplete={(scenarioName, completionScore) =>
              saveExplorationCompletion(activeModule.title, scenarioName, completionScore)
            }
          />
        ) : activeModule?.id === "payment-posting" ? (
          <PaymentPostingLab
            key={`payment-${activeScenario["payment-posting"]}`}
            module={activeModule}
            learnerName={learnerName}
            scenarioIndex={activeScenario["payment-posting"]}
            onSelectScenario={(index) => selectScenario(activeModule, index)}
            onComplete={(scenarioName, completionScore) =>
              saveExplorationCompletion(
                activeModule.title,
                scenarioName,
                completionScore,
              )
            }
          />
        ) : activeModule?.id === "ar-collections" ? (
          <ARCollectionsLab
            key={`ar-${activeScenario["ar-collections"]}`}
            module={activeModule}
            learnerName={learnerName}
            scenarioIndex={activeScenario["ar-collections"]}
            priorityActivity={priorityActivities["ar-collections"]}
            onPriorityActivity={(next) =>
              setPriorityActivities((current) => ({
                ...current,
                "ar-collections": next,
              }))
            }
            onSelectScenario={(index) => selectScenario(activeModule, index)}
            onComplete={(scenarioName, completionScore) =>
              saveExplorationCompletion(
                activeModule.title,
                scenarioName,
                completionScore,
              )
            }
          />
        ) : activeModule?.id === "denial-management" ? (
          <ARCollectionsLab
            key={`denial-${activeScenario["denial-management"]}`}
            mode="denial"
            module={activeModule}
            learnerName={learnerName}
            scenarioIndex={activeScenario["denial-management"]}
            priorityActivity={priorityActivities["denial-management"]}
            onPriorityActivity={(next) =>
              setPriorityActivities((current) => ({
                ...current,
                "denial-management": next,
              }))
            }
            onSelectScenario={(index) => selectScenario(activeModule, index)}
            onComplete={(scenarioName, completionScore) =>
              saveExplorationCompletion(
                activeModule.title,
                scenarioName,
                completionScore,
              )
            }
          />
        ) : activeModule && scenario ? (
          <ModuleWorkspace
            module={activeModule}
            learnerName={learnerName}
            scenario={scenario}
            selectedScenario={activeScenario[activeModule.id]}
            workspaceTab={workspaceTab}
            activeStep={activeStep}
            progress={progress}
            score={score}
            toast={toast}
            onSelectScenario={(index) => selectScenario(activeModule, index)}
            onSelectTab={setWorkspaceTab}
            onSelectStep={setActiveStep}
            onCompleteStep={completeCurrentStep}
            onCheck={(index) =>
              updateProgress(scenario.id, (current) => ({
                ...current,
                checked: current.checked.map((value, itemIndex) =>
                  itemIndex === index ? !value : value,
                ),
              }))
            }
            onNotes={(notes) =>
              updateProgress(scenario.id, (current) => ({ ...current, notes }))
            }
            onDisposition={(disposition) =>
              updateProgress(scenario.id, (current) => ({
                ...current,
                disposition,
              }))
            }
            onSaveCompletion={saveCompletion}
            logs={logs}
          />
        ) : null}
      </main>
    </div>
  );
}

function Dashboard({
  logs,
  scenarioCount,
  onOpenModule,
}: {
  logs: CompletionLog[];
  scenarioCount: number;
  onOpenModule: (id: ModuleId) => void;
}) {
  const moduleProgress = modules.map((module) => {
    const moduleLogs = logs.filter((log) => log.module === module.title);
    const completedScenarios = new Set(moduleLogs.map((log) => log.scenario));
    const total = moduleScenarioCount(module);
    const completed = completedScenarios.size;
    const bestScore = moduleLogs.length
      ? Math.max(...moduleLogs.map((log) => log.score))
      : null;
    return {
      module,
      completed,
      total,
      bestScore,
      latest: moduleLogs[0] ?? null,
      percent: total ? Math.round((completed / total) * 100) : 0,
    };
  });
  const completedCases = moduleProgress.reduce(
    (sum, item) => sum + item.completed,
    0,
  );
  const practicedModules = moduleProgress.filter(
    (item) => item.completed > 0,
  ).length;
  const readinessPercent = Math.round(
    (practicedModules / modules.length) * 100,
  );
  const averageScore = logs.length
    ? Math.round(logs.reduce((sum, log) => sum + log.score, 0) / logs.length)
    : null;
  const nextModule =
    moduleProgress.find((item) => item.completed === 0)?.module ??
    moduleProgress.find((item) => item.completed < item.total)?.module ??
    modules[0];
  const readinessEvidence: Record<ModuleId, string> = {
    billing: "Submit a clean CMS-1500 or UB-04 claim",
    "payment-posting": "Close a fully reconciled posting batch",
    "ar-collections": "Complete payer research, resolution, and account notation",
    "denial-management": "Resolve a denial and complete any required appeal work",
  };

  return (
    <div className="dashboard-page page-enter">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Revenue Cycle Back End practice floor</span>
          <h1>Train the decisions behind every dollar.</h1>
          <p>
            Move from payment evidence to payer recovery with realistic
            scenarios, independent investigation, and a score that makes
            progress visible.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => onOpenModule("billing")}
            >
              Start a practice case <span aria-hidden="true">↗</span>
            </button>
            <span className="hero-note">
              <span className="pulse-dot" /> 4 learning paths ready
            </span>
          </div>
        </div>
        <div className="hero-score-card">
          <span className="mini-label">Session readiness</span>
          <div className="readiness-number">{readinessPercent}%</div>
          <div className="readiness-track">
            <span style={{ width: `${readinessPercent}%` }} />
          </div>
          <div className="readiness-details">
            <span>
              <strong>{completedCases}</strong> cases completed
            </span>
            <span>
              <strong>{practicedModules}/4</strong> modules practiced
            </span>
          </div>
        </div>
      </section>

      <section className="dashboard-metrics" aria-label="Training summary">
        {[
          ["04", "role-based modules"],
          [`${scenarioCount}`, "fictional scenarios"],
          [averageScore === null ? "—" : `${averageScore}%`, "session average"],
          [`${completedCases}`, "completed this session"],
        ].map(([value, label]) => (
          <div className="metric-cell" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Practice paths</span>
            <h2>Choose the workflow to coach</h2>
          </div>
          <span className="section-caption">
            {scenarioCount} cases · independent investigation and validation
          </span>
        </div>
        <div className="module-grid">
          {modules.map((module, index) => (
            <article
              className="module-card"
              key={module.id}
              style={
                {
                  "--module-accent": module.accent,
                  "--module-soft": module.soft,
                } as React.CSSProperties
              }
            >
              <div className="module-card-top">
                <span className="module-index">0{index + 1}</span>
              </div>
              <span className="module-eyebrow">{module.eyebrow}</span>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <div className="module-card-meta">
                <span>{moduleScenarioCount(module)} scenarios</span>
                <span>
                  <strong>{module.metric}</strong> {module.metricLabel}
                </span>
              </div>
              <button
                type="button"
                className="module-link"
                onClick={() => onOpenModule(module.id)}
              >
                Open training desk <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-lower">
        <div className="session-progress-panel">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">Your learning record</span>
              <h2>Session progress by workflow</h2>
            </div>
            <span className="session-completion-count">
              {completedCases} of {scenarioCount} cases completed
            </span>
          </div>
          <div className="module-progress-list">
            {moduleProgress.map((item) => (
              <article
                className="module-progress-row"
                key={item.module.id}
                style={
                  {
                    "--progress-accent": item.module.accent,
                    "--progress-soft": item.module.soft,
                  } as React.CSSProperties
                }
              >
                <div className="module-progress-main">
                  <div>
                    <strong>{item.module.title}</strong>
                    <span>
                      {item.latest
                        ? `Latest: ${item.latest.scenario}`
                        : readinessEvidence[item.module.id]}
                    </span>
                  </div>
                  <div className="module-progress-track" aria-label={`${item.percent}% complete`}>
                    <span style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
                <div className="module-progress-result">
                  <strong>{item.completed}/{item.total}</strong>
                  <span>
                    {item.bestScore === null
                      ? "Not started"
                      : `Best ${item.bestScore}%`}
                  </span>
                </div>
                <button type="button" onClick={() => onOpenModule(item.module.id)}>
                  {item.completed ? "Continue" : "Start"} <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="readiness-action-panel">
          <span className="section-kicker light">RCM readiness evidence</span>
          <h2>Build one complete work sample in every workflow.</h2>
          <p>
            A module counts as practiced after at least one scenario is fully
            completed and scored during this session.
          </p>
          <div className="readiness-evidence-list">
            {moduleProgress.map((item) => (
              <div className={item.completed ? "complete" : ""} key={item.module.id}>
                <span>{item.completed ? "✓" : "○"}</span>
                <div>
                  <strong>{item.module.navLabel}</strong>
                  <small>{readinessEvidence[item.module.id]}</small>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onOpenModule(nextModule.id)}>
            {practicedModules === modules.length
              ? `Continue ${nextModule.navLabel}`
              : `Next: ${nextModule.navLabel}`}
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>
    </div>
  );
}

function ModuleWorkspace({
  module,
  learnerName,
  scenario,
  selectedScenario,
  workspaceTab,
  activeStep,
  progress,
  score,
  toast,
  onSelectScenario,
  onSelectTab,
  onSelectStep,
  onCompleteStep,
  onCheck,
  onNotes,
  onDisposition,
  onSaveCompletion,
  logs,
}: {
  module: TrainingModule;
  learnerName: string;
  scenario: Scenario;
  selectedScenario: number;
  workspaceTab: WorkspaceTab;
  activeStep: number;
  progress: CaseProgress;
  score: number;
  toast: string;
  onSelectScenario: (index: number) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectStep: (step: number) => void;
  onCompleteStep: () => void;
  onCheck: (index: number) => void;
  onNotes: (notes: string) => void;
  onDisposition: (disposition: string) => void;
  onSaveCompletion: () => void;
  logs: CompletionLog[];
}) {
  const currentStep = scenario.steps[activeStep];
  const caseProgress = Math.round(
    (progress.completedSteps.length / scenario.steps.length) * 100,
  );
  const moduleLogs = logs.filter((log) => log.module === module.title);

  return (
    <div
      className="module-page page-enter"
      style={
        {
          "--module-accent": module.accent,
          "--module-soft": module.soft,
        } as React.CSSProperties
      }
    >
      <section className="module-header">
        <div>
          <span className="section-kicker">{module.eyebrow}</span>
          <h1>{module.title}</h1>
          <p>{module.description}</p>
        </div>
        <div className="module-header-stat">
          <strong>{module.metric}</strong>
          <span>{module.metricLabel}</span>
        </div>
      </section>

      <section className="scenario-rail" aria-label="Training scenarios">
        {module.scenarios.map((item, index) => (
          <button
            key={item.id}
            className={
              index === selectedScenario
                ? "scenario-card scenario-card-active"
                : "scenario-card"
            }
            onClick={() => onSelectScenario(index)}
            type="button"
          >
            <span className="scenario-number">0{index + 1}</span>
            <span className="scenario-card-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
            <span
              className={`priority-tag priority-${item.priority
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {item.priority}
            </span>
          </button>
        ))}
      </section>

      <PdfExportCenter
        learnerName={learnerName}
        moduleName={module.title}
        scenarioName={`${scenario.id} · ${scenario.title}`}
        reports={[
          {
            label: "Case review",
            description: "Account facts, financial detail, and work status",
            title: "Denial Case Review",
            sections: [
              {
                heading: "Account facts",
                lines: scenario.facts.map(
                  (fact) => `${fact.label}: ${fact.value}`,
                ),
              },
              {
                heading: "Financial breakdown",
                lines: scenario.breakdown.map(
                  (item) => `${item.label}: ${item.value}`,
                ),
              },
              {
                heading: "Progress",
                lines: [
                  `${progress.completedSteps.length} of ${scenario.steps.length} workflow steps completed`,
                  `${progress.checked.filter(Boolean).length} of 4 trainer criteria marked`,
                ],
              },
            ],
          },
          {
            label: "Decision worksheet",
            description: "Investigation notes and selected disposition",
            title: "Denial Decision Worksheet",
            sections: [
              {
                heading: "Scenario mission",
                lines: [scenario.mission],
              },
              {
                heading: "Learner notes",
                lines: [progress.notes || "No notes entered"],
              },
              {
                heading: "Disposition",
                lines: [progress.disposition || "No disposition selected"],
              },
            ],
          },
          {
            label: "Completion report",
            description: "Score, completion evidence, and final note",
            title: "Denial Completion Report",
            sections: [
              {
                heading: "Completion",
                lines: [
                  `Score: ${score}%`,
                  `Disposition: ${progress.disposition || "Not selected"}`,
                  `Completed workflow steps: ${progress.completedSteps.length}`,
                ],
              },
              {
                heading: "Final learner note",
                lines: [progress.notes || "No final note entered"],
              },
            ],
          },
        ]}
      />

      <div className="workspace-grid">
        <section className="case-workspace">
          <div className="case-toolbar">
            <div>
              <span className="case-id">
                {scenario.id} · {scenario.status}
              </span>
              <h2>{scenario.title}</h2>
            </div>
            <div className="case-amount">
              <span>Work item</span>
              <strong>{scenario.amount}</strong>
              <small>{scenario.age} old</small>
            </div>
          </div>

          <div className="tab-bar" role="tablist" aria-label="Case workspace">
            {(
              [
                ["brief", "Case brief"],
                ["workflow", "Guided workflow"],
                ["history", "History"],
                ["notes", "Notes"],
                ["complete", "Complete"],
              ] as [WorkspaceTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={workspaceTab === id}
                className={workspaceTab === id ? "tab tab-active" : "tab"}
                onClick={() => onSelectTab(id)}
              >
                {label}
                {id === "complete" && caseProgress > 0 ? (
                  <span className="tab-count">{caseProgress}%</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {workspaceTab === "brief" ? (
              <CaseBrief scenario={scenario} onStart={() => onSelectTab("workflow")} />
            ) : null}
            {workspaceTab === "workflow" ? (
              <WorkflowPanel
                scenario={scenario}
                activeStep={activeStep}
                completedSteps={progress.completedSteps}
                onSelectStep={onSelectStep}
                onCompleteStep={onCompleteStep}
              />
            ) : null}
            {workspaceTab === "history" ? (
              <HistoryPanel scenario={scenario} />
            ) : null}
            {workspaceTab === "notes" ? (
              <NotesPanel
                scenario={scenario}
                notes={progress.notes}
                onNotes={onNotes}
              />
            ) : null}
            {workspaceTab === "complete" ? (
              <CompletionPanel
                module={module}
                scenario={scenario}
                progress={progress}
                score={score}
                toast={toast}
                moduleLogs={moduleLogs}
                onDisposition={onDisposition}
                onSave={onSaveCompletion}
              />
            ) : null}
          </div>
        </section>

        <aside className="coach-panel">
          <div className="coach-panel-header">
            <div>
              <span className="section-kicker">Trainer view</span>
              <h3>Coach in the moment</h3>
            </div>
            <div
              className="score-orbit"
              style={{
                background: `conic-gradient(var(--module-accent) ${score}%, #e9e5dc 0)`,
              }}
              aria-label={`Current score ${score} percent`}
            >
              <span>{score}</span>
            </div>
          </div>

          <div className="coach-callout">
            <span>Ask the trainee</span>
            <p>{currentStep.prompt}</p>
          </div>

          <div className="listen-card">
            <span className="listen-icon">◎</span>
            <div>
              <strong>Listen for</strong>
              <p>{currentStep.listenFor}</p>
            </div>
          </div>

          <div className="criteria-block">
            <div className="criteria-heading">
              <strong>Live scorecard</strong>
              <span>{progress.checked.filter(Boolean).length}/4</span>
            </div>
            {coachCriteria.map((criterion, index) => (
              <label className="check-row" key={criterion}>
                <input
                  type="checkbox"
                  checked={progress.checked[index]}
                  onChange={() => onCheck(index)}
                />
                <span className="custom-check">✓</span>
                <span>{criterion}</span>
              </label>
            ))}
          </div>

          <div className="coach-footer">
            <span>Case progress</span>
            <strong>{caseProgress}%</strong>
            <div className="slim-progress">
              <span style={{ width: `${caseProgress}%` }} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CaseBrief({
  scenario,
  onStart,
}: {
  scenario: Scenario;
  onStart: () => void;
}) {
  return (
    <div className="case-brief-stack">
      {scenario.documentLines && scenario.correspondence ? (
        <article className="denial-pdf-page">
          <div className="pdf-document-toolbar">
            <span>PDF preview · Explanation of Benefits</span>
            <strong>{scenario.correspondence.reference}</strong>
          </div>
          <div className="denial-pdf-sheet">
            <header>
              <div>
                <span>{scenario.payer}</span>
                <h3>{scenario.correspondence.title}</h3>
              </div>
              <div>
                <span>Document date</span>
                <strong>{scenario.correspondence.date}</strong>
              </div>
            </header>
            <div className="denial-pdf-meta">
              <div>
                <span>Patient control / claim</span>
                <strong>{scenario.account}</strong>
              </div>
              <div>
                <span>Payer</span>
                <strong>{scenario.payer}</strong>
              </div>
              <div>
                <span>Work queue</span>
                <strong>{scenario.owner}</strong>
              </div>
            </div>
            <div className="system-table-wrap">
              <table className="system-table denial-eob-table">
                <thead>
                  <tr>
                    <th>CPT</th>
                    <th>Billed</th>
                    <th>Allowed</th>
                    <th>Paid</th>
                    <th>Adjustment</th>
                    <th>Patient</th>
                    <th>Codes</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.documentLines.map((line) => (
                    <tr key={line.cpt}>
                      <td>{line.cpt}</td>
                      <td>{line.billed}</td>
                      <td>{line.allowed}</td>
                      <td>{line.paid}</td>
                      <td>{line.adjustment}</td>
                      <td>{line.patient}</td>
                      <td>{line.codes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="denial-pdf-message">
              <span>Claim determination</span>
              <p>{scenario.correspondence.body}</p>
            </div>
            <footer>Fictional payer document · Training use only</footer>
          </div>
        </article>
      ) : null}

      <div className="case-brief-layout">
        <div className="brief-primary">
        <div className="story-block">
          <span className="mini-label">Situation</span>
          <p>{scenario.story}</p>
        </div>
        <div className="mission-block">
          <span className="mission-marker">Your mission</span>
          <p>{scenario.mission}</p>
          <button className="primary-button small" type="button" onClick={onStart}>
            Begin guided workflow <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="facts-grid">
          {scenario.facts.map((fact) => (
            <div className="fact" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
        </div>
        <div className="financial-card">
        <div className="financial-card-head">
          <span className="mini-label">Account snapshot</span>
          <span className="status-dot">Ready</span>
        </div>
        <div className="account-meta">
          <span>{scenario.account}</span>
          <strong>{scenario.payer}</strong>
          <small>{scenario.owner}</small>
        </div>
        <div className="breakdown-list">
          {scenario.breakdown.map((item) => (
            <div
              key={item.label}
              className={
                item.tone === "accent"
                  ? "breakdown-row breakdown-accent"
                  : "breakdown-row"
              }
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowPanel({
  scenario,
  activeStep,
  completedSteps,
  onSelectStep,
  onCompleteStep,
}: {
  scenario: Scenario;
  activeStep: number;
  completedSteps: number[];
  onSelectStep: (index: number) => void;
  onCompleteStep: () => void;
}) {
  const step = scenario.steps[activeStep];
  const isComplete = completedSteps.includes(activeStep);

  return (
    <div className="workflow-layout">
      <div className="step-list">
        {scenario.steps.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={
              index === activeStep
                ? "step-button step-active"
                : completedSteps.includes(index)
                  ? "step-button step-complete"
                  : "step-button"
            }
            onClick={() => onSelectStep(index)}
          >
            <span className="step-index">
              {completedSteps.includes(index) ? "✓" : index + 1}
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.kicker}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="step-detail">
        <span className="step-kicker">
          Step {activeStep + 1} of {scenario.steps.length} · {step.kicker}
        </span>
        <h3>{step.label}</h3>
        <p className="step-instruction">{step.instruction}</p>
        <div className="evidence-box">
          <span className="mini-label">Evidence to confirm</span>
          {step.evidence.map((item) => (
            <div className="evidence-row" key={item}>
              <span aria-hidden="true">◇</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
        <div className="practice-prompt">
          <span>Practice aloud</span>
          <p>“{step.prompt}”</p>
        </div>
        <div className="step-actions">
          <span>{isComplete ? "This step is complete." : "Complete when the evidence is clear."}</span>
          <button
            className={isComplete ? "secondary-button" : "primary-button small"}
            type="button"
            onClick={onCompleteStep}
          >
            {isComplete ? "Continue" : "Mark step complete"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ scenario }: { scenario: Scenario }) {
  return (
    <div className="history-panel">
      <div className="content-heading">
        <div>
          <span className="mini-label">Account chronology</span>
          <h3>History & supporting events</h3>
        </div>
        <span className="history-count">{scenario.history.length} events</span>
      </div>
      <div className="timeline">
        {scenario.history.map((item, index) => (
          <div className="timeline-item" key={`${item.date}-${item.title}`}>
            <div className="timeline-rail">
              <span>{index + 1}</span>
            </div>
            <div className="timeline-copy">
              <div>
                <strong>{item.title}</strong>
                <span>{item.date}</span>
              </div>
              <p>{item.detail}</p>
              <small>{item.actor}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesPanel({
  scenario,
  notes,
  onNotes,
}: {
  scenario: Scenario;
  notes: string;
  onNotes: (notes: string) => void;
}) {
  return (
    <div className="notes-layout">
      <div className="notes-editor">
        <div className="content-heading">
          <div>
            <span className="mini-label">Trainee documentation</span>
            <h3>Write the completion note</h3>
          </div>
          <span className="autosave-label">Session draft</span>
        </div>
        <label htmlFor="case-notes">Account note</label>
        <textarea
          id="case-notes"
          value={notes}
          onChange={(event) => onNotes(event.target.value)}
          placeholder={`Start with the verified facts for ${scenario.id}, then document the action, outcome, and next step...`}
        />
        <div className="editor-footer">
          <span>{notes.length} characters</span>
          <span>Use objective language · no real PHI</span>
        </div>
      </div>
      <aside className="note-prompts">
        <span className="mini-label">A complete note answers</span>
        {scenario.notePrompts.map((prompt, index) => (
          <div key={prompt}>
            <span>0{index + 1}</span>
            <p>{prompt}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}

function CompletionPanel({
  module,
  scenario,
  progress,
  score,
  toast,
  moduleLogs,
  onDisposition,
  onSave,
}: {
  module: TrainingModule;
  scenario: Scenario;
  progress: CaseProgress;
  score: number;
  toast: string;
  moduleLogs: CompletionLog[];
  onDisposition: (disposition: string) => void;
  onSave: () => void;
}) {
  const ready =
    progress.disposition &&
    progress.completedSteps.length === scenario.steps.length;

  return (
    <div className="completion-layout">
      <div className="completion-card">
        {toast ? <div className="success-banner">✓ {toast}</div> : null}
        <div className="completion-score">
          <div
            className="large-score-orbit"
            style={{
              background: `conic-gradient(var(--module-accent) ${score}%, #ece8df 0)`,
            }}
          >
            <span>
              <strong>{score}</strong>
              <small>/ 100</small>
            </span>
          </div>
          <div>
            <span className="mini-label">Session score</span>
            <h3>{score >= 85 ? "Ready to close" : "Keep coaching"}</h3>
            <p>
              {progress.completedSteps.length} of {scenario.steps.length} workflow
              steps and {progress.checked.filter(Boolean).length} of 4 coach
              criteria are complete.
            </p>
          </div>
        </div>

        <div className="completion-checks">
          {scenario.steps.map((step, index) => (
            <span
              className={
                progress.completedSteps.includes(index)
                  ? "completion-check done"
                  : "completion-check"
              }
              key={step.label}
            >
              {progress.completedSteps.includes(index) ? "✓" : "○"} {step.label}
            </span>
          ))}
        </div>

        <label className="select-label" htmlFor="disposition">
          Completion outcome
        </label>
        <select
          id="disposition"
          value={progress.disposition}
          onChange={(event) => onDisposition(event.target.value)}
        >
          <option value="">Choose an outcome…</option>
          <option value="resolved">Resolved correctly</option>
          <option value="follow-up">Correct follow-up established</option>
          <option value="escalated">Escalated appropriately</option>
          <option value="retry">Coaching retry recommended</option>
        </select>

        <button
          type="button"
          className="primary-button full"
          disabled={!ready}
          onClick={onSave}
        >
          Save completion log <span aria-hidden="true">↗</span>
        </button>
        {!ready ? (
          <p className="completion-hint">
            Finish all workflow steps and choose an outcome to enable completion.
          </p>
        ) : null}
      </div>

      <div className="module-log">
        <div className="content-heading">
          <div>
            <span className="mini-label">Module history</span>
            <h3>Recent completions</h3>
          </div>
        </div>
        {moduleLogs.length ? (
          moduleLogs.slice(0, 4).map((log) => (
            <div className="module-log-row" key={log.id}>
              <span className="log-badge">{log.score}</span>
              <div>
                <strong>{log.scenario}</strong>
                <span>
                  {log.learner} · {log.time}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-copy">
            Complete the first {module.title} case to start this log.
          </p>
        )}
      </div>
    </div>
  );
}
