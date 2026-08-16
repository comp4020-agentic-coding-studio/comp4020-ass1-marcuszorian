import { levels, type Level } from "../data/levels";
import { toggleLink } from "../lib/network";
import { recordBreak, resetProgress, type ProgressState } from "../lib/progress";
import { loadProgress, saveProgress } from "../lib/persistence";
import type { FocusTarget } from "../lib/focus";
import { renderDiagram } from "./diagram";
import { applyCamera, initialCamera, panCamera, wireGestures, zoomCamera } from "./zoom";
import { handleDiagramKeydown, focusSelectorFor } from "./keyboard";
import { createLevelState, levelRoundTrip } from "./state";

document.addEventListener("DOMContentLoaded", () => {
  const counterEl = document.querySelector<HTMLElement>("#level-counter")!;
  const navToggle = document.querySelector<HTMLButtonElement>("#nav-toggle")!;
  const sectionNav = document.querySelector<HTMLElement>("#section-nav")!;
  const navScrim = document.querySelector<HTMLElement>("#nav-scrim")!;
  const resetProgressButton = document.querySelector<HTMLButtonElement>("#reset-progress")!;

  let progress: ProgressState = loadProgress();
  /** Every level's own "put it back how you found it", for the global reset. */
  const levelResets: (() => void)[] = [];

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

    function render(changedLinkId: string | null = null): void {
      const trip = levelRoundTrip(state);

      renderDiagram(svg, level, state.broken, state.focus, changedLinkId);

      if (trip) {
        const hops = trip.outbound.path.length - 1;
        statusEl.textContent =
          `● Connected: ${hops} hop${hops === 1 ? "" : "s"} · ${trip.outbound.latency}ms one-way · ` +
          `${trip.outbound.latency + trip.inbound.latency}ms RTT · ` +
          `${trip.survivingRoutes} surviving route${trip.survivingRoutes === 1 ? "" : "s"}`;
      } else {
        statusEl.textContent = "● Disconnected: no surviving route to any server";
      }

      // The way onward only appears once this level is actually broken.
      banner.hidden = trip !== null;
      bannerMessage.textContent = isLastLevel
        ? "Fully disconnected: you've broken the whole internet."
        : "Fully disconnected: nice work.";
    }

    function setFocus(target: FocusTarget): void {
      state.focus = target;
      render();
      svg.querySelector<SVGElement>(focusSelectorFor(target))?.focus();
    }

    function applyToggle(linkId: string): void {
      state.broken = toggleLink(state.broken, linkId);
      progress = recordBreak(progress, level.id, levelRoundTrip(state) !== null);
      saveProgress(progress);
      updateChrome();
      render(linkId);
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

    function restoreLevel(): void {
      state.broken = new Set();
      state.focus = null;
      setCamera(initialCamera());
      render();
    }

    resetLevel.addEventListener("click", restoreLevel);
    levelResets.push(restoreLevel);

    applyCamera(svg, state.camera);
    render();
  }

  // Tracked rather than read back off the element: HTMLElement["hidden"] is
  // boolean | string ("until-found"), which isn't a clean toggle source.
  let navOpen = false;
  const sidebarLayout = window.matchMedia("(min-width: 60rem)");

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
    if (!sidebarLayout.matches && (event.target as Element).closest("a")) {
      setNavOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navOpen) {
      setNavOpen(false);
      navToggle.focus();
    }
  });

  // Wide enough for a permanent sidebar; below this the same <nav> is a drawer.
  // The CSS makes the same call, and the attribute is dropped here too so the
  // sidebar isn't left marked hidden to assistive tech.
  function syncNavLayout(): void {
    if (sidebarLayout.matches) {
      navOpen = false;
      sectionNav.hidden = false;
      navScrim.hidden = true;
      navToggle.setAttribute("aria-expanded", "false");
    } else {
      setNavOpen(false);
    }
  }

  sidebarLayout.addEventListener("change", syncNavLayout);
  syncNavLayout();

  resetProgressButton.addEventListener("click", () => {
    // "Reset progress" means the whole thing back to how it shipped: the count
    // cleared, and every level's links repaired rather than left cut.
    progress = resetProgress();
    saveProgress(progress);
    for (const restore of levelResets) {
      restore();
    }
    updateChrome();
  });

  for (const level of levels) {
    wireLevel(level);
  }
  updateChrome();

  const header = document.querySelector<HTMLElement>(".app-header")!;
  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("is-scrolled", window.scrollY > 4);
    },
    { passive: true },
  );

  // Scrollspy: independent of updateChrome()'s is-complete toggling above —
  // this just tracks which section is on screen, not level progress.
  const navLinksBySection = new Map<string, HTMLElement>();
  for (const link of sectionNav.querySelectorAll<HTMLElement>(
    "[data-nav-section], [data-nav-level]",
  )) {
    const key = link.getAttribute("data-nav-section") ?? `level-${link.getAttribute("data-nav-level")}`;
    navLinksBySection.set(key, link);
  }
  const observedSections = [
    document.querySelector<HTMLElement>("#intro"),
    ...levels.map((level) => document.querySelector<HTMLElement>(`[data-level-id="${level.id}"]`)),
  ].filter((el): el is HTMLElement => el !== null);

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of navLinksBySection.values()) {
          link.classList.remove("is-current");
        }
        navLinksBySection.get(entry.target.id)?.classList.add("is-current");
      }
    },
    // rootMargin only accepts px/%, not rem, despite the CSS-margin-like syntax —
    // 88px mirrors the 5.5rem scroll-margin-top the sections already clear.
    { rootMargin: "-88px 0px -70% 0px" },
  );
  for (const section of observedSections) {
    sectionObserver.observe(section);
  }
});
