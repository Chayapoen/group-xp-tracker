export type QueueSaveStatus = "saved" | "saving" | "error";

export function createItemToggleQueue() {
  const chains = new Map<string, Promise<void>>();
  const failedItems = new Set<string>();
  let inFlight = 0;
  const listeners = new Set<(status: QueueSaveStatus) => void>();

  function getStatus(): QueueSaveStatus {
    if (inFlight > 0) return "saving";
    if (failedItems.size > 0) return "error";
    return "saved";
  }

  function notify() {
    const status = getStatus();
    for (const fn of listeners) {
      fn(status);
    }
  }

  function subscribe(listener: (status: QueueSaveStatus) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function enqueue(itemId: string, task: () => Promise<void>): Promise<void> {
    inFlight += 1;
    failedItems.delete(itemId);
    notify();

    const prev = chains.get(itemId) ?? Promise.resolve();
    const run = prev
      .catch(() => {})
      .then(async () => {
        try {
          await task();
          failedItems.delete(itemId);
        } catch (err) {
          failedItems.add(itemId);
          throw err;
        } finally {
          inFlight = Math.max(0, inFlight - 1);
          notify();
        }
      });

    chains.set(
      itemId,
      run.catch(() => {})
    );

    return run;
  }

  return { enqueue, getStatus, subscribe };
}
