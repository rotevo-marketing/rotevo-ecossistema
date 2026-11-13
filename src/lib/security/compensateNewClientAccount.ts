export type AuthRollbackResult =
  | { restored: true; reconciliationRequired: false }
  | { restored: false; reconciliationRequired: true; error: string };

type AuthAdmin = {
  auth: { admin: { deleteUser: (id: string) => Promise<{ error: { message: string } | null }> } };
};

/** Only call with the UID returned by createUser in the current request. */
export async function compensateNewClientAccount(
  admin: AuthAdmin,
  newlyCreatedUserId: string,
): Promise<AuthRollbackResult> {
  try {
    const { error } = await admin.auth.admin.deleteUser(newlyCreatedUserId);
    if (error) return { restored: false, reconciliationRequired: true, error: error.message };
    return { restored: true, reconciliationRequired: false };
  } catch {
    return { restored: false, reconciliationRequired: true, error: "Administrative rollback request failed" };
  }
}
