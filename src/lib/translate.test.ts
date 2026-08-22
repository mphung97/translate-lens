import { describe, it, expect, vi, beforeEach } from "vitest";
import { translate, TranslateError } from "./translate";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: ({ schema }: { schema: unknown }) => schema,
  },
}));

vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn(() => vi.fn(() => "mock-model")),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => "mock-model")),
}));

const mockGenerateText = vi.mocked(
  (await import("ai")).generateText as (...args: any[]) => Promise<any>,
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("translate", () => {
  it("should throw EMPTY_INPUT for empty string", async () => {
    await expect(
      translate({ text: "", targetLanguage: "vietnamese", provider: "groq", apiKey: "k" }),
    ).rejects.toThrow(TranslateError);

    await expect(
      translate({ text: "", targetLanguage: "vietnamese", provider: "groq", apiKey: "k" }),
    ).rejects.toMatchObject({ code: "EMPTY_INPUT" });
  });

  it("should throw EMPTY_INPUT for whitespace-only string", async () => {
    await expect(
      translate({ text: "   ", targetLanguage: "vietnamese", provider: "groq", apiKey: "k" }),
    ).rejects.toMatchObject({ code: "EMPTY_INPUT" });
  });

  it("should return translated text on success", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        detectedLanguage: "english",
        detectedText: "Hello world",
        translatedText: "Xin chào thế giới",
        pinyin: "",
      },
    });

    const result = await translate({
      text: "Hello world",
      provider: "groq",
      apiKey: "k",
    });

    expect(result).toEqual({
      detectedLanguage: "english",
      detectedText: "Hello world",
      translatedText: "Xin chào thế giới",
      pinyin: "",
    });
  });

  it("should include pinyin when input is Chinese", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        detectedLanguage: "chinese",
        detectedText: "你好世界",
        translatedText: "Xin chào thế giới",
        pinyin: "nǐ hǎo shì jiè",
      },
    });

    const result = await translate({
      text: "你好世界",
      provider: "groq",
      apiKey: "k",
    });

    expect(result).toEqual({
      detectedLanguage: "chinese",
      detectedText: "你好世界",
      translatedText: "Xin chào thế giới",
      pinyin: "nǐ hǎo shì jiè",
    });
  });

  it("should return unknown language when output is null", async () => {
    mockGenerateText.mockResolvedValueOnce({ output: null });

    const result = await translate({
      text: "Hello",
      provider: "groq",
      apiKey: "k",
    });

    expect(result).toEqual({
      detectedLanguage: "unknown",
      detectedText: "Hello",
      translatedText: "Hello",
      pinyin: "",
    });
  });

  it("should throw API_ERROR on Groq failure", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      translate({ text: "Hello", targetLanguage: "vietnamese", provider: "groq", apiKey: "k" }),
    ).rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("should re-throw TranslateError as-is", async () => {
    const original = new TranslateError("custom", "EMPTY_INPUT");
    mockGenerateText.mockRejectedValueOnce(original);

    await expect(
      translate({ text: "Hello", targetLanguage: "vietnamese", provider: "groq", apiKey: "k" }),
    ).rejects.toBe(original);
  });

  it("should throw MISSING_KEY when apiKey is empty", async () => {
    await expect(
      translate({ text: "Hello", provider: "groq", apiKey: "" }),
    ).rejects.toMatchObject({ code: "MISSING_KEY" });
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});
