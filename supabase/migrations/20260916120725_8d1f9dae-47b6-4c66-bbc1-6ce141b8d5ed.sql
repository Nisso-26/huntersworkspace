UPDATE public.baremes_hunters
SET tranche_min = 50001, updated_at = now()
WHERE service = 'deco' AND ordre = 3 AND tranche_min = 50000;

UPDATE public.modeles_documents
SET contenu_template = replace(contenu_template::text, '{{score_qualification}}/10', '{{score_qualification}}/13')::jsonb,
    updated_at = now()
WHERE contenu_template::text LIKE '%{{score_qualification}}/10%';