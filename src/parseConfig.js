const { XMLParser } = require("fast-xml-parser");

function asArray(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseConfig(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });
  const doc = parser.parse(xml);
  const config = doc.config || {};
  const subdomains = asArray(config.subdomains && config.subdomains.subdomain).map(
    (item) => String(item)
  );
  const cookies = asArray(config.cookies && config.cookies.cookie).map((cookie) => {
    if (typeof cookie === "string") {
      return { name: "", host: "", value: cookie };
    }
    return {
      name: String(cookie["@_name"] ?? ""),
      host: String(cookie["@_host"] ?? ""),
      value: String(cookie["#text"] ?? ""),
    };
  });
  return { subdomains, cookies };
}

module.exports = { parseConfig };
