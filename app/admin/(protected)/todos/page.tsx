import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { TodoList } from '@/components/todos/TodoList';
import type { TodoRow } from '@/types/database';

export const metadata: Metadata = {
  title: 'Todos',
  robots: { index: false, follow: false },
};

/**
 * FR-15. Private, and not linked from public navigation (REQUIREMENTS.html §3).
 *
 * The query has no `.eq('owner', ...)` because it does not need one: the
 * `own todos only` policy compares `owner` against `auth.uid()` on every row,
 * so this select can only ever return this user's todos. Adding the filter
 * would imply the policy might not hold.
 */
export default async function TodosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: true });

  const todos: TodoRow[] = data ?? [];

  return (
    <div className="shell max-w-3xl py-16">
      <p className="label mb-3">Admin</p>
      <h1 className="display mb-10 text-3xl lg:text-4xl">Todos</h1>

      {error ? (
        <p role="alert" className="mb-8 leading-relaxed text-ink-2">
          Could not load todos: {error.message}
        </p>
      ) : null}

      <TodoList todos={todos} />
    </div>
  );
}
