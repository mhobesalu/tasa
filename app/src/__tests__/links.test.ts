import { HOMEWORK_SHOTS } from "../testdata/stuudium";
import { parsePasted } from "../importText";
import { findLinks, joinWrapped, linkLabel, normalizeUrl, splitLinks } from "../links";

describe("links", () => {
  it("finds links in running text and leaves the full stop out", () => {
    expect(findLinks("Vaata www.opiq.ee/kit/1 ja https://example.ope.ee/tera/r/1/1.")).toEqual([
      "https://www.opiq.ee/kit/1",
      "https://example.ope.ee/tera/r/1/1",
    ]);
    const parts = splitLinks("Loe (https://a.ee/x) läbi.");
    expect(parts.map((p) => p.text)).toEqual(["Loe (", "https://a.ee/x", ") läbi."]);
  });

  it("a link inside the teacher's text stays out of the title", () => {
    const [d] = parsePasted("K 25. november\nAjalugu\nLoe lk 30-34 ja vaata videot https://www.opiq.ee/kit/12.", "2026-11-19");
    expect(d.title).toBe("Loe lk 30-34 ja vaata videot");
    expect(d.note).toContain("https://www.opiq.ee/kit/12");
  });

  it("accepts typed addresses and rejects other text", () => {
    expect(normalizeUrl("opiq.ee/kit")).toBe("https://opiq.ee/kit");
    expect(normalizeUrl("http://x.ee")).toBe("http://x.ee");
    expect(normalizeUrl("loe lk 5")).toBeNull();
    expect(normalizeUrl("1.5")).toBeNull();
    expect(linkLabel("https://www.opiq.ee/")).toBe("opiq.ee");
  });

  it("joins lines broken by the screen edge, keeps links on their own line", () => {
    expect(joinWrapped(["Loe kodus läbi", "õpikutekst ja tee", "kodu-", "töö lõpuni.", "https://a.ee/x", "Materjal on Teras."])).toBe(
      "Loe kodus läbi õpikutekst ja tee kodutöö lõpuni.\nhttps://a.ee/x\nMaterjal on Teras.",
    );
  });

  it("text read from screenshots has no line breaks inside a sentence", () => {
    const d = parsePasted(HOMEWORK_SHOTS, "2026-11-10");
    expect(d.length).toBeGreaterThan(0);
    for (const x of d) for (const line of x.note.split("\n")) if (!/^https?:/.test(line)) expect(line).not.toMatch(/^\p{Ll}/u);
  });
});
