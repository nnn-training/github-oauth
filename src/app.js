"use strict";

const { Hono } = require("hono");
const { logger } = require("hono/logger");
const { html } = require("hono/html");
const { HTTPException } = require("hono/http-exception");
const { secureHeaders } = require("hono/secure-headers");
const { env } = require("hono/adapter");
const { serve } = require("@hono/node-server");
const { serveStatic } = require("@hono/node-server/serve-static");
const { trimTrailingSlash } = require("hono/trailing-slash");
const { githubAuth } = require('@hono/oauth-providers/github');
const { getIronSession } = require('iron-session');

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const photosRouter = require("./routes/photos");

const app = new Hono();

app.use(logger());
app.use(serveStatic({ root: "./public" }));
app.use(secureHeaders());
app.use(trimTrailingSlash());

// セッション管理用のミドルウェア（リクエスト→ミドル→ルート→レス）
app.use(async (c, next) => {
  const { SESSION_PASSWORD } = env(c);
  const session = await getIronSession(c.req.raw, c.res, {
    password: SESSION_PASSWORD,
    cookieName: 'session',
  });
  c.set('session', session);
  await next();
});

// GitHub認証
app.use('/auth/github', async (c, next) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env(c);
  const authHandler = githubAuth({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    scope: ['user:email'],
    oauthApp: true,
  });
  return await authHandler(c, next).catch(() => c.redirect('/login'));
});

// GitHub認証後の処理
app.get('/auth/github', async (c) => {
  const session = c.get('session');
  session.user = c.get('user-github');
  await session.save();
  return c.redirect('/');
});

app.route("/", indexRouter);
app.route("/users", usersRouter);
app.route("/photos", photosRouter);

app.notFound((c) => {
  return c.html(
    html`
      <!doctype html>
      <html>
        <head>
          <title>Not Found</title>
        </head>
        <body>
          <h1>Not Found</h1>
          <p>${c.req.url} の内容が見つかりませんでした。</p>
        </body>
      </html>
    `,
    404,
  );
});

app.onError((error, c) => {
  const statusCode = error instanceof HTTPException ? error.status : 500;
  const { NODE_ENV } = env(c);
  return c.html(
    html`
      <!doctype html>
      <html>
        <head>
          <title>Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <h2>${error.name} (${statusCode})</h2>
          <p>${error.message}</p>
          ${NODE_ENV === "development" ? html`<pre>${error.stack}</pre>` : ""}
        </body>
      </html>
    `,
    statusCode,
  );
});

const port = 3000;
console.log(`Server running at http://localhost:${port}/`);
serve({
  fetch: app.fetch,
  port,
});
