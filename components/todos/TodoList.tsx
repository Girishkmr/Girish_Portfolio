'use client';

import { useOptimistic, useRef, useState, useTransition } from 'react';
import { addTodo, deleteTodo, toggleTodo } from '@/app/admin/todo-actions';
import { bucketTodos, isOverdue, PRIORITY_LABEL } from '@/lib/todos';
import type { TodoRow } from '@/types/database';

/**
 * FR-15. The todo list, with optimistic updates.
 *
 * "The row appears before the network confirms" is the requirement, and
 * `useOptimistic` is the supported way to do it: the optimistic value is
 * automatically discarded when the surrounding transition settles and the
 * server's real data arrives. Hand-rolling it with useState means owning the
 * rollback on failure, and getting that wrong leaves a checkbox showing a
 * state the database never accepted.
 *
 * Ticking something off is the most common action here and it must feel
 * instant — a checkbox that waits 300ms for a round trip before moving is the
 * difference between a tool you use daily and one you abandon.
 */

type OptimisticAction =
  | { kind: 'add'; todo: TodoRow }
  | { kind: 'toggle'; id: string; done: boolean }
  | { kind: 'delete'; id: string };

export function TodoList({ todos }: { todos: TodoRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [optimisticTodos, applyOptimistic] = useOptimistic(
    todos,
    (current: TodoRow[], action: OptimisticAction): TodoRow[] => {
      switch (action.kind) {
        case 'add':
          return [...current, action.todo];
        case 'toggle':
          return current.map((todo) =>
            todo.id === action.id
              ? {
                  ...todo,
                  done: action.done,
                  completed_at: action.done ? new Date().toISOString() : null,
                }
              : todo,
          );
        case 'delete':
          return current.filter((todo) => todo.id !== action.id);
      }
    },
  );

  const { open, doneToday, doneEarlier } = bucketTodos(optimisticTodos);

  function onAdd(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return;

    setError(null);
    formRef.current?.reset();

    startTransition(async () => {
      // A placeholder row so the item is on screen before the insert returns.
      // The id is temporary and is replaced wholesale when the transition
      // settles and the server's list arrives.
      applyOptimistic({
        kind: 'add',
        todo: {
          id: `optimistic-${Date.now()}`,
          owner: '',
          title,
          notes: String(formData.get('notes') ?? '').trim() || null,
          done: false,
          priority: Number(formData.get('priority') ?? 2),
          due_on: String(formData.get('due_on') ?? '') || null,
          completed_at: null,
          created_at: new Date().toISOString(),
        },
      });

      const result = await addTodo(formData);
      if (!result.ok) setError(result.error);
    });
  }

  function onToggle(todo: TodoRow) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ kind: 'toggle', id: todo.id, done: !todo.done });
      const result = await toggleTodo(todo.id, !todo.done);
      if (!result.ok) setError(result.error);
    });
  }

  function onDelete(id: string) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ kind: 'delete', id });
      const result = await deleteTodo(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <form
        ref={formRef}
        action={onAdd}
        className="flex flex-col gap-3 border border-rule bg-surface p-4"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="todo-title" className="label">
            New todo
          </label>
          <input
            id="todo-title"
            name="title"
            required
            maxLength={300}
            placeholder="What needs doing?"
            className="rounded-sm border border-rule bg-ground px-3 py-2.5 text-ink outline-none focus-visible:border-ink-3"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="todo-due" className="label">
              Due
            </label>
            <input
              id="todo-due"
              name="due_on"
              type="date"
              className="rounded-sm border border-rule bg-ground px-3 py-2 text-ink outline-none focus-visible:border-ink-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="todo-priority" className="label">
              Priority
            </label>
            <select
              id="todo-priority"
              name="priority"
              defaultValue="2"
              className="rounded-sm border border-rule bg-ground px-3 py-2 text-ink outline-none focus-visible:border-ink-3"
            >
              <option value="1">High</option>
              <option value="2">Normal</option>
              <option value="3">Low</option>
            </select>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="todo-notes" className="label">
              Notes
            </label>
            <input
              id="todo-notes"
              name="notes"
              className="rounded-sm border border-rule bg-ground px-3 py-2 text-ink outline-none focus-visible:border-ink-3"
            />
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          Add
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-ink-2">
          {error}
        </p>
      ) : null}

      <Group title={`Open · ${open.length}`} todos={open} onToggle={onToggle} onDelete={onDelete} pending={pending} />

      {doneToday.length > 0 ? (
        <Group
          title={`Done today · ${doneToday.length}`}
          todos={doneToday}
          onToggle={onToggle}
          onDelete={onDelete}
          pending={pending}
        />
      ) : null}

      {doneEarlier.length > 0 ? (
        <details className="border-t border-rule pt-5">
          <summary className="label cursor-pointer hover:text-ink">
            Done earlier · {doneEarlier.length}
          </summary>
          <div className="mt-4">
            <Group
              title=""
              todos={doneEarlier}
              onToggle={onToggle}
              onDelete={onDelete}
              pending={pending}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Group({
  title,
  todos,
  onToggle,
  onDelete,
  pending,
}: {
  title: string;
  todos: TodoRow[];
  onToggle: (todo: TodoRow) => void;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  return (
    <section>
      {title ? <h2 className="label mb-3 border-t border-rule pt-4">{title}</h2> : null}

      {todos.length === 0 ? (
        <p className="text-sm text-ink-3">Nothing here.</p>
      ) : (
        <ul className="flex flex-col">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-start gap-3 border-b border-rule py-3 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => onToggle(todo)}
                /* The label is on the input rather than a wrapping <label>
                   because the title can be 300 characters, and a click target
                   that large swallows text selection. */
                aria-label={`Mark "${todo.title}" as ${todo.done ? 'not done' : 'done'}`}
                className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
              />

              <div className="min-w-0 flex-1">
                <p className={todo.done ? 'text-ink-3 line-through' : 'text-ink'}>
                  {todo.title}
                </p>

                {todo.notes ? (
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">{todo.notes}</p>
                ) : null}

                <p className="label mt-1.5 flex flex-wrap gap-x-3">
                  {todo.due_on ? (
                    <time
                      dateTime={todo.due_on}
                      className={isOverdue(todo) ? 'text-accent' : ''}
                    >
                      {isOverdue(todo) ? 'Overdue · ' : 'Due '}
                      {new Date(todo.due_on).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </time>
                  ) : null}
                  {todo.priority !== 2 ? <span>{PRIORITY_LABEL[todo.priority]}</span> : null}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDelete(todo.id)}
                disabled={pending}
                aria-label={`Delete "${todo.title}"`}
                className="label shrink-0 hover:text-ink disabled:opacity-40"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
