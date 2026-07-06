import { runPlaywrightAudit as _runPlaywrightAudit } from './playwright-real';

export async function performAudit(siteUrl: string) {
  return _runPlaywrightAudit(siteUrl);
}

export { _runPlaywrightAudit as runPlaywrightAudit };

export interface AuditResult {
  checklist_items: Array<{ category: string; label: string; passed: boolean; details?: string }>;
  score_pct: number;
}
