import {
  describe,
  expect,
  it,
} from "vitest";
import {
  formatMenuOptionLabel,
} from "./menu-option";

describe("formatMenuOptionLabel", () => {
  it("wraps a selected option in angle markers", () => {
    expect(
      formatMenuOptionLabel("BEGIN RUN", true),
    ).toBe("> BEGIN RUN <");
  });

  it("leaves an unselected option unwrapped", () => {
    expect(
      formatMenuOptionLabel("EXIT STAGE", false),
    ).toBe("EXIT STAGE");
  });

  it("normalizes surrounding whitespace", () => {
    expect(
      formatMenuOptionLabel("  NEW RUN  ", true),
    ).toBe("> NEW RUN <");
  });
});
