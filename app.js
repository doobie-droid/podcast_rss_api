require("dotenv").config();
const express = require("express");
const https = require("https");
const ejs = require("ejs");
var fs = require("fs");
const bodyParser = require("body-parser");
const podcasts = []
let counterId = 0
const app = express();

app.use(express.json());
app.use(bodyParser.json());
var xmlJsonconverter = require("xml-js");

const port = process.env.PORT || 8080;
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

const xmlJsonFormatter = function (dataArray) {
  xmlData = Buffer.concat(dataArray).toString();
  jsonData = xmlJsonconverter.xml2json(xmlData, {
    compact: true,
    space: 4,
  });
  return JSON.parse(jsonData);
};
const downloadmp3 = function (url, dest, callback) {
  const file = fs.createWriteStream(dest);
  const request = https.get(url, function (response) {
    response.pipe(file);
    file.on("finish", function () {
      file.close(callback);
    });
    file.on("error", function (err) {
      fs.unlink(dest);
      if (callback) callback(err.message);
    });
  });
};
const errorLogger = function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log("Download complete");
  }
};

app.get("/", (req, res) => {
  res.redirect("/podcast/add");
});
app
  .route("/podcast/add")
  .get((req, res) => {

    res.render("homepage", {podcasts:podcasts});
  })
  .post((req, res) => {
    //API ENDPOINT RETURNS AN ARRAY OF PODCAST CONTENT
    let dataHolder = [];
    const { rssLink } = req.body;
    if (!rssLink) {
      res.status(400).send({ message: "we need a link" });
    } else {
        const request = https.get(rssLink, (response) => {
          console.log(response)
        response
          .on("data", (data) => {
            dataHolder.push(data);
          })
          .on("end", () => {
            jsonData = xmlJsonFormatter(dataHolder);
            res.redirect('/podcast/add')
            // res.send(jsonData["rss"]["channel"]["item"]);
            const emptyObject = {};
            emptyObject['id']= counterId
            emptyObject["title"] = jsonData["rss"]["channel"]["title"]["_cdata"]
              ? jsonData["rss"]["channel"]["title"]["_cdata"]
              : jsonData["rss"]["channel"]["title"]["_text"];
            emptyObject["description"] = jsonData["rss"]["channel"][
              "description"]["_cdata"]
              ? jsonData["rss"]["channel"]["description"]["_cdata"]
              : jsonData["rss"]["channel"]["description"]["_text"];
            emptyObject["image"] = jsonData["rss"]["channel"]['image']['url']['_text'];
            emptyObject['rssLink'] = rssLink
            podcasts.push(emptyObject)
            counterId++
            console.log(podcasts)
          })
          .on("error", (err) => {
            res.send(err.stack);
          });
        })
      request.end()
      request.on("error", function (e) {
        res.send(e)
      });
      
    }
  });
app
  .route("/podcast/episodes/:id")
  .get((req, res) => {
    let podcastDetails
    let dataHolder = [];
    https.get(podcasts[req.params.id]['rssLink'], (response) => {
      response
        .on("data", (data) => {
          dataHolder.push(data);
        })
        .on("end", () => {
          jsonData = xmlJsonFormatter(dataHolder);
          podcastDetails = jsonData["rss"]["channel"]["item"]
           res.render("episodes", {
             podcastInfo: podcasts[req.params.id],
             podcastPic: podcasts[req.params.id]['image'],
             podcastDetails: podcastDetails,
           });
        })
        .on("error", (err) => {
          res.send(err.stack);
        });
    });
   
  })
  .post((req, res) => {
    
  });
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

