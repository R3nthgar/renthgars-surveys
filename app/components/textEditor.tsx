/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CSSProperties, MouseEventHandler, ReactElement } from "react";

export const RichEditor = ({
  val,
  style,
  placeholder,
  set,
}: {
  val: string | undefined;
  style?: CSSProperties;
  placeholder?: string;
  set: (str: string) => void;
}) => {
  return (
    <div
      style={{
        padding: "25px",
        borderRadius: "15px",
        ...style,
      }}
      contentEditable="true"
      className="borderer"
      dangerouslySetInnerHTML={val ? { __html: val } : undefined}
      onInput={(e) => {
        val = e.currentTarget.innerHTML;
        set(e.currentTarget.innerHTML);
      }}
    />
  );
};

export function BetterTextArea({
  parent,
  keyVal,
  placeholder,
  remove,
  style,
  additional,
}: {
  parent: Record<string, any>;
  keyVal: string;
  placeholder?: string;
  remove?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
  additional?: ReactElement;
}) {
  return (
    <div
      className="borderer"
      style={{
        padding: "25px",
        overflow: "hidden",
        position: "relative",
        borderRadius: "15px",
        ...style,
      }}
    >
      <div
        style={{
          wordWrap: "break-word",
          position: "relative",
          minHeight: "inherit",
        }}
      >
        <div>{parent[keyVal]}</div>
        <textarea
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            textAlign: "center",
            height: "100%",
            width: "100%",
            borderRadius: 0,
          }}
          placeholder={placeholder}
          onChange={(e) => {
            const parentElement = e.target.parentElement;
            if (parentElement) {
              parentElement.children[0].innerHTML = e.target.value;
            }
            parent[keyVal] = e.target.value;
          }}
          key={parent[keyVal]}
          defaultValue={parent[keyVal]}
        ></textarea>
      </div>
      {remove ? (
        <button
          style={{ scale: 0.75, top: 0, right: 0 }}
          onClick={remove}
          className="delete"
        ></button>
      ) : (
        ""
      )}
      {additional}
    </div>
  );
}
