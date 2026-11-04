const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parseConfig } = require("../src/parseConfig");

const SAMPLE = `
<config>
  <subdomains>
    <subdomain>http://secureline.tools.avast.com</subdomain>
    <subdomain>http://gf.tools.avast.com</subdomain>
  </subdomains>
  <cookies>
    <!-- avast -->
    <cookie name="dlp-avast" host="amazon">mmm_amz_dlp_777_ppc_m</cookie>
    <cookie name="dlp-avg" host="filehippo">Mmm_fhp_dlp_779_ppc_m</cookie>
  </cookies>
</config>
`;

describe("parseConfig", () => {
  it("reads subdomains in document order and ignores comments", () => {
    const parsed = parseConfig(SAMPLE);
    assert.deepEqual(parsed.subdomains, [
      "http://secureline.tools.avast.com",
      "http://gf.tools.avast.com",
    ]);
  });

  it("reads cookie name, host, and value", () => {
    const parsed = parseConfig(SAMPLE);
    assert.deepEqual(parsed.cookies, [
      { name: "dlp-avast", host: "amazon", value: "mmm_amz_dlp_777_ppc_m" },
      { name: "dlp-avg", host: "filehippo", value: "Mmm_fhp_dlp_779_ppc_m" },
    ]);
  });

  it("parses the attached fixture", () => {
    const xml = fs.readFileSync(
      path.join(__dirname, "../fixtures/config.xml"),
      "utf8"
    );
    const parsed = parseConfig(xml);
    assert.equal(parsed.subdomains.length, 38);
    assert.equal(parsed.cookies.length, 46);
    assert.equal(parsed.subdomains[0], "http://secureline.tools.avast.com");
    assert.equal(parsed.subdomains.at(-1), "https://bits.avcdn.net");
  });
});
