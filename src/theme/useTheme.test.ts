import { describe, expect, it } from "vitest";
import { getInitialTheme } from "./useTheme";

describe("theme preference", () => {
  it("uses a stored preference before the system preference", () => {
    expect(getInitialTheme({ getItem: () => "light" }, true)).toBe("light");
    expect(getInitialTheme({ getItem: () => "dark" }, false)).toBe("dark");
  });

  it("falls back to the system preference", () => {
    expect(getInitialTheme({ getItem: () => null }, true)).toBe("dark");
    expect(getInitialTheme({ getItem: () => null }, false)).toBe("light");
  });
});
