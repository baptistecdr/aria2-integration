import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFormValues } from "@/shared/ui/use-form-values";

describe("useFormValues", () => {
  it("starts from the initial values and updates one field at a time", () => {
    const { result } = renderHook(() => useFormValues(() => ({ name: "aria2", port: 6800 })));

    act(() => result.current[1]("port", 6801));

    expect(result.current[0]).toEqual({ name: "aria2", port: 6801 });
  });

  it("keeps the changes of successive updates", () => {
    const { result } = renderHook(() => useFormValues(() => ({ name: "aria2", port: 6800 })));

    act(() => {
      result.current[1]("name", "NAS");
      result.current[1]("port", 6801);
    });

    expect(result.current[0]).toEqual({ name: "NAS", port: 6801 });
  });
});
