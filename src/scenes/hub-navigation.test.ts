import { describe, expect, it } from "vitest";
import {
  findFirstSelectableIndex,
  moveGridSelection,
} from "./hub-navigation";

const ALL_AVAILABLE = Array.from(
  { length: 9 },
  () => true,
);

describe("hub grid navigation", () => {
  it("finds the first selectable cell", () => {
    expect(
      findFirstSelectableIndex([
        false,
        false,
        true,
      ]),
    ).toBe(2);
  });

  it("moves horizontally", () => {
    expect(
      moveGridSelection(
        0,
        { rowDelta: 0, columnDelta: 1 },
        ALL_AVAILABLE,
      ),
    ).toBe(1);
  });

  it("wraps within the square grid", () => {
    expect(
      moveGridSelection(
        2,
        { rowDelta: 0, columnDelta: 1 },
        ALL_AVAILABLE,
      ),
    ).toBe(0);
  });

  it("skips an unavailable center cell", () => {
    const selectable = [...ALL_AVAILABLE];
    selectable[4] = false;

    expect(
      moveGridSelection(
        1,
        { rowDelta: 1, columnDelta: 0 },
        selectable,
      ),
    ).toBe(7);
  });

  it("keeps position when no cell is selectable", () => {
    expect(
      moveGridSelection(
        3,
        { rowDelta: 1, columnDelta: 0 },
        Array.from({ length: 9 }, () => false),
      ),
    ).toBe(3);
  });
});
