import { Random } from "./utilities";

const encryptLib = new Array(95)
  .fill(undefined)
  .map((value, index) => String.fromCharCode(index + 32));
export const encrypt = (text: string, seed: unknown) => {
  const random = new Random(seed);
  const chrArr = random.shuffle(encryptLib);
  let encrypted = "";
  for (let i = 0; i < text.length; i++) {
    if (chrArr.includes(text[i])) {
      const rand = Math.floor(Math.random() * chrArr.length);
      encrypted += chrArr[(chrArr.indexOf(text[i]) + rand) % chrArr.length];
      encrypted += chrArr[rand];
    } else {
      encrypted += text[i];
    }
  }
  return random.shuffle(encrypted.split("")).join("");
};
export const decrypt = (text: string, seed: unknown) => {
  const random = new Random(seed);
  const newtext = random.shuffle(text.split(""), true).join("");
  const chrArr = random.shuffle(encryptLib);
  let decrypted = "";
  for (let i = 0; i < newtext.length; i += 2) {
    if (chrArr.includes(newtext[i])) {
      if (i + 1 >= newtext.length) alert("Invalid Message");
      decrypted +=
        chrArr[
          (chrArr.indexOf(newtext[i]) -
            chrArr.indexOf(newtext[i + 1]) +
            chrArr.length) %
            chrArr.length
        ];
    } else {
      decrypted += newtext[i];
      i -= 1;
    }
  }
  return decrypted;
};
