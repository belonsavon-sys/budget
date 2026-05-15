-- Wave 7 patch: recurring rules can stop at a target balance or after N occurrences,
-- in addition to the existing end_date. First non-null end mode wins (priority:
-- end_count → end_balance → end_date → never).

alter table public.recurring_rules
  add column if not exists end_balance numeric,
  add column if not exists end_count int;

comment on column public.recurring_rules.end_balance is
  'Stop generating occurrences once this rule''s account balance reaches this target. Income rules stop at-or-above, expense rules stop at-or-below.';
comment on column public.recurring_rules.end_count is
  'Stop generating after this many total occurrences (including past ones).';
