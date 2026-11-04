async function exportToRedis(redis, parsed) {
  const saved = [];
  const subdomainsJson = JSON.stringify(parsed.subdomains);
  await redis.set("subdomains", subdomainsJson);
  saved.push({ key: "subdomains", value: subdomainsJson });

  for (const cookie of parsed.cookies) {
    const key = `cookie:${cookie.name}:${cookie.host}`;
    await redis.set(key, cookie.value);
    saved.push({ key, value: cookie.value });
  }

  return saved;
}

module.exports = { exportToRedis };
