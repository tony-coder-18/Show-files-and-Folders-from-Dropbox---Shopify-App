// @ts-check
import { resolve } from "path";
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { Shopify, ApiVersion } from "@shopify/shopify-api";
import "dotenv/config";

import applyAuthMiddleware from "./middleware/auth.js";
import verifyRequest from "./middleware/verify-request.js";



//Library for fetching:
import bent from "bent";

import axios from "axios";

const getJSON = bent('json');


const USE_ONLINE_TOKENS = true;
const TOP_LEVEL_OAUTH_COOKIE = "shopify_top_level_oauth";

const PORT = parseInt(process.env.PORT || "8081", 10);
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD;

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.April22,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

import {Theme} from '@shopify/shopify-api/dist/rest-resources/2022-04/index.js';
import {Asset} from '@shopify/shopify-api/dist/rest-resources/2022-04/index.js';

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};
Shopify.Webhooks.Registry.addHandler("APP_UNINSTALLED", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) => {
    delete ACTIVE_SHOPIFY_SHOPS[shop];
  },
});

// export for test use only
export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
) {
  const app = express();
  app.set("top-level-oauth-cookie", TOP_LEVEL_OAUTH_COOKIE);
  app.set("active-shopify-shops", ACTIVE_SHOPIFY_SHOPS);
  app.set("use-online-tokens", USE_ONLINE_TOKENS);

  app.use(cookieParser(Shopify.Context.API_SECRET_KEY));

  app.use(bodyParser.urlencoded({extended: true}));

  applyAuthMiddleware(app);

  app.post("/webhooks", async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });

  app.get("/products-count", verifyRequest(app), async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(req, res, true);
    const { Product } = await import(
      `@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`
    );

    const countData = await Product.count({ session });
    res.status(200).send(countData);
  });
  
  // Get all the Themes
  let publisedTheme;

  let blocks = '{"blocks":[]}';
  let blocksObj;
  let blocksStr;

  app.get("/add-theme-section", verifyRequest(app), async (req,res) => {
    const session = await Shopify.Utils.loadCurrentSession(req, res, true);
  
    const allThemes = await Theme.all({ session });

    allThemes.forEach((theme)=>{
      if (theme.role=="main") {
        publisedTheme = theme;
      }
    });

    res.status(200).send(publisedTheme);

    //If it's the 1st time adading something, add the Section+block
    //if not, do nothing 'till you hear from me...
    const assets = await Asset.all({
      session: session,
      theme_id: publisedTheme.id,
    })

    /*
    assets.forEach((asset)=>{
      if (asset.key == "sections/dropbox_folder.liquid") {
        console.log("The section is already set");
        return
      }
    })
    */

    blocksObj = JSON.parse(blocks);
    blocksObj["blocks"].push({"type":"dropbox"});
    //blocksObj["blocks"] = [...blocksObj["blocks"], {"type":"dropbox"}];
    console.log(blocksObj);

    blocksStr = JSON.stringify(blocksObj);
    blocks = blocksStr; //save new item in the original array

    //Remove the array name to put it in the section
    //10 first characters and the last one
    blocksStr = blocksStr.slice(10);
    blocksStr = blocksStr.slice(0, blocksStr.length - 1);
    console.log(blocksStr);

    //Create the Section
    const asset = new Asset({ session });
    asset.theme_id = publisedTheme.id;
    asset.key = "sections/dropbox_folders.liquid";
    asset.value = `
                    <p>We are busy updating the store for you and will be back within the hour.</p>
                    {% for block in section.blocks %}
                      {% case block.type %}
                        {% when 'dropbox' %}
                          <div >
                          {%- unless block.settings.dropbox_text == blank -%}
                          {{ block.settings.dropbox_text | escape }}
                          {%- endunless -%}
                          </div>
                      {% endcase %}
                    {% endfor %}

                    {% schema %}
                    {
                      "name": "New Section",
                      "tag": "section",
                      "blocks": [
                        {
                          "type": "dropbox",
                          "name": "dropbox folder",
                          "settings": [
                            {
                              "type": "text",
                              "id": "dropbox_text",
                              "label": "Title Text"
                            }
                          ]
                        }
                      ],
                      "presets": [
                        {
                          "name": "New Section Test",
                          "blocks": ${blocksStr}
                        }]
                    }
                    {% endschema %}`;
    await asset.save({});

  });

  app.post("/add-theme-block", function(req,res){
    console.log(req);
  });

  /*app.post("/add-theme-section", verifyRequest(app),  function(req,res) {
    //const session = await Shopify.Utils.loadCurrentSession(req, res);

    let themeNum = req.body;

    console.log(themeNum);

    res.status(200).send(themeNum);
    
    const asset = new Asset({ session });
    asset.theme_id = themeNum;
    asset.key = "templates/index.liquid";
    asset.value = "<p>We are busy updating the store for you and will be back within the hour.</p>";
    await asset.save({});

    res.status(200).send(asset);
  });*/


  app.post("/graphql", verifyRequest(app), async (req, res) => {
    try {
      const response = await Shopify.Utils.graphqlProxy(req, res);
      res.status(200).send(response.body);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.use(express.json());

  app.use((req, res, next) => {
    const shop = req.query.shop;
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      res.setHeader(
        "Content-Security-Policy",
        `frame-ancestors https://${shop} https://admin.shopify.com;`
      );
    } else {
      res.setHeader("Content-Security-Policy", `frame-ancestors 'none';`);
    }
    next();
  });

  app.use("/*", (req, res, next) => {
    const { shop } = req.query;

    // Detect whether we need to reinstall the app, any request from Shopify will
    // include a shop in the query parameters.
    if (app.get("active-shopify-shops")[shop] === undefined && shop) {
      res.redirect(`/auth?${new URLSearchParams(req.query).toString()}`);
    } else {
      next();
    }
  });

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite;
  if (!isProd) {
    vite = await import("vite").then(({ createServer }) =>
      createServer({
        root,
        logLevel: isTest ? "error" : "info",
        server: {
          port: PORT,
          hmr: {
            protocol: "ws",
            host: "localhost",
            port: 64999,
            clientPort: 64999,
          },
          middlewareMode: "html",
        },
      })
    );
    app.use(vite.middlewares);
  } else {
    const compression = await import("compression").then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import("serve-static").then(
      ({ default: fn }) => fn
    );
    const fs = await import("fs");
    app.use(compression());
    app.use(serveStatic(resolve("dist/client")));
    app.use("/*", (req, res, next) => {
      // Client-side routing will pick up on the correct route to render, so we always render the index here
      res
        .status(200)
        .set("Content-Type", "text/html")
        .send(fs.readFileSync(`${process.cwd()}/dist/client/index.html`));
    });
  }

  

  

  return { app, vite };

}

if (!isTest) {
  createServer().then(({ app }) => app.listen(PORT));
}

//Get all themes
const app = express();

app.get("/add-theme-section-2", (req,res)=>{
  const shop = req.query.shop;

  /*const options = {
    method: 'GET',
    url: `https://${shop}/admin/api/2022-04/themes.json`,
  };

  axios.request(options)
  .then(function (response) {
    // handle success
    console.log(response.data);
    res.send(shop);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  */
 res.json({ user: 'tj' });
})
