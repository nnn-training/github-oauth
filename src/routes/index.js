//URLごとの**ルーティング処理（画面やAPIの振り分け）**を定義するフォルダです
//機能ごとにファイルを分けることで、コードを整理しやすくしています。
//index /（トップページ）用ルート

const { Hono } = require("hono");
const { html } = require("hono/html");
const layout = require("../layout");

const app = new Hono();

app.get("/", (c) => {
  const session = c.get('session');
  return c.html(
    layout(
      'Home',
      html`
        <h1>Hello Hono!</h1>
        ${session.user
          ? html`
          <p>Hello, ${session.user.login}!</p>
          <p>
            <a href="/logout">Logout</a>
          </p>
          `
        :html`
          <p>
            <a href="login">Login</a>
          </p>
        `}
      `
    )
  );
});

module.exports = app;
