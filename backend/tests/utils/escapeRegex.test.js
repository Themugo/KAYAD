import { describe, it, expect } from "@jest/globals";
import { escapeRegex } from "../../utils/escapeRegex.js";

describe("escapeRegex", () => {
  it("escapes special regex characters", () => {
    const result = escapeRegex("test.value*");
    expect(result).toBe("test\\.value\\*");
  });

  it("escapes all special regex metacharacters", () => {
    const result = escapeRegex(".*+?^${}()|[]\\");
    expect(result).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("returns unchanged string when no special characters", () => {
    const result = escapeRegex("helloWorld123");
    expect(result).toBe("helloWorld123");
  });

  it("handles empty string", () => {
    const result = escapeRegex("");
    expect(result).toBe("");
  });

  it("handles non-string input by converting to string", () => {
    const result = escapeRegex(123);
    expect(result).toBe("123");
  });

  it("escapes parentheses", () => {
    const result = escapeRegex("test(value)");
    expect(result).toBe("test\\(value\\)");
  });

  it("escapes square brackets", () => {
    const result = escapeRegex("[test]");
    expect(result).toBe("\\[test\\]");
  });

  it("escapes dollar sign", () => {
    const result = escapeRegex("$100");
    expect(result).toBe("\\$100");
  });

  it("escapes caret", () => {
    const result = escapeRegex("^start");
    expect(result).toBe("\\^start");
  });

  it("escapes pipe", () => {
    const result = escapeRegex("a|b");
    expect(result).toBe("a\\|b");
  });

  it("escapes backslash", () => {
    const result = escapeRegex("path\\to\\file");
    expect(result).toBe("path\\\\to\\\\file");
  });

  it("handles complex real-world input like user search query", () => {
    const result = escapeRegex("hello (world) [test]?");
    expect(result).toBe("hello \\(world\\) \\[test\\]\\?");
  });
});
