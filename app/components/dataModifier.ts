"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
//Firestore functions
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
console.log(process.env.FIREBASE_PROJECTID);
if (!getApps().length)
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECTID,
      clientEmail: process.env.FIREBASE_CLIENTEMAIL,
      privateKey: process.env.FIREBASE_PRIVATEKEY,
    }),
  });
const db = getFirestore();
export const addDoc = (
  ...pushes: { collection: string; doc: string; data: any; update?: boolean }[]
) => {
  const batch = db.batch();
  pushes.forEach((push) => {
    if (push.update)
      batch.update(db.collection(push.collection).doc(push.doc), push.data);
    else batch.set(db.collection(push.collection).doc(push.doc), push.data);
  });
  batch.commit();
};
export const delDoc = (...pushes: { collection: string; doc: string }[]) => {
  const batch = db.batch();
  pushes.forEach((push) => {
    batch.delete(db.collection(push.collection).doc(push.doc));
  });
  batch.commit();
};
export const getData = async (collection: string, doc: string) =>
  (await db.collection(collection).doc(doc).get())?.data();
export const getExists = async (collection: string, doc: string) =>
  (await getData(collection, doc)) != undefined;
export const getPassword = async (
  collection: string,
  doc: string,
  password: string
) => {
  try {
    const data = await getData(collection, doc);
    return !data
      ? undefined
      : (await decode(data.password)) == password
      ? data
      : undefined;
  } catch (err) {
    console.log(err);
    return undefined;
  }
};

//Encoding Functions
function strToHash(str: string) {
  let [h1, h2, h3, h4] = [1779033703, 3144134277, 1013904242, 2773480762];
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    [h1, h2, h3, h4] = [
      h2 ^ Math.imul(h1 ^ k, 597399067),
      h3 ^ Math.imul(h2 ^ k, 2869860233),
      h4 ^ Math.imul(h3 ^ k, 951274213),
      h1 ^ Math.imul(h4 ^ k, 2716044179),
    ];
  }
  [h1, h2, h3, h4] = [
    Math.imul(h3 ^ (h1 >>> 18), 597399067),
    Math.imul(h4 ^ (h2 >>> 22), 2869860233),
    Math.imul(h1 ^ (h3 >>> 17), 951274213),
    Math.imul(h2 ^ (h4 >>> 19), 2716044179),
  ];
  (h1 ^= h2 ^ h3 ^ h4), (h2 ^= h1), (h3 ^= h1), (h4 ^= h1);
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
function randomSeed(seed: any) {
  const str = String(seed);
  let [a, b, c, d] = strToHash(str);
  a |= 0;
  b |= 0;
  c |= 0;
  d |= 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  return (t >>> 0) / 4294967296;
}
function shuffle(arr: any[], seed?: any, reverse?: boolean) {
  let tempSeed = seed != undefined ? seed : Math.random();
  function random() {
    tempSeed = randomSeed(tempSeed);
    return tempSeed;
  }
  const tempArr = [...arr];
  if (!reverse) {
    return new Array(arr.length)
      .fill(undefined)
      .map(
        (val) => tempArr.splice(Math.floor(random() * tempArr.length), 1)[0]
      );
  } else {
    const retArr = new Array(arr.length).fill(undefined);
    const shuffled: any[] = shuffle(
      new Array(arr.length).fill(undefined).map((val, index) => index),
      seed
    );
    if (shuffled) {
      shuffled.map((val, index) => (retArr[val] = arr[index]));
      return retArr;
    } else return arr;
  }
}
const encryptLib = new Array(95)
  .fill(undefined)
  .map((value, index) => String.fromCharCode(index + 32));
export const encode = async (text: string) => {
  const chrArr = shuffle(encryptLib, process.env.ENCODER_PRIVATEKEY);
  let encoded = "";
  for (let i = 0; i < text.length; i++) {
    if (chrArr.includes(text[i])) {
      const rand = Math.floor(Math.random() * chrArr.length);
      encoded += chrArr[(chrArr.indexOf(text[i]) + rand) % chrArr.length];
      encoded += chrArr[rand];
    } else {
      encoded += text[i];
    }
  }
  return shuffle(encoded.split(""), process.env.ENCODER_PRIVATEKEY).join("");
};
const decode = async (text: string) => {
  const newtext = shuffle(
    text.split(""),
    process.env.ENCODER_PRIVATEKEY,
    true
  ).join("");
  const chrArr = shuffle(encryptLib, process.env.ENCODER_PRIVATEKEY);
  let decoded = "";
  for (let i = 0; i < newtext.length; i += 2) {
    if (chrArr.includes(newtext[i])) {
      if (i + 1 >= newtext.length) alert("Invalid Message");
      decoded +=
        chrArr[
          (chrArr.indexOf(newtext[i]) -
            chrArr.indexOf(newtext[i + 1]) +
            chrArr.length) %
            chrArr.length
        ];
    } else {
      decoded += newtext[i];
      i -= 1;
    }
  }
  return decoded;
};
