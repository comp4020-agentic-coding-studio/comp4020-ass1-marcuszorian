export type TutorialStep = {
  message: string;
  /** When set, this step is only satisfied by toggling this exact link. */
  linkId?: string;
  advanceOn: "toggle" | "manual";
};

export const TUTORIAL_HINT_ID = "tutorial:level1";

export const tutorialSteps: TutorialStep[] = [
  {
    message: "This is a small network. Data travels from You to the Server along any surviving path.",
    advanceOn: "manual",
  },
  {
    message: "Tap this link to break it.",
    linkId: "direct",
    advanceOn: "toggle",
  },
  {
    message: "See how it rerouted? Traffic now takes a slower path.",
    advanceOn: "manual",
  },
  {
    message: "Tap Reset to try again, or move on to Level 2 whenever you're ready.",
    advanceOn: "manual",
  },
];

export function isLastTutorialStep(index: number): boolean {
  return index >= tutorialSteps.length - 1;
}
