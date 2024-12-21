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
export const surveyTemplates: surveyClass[] = [
  {
    questions: [
      {
        name: "New Group 1",
        questions: [
          {
            values: [],
            type: "DIS",
            name: '<div id="Questions" role="main" style="margin: 0px; padding: 0px; overflow: auto; color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: medium;"><div class="QuestionOuter BorderColor DB  QID117" id="QID117" questionid="QID117" posttag="QID117" data-runtime-remove-class-hidden="runtime.Displayed" style="margin: 0px; padding: 0px 0px 0vh; overflow-y: hidden;"><div class="Inner BorderColor TB" style="margin: 0px; padding: 0px;"><div class="InnerInner BorderColor" style="margin: 0px; padding: 0px;"><div class="QuestionText BorderColor" style="margin: 0px; padding: 20px; zoom: 1; font-size: 18px; line-height: 1.5em;"><strong tabindex="-1" style="outline: rgb(0, 0, 0) solid 0px;">Overview of the tool</strong><ul><li>This tool is administered by the Fire Adapted Communities Learning Network (FAC Net) for the purposes of this facilitation workshop.</li><li>We anticipate this will take&nbsp;<em><strong>10-15 minutes</strong></em>&nbsp;to complete. You can save it and return to it at a later time.</li><li>Please submit only one entry.</li><li>There are no known risks to you from using this questionnaire. Your participation is voluntary, you may leave questions blank or unanswered, or stop participating at any time by closing the browser window.</li><li>Your answers will be confidential and only accessible to the FAC Net team. Findings will only be used for the purposes of the workshop.</li><li></li></ul></div><div class="QuestionBody" style="margin: 0px; padding: 0px; user-select: none; cursor: default; font-size: 16px; overflow-y: hidden; position: relative; z-index: 1;"></div></div></div></div></div>',
          },
          {
            values: [],
            type: "DIS",
            name: '<p style="padding: 0px; color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;"><span style="font-size: 16px;"><strong tabindex="-1" style="outline: rgb(0, 0, 0) solid 0px;">Paired statements</strong></span></p><p dir="ltr" style="padding: 0px; color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;"><b id="docs-internal-guid-373dc12b-7fff-a2e8-071d-05bd3a779dbf">The following pairs of statements&nbsp;</b>correspond with distinct wildfire narratives or ways of thinking about the Western wildfire crisis. They represent the authentic language and expression of people who are leading the thinking on western wildfire issues.&nbsp;</p><ul style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;"><li>For&nbsp;each pair of statements, select the statement that resonates with you&nbsp;<em><strong>more</strong></em>, when you consider wildfire across western US forests.&nbsp;</li><li>If you cannot choose between the two statements, if you agree with both, select&nbsp;<em>both</em>.</li><li>If you do not agree with either of the statements or do not find it to be applicable,&nbsp;<em>skip</em>&nbsp;the pair.</li></ul><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;">Every person working on wildfire issues wears more than one \'hat\' and tells more than one narrative. This survey is intended to map the way you characterize the wildfire crisis as a blend of these narratives.&nbsp;</span>',
          },
        ],
        shuffle: false,
      },
      {
        name: "New Group 2",
        questions: [
          {
            type: "MSQ",
            values: [
              {
                option:
                  "We should use unplanned ignitions under good conditions as an opportunity to restore ecological function.",
                categories: { Manage: 1, Conserve: 1, Revitalize: 1, Adapt: 1 },
              },
              {
                option:
                  "We should not use unplanned ignitions to burn for resource purposes as it is a dangerous and costly means to manage our forests.",
                categories: { Work: 1, Control: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "To manage the long-term health impacts of wildfire smoke, we need to increase the amount of prescribed burning on the landscape now.",
                categories: { Manage: 1, Revitalize: 1 },
              },
              {
                option:
                  "The short-term health impacts from smoke may outweigh any long-term potential benefits of using prescribed burning to reduce future wildfire risk.",
                categories: { Work: 1, Control: 1, Justice: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Liability reform is needed to incentivize prescribed burning practices",
                categories: { Manage: 1, Revitalize: 1 },
              },
              {
                option:
                  "Escaped fires from prescribed burning are too high of a liability",
                categories: { Work: 1, Control: 1, Regulate: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "To reduce impacts to communities from wildfires we must educate the public about the importance of fire.",
                categories: { Manage: 1, Adapt: 1 },
              },
              {
                option:
                  "To reduce impacts to communities from wildfires, we must learn to listen to what the public is saying.",
                categories: { Work: 1, Justice: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "There is no future in which we do not see dramatically more smoke, in more areas, for longer periods of time",
                categories: { Adapt: 2 },
              },
              {
                option:
                  "There are viable management options that allow us to dramatically reduce smoke and emissions due to wildfires.",
                categories: { Work: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "We need to increase the pace and scale of fuels treatments by identifying practices that can work in many places",
                categories: { Manage: 1 },
              },
              {
                option:
                  "We need to increase place-based solutions by identifying practices that are tailored for specific communities.",
                categories: { Revitalize: 1, Justice: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "There are a lot of opinions out there. Our forest and fire management plans must be grounded in science",
                categories: { Manage: 1, Adapt: 1 },
              },
              {
                option:
                  "Science is important, but we must incorporate multiple types of knowledge",
                categories: { Revitalize: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "The more we suppress fires, the less expensive and risky the conditions",
                categories: { Control: 1 },
              },
              {
                option:
                  "The more we suppress fires, the more expensive and risky the conditions",
                categories: { Manage: 1, Revitalize: 1, Adapt: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Foremost, we need to focus our efforts on hardening the wildland urban interface",
                categories: { Regulate: 2, Conserve: 1 },
              },
              {
                option:
                  "Foremost, we need to focus our efforts on managing our wildland forests",
                categories: { Manage: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Climate mitigation, in the form of emissions reductions, is our best tool against wildfires",
                categories: { Adapt: 2 },
              },
              {
                option:
                  "Fuels reduction, in the form of thinning and prescribed burning, is our best tool against wildfires",
                categories: { Manage: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "The Western wildfire crisis is predominantly a WUI problem. If we change how and where we build, we won't have a fire problem.",
                categories: { Regulate: 2, Conserve: 1 },
              },
              {
                option:
                  "The Western wildfire crisis is predominantly a forest and climate problem. Some of these fires burn so hot and fast, that no amount of WUI mitigation will stop them.",
                categories: { Manage: 1, Adapt: 2 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Fire in wildlands is not a disaster. Fire in homes and communities is absolutely a disaster",
                categories: { Regulate: 2, Conserve: 1, Justice: 2 },
              },
              {
                option:
                  "Western wildfires pose an existential crisis to our forests. We cannot separate the health of our forests from the impact on communities.",
                categories: { Manage: 1, Adapt: 2 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "To the extent it is safe, we should try to stop all fires in the wildlands as soon as possible",
                categories: { Control: 1 },
              },
              {
                option:
                  "To the extent it is safe, we should try to let fires burn in the wildland.",
                categories: { Manage: 1, Conserve: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Our wildfire problems are tied to overly restrictive environmental and economic policy.",
                categories: { Work: 2, Market: 2 },
              },
              {
                option:
                  "Our wildfire problems are tied to persistent socio-economic inequities.",
                categories: { Revitalize: 1, Justice: 2 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "The insurance industry has the financial incentive to develop and deploy the best, most accurate models so they can properly manage their risks",
                categories: { Market: 2 },
              },
              {
                option:
                  "Insurance premiums need to be regulated to protect homeowners",
                categories: { Justice: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Putting a ceiling on insurance premiums, or a moratorium on non-renewals, causes a market distortion and covers up the true price signal of risk.",
                categories: { Market: 2 },
              },
              {
                option:
                  "Insurance reform helps stabilize the market and reduces risk to homeowners affected by disasters.",
                categories: { Justice: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "We should restrict development in high risk fire hazard zones.",
                categories: { Regulate: 2, Conserve: 1 },
              },
              {
                option:
                  "It is unrealistic to restrict development in high risk fire hazard zones.",
                categories: { Market: 2, Justice: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Fuels reductions practices in the wildlands, that provide firefighters a chance to stop the fire before it reaches the community, are the most effective means to protect communities from wildfire.",
                categories: { Manage: 1 },
              },
              {
                option:
                  "Home mitigation practices such as home hardening and defensible space are the most effective means to protect communities from wildfire.",
                categories: { Market: 1, Regulate: 2, Conserve: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "The communities most affected by wildfire are also least likely to recover from the long-term financial stress following a disaster",
                categories: { Justice: 2 },
              },
              {
                option:
                  "Communities most affected by wildfire have chosen to live in high risk fire hazard areas. The cost of their home is a reflection of that risk.",
                categories: { Market: 2 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Justice means vulnerable populations don't disproportionality bear the burden of the Western wildfire crisis.",
                categories: { Justice: 2 },
              },
              {
                option:
                  "Justice means wildfire protection and recovery is the responsibility of communities living in the WUI, and not taxpayers living miles away.",
                categories: { Market: 2 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "To put fire back in balance, we need to use all the tools available to us to invite more fire to the landscape",
                categories: { Revitalize: 1 },
              },
              {
                option:
                  "To put fire back in balance, we need to control and minimize the amount of fire on the landscape.",
                categories: { Control: 2 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "We need more people managing fire. Therefore, we need to mainstream and democratize fire. Fire management doesn't just belong to government agency professionals.",
                categories: { Revitalize: 1 },
              },
              {
                option:
                  "We need more fire professionals managing fire. Therefore, we need to invest more into our hot shot crews. They are specialized, trained, and certified.",
                categories: { Control: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "We need to decolonize fire management. We need to de-fund the Forest Service. We need to tear down the system and build another one.",
                categories: { Revitalize: 2 },
              },
              {
                option:
                  "We need to restore the function and mission of the Forest Service. We need to provide the agency with the resources and freedom to manage our national forestlands.",
                categories: { Control: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Fire managers need to participate in Indigenous-led trainings and learn from communities who have successfully managed fire in the West for millennia.",
                categories: { Revitalize: 2 },
              },
              {
                option:
                  "Our fire managers are expertly trained to fight fires and conduct burns. To suggest that historic practices are appropriate for today's fire landscape is out of touch given conditions on the ground.",
                categories: { Control: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Salvage logging should be prohibited, it is unilaterally damaging to ecosystems. Large dead trees still retain nearly all of their carbon.",
                categories: { Conserve: 1 },
              },
              {
                option:
                  "Salvage logging is necessary to capture carbon into sustainable products. A burned forest is a major net contributor of carbon emissions.",
                categories: { Work: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Fuels reduction measures need to ‘pay for themselves’ or they will not be a long term viable solution.",
                categories: { Work: 1 },
              },
              {
                option:
                  "The co-benefits of fuels reduction measures are enormous, we need to better account for these benefits instead of trying to make fuels reduction measures pay for themselves.",
                categories: { Conserve: 1, Revitalize: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Forest roads are a source of ignitions and thereby increase wildfire risk",
                categories: { Conserve: 1 },
              },
              {
                option:
                  "Forest roads are necessary access points and thereby reduce wildfire risk",
                categories: { Work: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Coupling fuels reduction treatments with profit-driven forest practices usually ends up increasing fire risk",
                categories: { Conserve: 1 },
              },
              {
                option:
                  "Economically viable forest treatments are needed to remove hazardous fuels and create a healthier forest environment",
                categories: { Work: 1, Control: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Environmental regulations and standards are more important than ever",
                categories: { Work: 2 },
              },
              {
                option:
                  "Environmental regulations are preventing necessary work from happening on the landscape",
                categories: { Conserve: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "Fire as a means of fuels management is the most effective way to protect our forests.",
                categories: { Manage: 1, Conserve: 2 },
              },
              {
                option:
                  "Fire as a means of fuels management is a waste of forest resources.",
                categories: { Work: 2, Control: 1 },
              },
            ],
          },
          {
            type: "MSQ",
            values: [
              {
                option:
                  "The objective of fire management should be to control wildfire spread.",
                categories: { Control: 2 },
              },
              {
                option:
                  "The objective of fire management should be to support ecological objectives.",
                categories: { Conserve: 1 },
              },
            ],
          },
        ],
        shuffle: false,
        defaultText:
          '<span tabindex="-1" style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px; outline: rgb(0, 0, 0) solid 0px;">For each of the pairs of statements below, please select which statement resonates with you more.</span><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;"><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 13px;">If you are unable to select one, you can select both, or simply skip it to the next question.</span>',
      },
    ],
    categories: {
      Manage: 14,
      Work: 15,
      Market: 13,
      Control: 14,
      Regulate: 11,
      Conserve: 15,
      Revitalize: 14,
      Justice: 14,
      Adapt: 12,
    },
    ID: "YVQvmtNeFz",
    name: "Wildfire Narratives",
    startScreen:
      '<span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">Dear participant,</span><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;"><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">The western United States is experiencing a wildfire crisis; whole communities destroyed, billions of dollars in damages, millions affected by smoke, and thousands of forest acres burning at high severity. Despite investments in scientific research, policy, and management actions, impacts are getting worse. The wildfire community has diverse perspectives about how we got here, why we should care, and what we ought to do about it. That diversity can provide a wider and more comprehensive perspective of wildfire issues, but it can also lead to inefficiencies, miscommunication, and conflict.</span><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;"><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;"><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">Welcome to the</span><strong style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">&nbsp;Western Wildfire Perspective Tool</strong><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;"><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">This survey is designed to map the way you characterize the wildfire crisis in relation to your colleagues. We want to explore these characterizations to better understand the distribution of perspectives among practitioners, academics, managers, and other stakeholders working on wildfire topics in forested regions of the western US.&nbsp;</span><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;"><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;"><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">This survey tool is based on a survey designed and implemented by Michal Russo et al. (</span><a href="http://deepblue.lib.umich.edu/bitstream/2027.42/178105/1/michalr_1.pdf" style="color: rgb(182, 196, 203); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">Russo, M. 2023. Exploring Multiple Understandings of Western Wildfires in Support of Knowledge Co-Production Practices. University of Michigan Deep Blue.</a><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">;&nbsp;&nbsp;Russo, M., A.P. Fischer, &amp; Huber-Stearns, H. (under review). “Understandings of western wildfire challenges: in support of more inclusive collaborative practices.” Ecology and Society.), funded by the Kathy and Steve Berman Western Forest and Fire Initiative (WFFI) at the University of Michigan (Paige Fischer, PI,&nbsp;</span><a href="https://wffi.seas.umich.edu/" style="color: rgb(182, 196, 203); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">https://wffi.seas.umich.edu/</a><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">). It is used here as a facilitation and group learning tool. It is not intended to be used for wide scale survey administration or research. For questions about this please contact (Michal Russo&nbsp;</span><a href="mailto:michalr@umich.edu?subject=Wildfire%20Perspectives%20Survey" style="color: rgb(182, 196, 203); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">michalr@umich.edu</a><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">&nbsp;or Heidi Huber-Stearns&nbsp;</span><a href="mailto:hhuber@uoregon.edu?subject=Wildfire%20Perspectives%20Survey" style="color: rgb(182, 196, 203); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">hhuber@uoregon.edu</a><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px;">).</span>',
    finishScreen:
      '<b tabindex="-1" style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px; outline: rgb(0, 0, 0) solid 0px;">Results</b><br style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;"><span style="color: rgb(82, 82, 82); font-family: &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 18px;">The previous pairs of statements correspond with nine distinct wildfire narratives or ways of thinking about the Western wildfire crisis. Every person working on these issues wears more than one ‘hat’ and tells more than one narrative. The proportion and balance of the narratives they hold shed light on their perspectives. The figure below illustrates the degree to which your responses resonate with each of the nine narratives. Note: The following step provides a savable (pfd) complete report of how you responded to this survey including this figure.</span>',
  },
];
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
