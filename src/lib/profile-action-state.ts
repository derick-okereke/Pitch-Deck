export type ProfileActionState = {
  status: "idle" | "saved" | "reviewing" | "review_ready" | "conflict" | "error";
  message: string;
  draftVersion?: number;
  startupId?: string;
  reviewId?: string;
  fieldErrors?: Record<string, string>;
  supportCode?: string;
};

export const initialProfileActionState: ProfileActionState = {
  status: "idle",
  message: "All changes saved",
};
