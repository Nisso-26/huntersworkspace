// Helpers de formatage des nombres pour jsPDF.
// La locale fr-FR utilise U+202F (NARROW NO-BREAK SPACE) et U+00A0 comme
// séparateurs de milliers / avant le symbole €. Les polices WinAnsi par
// défaut de jsPDF (Helvetica) ne supportent pas ces caractères et les
// rendent en "/" ou en caractères parasites (ex: "1 2 / 0 0 0 , 0 0 €").
// On remplace donc systématiquement les espaces fines/insécables par
// une espace normale.

const sanitize = (s: string) =>
  s.replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');

export function fmtPdfEur(value: number | null | undefined): string {
  const v = typeof value === 'number' && isFinite(value) ? value : 0;
  return sanitize(
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v)
  );
}

export function fmtPdfNum(value: number | null | undefined, decimals = 2): string {
  const v = typeof value === 'number' && isFinite(value) ? value : 0;
  return v.toFixed(decimals).replace('.', ',');
}

// Variante sans décimales avec séparateur de milliers (espace normale) + " €"
export function fmtPdfEurInt(value: number | null | undefined): string {
  const v = typeof value === 'number' && isFinite(value) ? value : 0;
  const formatted = sanitize(
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)
  );
  return `${formatted} €`;
}
