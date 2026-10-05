export const browserFailureCodes = {
  profile_save: ["PROFILE_SAVE_CLIENT_FAILURE"],
  intro_request: ["INTRO_REQUEST_CLIENT_FAILURE"],
  billing_checkout: ["CHECKOUT_CLIENT_FAILURE"],
  billing_return: ["CHECKOUT_STATUS_FAILURE"],
  simulator_step: ["FEEDBACK_CLIENT_FAILURE", "PITCH_CLIENT_FAILURE", "ANSWER_CLIENT_FAILURE"],
} as const;

export type BrowserStage = keyof typeof browserFailureCodes;

export function isAllowedBrowserFailure(stage: unknown, code: unknown): stage is BrowserStage {
  return typeof stage === "string"
    && Object.prototype.hasOwnProperty.call(browserFailureCodes, stage)
    && typeof code === "string"
    && (browserFailureCodes[stage as BrowserStage] as readonly string[]).includes(code);
}
