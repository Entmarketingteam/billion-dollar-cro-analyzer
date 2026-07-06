import { getGA4AuthUrl } from "@/lib/ga4";

describe("getGA4AuthUrl", () => {
  it("returns a Google OAuth authorize URL", () => {
    const url = getGA4AuthUrl();
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("requests offline access for a refresh token", () => {
    const url = getGA4AuthUrl();
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
  });

  it("requests the analytics readonly scope", () => {
    const url = getGA4AuthUrl();
    expect(url).toContain("analytics.readonly");
  });

  it("uses the authorization code response type", () => {
    const url = getGA4AuthUrl();
    expect(url).toContain("response_type=code");
  });
});
