import { redirect } from "next/navigation";

// Backward-compatible entrypoint from the approved V2 team release.
// The UI3 admin page validates the session and active admin authorization.
export default function LegacyTeamEntry() {
  redirect("/admin?section=team");
}
