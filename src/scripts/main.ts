import { levels, type Level } from "../data/levels";
import { toggleLink } from "../lib/network";
import { recordBreak, resetProgress, type ProgressState } from "../lib/progress";
import { loadProgress, saveProgress } from "../lib/persistence";
import type { FocusTarget } from "../lib/focus";
import { renderDiagram } from "./diagram";
import { applyCamera, initialCamera, panCamera, wireGestures, zoomCamera } from "./zoom";
import { handleDiagramKeydown, focusSelectorFor } from "./keyboard";
import { createLevelState, levelRoutes } from "./state";

document.addEventListener("DOMContentLoaded", () => {
  const counterEl = document.querySelector<HTMLElement>("#level-counter")!;
  const navToggle = document.querySelector<HTMLButtonElement>("#nav-toggle")!;
  const sectionNav = document.querySelector<HTMLElement>("#section-nav")!;
  const navScrim = document.querySelector<HTMLElement>("#nav-scrim")!;
  const settingsButton = document.querySelector<HTMLButtonElement>("#settings-button")!;
  const settingsDialog = document.querySelector<HTMLDialogElement>("#settings-dialog")!;
  const settingsClose = document.querySelector<HTMLButtonElement>("#settings-close")!;
  const resetProgressButton = document.querySelector<HTMLButtonElement>("#reset-progress")!;

  let progress: ProgressState = loadProgress();

  function updateChrome(): void {
    counterEl.textContent = `✓ ${progress.completedLevels.size}/${levels.length}`;
    for (const link of sectionNav.querySelectorAll<HTMLElement>("[data-nav-level]")) {
      const id = Number(link.getAttribute("data-nav-level"));
      link.classList.toggle("is-complete", progress.completedLevels.has(id));
    }
  }

  function wireLevel(level: Level): void {
    const section = document.querySelector<HTMLElement>(`[data-level-id="${level.id}"]`);
    if (!section) return;

    const svg = section.querySelector<SVGSVGElement>("[data-network]")!;
    const statusEl = section.querySelector<HTMLElement>("[data-status]")!;
    const banner = section.querySelector<HTMLElement>("[data-complete-banner]")!;
    const bannerMessage = section.querySelector<HTMLElement>("[data-complete-message]")!;
    const zoomIn = section.querySelector<HTMLButtonElement>("[data-zoom-in]")!;
    const zoomOut = section.querySelector<HTMLButtonElement>("[data-zoom-out]")!;
    const resetLevel = section.querySelector<HTMLButtonElement>("[data-reset-level]")!;

    const state = createLevelState(level);
    const isLastLevel = level.id === levels[levels.length - 1].id;

    function render(): void {
      const found = levelRoutes(state);
      const connected = found.length > 0;

      renderDiagram(svg, level, state.broken, found[0]?.path ?? null, state.focus);

      if (connected) {
        const cheapest = found[0];
        const hops = cheapest.path.length - 1;
        statusEl.textContent =
          `● Connected — ${hops} hop${hops === 1 ? "" : "s"}, ${cheapest.latency}ms each way ` +
          `(${cheapest.latency * 2}ms round trip, ` +
          `${found.length} surviving route${found.length === 1 ? "" : "s"})`;
      } else {
        statusEl.textContent = "● Disconnected — no surviving route to any server";
      }

      // The way onward only appears once this level is actually broken.
      banner.hidden = connected;
      bannerMessage.textContent = isLastLevel
        ? "Fully disconnected — you've broken the whole internet."
        : "Fully disconnected — nice work.";
    }

    function setFocus(target: FocusTarget): void {
      state.focus = target;
      render();
      svg.querySelector<SVGElement>(focusSelectorFor(target))?.focus();
    }

    function applyToggle(linkId: string): void {
      state.broken = toggleLink(state.broken, linkId);
      progress = recordBreak(progress, level.id, levelRoutes(state).length > 0);
      saveProgress(progress);
      updateChrome();
      render();
      if (state.focus) {
        svg.querySelector<SVGElement>(focusSelectorFor(state.focus))?.focus();
      }
    }

    function setCamera(next: typeof state.camera): void {
      state.camera = next;
      applyCamera(svg, state.camera);
    }

    svg.addEventListener("click", (event) => {
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

    svg.addEventListener("keydown", (event) => {
      handleDiagramKeydown(event, level, state.focus, setFocus, applyToggle);
    });

    svg.addEventListener("focusin", (event) => {
      const el = event.target as Element;
      const nodeId = el.getAttribute("data-node-id");
      const linkId = el.getAttribute("data-link-id");
      if (nodeId) {
        state.focus = { kind: "node", id: nodeId };
      } else if (linkId) {
        state.focus = { kind: "link", id: linkId };
      }
    });

    zoomIn.addEventListener("click", () => setCamera(zoomCamera(state.camera, 0.8)));
    zoomOut.addEventListener("click", () => setCamera(zoomCamera(state.camera, 1.25)));

    wireGestures(svg, {
      onZoom: (factor) => setCamera(zoomCamera(state.camera, factor)),
      onPan: (dxPx, dyPx) => {
        // preserveAspectRatio="meet" scales uniformly by whichever axis is
        // tighter, so one units-per-pixel figure covers both.
        const rect = svg.getBoundingClientRect();
        const unitsPerPx = Math.max(
          state.camera.width / rect.width,
          state.camera.height / rect.height,
        );
        setCamera(panCamera(state.camera, -dxPx * unitsPerPx, -dyPx * unitsPerPx));
      },
    });

    resetLevel.addEventListener("click", () => {
      state.broken = new Set();
      state.focus = null;
      setCamera(initialCamera());
      render();
    });

    applyCamera(svg, state.camera);
    render();
  }

  // Tracked rather than read back off the element: HTMLElement["hidden"] is
  // boolean | string ("until-found"), which isn't a clean toggle source.
  let navOpen = false;

  function setNavOpen(open: boolean): void {
    navOpen = open;
    sectionNav.hidden = !open;
    navScrim.hidden = !open;
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close topics menu" : "Open topics menu");
    if (open) {
      sectionNav.querySelector<HTMLAnchorElement>(".section-nav-link")?.focus();
    }
  }

  navToggle.addEventListener("click", () => setNavOpen(!navOpen));
  navScrim.addEventListener("click", () => setNavOpen(false));
  sectionNav.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) setNavOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navOpen) {
      setNavOpen(false);
      navToggle.focus();
    }
  });

  settingsButton.addEventListener("click", () => settingsDialog.showModal());
  settingsClose.addEventListener("click", () => settingsDialog.close());
  resetProgressButton.addEventListener("click", () => {
    progress = resetProgress();
    saveProgress(progress);
    settingsDialog.close();
    updateChrome();
  });

  for (const level of levels) {
    wireLevel(level);
  }
  updateChrome();
});
