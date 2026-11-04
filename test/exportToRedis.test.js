const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { exportToRedis } = require("../src/exportToRedis");

class FakeRedis {
  constructor() {
    this.store = new Map();
  }

  async set(key, value) {
    this.store.set(key, value);
  }
}

describe("exportToRedis", () => {
  it("writes subdomains JSON and cookie keys", async () => {
    const redis = new FakeRedis();
    const parsed = {
      subdomains: [
        "http://secureline.tools.avast.com",
        "http://gf.tools.avast.com",
      ],
      cookies: [
        { name: "dlp-avast", host: "amazon", value: "mmm_amz_dlp_777_ppc_m" },
      ],
    };

    const saved = await exportToRedis(redis, parsed);

    assert.equal(
      redis.store.get("subdomains"),
      JSON.stringify(parsed.subdomains)
    );
    assert.equal(
      redis.store.get("cookie:dlp-avast:amazon"),
      "mmm_amz_dlp_777_ppc_m"
    );
    assert.deepEqual(
      saved.map((item) => item.key),
      ["subdomains", "cookie:dlp-avast:amazon"]
    );
  });
});
