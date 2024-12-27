"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { decrypt } from "./encrypter";
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
export const addDoc = async (
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
export const delDoc = async (
  ...pushes: { collection: string; doc: string }[]
) => {
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
      : decrypt(data.password, process.env.ENCRYPTER_PRIVATEKEY) == password
      ? data
      : undefined;
  } catch (err) {
    console.log(err);
    return undefined;
  }
};
