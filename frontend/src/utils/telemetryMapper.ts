/**
 * Telemetry Mapper - Sprint 4
 * Maps raw backend metrics to user-friendly "Social Proof" labels.
 */

export interface Telemetry {
  downloads: number;
  executions: number;
  trust_score: number;
}

export interface SocialProof {
  label: string;
  type: 'popularity' | 'activity' | 'trust' | 'new';
  isNumeric: boolean;
}

export const mapTelemetry = (metrics: Telemetry): SocialProof[] => {
  const proofs: SocialProof[] = [];

  // 1. Popularity (Installs)
  if (metrics.downloads > 100) {
    const displayNum = metrics.downloads > 1000 
      ? (metrics.downloads / 1000).toFixed(1) + 'k' 
      : metrics.downloads.toString();
    proofs.push({
      label: `${displayNum} Pengguna`,
      type: 'popularity',
      isNumeric: true
    });
  } else if (metrics.downloads > 50) {
    proofs.push({
      label: 'Populer',
      type: 'popularity',
      isNumeric: false
    });
  } else {
    proofs.push({
      label: 'Baru',
      type: 'new',
      isNumeric: false
    });
  }

  // 2. Trust Score
  if (metrics.trust_score >= 4.5) {
    proofs.push({
      label: 'Terpercaya',
      type: 'trust',
      isNumeric: false
    });
  }

  // 3. Activity (Executions)
  if (metrics.executions > 1000) {
    proofs.push({
      label: 'Aktivitas Tinggi',
      type: 'activity',
      isNumeric: false
    });
  }

  return proofs;
};
