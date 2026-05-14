-- Hot-path indexes
create index transactions_household_date_idx on public.transactions (household_id, date desc);
create index transactions_account_idx on public.transactions (household_id, account_id);
create index transactions_category_idx on public.transactions (household_id, category_id);
create index transactions_recurring_idx on public.transactions (household_id, recurring_id);
create index recurring_household_idx on public.recurring_rules (household_id, active) where deleted_at is null;
create index budgets_household_category_idx on public.budgets (household_id, category_id);
create index goals_household_idx on public.savings_goals (household_id) where deleted_at is null;
create index notes_household_pinned_idx on public.notes (household_id, pinned, updated_at desc);
create index reminders_household_date_idx on public.reminders (household_id, date) where done = false;
create index household_members_user_idx on public.household_members (user_id);
