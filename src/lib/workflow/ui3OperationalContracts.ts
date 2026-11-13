/**
 * UI 3.0 domain contracts. Pure helpers: do not mutate planning JSON or database state.
 * Activation and authorization remain server-side responsibilities.
 */
export type EditorialStatus =
  | "idea" | "idea_pending" | "idea_changes" | "idea_approved"
  | "production" | "recording" | "review" | "awaiting_client"
  | "changes_requested" | "approved" | "scheduled" | "published";
export type ClientActionStatus = "pending" | "in_progress" | "submitted" | "validated" | "correction_requested";
export type FormalDecisionPhase = "idea" | "final";
export type FormalDecision = "approved" | "changes_requested";
export type EditorialDates = { deadlineDate?: string | null; publishDate: string };
export type TaskDates = { dueDate?: string | null; launchDate?: string | null };

const editorialTransitions: Readonly<Record<EditorialStatus, readonly EditorialStatus[]>> = {
  idea: ["idea_changes", "idea_approved"],
  idea_pending: ["idea_changes", "idea_approved"], // legacy read compatibility only
  idea_changes: ["idea"],
  idea_approved: ["production"],
  production: ["recording", "review"],
  recording: ["production", "review"],
  review: ["production", "awaiting_client"],
  awaiting_client: ["changes_requested", "approved"],
  changes_requested: ["production", "review"],
  approved: ["scheduled", "published"],
  scheduled: ["approved", "published"],
  published: [],
};
const actionTransitions: Readonly<Record<ClientActionStatus, readonly ClientActionStatus[]>> = {
  pending: ["in_progress", "submitted"],
  in_progress: ["submitted"],
  submitted: ["validated", "correction_requested"],
  correction_requested: ["pending", "in_progress", "submitted"],
  validated: [],
};

export function canTransitionEditorial(from: EditorialStatus, to: EditorialStatus): boolean {
  return editorialTransitions[from]?.includes(to) ?? false;
}
export function canTransitionClientAction(from: ClientActionStatus, to: ClientActionStatus): boolean {
  return actionTransitions[from]?.includes(to) ?? false;
}
export function isFormalDecisionDue(status: EditorialStatus, phase: FormalDecisionPhase, visibleToClient: boolean): boolean {
  if (!visibleToClient) return false;
  return phase === "idea" ? status === "idea" || status === "idea_pending" : status === "awaiting_client";
}
/** Deprecated status remains readable; it must not appear as a newly selectable UI state. */
export function isLegacyIdeaPending(status: EditorialStatus): boolean {
  return status === "idea_pending";
}
export function resultOfFormalDecision(phase: FormalDecisionPhase, decision: FormalDecision): EditorialStatus {
  if (phase === "idea") return decision === "approved" ? "idea_approved" : "idea_changes";
  return decision === "approved" ? "approved" : "changes_requested";
}
/** YYYY-MM-DD validation is strict and independent of the browser timezone. */
export function validLocalDate(value: string | null | undefined): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day;
}
export function validateEditorialDates(value: EditorialDates): string[] {
  const errors: string[]=[];
  if (!validLocalDate(value.deadlineDate)) errors.push("deadlineDate inválida");
  if (!validLocalDate(value.publishDate) || !value.publishDate) errors.push("publishDate inválida");
  if (errors.length===0 && value.deadlineDate && value.deadlineDate > value.publishDate)
    errors.push("Prazo de conclusão posterior à publicação");
  return errors;
}
export function validateTaskDates(value: TaskDates): string[] {
  const errors: string[]=[];
  if (!validLocalDate(value.dueDate)) errors.push("dueDate inválida");
  if (!validLocalDate(value.launchDate)) errors.push("launchDate inválida");
  if (errors.length===0 && value.dueDate && value.launchDate && value.dueDate > value.launchDate)
    errors.push("Prazo de entrega posterior ao lançamento");
  return errors;
}
/** Only a real account assignment counts; visibility alone never creates an obligation. */
export function assignedToClient(assigneeUserId: string | null | undefined, authenticatedUserId: string): boolean {
  return Boolean(assigneeUserId && authenticatedUserId && assigneeUserId === authenticatedUserId);
}
