// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePreferencesStore } from "@/stores/preferences";
import type { ProviderKeys } from "@/lib/secrets";
import { getKey, setKey, getAllKeys } from "@/lib/secrets";
import ByokSettingsPanel from "./ByokSettingsPanel";

vi.mock("@/lib/window", () => ({
  setAlwaysOnTop: vi.fn(async () => {}),
  isAlwaysOnTop: vi.fn(async () => false),
}));

vi.mock("@/lib/secrets", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/secrets")>();
  return {
    ...mod,
    getKey: vi.fn(async (_p: string) => null),
    setKey: vi.fn(async (_p: string, _k: string) => {}),
    clearKey: vi.fn(async (_p: string) => {}),
    getAllKeys: vi.fn(async () => ({ groq: null, openrouter: null })),
  };
});

function setup(keys?: ProviderKeys) {
  usePreferencesStore.setState({
    apiKeys: keys ?? { groq: null, openrouter: null },
  });
  return render(<ByokSettingsPanel />);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  usePreferencesStore.setState({
    apiKeys: { groq: null, openrouter: null },
  });
});

test("prefills field from memory with zero keychain reads", async () => {
  setup({ groq: "sk-test-123", openrouter: null });
  const input = (await screen.findByPlaceholderText(/sk-/i)) as HTMLInputElement;
  expect(input.value).toBe("sk-test-123");
  expect(getKey).not.toHaveBeenCalled();
  expect(getAllKeys).not.toHaveBeenCalled();
});

test("save writes keychain once and serves later visits from memory", async () => {
  setup();
  const input = (await screen.findByPlaceholderText(/sk-/i)) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "sk-test-123" } });
  fireEvent.click(screen.getByRole("button", { name: /lưu cấu hình/i }));
  expect(await screen.findByText("Đã lưu vào Keychain")).toBeTruthy();
  expect(setKey).toHaveBeenCalledTimes(1);
  expect(getKey).not.toHaveBeenCalled();
});
