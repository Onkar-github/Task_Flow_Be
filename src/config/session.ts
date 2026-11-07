import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

import { env } from "./env.js";

const PgSession = connectPgSimple(session);

const sessionPool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const sessionMiddleware = session({
  store: new PgSession({
    pool: sessionPool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),

  name: "ai_task_flow.sid",
  secret: env.SESSION_SECRET,

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
});