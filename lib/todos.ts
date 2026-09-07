import type { TodoRow } from '@/types/database';

/**
 * Pure helpers for the todo list.
 *
 * These live here rather than beside the actions because `app/admin/
 * todo-actions.ts` carries `'use server'`, and such a module may only export
 * async functions — a synchronous export there is a build error, not a style
 * preference. Keeping the sorting logic pure also means it can be reasoned
 * about without a database.
 */

export type TodoBuckets = {
  open: TodoRow[];
  doneToday: TodoRow[];
  doneEarlier: TodoRow[];
};

export const PRIORITY_LABEL: Record<number, string> = {
  1: 'High',
  2: 'Normal',
  3: 'Low',
};

/**
 * Split into the three groups the page renders.
 *
 * "Done today" is its own group because finishing things is the part worth
 * seeing (FR-15). Older completed items collapse away rather than accumulating
 * into a wall that makes the open list harder to read.
 */
export function bucketTodos(todos: TodoRow[]): TodoBuckets {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const open: TodoRow[] = [];
  const doneToday: TodoRow[] = [];
  const doneEarlier: TodoRow[] = [];

  for (const todo of todos) {
    if (!todo.done) {
      open.push(todo);
    } else if (todo.completed_at && new Date(todo.completed_at) >= startOfToday) {
      doneToday.push(todo);
    } else {
      doneEarlier.push(todo);
    }
  }

  /* Due date first: an overdue task outranks a high-priority one with no
     deadline, because the deadline is the thing with a consequence. Then
     priority, then age. */
  open.sort((a, b) => {
    if (a.due_on && b.due_on && a.due_on !== b.due_on) return a.due_on < b.due_on ? -1 : 1;
    if (a.due_on && !b.due_on) return -1;
    if (!a.due_on && b.due_on) return 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.created_at < b.created_at ? -1 : 1;
  });

  doneToday.sort((a, b) => (a.completed_at! > b.completed_at! ? -1 : 1));

  return { open, doneToday, doneEarlier };
}

/** Overdue means strictly before today, so something due today is not late. */
export function isOverdue(todo: TodoRow): boolean {
  if (!todo.due_on || todo.done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(todo.due_on) < today;
}
