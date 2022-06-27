import { assertEquals } from "https://deno.land/std@0.145.0/testing/asserts.ts";
import { parseJson } from "./tsjp.ts";

Deno.test("null", () => {
  const raw = "null";
  assertEquals(JSON.parse(raw), parseJson(raw));
});

Deno.test("bool", () => {
  const rawTrue = "true";
  assertEquals(JSON.parse(rawTrue), parseJson(rawTrue));
  const rawFalse = "false";
  assertEquals(JSON.parse(rawFalse), parseJson(rawFalse));
});

Deno.test("string", () => {
  const raw = `"foo"`;
  assertEquals(JSON.parse(raw), parseJson(raw));
});

Deno.test("number", () => {
  const raw = `42`;
  assertEquals(JSON.parse(raw), parseJson(raw));
});

Deno.test("array", () => {
  const raw = `[null, true, "foo", 42]`;
  assertEquals(JSON.parse(raw), parseJson(raw));
});

Deno.test("object", () => {
  const raw = `{"foo": 42, "bar": false, "baz": null}`;
  assertEquals(JSON.parse(raw), parseJson(raw));
});

Deno.test("nested", () => {
  const raw = `
  {
    "foo": [
      {
        "bar": {
        "baz": [42, false] 
        }
      },
      {"quox": 999}
    ],
    "bar": [[[42, null, true], {"foo": [1, 2, 3]}]]
  }`;
  assertEquals(JSON.parse(raw), parseJson(raw));
});
