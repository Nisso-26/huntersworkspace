import { useState, useEffect } from 'react';

export interface AlertSettings {
  relance_client: boolean;
  chasse_30j: boolean;
  compromis_rappel: boolean;
  acte_signe_facture: boolean;
  pack_impaye: boolean;
  commission_attente: boolean;
  mandataire_inactif: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  relance_client: true,
  chasse_30j: true,
  compromis_rappel: true,
  acte_signe_facture: true,
  pack_impaye: true,
  commission_attente: true,
  mandataire_inactif: true,
};

const STORAGE_KEY = 'hunters_alert_settings';

export function useAlertSettings() {
  const [settings, setSettings] = useState<AlertSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggle = (key: keyof AlertSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return { settings, toggle };
}

// Map alert title patterns to setting keys
export function matchesAlertSetting(title: string): keyof AlertSettings | null {
  if (/relancer/i.test(title)) return 'relance_client';
  if (/point chasse/i.test(title)) return 'chasse_30j';
  if (/compromis|signature/i.test(title)) return 'compromis_rappel';
  if (/mettre la facture/i.test(title)) return 'acte_signe_facture';
  if (/impayé pack/i.test(title)) return 'pack_impaye';
  if (/commission en attente/i.test(title)) return 'commission_attente';
  if (/mandataire inactif/i.test(title)) return 'mandataire_inactif';
  return null;
}
