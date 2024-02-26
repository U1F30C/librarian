import { Config } from "meilisearch";
import express from "express";
import consolidate from "consolidate";

export async function startInstantMeiliSearchServer(
  config: Config,
  port: number
) {
  const app = express();
  app.engine("mustache", consolidate.mustache);
  app.set("view engine", "mustache");
  app.set("views", __dirname + "/frontend");

  app.get("/", (req, res) => {
    res.redirect("files/");
  });
  app.get("/files/", (req, res) => {
    res.render("main", { meilisearchUrl: config.host, apiKey: config.apiKey });
  });
  app.get("/files/:id", (req, res) => {
    res.render("file", {
      id: req.params.id,
      meilisearchUrl: config.host,
      apiKey: config.apiKey,
    });
  });

  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
}
