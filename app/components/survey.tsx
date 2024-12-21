"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CSSProperties,
  MouseEventHandler,
  MutableRefObject,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";
import { addDoc } from "./dataModifier";
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function Survey({
  recordData,
  survey,
}: {
  recordData?: boolean;
  survey: surveyClass;
}) {
  const [started, start] = useState(false);
  const [questionIndex, setIndex] = useState(-1);
  const results = useRef<Record<string, string>>({});
  const categories = useRef<Record<string, number>[]>([]);
  const questions = useRef<questionClass[]>([]);
  const question =
    questions.current[
      questionIndex >= 0 && questionIndex < questions.current.length
        ? questionIndex
        : 0
    ];
  const curResult = useRef<string[]>([]);
  useEffect(() => {
    if (!started) {
      [results.current, questions.current] = getQuestions(survey);
      start(true);
    }
  }, [started, survey]);
  function changeQuestion(moveIndex: number) {
    if (questionIndex >= 0) {
      if (question.type != "DIS") {
        if (!question.name)
          question.values.map(
            (val) =>
              (results.current[val.option] = curResult.current.includes(
                val.option
              )
                ? "Yes"
                : "No")
          );
        else
          results.current[question.name] =
            curResult.current.filter((val) => val).join(" & ") || "";
      }
      categories.current[questionIndex] = {};
      if (!["TXT", "DIS"].includes(question.type))
        curResult.current.map((val) => {
          const option = question.values.find(
            ({ option: name }) => name == val
          );
          if (option)
            Object.entries(option.categories).map(([key, val]) => {
              if (!categories.current[questionIndex][key])
                categories.current[questionIndex][key] = 0;
              categories.current[questionIndex][key] += val;
            });
        });
    }
    if (questionIndex + moveIndex >= 0) {
      if (questionIndex + moveIndex == questions.current.length && survey) {
        const totalCat: Record<string, number> = {};
        Object.keys(survey.categories).map((cat) => (totalCat[cat] = 0));
        categories.current.map((val) => {
          Object.entries(val).map(([cat, val]) => {
            totalCat[cat] += val;
          });
        });
        Object.keys(totalCat).map(
          (key) =>
            (totalCat[key] = Math.round(
              (totalCat[key] / (survey?.categories[key] || 1)) * 100
            ))
        );
        categories.current.push(totalCat);
        const temp: Record<string, any> = {};
        temp[IDgen()] = {
          Timestamp: new Date().toUTCString(),
          ...results.current,
          ...Object.entries(totalCat).reduce(
            (res: Record<string, any>, [key, val]) => (
              (res[key] = val + "%"), res
            ),
            {}
          ),
        };
        if (recordData)
          addDoc({
            collection: "results",
            doc: survey.ID,
            data: temp,
            update: true,
          });
      } else {
        const newQuestion = questions.current[questionIndex + moveIndex];
        if (!newQuestion.name)
          curResult.current = newQuestion.values
            .map((val) => val.option)
            .filter((val) => results.current[val] == "Yes");
        else curResult.current = [results.current[newQuestion.name]];
      }
    } else {
      curResult.current = [];
    }
    setIndex(questionIndex + moveIndex);
  }
  if (started)
    return (
      <>
        <div
          className="groupEditor"
          style={{
            margin: 0,
            display: "flex",
            justifyContent: "space-evenly",
            width: "100%",
            border: "none",
            borderBottom: "solid",
            borderRadius: 0,
          }}
        >
          {questionIndex == questions.current.length
            ? "Survey Finished"
            : questionIndex + 1 + " / " + questions.current.length}
        </div>
        {questionIndex == -1 || questionIndex == questions.current.length ? (
          <>
            <div
              id="textContainer"
              dangerouslySetInnerHTML={{
                __html:
                  questionIndex == -1
                    ? survey.startScreen
                    : survey.finishScreen,
              }}
            ></div>
            {questionIndex == -1 ? (
              <div id="buttonContainer">
                <button
                  onClick={() => {
                    changeQuestion(1);
                  }}
                >
                  Start
                </button>
              </div>
            ) : Object.keys(survey.categories).length ? (
              <CustomChart
                categories={Object.keys(survey.categories)}
                data={[
                  Object.values(
                    categories.current[categories.current.length - 1]
                  ),
                ]}
                fill={true}
              />
            ) : (
              <></>
            )}
          </>
        ) : (
          <>
            {question.name || question.group?.defaultText ? (
              <div id="textContainer" style={{ textAlign: "center" }}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: question.group?.defaultText || "",
                  }}
                ></div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: question.name || "",
                  }}
                ></div>
              </div>
            ) : (
              <></>
            )}
            <QuestionArea question={question} curResult={curResult} />
            <div id="buttonContainer">
              <button
                onClick={() => {
                  changeQuestion(-1);
                }}
              >
                Back
              </button>
              <button
                onClick={() => {
                  changeQuestion(1);
                }}
              >
                {questionIndex == questions.current.length - 1
                  ? "Finish"
                  : "Next"}
              </button>
            </div>
          </>
        )}
      </>
    );
}
export function QuestionArea({
  question,
  curResult,
}: {
  question: questionClass;
  curResult: MutableRefObject<string[]>;
}) {
  const [proxy, update] = useState({});
  return (
    <div id="questionContainer">
      {!["TXT", "DIS"].includes(question.type) ? (
        question.values.map((option) => (
          <button
            className={
              curResult.current.includes(option.option) ? "selected" : undefined
            }
            key={option.option}
            onClick={() => {
              if (question.type == "MCQ")
                curResult.current =
                  curResult.current[0] == option.option ? [] : [option.option];
              else if (question.type == "MSQ")
                curResult.current.includes(option.option)
                  ? curResult.current.splice(
                      curResult.current.indexOf(option.option),
                      1
                    )
                  : curResult.current.push(option.option);
              update({});
            }}
          >
            {option.option}
          </button>
        ))
      ) : question.type == "TXT" ? (
        <textarea
          id="question"
          onChange={(e) => {
            curResult.current[0] = e.target.value;
          }}
          defaultValue={curResult.current[0]}
        ></textarea>
      ) : (
        ""
      )}
    </div>
  );
}
export function getQuestions(
  survey: surveyClass
): [Record<string, string>, questionClass[]] {
  const retresults: Record<string, string> = {};
  const retquestions: questionClass[] = [];
  survey.questions.map((group) => {
    const oldArr = [...group.questions];
    oldArr.map((val) => {
      if (val.type != "DIS") {
        if (!val.name)
          val.values.map((val) => {
            retresults[val.option] = "No";
          });
        else retresults[val.name] = "";
      }
      val.group = group;
    });
    const newArr = [];
    if (group.shuffle)
      while (oldArr.length > 0)
        newArr.push(
          oldArr.splice(Math.floor(Math.random() * oldArr.length), 1)[0]
        );
    (group.shuffle ? newArr : oldArr).forEach((val) => retquestions.push(val));
  });
  return [retresults, retquestions];
}
export class questionClass {
  type: "MCQ" | "MSQ" | "TXT" | "DIS";
  values: { option: string; categories: Record<string, number> }[];
  name?: string;
  group?: group;
  constructor({
    type,
    values = [],
    name,
  }: {
    type: "MCQ" | "MSQ" | "TXT" | "DIS";
    values?: { option: string; categories: Record<string, number> }[];
    name?: string;
  }) {
    this.type = type;
    this.values = values;
    this.name = name;
  }
}
export function CustomChart({
  categories,
  data,
  stepSize = 10,
  title,
  color = "#FF4560",
  fill,
}: {
  categories: string[];
  data: number[][];
  stepSize?: number;
  title?: string;
  color?: string;
  fill: boolean;
}) {
  const options = {
    fill: { opacity: fill ? 0.1 : 0, colors: ["#FF4560"] },
    series: data.map((val, i) => ({ name: "Series " + i, data: val })),
    plotOptions: {
      radar: {
        size: 250,
        polygons: {
          strokeColors: "#e9e9e9",
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: { show: false },
    title: {
      text: title,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + "%";
        },
        title: {
          formatter: function (val: string) {
            val;
            return "";
          },
        },
      },
    },
    colors: [color],
    markers: {
      size: 4,
      colors: ["#fff"],
      strokeColor: color,
      strokeWidth: 2,
    },
    xaxis: {
      categories: categories,
    },
    yaxis: {
      stepSize: stepSize,
      show: false,
      max: 100,
    },
  };
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <ApexChart
        type="radar"
        options={options}
        series={options.series}
        height={750}
        width={750}
      />
    </div>
  );
}

