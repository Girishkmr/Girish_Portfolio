'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

/**
 * FR-15 write paths.
 *
 * Same rule as the post actions: every one re-checks the session, because a
 * Server Action is a callable POST endpoint and the proxy guard only covers
 * page navigations. The `own todos only` policy is the layer that holds if
 * this check were ever removed — it compares `owner` against `auth.uid()`, so
 * even a valid session belonging to someone else sees nothing.
 */

export type TodoResult = { ok: true } | { ok: false; error: string };

export async function addTodo(formData: FormData): Promise<TodoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const title = String(formData.get('title') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const dueOn = String(formData.get('due_on') ?? '').trim();
  const priority = Number(formData.get('priority') ?? 2);

  if (!title) return { ok: false, error: 'A todo needs a title.' };
  if (title.length > 300) return { ok: false, error: 'Title is too long.' };
  if (![1, 2, 3].includes(priority)) return { ok: false, error: 'Bad priority.' };

  const supabase = await createClient();

  // `owner` is deliberately not set here. The column defaults to auth.uid(),
  // so the database decides who owns the row — a client-supplied owner is
  // exactly the thing the RLS check exists to reject.
  const { error } = await supabase.from('todos').insert({
    title,
    notes: notes || null,
    due_on: dueOn || null,
    priority,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/todos');
  return { ok: true };
}

export async function toggleTodo(id: string, done: boolean): Promise<TodoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const supabase = await createClient();

  // done and completed_at move together or the CHECK constraint rejects the
  // row — which is the point of having the constraint rather than trusting
  // every future caller to remember.
  const { error } = await supabase
    .from('todos')
    .update({
      done,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/todos');
  return { ok: true };
}

export async function updateTodo(formData: FormData): Promise<TodoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const dueOn = String(formData.get('due_on') ?? '').trim();
  const priority = Number(formData.get('priority') ?? 2);

  if (!id) return { ok: false, error: 'Missing id.' };
  if (!title) return { ok: false, error: 'A todo needs a title.' };
  if (![1, 2, 3].includes(priority)) return { ok: false, error: 'Bad priority.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('todos')
    .update({
      title,
      notes: notes || null,
      due_on: dueOn || null,
      priority,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/todos');
  return { ok: true };
}

export async function deleteTodo(id: string): Promise<TodoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const supabase = await createClient();
  const { error } = await supabase.from('todos').delete().eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/todos');
  return { ok: true };
}
