export function requireCompanyId(activeCompanyId: string | null | undefined): string {
  if (!activeCompanyId) {
    throw new Error("Select or create a company first");
  }
  return activeCompanyId;
}

export function withCompanyId<T extends object>(values: T, companyId: string): T & { company_id: string } {
  return { ...(values as any), company_id: companyId };
}


