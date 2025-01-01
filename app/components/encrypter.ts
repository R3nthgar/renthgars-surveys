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
function getRandom(seed: unknown) {
  const ret = {
    seed,
    random: () => {
      const str = String(ret.seed);
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
    },
  };
  return ret;
}
function shuffle(
  arr: unknown[],
  seed: unknown = Math.random(),
  reverse?: boolean
) {
  const random = getRandom(seed);
  const tempArr = [...arr];
  if (!reverse) {
    return new Array(arr.length)
      .fill(undefined)
      .map(
        () =>
          tempArr.splice(
            Math.floor(Number(random.random()) * tempArr.length),
            1
          )[0]
      );
  } else {
    const retArr = new Array(arr.length).fill(undefined);
    const shuffled: number[] = shuffle(
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
export const encrypt = (text: string, seed: unknown) => {
  const chrArr = shuffle(encryptLib, seed);
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
  return shuffle(encrypted.split(""), seed).join("");
};
export const decrypt = (text: string, seed: unknown) => {
  const newtext = shuffle(text.split(""), seed, true).join("");
  const chrArr = shuffle(encryptLib, seed);
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
