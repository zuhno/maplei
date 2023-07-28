#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const parse = require("node-html-parser").parse;
const { Readable } = require("node:stream");
const fs = require("fs");
const fetch = require("node-fetch-polyfill");

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
  s: {
    alias: "size",
    describe: "image size",
    default: "96",
    choices: ["96", "180"],
    type: "string",
  },
};

const argv = yargs(hideBin(process.argv)).help().options(argvOptions).argv;

// -------------------------------

const RANKING_PAGE_URL =
  "https://maplestory.nexon.com/N23Ranking/World/Total?w=0";

const mapleScraper = async (nickname) => {
  const maplestoryRankingUrl = new URL(
    RANKING_PAGE_URL + `&c=${nickname}`
  ).toString();

  const response = await fetch(maplestoryRankingUrl);
  const responseTxt = await response.text();

  const parsedDocument = parse(responseTxt);
  const users = parsedDocument.querySelectorAll("td.left");

  const userInfos = {
    nick: "",
    avatar: "",
    ext: "",
  };

  for (const user of users) {
    const nickEl = user.querySelector("dl > dt > a > *:not(img)");
    const nick = nickEl?.["rawText"] || "";

    if (nick?.toLowerCase() !== nickname?.toLowerCase()) continue;

    const avatarImgEl = user.querySelector(".char_img > img:not(.bg)");
    const avatar = avatarImgEl?.["_rawAttrs"]["src"] || "";
    const splited = avatar.split(".");

    userInfos.nick = nick;
    userInfos.avatar = avatar;
    userInfos.ext = splited[splited.length - 1];
  }

  if (!userInfos.avatar) {
    console.log(`The user '${nickname}' does not exist.`);
    process.exit(1);
  }

  return userInfos;
};

const responseToReadable = (response) => {
  const reader = response.body.getReader();

  const rs = new Readable();

  rs._read = async () => {
    const result = await reader.read();
    if (!result.done) {
      rs.push(Buffer.from(result.value));
    } else {
      rs.push(null);
      return;
    }
  };

  return rs;
};

const downloadAvatar = async (path, size, user) => {
  const regex = /\/$/;

  const slash = regex.test(path) ? "" : "/";
  const uniq = Date.now();
  const filePath = `${path}${slash}${uniq}_${user.nick}.${user.ext}`;

  let avatarUrl = user.avatar;
  if (size === "96") {
    avatarUrl = user.avatar.replace("Character/180/", `Character/`);
  }

  const parsedAvatarUrl = new URL(avatarUrl).toString();
  const response = await fetch(parsedAvatarUrl);

  const file = fs.createWriteStream(filePath);

  responseToReadable(response)
    .on("end", () => {
      console.log("Download Complete.");
    })
    .pipe(file);
};

const main = async () => {
  const { n: nickname, p: downloadPath, s: size } = argv;

  const user = await mapleScraper(nickname);
  await downloadAvatar(downloadPath, size, user);
};

main();
