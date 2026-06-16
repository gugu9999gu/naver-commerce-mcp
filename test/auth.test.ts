import assert from "node:assert/strict";
import test from "node:test";

import { generateClientSecretSign } from "../src/auth.js";

// Official NAVER documentation sample vector.
test("generates the documented bcrypt + Base64 signature", () => {
  const signature = generateClientSecretSign(
    "aaaabbbbcccc",
    "$2a$10$abcdefghijklmnopqrstuv",
    1643961623299,
  );
  assert.equal(
    signature,
    "JDJhJDEwJGFiY2RlZmdoaWprbG1ub3BxcnN0dXVCVldZSk42T0VPdEx1OFY0cDQxa2IuTnpVaUEzbmsy",
  );
});
