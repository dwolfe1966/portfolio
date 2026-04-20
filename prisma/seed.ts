import { reseed } from "../lib/seed";

async function main() {
  await reseed();
  console.log("Database seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