export const downloadCSV = (data: string) => {
  window.open(URL.createObjectURL(new Blob([data], { type: "text/csv" })));
};
export class surveyClass {
  ID: string;
  name: string;
  startScreen: string;
  finishScreen: string;
  questions: group[];
  categories: Record<string, number>;
  constructor({
    name,
    startScreen = "Click Below To Start",
    finishScreen = "You've Finished The Survey",
    questions,
    categories = {},
  }: {
    name: string;
    startScreen?: string;
    finishScreen?: string;
    questions: group[];
    categories?: Record<string, number>;
  }) {
    this.categories = categories;
    this.ID = IDgen();
    this.name = name;
    this.startScreen = startScreen;
    this.finishScreen = finishScreen;
    this.questions = questions;
  }
}
export class userClass {
  password: string;
  surveys: Record<string, surveyClass>;
  constructor({
    password,
    surveys = {},
  }: {
    password: string;
    surveys?: Record<string, surveyClass>;
  }) {
    this.password = password;
    this.surveys = surveys;
  }
}
export class group {
  name: string;
  questions: questionClass[];
  shuffle: boolean;
  defaultText?: string;
  constructor({
    name,
    questions,
    shuffle = false,
    defaultText,
  }: {
    name: string;
    questions: questionClass[];
    shuffle?: boolean;
    defaultText?: string;
  }) {
    this.name = name;
    this.questions = questions;
    this.shuffle = shuffle;
    this.defaultText = defaultText;
  }
}
export function IDgen() {
  const text = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
  return new Array(10)
    .fill(undefined)
    .map(() => text[Math.floor(Math.random() * text.length)])
    .join("");
}
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

export const sum = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b) : 0;
export const RichEditor = ({
  parent,
  keyVal,
  style,
  placeholder,
}: {
  parent: Record<string, any>;
  keyVal: string;
  style?: CSSProperties;
  placeholder?: string;
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
      dangerouslySetInnerHTML={{ __html: parent[keyVal] }}
      onInput={(e) => {
        parent[keyVal] = e.currentTarget.innerHTML;
      }}
    />
  );
};

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
