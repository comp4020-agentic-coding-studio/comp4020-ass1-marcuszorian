import { levels, type Level } from "../data/levels";
import { routes, toggleLink, type Route } from "../lib/network";
import { markHintSeen, recordBreak, resetProgress, setHintsEnabled, shouldShowHint } from "../lib/progress";
import { saveProgress } from "../lib/persistence";
import type { FocusTarget } from "../lib/focus";
import { renderDiagram } from "./diagram";
import { applyCamera, initialCamera, wirePinchZoom, zoomCamera, type Camera } from "./zoom";
import { handleDiagramKeydown, focusSelectorFor } from "./keyboard";
import { maybeShowDeviceIntro } from "./overlays";
import { TUTORIAL_HINT_ID, isLastTutorialStep, tutorialSteps } from "./tutorial";
import { createInitialState, currentLevel, currentRoutes } from "./state";

document.addEventListener("DOMContentLoaded", () => {
  const svgEl = document.querySelector<SVGSVGElement>("#network")!;
  const counterEl = document.querySelector<HTMLElement>("#level-counter")!;
  const statusBarEl = document.querySelector<HTMLElement>("#status-bar")!;
  const levelTabsEl = document.querySelector<HTMLElement>("#level-tabs")!;
  const levelPagerLabel = document.querySelector<HTMLElement>("#level-pager-label")!;
  const levelPrevButton = document.querySelector<HTMLButtonElement>("#level-prev")!;
  const levelNextButton = document.querySelector<HTMLButtonElement>("#level-next")!;
  const zoomInButton = document.querySelector<HTMLButtonElement>("#zoom-in")!;
  const zoomOutButton = document.querySelector<HTMLButtonElement>("#zoom-out")!;
  const resetLevelButton = document.querySelector<HTMLButtonElement>("#reset-level")!;
  const calloutEl = document.querySelector<HTMLElement>("#tutorial-callout")!;
  const settingsButton = document.querySelector<HTMLButtonElement>("#settings-button")!;
  const settingsDialog = document.querySelector<HTMLDialogElement>("#settings-dialog")!;
  const settingsClose = document.querySelector<HTMLButtonElement>("#settings-close")!;
  const hintsToggle = document.querySelector<HTMLInputElement>("#hints-toggle")!;
  const resetProgressButton = document.querySelector<HTMLButtonElement>("#reset-progress")!;
  const deviceIntroDialog = document.querySelector<HTMLDialogElement>("#device-intro-dialog")!;
  const deviceIntroBody = document.querySelector<HTMLElement>("#device-intro-body")!;
  const deviceIntroDismiss = document.querySelector<HTMLButtonElement>("#device-intro-dismiss")!;

  const state = createInitialState();
  let camera: Camera = initialCamera();
  let pendingTutorialStart = false;

  function render(): void {
    const level = currentLevel(state);
    const found = currentRoutes(state);
    const connected = found.length > 0;

    renderDiagram(svgEl, level, state.broken, found[0]?.path ?? null, state.focus);
    updateStatusBar(found, connected);
    updateCounter();
    updateLevelNav(level);
  }

  function updateStatusBar(found: Route[], connected: boolean): void {
    if (!connected) {
      statusBarEl.textContent = "● Disconnected — no surviving route";
      return;
    }
    const cheapest = found[0];
    const hops = cheapest.path.length - 1;
    statusBarEl.textContent =
      `● Connected — ${hops} hop${hops === 1 ? "" : "s"}, ${cheapest.latency}ms ` +
      `(${found.length} surviving route${found.length === 1 ? "" : "s"})`;
  }

  function updateCounter(): void {
    counterEl.textContent = `✓ ${state.progress.completedLevels.size}/${levels.length}`;
  }

  function updateLevelNav(level: Level): void {
    for (const tab of levelTabsEl.querySelectorAll<HTMLElement>("[data-level-id]")) {
      const id = Number(tab.getAttribute("data-level-id"));
      tab.classList.toggle("is-current", id === level.id);
      tab.setAttribute("aria-selected", String(id === level.id));
      tab.classList.toggle("is-complete", state.progress.completedLevels.has(id));
    }
    levelPagerLabel.textContent = `Level ${state.levelIndex + 1} of ${levels.length}`;
  }

  function setFocus(target: FocusTarget): void {
    state.focus = target;
    render();
    svgEl.querySelector<SVGElement>(focusSelectorFor(target))?.focus();
  }

  function applyToggle(linkId: string): void {
    state.broken = toggleLink(state.broken, linkId);
    const level = currentLevel(state);
    const connected = routes(level, level.source, level.destination, state.broken).length > 0;
    state.progress = recordBreak(state.progress, level.id, connected);
    saveProgress(state.progress);

    if (state.tutorialStepIndex !== null) {
      const step = tutorialSteps[state.tutorialStepIndex];
      if (step.advanceOn === "toggle" && step.linkId === linkId) {
        advanceTutorial();
      }
    }

    render();
    if (state.focus) {
      svgEl.querySelector<SVGElement>(focusSelectorFor(state.focus))?.focus();
    }
  }

  function showTutorialStep(): void {
    if (state.tutorialStepIndex === null) return;
    const step = tutorialSteps[state.tutorialStepIndex];
    calloutEl.hidden = false;
    calloutEl.replaceChildren();

    const text = document.createElement("p");
    text.textContent = step.message;
    calloutEl.append(text);

    if (step.advanceOn === "manual") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button";
      button.textContent = isLastTutorialStep(state.tutorialStepIndex) ? "Got it" : "Next →";
      button.addEventListener("click", () => advanceTutorial());
      calloutEl.append(button);
    }

    positionCallout(step);
  }

  function positionCallout(step: (typeof tutorialSteps)[number]): void {
    const panel = svgEl.closest<HTMLElement>(".diagram-panel")!;
    const panelRect = panel.getBoundingClientRect();

    let anchorX = panelRect.width / 2;
    let anchorY = panelRect.height - 24;

    if (step.linkId) {
      const target = svgEl.querySelector<SVGGraphicsElement>(`[data-link-id="${step.linkId}"]`);
      if (target) {
        const targetRect = target.getBoundingClientRect();
        anchorX = targetRect.left + targetRect.width / 2 - panelRect.left;
        anchorY = targetRect.top + targetRect.height / 2 - panelRect.top;
      }
    }

    const calloutWidth = calloutEl.offsetWidth;
    const calloutHeight = calloutEl.offsetHeight;
    const margin = 12;

    const left = Math.min(
      Math.max(anchorX - calloutWidth / 2, margin),
      panelRect.width - calloutWidth - margin,
    );
    const top = Math.min(
      Math.max(anchorY - calloutHeight - margin, margin),
      panelRect.height - calloutHeight - margin,
    );

    calloutEl.style.left = `${left}px`;
    calloutEl.style.top = `${top}px`;
  }

  function advanceTutorial(): void {
    if (state.tutorialStepIndex === null) return;
    if (isLastTutorialStep(state.tutorialStepIndex)) {
      finishTutorial();
      return;
    }
    state.tutorialStepIndex += 1;
    showTutorialStep();
  }

  function finishTutorial(): void {
    state.tutorialStepIndex = null;
    calloutEl.hidden = true;
    calloutEl.replaceChildren();
    state.progress = markHintSeen(state.progress, TUTORIAL_HINT_ID);
    saveProgress(state.progress);
  }

  function startTutorial(): void {
    state.tutorialStepIndex = 0;
    showTutorialStep();
  }

  function goToLevel(index: number): void {
    state.levelIndex = index;
    state.broken = new Set();
    state.focus = null;
    state.tutorialStepIndex = null;
    calloutEl.hidden = true;
    calloutEl.replaceChildren();
    camera = initialCamera();
    applyCamera(svgEl, camera);
    render();
    svgEl.querySelector<SVGElement>('[tabindex="0"]')?.focus();

    const level = currentLevel(state);
    const types = [...new Set(level.nodes.map((n) => n.type))];
    const beforeHints = state.progress;
    state.progress = maybeShowDeviceIntro(deviceIntroDialog, deviceIntroBody, state.progress, types);
    const shownDeviceIntro = state.progress !== beforeHints;

    const tutorialEligible = level.isTutorial === true && shouldShowHint(state.progress, TUTORIAL_HINT_ID);
    if (tutorialEligible) {
      if (shownDeviceIntro) {
        pendingTutorialStart = true;
      } else {
        startTutorial();
      }
    }
  }

  svgEl.addEventListener("click", (event) => {
    const target = event.target as Element;
    const linkGroup = target.closest<SVGElement>("[data-link-id]");
    if (linkGroup) {
      const linkId = linkGroup.getAttribute("data-link-id")!;
      setFocus({ kind: "link", id: linkId });
      applyToggle(linkId);
      return;
    }
    const nodeGroup = target.closest<SVGElement>("[data-node-id]");
    if (nodeGroup) {
      setFocus({ kind: "node", id: nodeGroup.getAttribute("data-node-id")! });
    }
  });

  svgEl.addEventListener("keydown", (event) => {
    handleDiagramKeydown(event, currentLevel(state), state.focus, setFocus, applyToggle);
  });

  svgEl.addEventListener("focusin", (event) => {
    const el = event.target as Element;
    const nodeId = el.getAttribute("data-node-id");
    const linkId = el.getAttribute("data-link-id");
    if (nodeId) {
      state.focus = { kind: "node", id: nodeId };
    } else if (linkId) {
      state.focus = { kind: "link", id: linkId };
    }
  });

  zoomInButton.addEventListener("click", () => {
    camera = zoomCamera(camera, 0.8);
    applyCamera(svgEl, camera);
  });
  zoomOutButton.addEventListener("click", () => {
    camera = zoomCamera(camera, 1.25);
    applyCamera(svgEl, camera);
  });
  wirePinchZoom(svgEl, (factor) => {
    camera = zoomCamera(camera, factor);
    applyCamera(svgEl, camera);
  });

  resetLevelButton.addEventListener("click", () => {
    state.broken = new Set();
    state.focus = null;
    render();
  });

  levelTabsEl.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-level-id]");
    if (!button) return;
    const id = Number(button.getAttribute("data-level-id"));
    const index = levels.findIndex((level) => level.id === id);
    if (index >= 0) goToLevel(index);
  });
  levelPrevButton.addEventListener("click", () => {
    goToLevel((state.levelIndex - 1 + levels.length) % levels.length);
  });
  levelNextButton.addEventListener("click", () => {
    goToLevel((state.levelIndex + 1) % levels.length);
  });

  settingsButton.addEventListener("click", () => {
    hintsToggle.checked = state.progress.hintsEnabled;
    settingsDialog.showModal();
  });
  settingsClose.addEventListener("click", () => settingsDialog.close());
  hintsToggle.addEventListener("change", () => {
    state.progress = setHintsEnabled(state.progress, hintsToggle.checked);
    saveProgress(state.progress);
  });
  resetProgressButton.addEventListener("click", () => {
    state.progress = resetProgress(state.progress);
    saveProgress(state.progress);
    settingsDialog.close();
    render();
  });

  deviceIntroDismiss.addEventListener("click", () => {
    deviceIntroDialog.close();
    if (pendingTutorialStart) {
      pendingTutorialStart = false;
      startTutorial();
    }
  });

  goToLevel(0);
});
