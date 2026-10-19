import { describe, expect, it } from "vitest";
import { pickLatestNode22 } from "./use-node22.mjs";

describe("pickLatestNode22", () => {
  it("picks the newest Node 22 at or above 22.12 and ignores other majors", () => {
    expect(
      pickLatestNode22([
        { version: "v24.18.0" },
        { version: "v22.11.0" },
        { version: "v22.14.0" },
        { version: "v22.22.0" },
        { version: "v23.11.0" },
      ]),
    ).toBe("v22.22.0");
  });

  it("returns null when the index has no usable Node 22", () => {
    expect(pickLatestNode22([{ version: "v20.18.0" }, { version: "v22.11.0" }])).toBeNull();
  });
});
