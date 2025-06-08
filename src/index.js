#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { Readable } = require("node:stream");
const fs = require("node:fs");
const fetch = require("node-fetch-polyfill");
require("dotenv").config();

// ---------- CLI Config -----------

const argvOptions = {
  n: {
    alias: "nick",
    required: true,
    describe: "maplestory nickname",
    type: "string",
  },
  p: {
    alias: "path",
    describe: "download path",
    default: process.cwd(),
    type: "string",
  },
};

const argv = yargs(hideBin(process.argv)).help().options(argvOptions).argv;

// -------------------------------

const mapleScraper = async (nickname) => {
  const maplestoryScouterUrl = new URL(
    process.env.MAPLE_URL + `/${nickname}`
  ).toString();

  const response = await fetch(maplestoryScouterUrl);
  const responseJson = await response.json();

  const info = responseJson?.basic;

  const userInfos = {
    nick: info?.character_name,
    avatar: info?.character_image,
  };

  if (!userInfos.avatar) {
    console.log(`The user '${nickname}' does not exist.`);
    process.exit(1);
  }

  return userInfos;
};

const getImageType = (contentType) => {
  const mimeToExt = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const extension = mimeToExt[contentType];

  return extension || "png";
};

const responseToReadable = (response) => {
  const reader = response.body.getReader();
  const rs = new Readable({
    read() {
      reader.read().then(
        ({ done, value }) => {
          if (done) {
            rs.push(null);
          } else {
            rs.push(Buffer.from(value));
          }
        },
        (err) => {
          rs.emit("error", err);
        }
      );
    },
  });

  return rs;
};

const downloadAvatar = (path, user) => {
  return new Promise(async (resolve, reject) => {
    const regex = /\/$/;

    const slash = regex.test(path) ? "" : "/";
    const uniq = Date.now();

    const avatarUrl = user.avatar;
    const parsedAvatarUrl = new URL(avatarUrl).toString();
    const response = await fetch(parsedAvatarUrl);
    const contentType = response.headers.get("Content-Type");
    const extension = getImageType(contentType);

    const filePath = `${path}${slash}${uniq}_${user.nick}.${extension}`;

    const file = fs.createWriteStream(filePath);

    responseToReadable(response)
      .on("error", (err) => {
        console.log("Download failed");
        reject(err);
      })
      .on("end", () => {
        console.log("Download Complete.");
        resolve();
      })
      .pipe(file);
  });
};

const main = async () => {
  const { n: nickname, p: downloadPath } = argv;

  try {
    const user = await mapleScraper(nickname);
    await downloadAvatar(downloadPath, user);
  } catch (error) {
    console.log("Error:", error);
    console.log(`Failed to load avatar information for '${nickname}'.`);
  }
};

main();
