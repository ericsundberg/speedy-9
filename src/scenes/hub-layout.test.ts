import {
  describe,
  expect,
  it,
} from "vitest";
import {
  FINAL_STAGE_ID,
  STAGE_REGISTRY,
} from "../game/stage-registry";
import {
  getHubStagePresentation,
  HUB_STAGE_ORDER,
} from "./hub-layout";

describe("hub stage presentation", () => {
  it("uses all nine stages exactly once", () => {
    expect(HUB_STAGE_ORDER).toHaveLength(9);
    expect(new Set(HUB_STAGE_ORDER).size).toBe(9);

    expect(new Set(HUB_STAGE_ORDER)).toEqual(
      new Set(STAGE_REGISTRY.map((stage) => stage.id)),
    );
  });

  it("places the final stage in the center position", () => {
    expect(HUB_STAGE_ORDER[4]).toBe(FINAL_STAGE_ID);
  });

  it("provides one or two non-empty label lines", () => {
    for (const stageId of HUB_STAGE_ORDER) {
      const presentation = getHubStagePresentation(stageId);

      expect(presentation.labelLines.length).toBeGreaterThanOrEqual(1);
      expect(presentation.labelLines.length).toBeLessThanOrEqual(2);

      for (const line of presentation.labelLines) {
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  it("uses the Tic Tac Toe hub presentation", () => {
    expect(
      getHubStagePresentation("tower-climb"),
    ).toEqual({
      labelLines: ["TIC TAC", "TOE"],
      glyph: "tic-tac-toe",
    });
  });

  it("uses only Locked as the visible final-stage label", () => {
    expect(
      getHubStagePresentation(FINAL_STAGE_ID).labelLines,
    ).toEqual(["LOCKED"]);
  });
});
