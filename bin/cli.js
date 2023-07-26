#!/usr/bin/env node

const yargs = require("yargs");
const parse = require("node-html-parser").parse;
const { Readable } = require("node:stream");
const https = require("https");
const fs = require("fs");
const fetch = require("node-fetch-polyfill");

const argv = yargs.help().options({
  n: {
    alias: "nick",
    demandOption: true,
    describe: "maplestory nickname",
    type: "string",
  },
  p: {
    alias: "path",
    demandOption: false,
    describe: "download path",
    default: process.cwd(),
    type: "string",
  },
}).argv;

const mapleScraper = async (nickname) => {
  const maplestoryRankingUrl = new URL(
    `https://maplestory.nexon.com/N23Ranking/World/Total?c=${nickname}&w=0`
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

const downloadAvatar = async (path, user) => {
  const regex = /\/$/;

  const slash = regex.test(path) ? "" : "/";
  const uniq = Date.now();
  const filePath = `${path}${slash}${uniq}_${user.nick}.${user.ext}`;

  const file = fs.createWriteStream(filePath);

  const parsedAvatarUrl = new URL(user.avatar).toString();
  const response = await fetch(parsedAvatarUrl);

  responseToReadable(response)
    .on("end", () => {
      console.log("Download Complete.");
    })
    .pipe(file);
};

const main = async () => {
  const { n, p } = argv;

  const user = await mapleScraper(n);

  await downloadAvatar(p, user);
};

main();
