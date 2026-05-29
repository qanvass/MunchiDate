/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./db/schema.js",
  out: "./drizzle-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/specialsdb"
  }
};
