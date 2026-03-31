export const PROVIDER_BG: Record<string, string> = {
  google: 'rgba(66, 133, 244, 0.08)',
  aws: 'rgba(255, 153, 0, 0.08)',
  azurerm: 'rgba(0, 120, 212, 0.08)',
};

export function getProviderBg(provider?: string): string {
  if (!provider) return 'rgba(148, 163, 184, 0.08)';
  return PROVIDER_BG[provider] ?? 'rgba(148, 163, 184, 0.08)';
}
