/**
 * Helper de pagination pour contourner la limite par défaut de 1000 lignes
 * imposée par PostgREST / Supabase. Récupère toutes les lignes par chunks
 * successifs jusqu'à épuisement.
 *
 * Usage :
 *   const rows = await fetchAllPaginated((from, to) =>
 *     supabase.from('dossiers').select('*').order('updated_at', { ascending: false }).range(from, to)
 *   );
 */
export async function fetchAllPaginated<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  chunkSize = 1000,
  hardLimit = 50000, // Garde-fou : on ne dépasse pas 50 000 lignes côté client
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (from < hardLimit) {
    const to = from + chunkSize - 1;
    const { data, error } = await query(from, to);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < chunkSize) break; // Plus de pages
    from += chunkSize;
  }
  return all;
}
