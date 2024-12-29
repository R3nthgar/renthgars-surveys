import { CSSProperties, MouseEventHandler, ReactElement } from "react";

export const RichTextEditor = ({
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
  console.log([val?.replace(/<[^>]*>/g, "")]);
  return (
    <div className="borderer richtexteditor" style={style}>
      <div>{val?.replace(/<[^>]*>/g, "") || placeholder}</div>
      <div
        style={{
          background: val?.replace(/<[^>]*>/g, "") ? "inherit" : "none",
        }}
        contentEditable="true"
        dangerouslySetInnerHTML={val ? { __html: val } : undefined}
        onInput={(e) => {
          e.currentTarget.style.background =
            e.currentTarget.innerText.replaceAll("\n", "") ? "inherit" : "none";
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const child = parent.firstElementChild;
            if (child)
              child.innerHTML = e.currentTarget.innerText.replaceAll("\n", "")
                ? e.currentTarget.innerHTML
                : placeholder || "";
          }
          val = e.currentTarget.innerHTML;
          set(e.currentTarget.innerHTML);
        }}
      />
    </div>
  );
};

export function TextEditor({
  val,
  placeholder,
  remove,
  style,
  additional,
  set,
}: {
  val: string;
  placeholder?: string;
  remove?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
  additional?: ReactElement;
  set: (str: string) => void;
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
        <div>{val}</div>
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
            val = e.target.value;
            set(e.target.value);
          }}
          key={val}
          defaultValue={val}
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
