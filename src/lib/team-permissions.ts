/** Capabilities available to restricted staff in the current release. */
export const teamPermissionLabels: Record<string, string> = {
  "projects.read": "Consultar nomes dos projetos atribuídos",
  "finance.read": "Consultar o financeiro interno da Rotevo",
  "finance.write": "Operar o financeiro interno da Rotevo",
};

export function canGrantTeamPermission(permission: string) {
  return Object.hasOwn(teamPermissionLabels, permission);
}

export function teamPermissionLabel(permission: string) {
  return teamPermissionLabels[permission] ?? "Permissão indisponível nesta etapa";
}
