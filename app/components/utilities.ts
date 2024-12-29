/* eslint-disable @typescript-eslint/no-explicit-any */
export function IDgen() {
  const text = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
  return new Array(10)
    .fill(undefined)
    .map(() => text[Math.floor(Math.random() * text.length)])
    .join("");
}
export const cookies = {
  add: (objs: Record<string, any>) => {
    if (typeof objs == "object") {
      Object.entries(objs).map(([key, value]) => {
        document.cookie = `${JSON.stringify(key)}=${JSON.stringify(value)}${
          value.expiration
            ? "; expires=" + new Date(value.expiration).toUTCString()
            : ""
        }}; path=/;`;
      });
      return true;
    }
    return false;
  },
  remove: (...key: any[]) => {
    key.map((value) => {
      document.cookie = `${JSON.stringify(
        value
      )}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  },
  get: (...key: any[]): Record<any, any> => {
    if (document.cookie) {
      const data: Record<string, any> = JSON.parse(
        `{${document.cookie
          .split("; ")
          .map((val) => [val.split("=")[0], val.split("=")[1]])
          .filter((val) =>
            key.length > 0
              ? key.map((o) => `${JSON.stringify(o)}`).includes(`${val[0]}`)
              : true
          )
          .map((val) => `${val[0]}:${val[1]}`)}}`
      );
      if (key.length) {
        cookies.get();
      } else {
        cookies.add(data);
      }
      return data;
    }
    return {};
  },
  clear: () => {
    cookies.remove(...Object.keys(cookies.get()));
  },
};
