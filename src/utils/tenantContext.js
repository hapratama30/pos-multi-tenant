/**
 * Require tenant ID — never fall back to demo tenant.
 */
export function requireTenantId(tenantId, context = 'component') {
  if (!tenantId) {
    console.warn(`[${context}] tenant_id missing — operation blocked`);
    return null;
  }
  return tenantId;
}

export function assertTenantId(tenantId, context = 'operation') {
  if (!tenantId) {
    throw new Error(`Tenant ID tidak tersedia. Silakan login ulang. (${context})`);
  }
  return tenantId;
}
