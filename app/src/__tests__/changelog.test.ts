declare const require: (m: string) => any;
declare const __dirname: string;
const fs = require("fs");
const path = require("path");
import { APP_VERSION, CHANGELOG } from "../changelog";

test("the newest changelog entry is the version in app.json", () => {
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, "../../app.json"), "utf8"));
  expect(APP_VERSION).toBe(app.expo.version);
});

test("CHANGELOG.md has every version, and versions only go up", () => {
  const md = fs.readFileSync(path.join(__dirname, "../../CHANGELOG.md"), "utf8");
  for (const r of CHANGELOG) expect(md).toContain(`## ${r.version} `);
  const n = (v: string) => v.split(".").reduce((a, x) => a * 1000 + Number(x), 0);
  for (let i = 1; i < CHANGELOG.length; i++) expect(n(CHANGELOG[i - 1].version)).toBeGreaterThan(n(CHANGELOG[i].version));
});
