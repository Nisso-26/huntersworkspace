// Helpers de formatage des nombres pour jsPDF.
// La locale fr-FR utilise U+202F (NARROW NO-BREAK SPACE) comme séparateur
// de milliers. Les polices WinAnsi par défaut de jsPDF (Helvetica) ne
// supportent pas ce caractère et l'affichent en "/" ou en blanc, ce qui
// produit des rendus du type "1 2 / 0 0 0 , 0 0".
// On remplace donc tous les espaces fins/insécables par une espace normale.

const sanitize = (s: string) => s.replace(/[\u202F\u00A0]/g, ' ');

export function pdfNumber(n: number | null | undefined, fractionDigits = 0): string {
  const v = typeof n === 'number' && isFinite(n) ? n : 0;
  return sanitize(
    v.toLocaleString('fr-FR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
  );
}

export function pdfEuro(n: number | null | undefined, fractionDigits = 0): string {
  return `${pdfNumber(n, fractionDigits)} €`;
}

export function pdfSanitize(s: string): string {
  return sanitize(s);
}
