-- P131.1: make the first manual run source-first and align saved settings with C131 R1-R14.
-- Preserve the user's municipality and delivery choices; replace only obsolete default search gates/source toggles.
UPDATE immofinder_settings
SET data = jsonb_set(
  data,
  '{search}',
  COALESCE(data->'search', '{}'::jsonb) || jsonb_build_object(
    'profile', 'burst',
    'defaultWave', 'full',
    'carouselCommunesPerRun', 12,
    'sources',
      ((COALESCE(data #> '{search,sources}', '{}'::jsonb) - 'swiss-portals') ||
        jsonb_build_object(
          'search', true,
          'portal-immoscout24', false,
          'portal-homegate', true,
          'portal-newhome', false,
          'portal-flatfox', false,
          'portal-tutti', true,
          'portal-anibis', false,
          'portal-petitesannonces', false,
          'portal-immobilier', false,
          'portal-acheter-louer', false,
          'portal-immostreet', false,
          'portal-home', false,
          'portal-icasa', false,
          'portal-urbanhome', false,
          'happyholiday', true,
          'ferienhausmiete', false,
          'landwirtschaft-gr', false
        )),
    'maxAiPages', 40,
    'limitPrice', false,
    'maxListingAgeDays', 0,
    'requirePrice', false,
    'rejectNonMonthly', false,
    'rejectSeekerPosts', true,
    'requireContact', false,
    'privateQueryTemplates', 2,
    'enrichSearchesPerRun', 0,
    'recheckContactSearch', false
  ),
  true
),
updated_at = now()
WHERE id = 'main';
