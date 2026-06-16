import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isPathInsideRoot, loadAllowedImages } from "../src/files.js";

test("path containment rejects sibling-prefix paths", () => {
  assert.equal(isPathInsideRoot("/tmp/images/a.jpg", "/tmp/images"), true);
  assert.equal(isPathInsideRoot("/tmp/images-evil/a.jpg", "/tmp/images"), false);
});

test("loads an allowed image and rejects files outside roots", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "naver-commerce-mcp-"));
  try {
    const allowed = path.join(workspace, "allowed");
    const outside = path.join(workspace, "outside");
    await mkdir(allowed);
    await mkdir(outside);
    const allowedFile = path.join(allowed, "item.png");
    const outsideFile = path.join(outside, "item.png");
    await writeFile(allowedFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(outsideFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const images = await loadAllowedImages([allowedFile], [allowed], 1024);
    assert.equal(images.length, 1);
    assert.equal(images[0]?.mimeType, "image/png");
    await assert.rejects(() => loadAllowedImages([outsideFile], [allowed], 1024));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
