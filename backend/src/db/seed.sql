BEGIN;

INSERT INTO roles (code, name, description)
VALUES
  ('super_admin', 'Super Admin', 'Full system access across all academies.'),
  ('admin', 'Admin', 'Administrative access for academy operations.'),
  ('coach', 'Coach', 'Coach role for working with groups and children.'),
  ('manager', 'Manager', 'Management role for planning and coordination.')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO questionnaires (code, version, title, description, is_active)
VALUES (
  'comfort_zone_parent_v1',
  1,
  'Въпросник за комфортна зона на детето',
  'Родителски въпросник за комфортна зона с оценки и поведенчески интерпретации.',
  TRUE
)
ON CONFLICT (code) DO UPDATE
SET
  version = EXCLUDED.version,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

INSERT INTO comfort_zone_spheres (code, name, display_order, is_active)
VALUES
  ('creativity', 'Креативност', 1, TRUE),
  ('sport_physical_activity', 'Спорт / Физическа активност', 2, TRUE),
  ('social_contact', 'Социален контакт', 3, TRUE),
  ('reading', 'Четене', 4, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

WITH subsphere_values AS (
  SELECT *
  FROM (
    VALUES
      ('creativity', 'art', 'Арт', 1),
      ('creativity', 'life_and_technique', 'Бит и Техника', 2)
  ) AS t(sphere_code, code, name, display_order)
), sphere_lookup AS (
  SELECT id, code
  FROM comfort_zone_spheres
)
INSERT INTO comfort_zone_subspheres (
  sphere_id,
  code,
  name,
  display_order,
  is_active
)
SELECT
  sl.id,
  sv.code,
  sv.name,
  sv.display_order,
  TRUE
FROM subsphere_values sv
INNER JOIN sphere_lookup sl ON sl.code = sv.sphere_code
ON CONFLICT (sphere_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

WITH action_values AS (
  SELECT *
  FROM (
    VALUES
      ('drawing_desire', 'creativity', 'art', 'Рисуване - желание / отношение', 'standard_comfort', 'score', TRUE, TRUE, 1),
      ('drawing_skill', 'creativity', 'art', 'Рисуване - умение / справяне', 'standard_comfort', 'score', TRUE, TRUE, 2),
      ('dancing_desire', 'creativity', 'art', 'Танци - желание / отношение', 'standard_comfort', 'score', TRUE, TRUE, 3),
      ('dancing_skill', 'creativity', 'art', 'Танци - умение / справяне', 'standard_comfort', 'score', TRUE, TRUE, 4),
      ('daily_life_skills', 'creativity', 'life_and_technique', 'Ежедневни битови умения', 'standard_comfort', 'score', TRUE, TRUE, 5),
      ('tools_and_technique', 'creativity', 'life_and_technique', 'Инструменти и техника', 'standard_comfort', 'score', TRUE, TRUE, 6),
      ('diy', 'creativity', 'life_and_technique', 'Направи си сам / DIY', 'standard_comfort', 'score', TRUE, TRUE, 7),
      ('general_physical_activity', 'sport_physical_activity', NULL, 'Обща физическа активност / отношение към спорт', 'standard_comfort', 'score', TRUE, TRUE, 8),
      ('temperament', 'social_contact', NULL, 'Характер / темперамент', 'temperament', 'score', TRUE, TRUE, 9),
      ('social_has_friends', 'social_contact', NULL, 'Социални контакти / има ли своя среда', 'standard_comfort', 'score', TRUE, TRUE, 10),
      ('joining_new_group', 'social_contact', NULL, 'Включване в нова група', 'standard_comfort', 'score', TRUE, TRUE, 11),
      ('stage_performance', 'social_contact', NULL, 'Представяне пред хора / сцена', 'standard_comfort', 'score', TRUE, TRUE, 12),
      ('emotional_sensitivity', 'social_contact', NULL, 'Обидчивост / широко скроеност', 'emotional_sensitivity', 'score', TRUE, TRUE, 13),
      ('rules_tendency', 'social_contact', NULL, 'Склонност към нарушаване на правила', 'rules_tendency', 'score', TRUE, TRUE, 14),
      ('reading_level', 'reading', NULL, 'Ниво на четене', 'standard_comfort', 'score', TRUE, TRUE, 15),
      ('reading_desire', 'reading', NULL, 'Желание за четене', 'standard_comfort', 'score', TRUE, TRUE, 16),
      ('favorite_sport', 'sport_physical_activity', NULL, 'Има ли конкретен любим спорт? Ако да - кой?', 'text_only', 'text', FALSE, FALSE, 17)
  ) AS t(code, sphere_code, subsphere_code, label, scale_type, input_type, is_required, has_note, display_order)
), sphere_lookup AS (
  SELECT id, code
  FROM comfort_zone_spheres
), subsphere_lookup AS (
  SELECT ss.id, ss.code, s.code AS sphere_code
  FROM comfort_zone_subspheres ss
  INNER JOIN comfort_zone_spheres s ON s.id = ss.sphere_id
)
INSERT INTO comfort_zone_actions (
  sphere_id,
  subsphere_id,
  code,
  label,
  scale_type,
  input_type,
  is_required,
  has_note,
  display_order,
  metadata,
  is_active
)
SELECT
  sl.id,
  ssl.id,
  av.code,
  av.label,
  av.scale_type,
  av.input_type,
  av.is_required,
  av.has_note,
  av.display_order,
  '{}'::jsonb,
  TRUE
FROM action_values av
INNER JOIN sphere_lookup sl ON sl.code = av.sphere_code
LEFT JOIN subsphere_lookup ssl
  ON ssl.sphere_code = av.sphere_code
  AND ssl.code = av.subsphere_code
ON CONFLICT (code) DO UPDATE
SET
  sphere_id = EXCLUDED.sphere_id,
  subsphere_id = EXCLUDED.subsphere_id,
  label = EXCLUDED.label,
  scale_type = EXCLUDED.scale_type,
  input_type = EXCLUDED.input_type,
  is_required = EXCLUDED.is_required,
  has_note = EXCLUDED.has_note,
  display_order = EXCLUDED.display_order,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active;

WITH question_values AS (
  SELECT *
  FROM (
    VALUES
      ('drawing_desire', 'drawing_desire', 'Рисуване - желание / отношение', 'score', TRUE, 1),
      ('drawing_skill', 'drawing_skill', 'Рисуване - умение / справяне', 'score', TRUE, 2),
      ('dancing_desire', 'dancing_desire', 'Танци - желание / отношение', 'score', TRUE, 3),
      ('dancing_skill', 'dancing_skill', 'Танци - умение / справяне', 'score', TRUE, 4),
      ('daily_life_skills', 'daily_life_skills', 'Ежедневни битови умения', 'score', TRUE, 5),
      ('tools_and_technique', 'tools_and_technique', 'Инструменти и техника', 'score', TRUE, 6),
      ('diy', 'diy', 'Направи си сам / DIY', 'score', TRUE, 7),
      ('general_physical_activity', 'general_physical_activity', 'Обща физическа активност / отношение към спорт', 'score', TRUE, 8),
      ('temperament', 'temperament', 'Характер / темперамент', 'score', TRUE, 9),
      ('social_has_friends', 'social_has_friends', 'Социални контакти / има ли своя среда', 'score', TRUE, 10),
      ('joining_new_group', 'joining_new_group', 'Включване в нова група', 'score', TRUE, 11),
      ('stage_performance', 'stage_performance', 'Представяне пред хора / сцена', 'score', TRUE, 12),
      ('emotional_sensitivity', 'emotional_sensitivity', 'Обидчивост / широко скроеност', 'score', TRUE, 13),
      ('rules_tendency', 'rules_tendency', 'Склонност към нарушаване на правила', 'score', TRUE, 14),
      ('reading_level', 'reading_level', 'Ниво на четене', 'score', TRUE, 15),
      ('reading_desire', 'reading_desire', 'Желание за четене', 'score', TRUE, 16),
      ('favorite_sport', 'favorite_sport', 'Има ли конкретен любим спорт? Ако да - кой?', 'text', FALSE, 17)
  ) AS t(code, action_code, label, input_type, is_required, display_order)
), questionnaire_lookup AS (
  SELECT id
  FROM questionnaires
  WHERE code = 'comfort_zone_parent_v1'
  LIMIT 1
), action_lookup AS (
  SELECT id, code, scale_type, has_note
  FROM comfort_zone_actions
)
INSERT INTO questionnaire_questions (
  questionnaire_id,
  action_id,
  code,
  label,
  help_text,
  input_type,
  is_required,
  display_order,
  metadata,
  is_active
)
SELECT
  ql.id,
  al.id,
  qv.code,
  qv.label,
  NULL,
  qv.input_type,
  qv.is_required,
  qv.display_order,
  jsonb_build_object(
    'scaleType', COALESCE(al.scale_type, 'text_only'),
    'hasNote', COALESCE(al.has_note, FALSE)
  ),
  TRUE
FROM question_values qv
CROSS JOIN questionnaire_lookup ql
LEFT JOIN action_lookup al ON al.code = qv.action_code
ON CONFLICT (questionnaire_id, code) DO UPDATE
SET
  action_id = EXCLUDED.action_id,
  label = EXCLUDED.label,
  input_type = EXCLUDED.input_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active;

COMMIT;
