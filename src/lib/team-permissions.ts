/** Capabilities available to restricted staff in the current release. */
export const teamPermissionLabels: Record<string, string> = {
  "projects.read": "Consultar nomes dos projetos atribuídos",
};

export function canGrantTeamPermission(permission: string) {
  return Object.hasOwn(teamPermissionLabels, permission);
}

export function teamPermissionLabel(permission: string) {
  return teamPermissionLabels[permission] ?? "Permissão indisponível nesta etapa";
}
