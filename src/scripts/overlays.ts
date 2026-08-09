import { markHintSeen, shouldShowHint, type ProgressState } from "../lib/progress";
import { saveProgress } from "../lib/persistence";
import { deviceHints } from "../data/deviceHints";
import type { NodeType } from "../data/levels";

export function maybeShowDeviceIntro(
  dialog: HTMLDialogElement,
  body: HTMLElement,
  progress: ProgressState,
  types: NodeType[],
): ProgressState {
  const unseen = types.filter((type) => shouldShowHint(progress, `device:${type}`));
  if (unseen.length === 0) {
    return progress;
  }

  body.replaceChildren();
  for (const type of unseen) {
    const hint = deviceHints[type];
    const section = document.createElement("div");
    section.className = "device-hint";

    const title = document.createElement("h3");
    title.textContent = hint.title;

    const description = document.createElement("p");
    description.textContent = hint.description;

    section.append(title, description);
    body.append(section);
  }

  let next = progress;
  for (const type of unseen) {
    next = markHintSeen(next, `device:${type}`);
  }
  saveProgress(next);
  dialog.showModal();
  return next;
}
