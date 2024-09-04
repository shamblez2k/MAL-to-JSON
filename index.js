const fs = require("fs");
const http = require("http");
const https = require("https");
const credentialsMAL = require("./auth/credentialsMAL.json");
const credentialsJB = require("./auth/credentialsJB.json");

const port = 3000;

const server = http.createServer();
server.on("request", requestHandler);
server.on("listening", listenHandler);
server.listen(port);

function listenHandler() {
  console.log(`Now listening on port ${port}`);
}

function requestHandler(req, res) {
  console.log(req.url);
  if (req.url === "/") {
    const form = fs.createReadStream("html/index.html");
    res.writeHead(200, { "Content-Type": "text/html" });
    form.pipe(res);
  } else if (req.url.startsWith("/search")) {
    const user_input = new URL(req.url, `https://${req.headers.host}`)
      .searchParams;
    console.log(user_input);
    const rankingType = user_input.get("type");
    const limit = user_input.get("limit");
    if (!rankingType || limit < 1) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Input Error</h1>");
    } else {
      const MAL_API = https.request(
        `https://api.myanimelist.net/v2/anime/ranking?ranking_type=${rankingType}$limit=${limit}`,
        { method: "GET", headers: credentialsMAL }
      );
      MAL_API.on("response", (MAL_res) => {
        if (MAL_res.statusCode >= 200 && MAL_res.statusCode < 300) {
          process_stream(MAL_res, after_MAL, res, rankingType);
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end("<h1>Invalid Input - Not Found</h1>");
        }
      });
      MAL_API.end();
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>Not Found</h1>");
  }
}

function process_stream(stream, callback, ...args) {
  let body = "";
  stream.on("data", (chunk) => (body += chunk));
  stream.on("end", () => callback(body, ...args));
}

function after_MAL(data, res, rankingType) {
  //const rankings = JSON.parse(data);
  //const postData = JSON.stringify(rankings);
  const JB_API = https.request(
    `https://api.jsonbin.io/v3/b`,
    {
      method: "POST",
      headers: { ...credentialsJB, "X-Bin-Name": `Top ${rankingType} Anime` },
    },
    (JB_res) => process_stream(JB_res, after_JB, res)
  );
  JB_API.end(data);
}

function after_JB(data, res) {
  const response = JSON.parse(data);
  const bin_name = response?.metadata?.name;

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    `<h1>Your results have been stored into your new bin called ${bin_name}`
  );
}
