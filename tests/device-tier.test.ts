import assert from "node:assert/strict";
import test from "node:test";
import { classifyDeviceSignals, type DeviceSignals } from "../src/lib/device-tier.ts";

const base: DeviceSignals = {
  userAgent: "",
  platform: "",
  maxTouchPoints: 0,
  finePointer: false,
};

test("keeps phones in Tier 2, including explicit mobile hints", () => {
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 }), "phone");
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "desktop-looking override", platform: "Linux", mobileHint: true, maxTouchPoints: 5, finePointer: true }), "phone");
});

test("keeps iPadOS and tablets with peripherals in Tier 2", () => {
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", platform: "iPad", maxTouchPoints: 5, finePointer: true }), "tablet");
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel", maxTouchPoints: 5, finePointer: true }), "tablet");
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel Tablet)", platform: "Linux armv8", maxTouchPoints: 10, finePointer: true }), "tablet");
});

test("keeps ambiguous touch and unknown devices in Tier 2", () => {
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (Windows NT 10.0)", platform: "Win32", maxTouchPoints: 10, finePointer: true }), "unknown");
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "CustomBrowser", platform: "", finePointer: true }), "unknown");
});

test("only classifies unambiguous fine-pointer computers as desktop", () => {
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32", finePointer: true }), "desktop");
  assert.equal(classifyDeviceSignals({ ...base, userAgent: "Mozilla/5.0 (X11; Linux x86_64)", platform: "Linux x86_64", finePointer: false }), "unknown");
});
