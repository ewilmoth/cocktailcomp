export function renderPage({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} &mdash; Woodhamptons Cocktail Competition</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: radial-gradient(ellipse at top, #241a12 0%, #0d0a08 60%);
    color: #f0e6d6;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .box { max-width: 380px; text-align: center; }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 3px;
    font-size: 11px;
    color: #caa25d;
    font-weight: 600;
    font-family: system-ui, sans-serif;
    margin-bottom: 10px;
  }
  h1 { color: #e0c58f; font-size: 26px; margin: 0 0 14px; }
  p { color: #a9987e; line-height: 1.6; font-size: 15px; }
  .btn {
    display: inline-block;
    margin-top: 22px;
    background: #caa25d;
    color: #1a1208;
    text-decoration: none;
    font-weight: bold;
    padding: 14px 32px;
    border-radius: 999px;
    border: none;
    font-size: 16px;
    font-family: system-ui, sans-serif;
    cursor: pointer;
  }
  a { color: #caa25d; }
</style>
</head>
<body>
  <div class="box">${body}</div>
</body>
</html>`;
}
