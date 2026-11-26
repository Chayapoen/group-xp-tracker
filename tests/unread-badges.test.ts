import { describe, it, expect } from "vitest";
import { computeUnreadTabs } from "@/lib/admin-notifications";

describe("Admin unread tab badges", () => {
  it("flags inactive tabs with newer activity timestamps and clears active tab", () => {
    const latest = {
      monitor: "2026-11-26T10:05:00.000Z",
      history: "2026-11-26T10:05:00.000Z",
      photos: "2026-11-26T09:00:00.000Z",
    };
    const lastSeen = {
      monitor: "2026-11-26T10:00:00.000Z",
      history: "2026-11-26T10:00:00.000Z",
      photos: "2026-11-26T09:30:00.000Z",
    };

    const unread = computeUnreadTabs(latest, lastSeen, "monitor");
    expect(unread.monitor).toBe(false); // active tab is read
    expect(unread.history).toBe(true); // newer than lastSeen & not active
    expect(unread.photos).toBe(false); // older than lastSeen
  });

  it("does not flag unread when there is no activity timestamp yet", () => {
    const unread = computeUnreadTabs(
      { monitor: null, history: null, photos: null },
      { monitor: null, history: null, photos: null },
      "users"
    );
    expect(unread).toEqual({ monitor: false, history: false, photos: false });
  });
});
