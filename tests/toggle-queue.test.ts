import { describe, it, expect } from "vitest";
import { createItemToggleQueue } from "@/lib/toggle-queue";

describe("Per-item serialized toggle queue", () => {
  it("serializes rapid clicks on the same item in strict order", async () => {
    const queue = createItemToggleQueue();
    const order: string[] = [];

    const p1 = queue.enqueue("item-1", async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push("req-1:true");
    });
    const p2 = queue.enqueue("item-1", async () => {
      order.push("req-2:false");
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual(["req-1:true", "req-2:false"]);
  });

  it("tracks error status independently across concurrent items", async () => {
    const queue = createItemToggleQueue();
    const statuses: string[] = [];
    queue.subscribe((status) => statuses.push(status));

    const pFail = queue
      .enqueue("item-a", async () => {
        await new Promise((r) => setTimeout(r, 10));
        throw new Error("network");
      })
      .catch(() => {});

    const pOk = queue.enqueue("item-b", async () => {
      await new Promise((r) => setTimeout(r, 35));
    });

    await Promise.all([pFail, pOk]);
    // Item B finishing must NOT mask Item A's error
    expect(queue.getStatus()).toBe("error");
    expect(statuses[statuses.length - 1]).toBe("error");

    // Retrying Item A successfully clears error back to saved
    await queue.enqueue("item-a", async () => {});
    expect(queue.getStatus()).toBe("saved");
  });
});
