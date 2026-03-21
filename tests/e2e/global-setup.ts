import { cleanDatabase } from "./helpers/clean-database";

async function globalSetup() {
  await cleanDatabase();
}

export default globalSetup;
