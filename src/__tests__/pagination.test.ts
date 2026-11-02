import { describe, expect, it, vi } from "vitest";
import { allPages } from "../api/pagination";

describe("organization-scoped list pagination", () => {
  it("includes later pages without following server-provided hosts", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        data: { results: ["first"], next: "https://untrusted.example/?page=2" },
      })
      .mockResolvedValueOnce({ data: { results: ["second"], next: null } });
    await expect(allPages(fetch)).resolves.toEqual(["first", "second"]);
    expect(fetch.mock.calls).toEqual([[1], [2]]);
  });

  it("supports unpaginated application target and authorization responses", async () => {
    await expect(
      allPages(async () => ({ data: ["verified-target"] })),
    ).resolves.toEqual(["verified-target"]);
  });

  it.each(["?page=1", "?page=-1", "?page=bad", "?cursor=unsupported"])(
    "rejects a non-progressing or unsupported next link: %s",
    async (next) => {
      await expect(
        allPages(async () => ({ data: { results: [], next } })),
      ).rejects.toThrow("pagination");
    },
  );

  it("surfaces later-page permission errors instead of showing an empty history", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ data: { results: ["first"], next: "?page=2" } })
      .mockRejectedValueOnce(new Error("Access denied"));
    await expect(allPages(fetch)).rejects.toThrow("Access denied");
  });
});
