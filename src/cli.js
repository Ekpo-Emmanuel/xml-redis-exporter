const fs = require("fs");
const Redis = require("ioredis");
const { parseConfig } = require("./parseConfig");
const { exportToRedis } = require("./exportToRedis");

function parseArgs(argv) {
  let verbose = false;
  const rest = [];
  for (const arg of argv) {
    if (arg === "-v") {
      verbose = true;
    } else {
      rest.push(arg);
    }
  }
  return { verbose, xmlPath: rest[0] };
}

async function main() {
  const { verbose, xmlPath } = parseArgs(process.argv.slice(2));
  if (!xmlPath) {
    console.error("Usage: export.sh [-v] /path/to/xml");
    process.exit(1);
  }
  if (!fs.existsSync(xmlPath)) {
    console.error(`File not found: ${xmlPath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath, "utf8");
  const parsed = parseConfig(xml);
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null;
      }
      return 200;
    },
  });

  try {
    const saved = await exportToRedis(redis, parsed);
    if (verbose) {
      for (const item of saved) {
        console.log(item.key);
      }
    }
  } finally {
    await redis.quit();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
