"use client";

import { useRef, useState, useEffect } from "react";
import {
  downloadCSV,
  Group,
  Question,
  Survey,
  User,
  DisplaySurvey,
  CustomChart,
} from "../components/survey";
import {
  addDoc,
  delDoc,
  getDoc,
  getExists,
  getPassword,
} from "../components/firestore";
import { surveyTemplates } from "../surveyTemplates";
import { encrypt } from "../components/encrypter";
import { TextEditor, RichTextEditor } from "../components/textEditor";
import { cookies, IDgen } from "../components/utilities";

function createSurvey(
  {
    survey,
    categories,
    user,
    username,
    setMode,
  }: {
    survey: { current: Survey | undefined };
    categories: { current: string[] };
    user: { current: User | undefined };
    username: { current: string };
    setMode: (
      a:
        | Record<string, never>
        | "previewing"
        | "choosingTemplate"
        | "showingResults"
    ) => void;
  },
  surveyTemplate?: Survey
) {
  survey.current = new Survey(
    surveyTemplate || {
      name: "New Survey",
      questions: [],
      startScreen: '<div style="text-align: center">Click Below To Start</div>',
      finishScreen:
        '<div style="text-align: center">You\'ve Finished The Survey</div>',
    }
  );
  categories.current = Object.keys(survey.current.categories);
  if (user.current) {
    user.current.surveys[survey.current.ID] = survey.current;
    addDoc({
      collection: "users",
      doc: username.current,
      data: JSON.parse(JSON.stringify(user.current)),
    });
  }
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  searchParams.set("survey", survey.current.ID);
  url.search = searchParams.toString();
  window.history.replaceState({}, "", url.toString());
  setMode({});
}

export default function Home() {
  const [overpage, setOverpage] = useState<
    | { type: "deleting" | "publishing" }
    | {
        type: "importing";
        group: Group;
        importType: "simple" | "complex";
        dataType: "MCQ" | "MSQ";
        optPerQues: number;
      }
    | undefined
  >(undefined);
  const [mode, setMode] = useState<
    "previewing" | "choosingTemplate" | "showingResults" | Record<string, never>
  >({});
  let saved = false;
  const [started, start] = useState(false);
  const [proxy, update] = useState({});
  proxy;
  const username = useRef("");
  const categories = useRef<string[]>([]);
  const user = useRef<User | undefined>(undefined);
  const password = useRef("");
  const results = useRef<Record<string, Record<string, string>> | undefined>(
    undefined
  );
  const questionResults = useRef<Record<string, string[]>>({});
  const survey = useRef<Survey | undefined>(undefined);
  async function getUser(surveyID?: string) {
    if (!user.current) {
      const trueUser = await getPassword(
        "users",
        username.current,
        password.current
      );
      user.current = trueUser
        ? new User({ password: "", surveys: {}, ...trueUser })
        : undefined;
    }
    if (user.current && surveyID) {
      if (user.current.surveys[surveyID]) {
        survey.current = user.current.surveys[surveyID];
        categories.current = Object.keys(survey.current.categories);
      } else alert("You can't edit this survey");
    } else if (surveyID) {
      cookies.clear();
      alert("Username or password is incorrect");
    }
    return true;
  }
  useEffect(() => {
    if (!started) {
      const tempFunct = async () => {
        const params = new URLSearchParams(window.location.search);
        const tempUser = cookies.get("user").user;
        username.current = tempUser?.username || "";
        password.current = tempUser?.password || "";
        if (username.current) {
          await getUser(params.get("survey") || undefined);
          start(true);
        } else start(true);
      };
      tempFunct();
    }
  }, [started]);
  const takenSurvey = Object.keys(results.current || {}).length;
  if (started)
    return !user.current ? (
      <>
        <div id="textContainer" style={{ textAlign: "center" }}>
          {"You're not logged in."}
        </div>
        <div id="questionContainer">
          <input
            type="text"
            id="username"
            placeholder="
                Username"
            onChange={(e) => {
              username.current = e.target.value;
            }}
          ></input>
          <input
            type="password"
            id="password"
            placeholder="Password"
            onChange={(e) => {
              password.current = e.target.value;
            }}
          ></input>
        </div>
        <div id="buttonContainer">
          <button
            type="submit"
            onClick={async () => {
              await getUser();
              if (user.current) {
                cookies.add({
                  user: {
                    username: username.current,
                    password: password.current,
                    expiration: new Date().getTime() + 3600000,
                  },
                });
                document.cookie;
              } else alert("Username or password is incorrect");
              update({});
            }}
          >
            Log In
          </button>
          <button
            onClick={async () => {
              if (await getExists("users", username.current)) {
                alert("Username Is Taken");
              } else {
                cookies.add({
                  user: {
                    username: username.current,
                    password: password.current,
                    expiration: new Date().getTime() + 3600000,
                  },
                });
                addDoc({
                  collection: "users",
                  doc: username.current,
                  data: {
                    password: encrypt(
                      password.current,
                      process.env.ENCRYPTER_PRIVATEKEY
                    ),
                    surveys: {},
                  },
                });
                user.current = {
                  password: "",
                  surveys: {},
                };
                update({});
              }
            }}
          >
            Sign Up
          </button>
        </div>
      </>
    ) : !survey.current ? (
      mode == "choosingTemplate" ? (
        <>
          <div className="header">Choose Template</div>
          <button
            style={{ position: "absolute", top: 10, right: 10, width: 200 }}
            className="borderer"
            onClick={() => {
              setMode({});
            }}
          >
            Back
          </button>
          <div id="surveyContainer">
            <button
              onClick={() => {
                createSurvey({ survey, categories, user, username, setMode });
              }}
            >
              Blank Survey
            </button>
            {surveyTemplates.map((surveyTemplate) => (
              <button
                key={surveyTemplate.name}
                onClick={() => {
                  createSurvey(
                    { survey, categories, user, username, setMode },
                    surveyTemplate
                  );
                }}
              >
                {surveyTemplate.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            style={{ position: "absolute", top: 10, right: 10, width: 200 }}
            className="borderer"
            onClick={() => {
              username.current = "";
              password.current = "";
              user.current = undefined;
              survey.current = undefined;
              cookies.clear();
              update({});
            }}
          >
            Log Out
          </button>
          <div id="surveyContainer">
            {Object.values(user.current.surveys).map((curSurvey) => (
              <button
                key={curSurvey.ID}
                onClick={async () => {
                  const url = new URL(window.location.href);
                  const searchParams = new URLSearchParams(url.search);
                  searchParams.set("survey", curSurvey.ID);
                  url.search = searchParams.toString();
                  window.history.replaceState({}, "", url.toString());
                  survey.current = curSurvey;
                  categories.current = Object.keys(survey.current.categories);
                  update({});
                }}
              >
                {curSurvey.name}
                <div className="subtext">{curSurvey.ID}</div>
              </button>
            ))}
            <button
              onClick={() => {
                Object.keys(surveyTemplates).length
                  ? setMode("choosingTemplate")
                  : createSurvey({
                      survey,
                      categories,
                      user,
                      username,
                      setMode,
                    });
              }}
            >
              Create New Survey
            </button>
          </div>
        </>
      )
    ) : (
      <>
        <div className="groupEditor topbar" id="topbar">
          <div>
            <button
              onClick={() => {
                if (user.current && survey.current) {
                  const url = new URL(window.location.href);
                  const searchParams = new URLSearchParams(url.search);
                  searchParams.delete("survey");
                  url.search = searchParams.toString();
                  window.history.replaceState({}, "", url.toString());
                  survey.current = undefined;
                  setMode({});
                }
              }}
            >
              Home
            </button>
            <button
              onClick={() => {
                setOverpage({ type: "publishing" });
              }}
            >
              Publish
            </button>
            <input
              className="textEditor"
              style={{ borderRadius: "15px", margin: 0, width: "20vw" }}
              placeholder="Survey Name"
              defaultValue={survey.current.name}
              onChange={(e) => {
                if (survey.current) survey.current.name = e.target.value;
              }}
            ></input>
            <button
              onClick={() => {
                setOverpage({ type: "deleting" });
              }}
            >
              Delete Survey
            </button>
            <button
              onClick={() => {
                username.current = "";
                password.current = "";
                user.current = undefined;
                survey.current = undefined;
                cookies.clear();
                update({});
              }}
            >
              Log Out
            </button>
          </div>
          <div>
            <button
              onClick={() => {
                if (user.current && survey.current && !saved) {
                  saved = true;
                  const newCategories: Record<string, number> = {};
                  categories.current.map((cat) => (newCategories[cat] = 0));
                  survey.current.questions.map((group) =>
                    group.questions.map((question) => {
                      if (!["TXT", "DIS"].includes(question.type))
                        question.values.map((option) =>
                          Object.entries(option.categories).map(
                            ([key, val]) => (newCategories[key] += val)
                          )
                        );
                    })
                  );
                  survey.current.categories = newCategories;
                  user.current.surveys[survey.current.ID] = survey.current;
                  addDoc({
                    collection: "users",
                    doc: username.current,
                    data: JSON.parse(JSON.stringify(user.current)),
                  });
                }
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                if (survey.current) {
                  const newCategories: Record<string, number> = {};
                  categories.current.map((cat) => (newCategories[cat] = 0));
                  survey.current.questions.map((group) =>
                    group.questions.map((question) => {
                      if (question.type != "TXT")
                        question.values.map((option) =>
                          Object.entries(option.categories).map(
                            ([key, val]) => (newCategories[key] += val)
                          )
                        );
                    })
                  );
                  survey.current.categories = newCategories;
                }
              }}
            >
              <a
                href={
                  "data:text/json;charset=utf-8," +
                  encodeURIComponent(JSON.stringify(survey.current))
                }
                download={survey.current.name.replaceAll(" ", "_") + ".JSON"}
              >
                Download JSON
              </a>
            </button>
            <button
              onClick={() => {
                setMode(mode == "previewing" ? {} : "previewing");
              }}
            >
              Preview
            </button>
            <button
              onClick={async () => {
                if (survey.current) {
                  if (mode != "showingResults") {
                    const tempResults = await getDoc(
                      "results",
                      survey.current.ID
                    );
                    if (tempResults) {
                      results.current = tempResults;
                      console.log(results.current);
                      questionResults.current = {};
                      Object.values(results.current).map((questions) => {
                        Object.entries(questions).map(
                          ([question, response]) => {
                            if (!questionResults.current[question])
                              questionResults.current[question] = [];
                            questionResults.current[question].push(
                              String(response)
                            );
                          }
                        );
                      });
                    }
                  }
                  setMode(mode == "showingResults" ? {} : "showingResults");
                }
              }}
            >
              Results
            </button>
          </div>
        </div>
        {mode == "previewing" ? (
          <DisplaySurvey survey={survey.current} />
        ) : (
          <>
            {mode == "showingResults" ? (
              <>
                <div
                  className="groupEditor"
                  style={{
                    textAlign: "center",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    onClick={() => {
                      if (results.current)
                        downloadCSV(
                          `"${Object.keys(questionResults.current)
                            .map((val) => val.replaceAll('"', '""'))
                            .join('","')}"\n"${Object.values(results.current)
                            .map((val) =>
                              Object.values(val)
                                .map((val) => val.replaceAll('"', '""'))
                                .join('","')
                            )
                            .join(`"\n"`)}"`
                        );
                    }}
                    style={{
                      background: "white",
                      border: "solid",
                      borderRadius: "50px",
                      width: "400px",
                    }}
                  >
                    Download Results
                  </button>
                  <div>
                    {takenSurvey == 0
                      ? "Nobody has taken the survey. Make sure it's published."
                      : takenSurvey == 1
                      ? "1 person has taken the survey."
                      : `${takenSurvey} people have taken the survey.`}
                  </div>
                  <button
                    onClick={() => {
                      results.current = {};
                      addDoc({
                        collection: "results",
                        doc: survey.current?.ID || "",
                        data: {},
                      });
                    }}
                    style={{
                      background: "white",
                      border: "solid",
                      borderRadius: "50px",
                      width: "400px",
                    }}
                  >
                    Clear Results
                  </button>
                </div>
                {takenSurvey != 0 ? (
                  <>
                    <CustomChart
                      categories={categories.current}
                      data={Object.values(results.current || {}).map((value) =>
                        categories.current.map((val) =>
                          parseInt(value[val].replace("%", ""))
                        )
                      )}
                      fill={false}
                    />

                    <div className="groupEditor">
                      <div className="centered">Average Categories</div>
                      <div className="choiceContainer small">
                        {categories.current.map((category) => (
                          <div
                            key={category}
                            style={{
                              padding: 5,
                            }}
                          >
                            {category}:{" "}
                            {Math.floor(
                              Object.values(results.current || {})
                                .map((val) => {
                                  return parseInt(
                                    val[category].replace("%", "")
                                  );
                                })
                                .reduce((a, b) => a + b) /
                                Object.keys(results.current || {}).length
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  ""
                )}
                {takenSurvey != 0 ? (
                  survey.current.questions
                    .filter(
                      (val) =>
                        val.questions.filter(({ type }) => type != "DIS").length
                    )
                    .map((group, index) => (
                      <div className="groupEditor" key={group.name + index}>
                        {group.name}
                        <br></br>
                        <div
                          className="borderer"
                          style={{ padding: "50px", paddingBottom: 0 }}
                        >
                          {group.questions
                            .filter(({ type }) => type != "DIS")
                            .map((question) => (
                              <div
                                className="bar"
                                key={IDgen()}
                                style={{ marginBottom: "50px" }}
                              >
                                {question.name ? (
                                  <div
                                    className="borderer"
                                    dangerouslySetInnerHTML={{
                                      __html: question.name,
                                    }}
                                  />
                                ) : (
                                  ""
                                )}
                                <div className="choiceContainer">
                                  {!["TXT", "DIS"].includes(question.type) ? (
                                    question.values.map((option) => (
                                      <div key={option.option}>
                                        {!question.name
                                          ? questionResults.current[
                                              option.option
                                            ]?.filter((value) => value == "Yes")
                                              .length
                                          : questionResults.current[
                                              question.name
                                            ].filter((value) =>
                                              value.includes(option.option)
                                            ).length}
                                        <br></br>
                                        <br></br>
                                        {option.option}
                                      </div>
                                    ))
                                  ) : (
                                    <></>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))
                ) : (
                  <></>
                )}
              </>
            ) : (
              <>
                <div className="groupEditor">
                  <div className="centered">Categories</div>
                  <div className="choiceContainer small">
                    {categories.current.map((category, index) => (
                      <div
                        key={category}
                        style={{
                          position: "relative",
                        }}
                      >
                        <input
                          type="text"
                          style={{ width: "100%", height: "100%" }}
                          defaultValue={category}
                          onChange={(e) => {
                            categories.current[index] = e.target.value;
                          }}
                        ></input>
                        <button
                          style={{ scale: 0.75, top: 0, right: 0 }}
                          onClick={() => {
                            categories.current.splice(index, 1);
                            update({});
                          }}
                          className="delete"
                        ></button>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        categories.current.push(
                          `Category ${categories.current.length + 1}`
                        );
                        update({});
                      }}
                    >
                      Add Category
                    </button>
                  </div>
                </div>
                <div className="groupEditor">
                  <div className="centered">Start Page</div>
                  <RichTextEditor
                    val={survey.current.startScreen}
                    set={(str) => {
                      if (survey.current) survey.current.startScreen = str;
                    }}
                    placeholder="Starting Page"
                    style={{
                      minHeight: "25lvh",
                      width: "90%",
                      margin: "25px auto",
                    }}
                  ></RichTextEditor>
                </div>
                {survey.current.questions.map((group, index) => (
                  <div key={group.name} className="groupEditor">
                    <button
                      onClick={() => {
                        survey.current?.questions.splice(index, 1);
                        update({});
                      }}
                      className="delete"
                    ></button>
                    <div
                      style={{
                        position: "absolute",
                        left: "25px",
                        top: "25px",
                      }}
                    >
                      <label htmlFor={group.name + index + " shuffler"}>
                        Shuffle
                      </label>
                      <input
                        defaultChecked={group.shuffle}
                        id={group.name + index + " shuffler"}
                        onClick={() => {
                          group.shuffle = !group.shuffle;
                          update({});
                        }}
                        style={{
                          height: "45px",
                          width: "45px",
                          position: "relative",
                          top: "10px",
                          left: "15px",
                        }}
                        type="checkbox"
                      ></input>
                    </div>
                    <input
                      className="borderer textEditor"
                      style={{ margin: "auto" }}
                      defaultValue={group.name}
                      onChange={(e) => {
                        group.name = e.target.value;
                      }}
                    ></input>
                    <br></br>
                    <button
                      className="borderer textEditor"
                      style={{ margin: "auto" }}
                      onClick={() => {
                        setOverpage({
                          type: "importing",
                          group: group,
                          importType: "simple",
                          dataType: "MCQ",
                          optPerQues: 2,
                        });
                      }}
                    >
                      Import Data
                    </button>
                    <RichTextEditor
                      val={group.defaultText}
                      set={(str) => {
                        group.defaultText = str;
                      }}
                      placeholder="Default Text"
                      style={{
                        minHeight: "15lvh",
                        width: "95%",
                        margin: "25px auto",
                        borderRadius: "15px",
                      }}
                    ></RichTextEditor>
                    <br></br>
                    <div className="borderer" style={{ padding: "50px" }}>
                      {group.questions.map((question, index) => (
                        <div
                          className="bar"
                          key={IDgen()}
                          style={{
                            marginBottom: "50px",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-around",
                              marginBottom: "25px",
                            }}
                          >
                            <select
                              className="borderer textEditor"
                              value={question.type}
                              onChange={(e) => {
                                if (
                                  e.target.value == "MCQ" ||
                                  e.target.value == "MSQ" ||
                                  e.target.value == "TXT" ||
                                  e.target.value == "DIS"
                                )
                                  question.type = e.target.value;
                                update({});
                              }}
                            >
                              <option value="MCQ">Multiple Choice</option>
                              <option value="MSQ">Multiple Select</option>
                              <option value="TXT">Text Input</option>
                              <option value="DIS">Text Display</option>
                            </select>
                          </div>

                          <RichTextEditor
                            val={question.name}
                            set={(str) => {
                              question.name = str;
                            }}
                            placeholder="Displayed Text"
                            style={{
                              minHeight: "15lvh",
                              width: "95%",
                              margin: "25px auto",
                              borderRadius: "15px",
                            }}
                          ></RichTextEditor>
                          {!["TXT", "DIS"].includes(question.type) ? (
                            <div className="choiceContainer">
                              {question.values.map((value, index) => (
                                <TextEditor
                                  set={(str) => {
                                    question.values[index].option = str;
                                  }}
                                  val={question.values[index].option}
                                  placeholder="Enter Option Here"
                                  remove={() => {
                                    question.values.splice(index, 1);
                                    update({});
                                  }}
                                  key={question.values[index].option}
                                  additional={
                                    categories.current.length ? (
                                      <div>
                                        {Object.entries(
                                          question.values[index].categories
                                        ).map(([key, val]) => (
                                          <div
                                            key={key}
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-evenly",
                                              margin: "10px",
                                              padding: "10px 25px",
                                              background: "var(--backColor2)",
                                              position: "relative",
                                              borderRadius: "15px",
                                            }}
                                            className="borderer"
                                          >
                                            <div style={{ width: "50%" }}>
                                              {key}
                                            </div>
                                            <input
                                              style={{ width: "33%" }}
                                              className="borderer"
                                              defaultValue={val}
                                              type="number"
                                              min={0}
                                              onChange={(e) => {
                                                if (
                                                  e.target.value != "" &&
                                                  parseInt(e.target.value) >= 0
                                                )
                                                  question.values[
                                                    index
                                                  ].categories[key] = parseInt(
                                                    e.target.value
                                                  );
                                              }}
                                            ></input>

                                            <button
                                              style={{
                                                scale: 0.75,
                                                top: 0,
                                                right: 0,
                                              }}
                                              onClick={() => {
                                                delete question.values[index]
                                                  .categories[key];
                                                update({});
                                              }}
                                              className="delete"
                                            ></button>
                                          </div>
                                        ))}
                                        {categories.current.filter(
                                          (cat) =>
                                            !question.values[index].categories[
                                              cat
                                            ]
                                        ).length ? (
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-evenly",
                                              margin: "10px",
                                              padding: "10px 25px",
                                              background: "var(--backColor2)",
                                              borderRadius: "15px",
                                            }}
                                            className="borderer"
                                          >
                                            <div style={{ display: "none" }}>
                                              {
                                                categories.current.filter(
                                                  (cat) =>
                                                    !question.values[index]
                                                      .categories[cat]
                                                )[0]
                                              }
                                            </div>
                                            <select
                                              style={{ width: "50%" }}
                                              className="borderer"
                                              onChange={(e) => {
                                                const parentElement =
                                                  e.target.parentElement;
                                                if (parentElement) {
                                                  parentElement.children[0].innerHTML =
                                                    e.target.value;
                                                }
                                              }}
                                            >
                                              {categories.current
                                                .filter(
                                                  (cat) =>
                                                    !question.values[index]
                                                      .categories[cat]
                                                )
                                                .map((cat) => (
                                                  <option key={cat} value={cat}>
                                                    {cat}
                                                  </option>
                                                ))}
                                            </select>
                                            <button
                                              style={{ width: "33%" }}
                                              className="borderer"
                                              onClick={(e) => {
                                                const parentElement =
                                                  e.currentTarget.parentElement;
                                                if (parentElement)
                                                  question.values[
                                                    index
                                                  ].categories[
                                                    parentElement.children[0].innerHTML
                                                  ] = 1;
                                                update({});
                                              }}
                                            >
                                              Add
                                            </button>
                                          </div>
                                        ) : (
                                          <></>
                                        )}
                                      </div>
                                    ) : undefined
                                  }
                                ></TextEditor>
                              ))}
                              <button
                                onClick={() => {
                                  question.values.push({
                                    option: `Option ${
                                      question.values.length + 1
                                    }`,
                                    categories: {},
                                  });
                                  update({});
                                }}
                              >
                                Add Option
                              </button>
                            </div>
                          ) : (
                            ""
                          )}
                          <button
                            onClick={() => {
                              group.questions.splice(index, 1);
                              update({});
                            }}
                            className="delete"
                          ></button>
                        </div>
                      ))}
                      <button
                        className="bar"
                        onClick={() => {
                          group.questions.push(
                            new Question({
                              name: "",
                              type: "MCQ",
                              values: [],
                            })
                          );
                          update({});
                        }}
                      >
                        Add Question
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="groupEditor bar"
                  onClick={() => {
                    if (survey.current)
                      survey.current.questions.push(
                        new Group({
                          name: `New Group ${
                            survey.current.questions.length + 1
                          }`,
                          questions: [],
                        })
                      );
                    update({});
                  }}
                >
                  Add Group
                </button>
                <div className="groupEditor">
                  <div className="centered">End Page</div>
                  <RichTextEditor
                    val={survey.current.finishScreen}
                    set={(str) => {
                      if (survey.current) survey.current.finishScreen = str;
                    }}
                    placeholder="Finishing Page"
                    style={{
                      minHeight: "25lvh",
                      width: "90%",
                      margin: "25px auto",
                    }}
                  ></RichTextEditor>
                </div>
              </>
            )}
          </>
        )}
        <div
          id="overpage"
          style={{
            zIndex: 1,
            height: "100lvh",
            width: "100%",
            position: "fixed",
            top: "0",
            background: "rgba(200,200,200,0.9)",
            display: overpage?.type ? "flex" : "none",
          }}
        >
          {overpage ? (
            <>
              <button
                onClick={() => {
                  setOverpage(undefined);
                }}
                className="delete"
              ></button>
              <div
                className="borderer"
                style={{
                  width: "90%",
                  margin: "auto",
                  minHeight: "90lvh",
                  padding: "1%",
                }}
              >
                {overpage.type == "importing" ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-evenly",
                      }}
                    >
                      <div className="reverseFlex">
                        <label htmlFor="csvImporterIT">Import Type</label>
                        <select
                          className="borderer"
                          value={overpage.importType}
                          id="csvImporterIT"
                          onChange={(e) => {
                            if (
                              (e.target.value == "simple" ||
                                e.target.value == "complex") &&
                              overpage.type == "importing"
                            )
                              overpage.importType = e.target.value;
                            update({});
                          }}
                        >
                          <option value="simple">Simple</option>
                          <option value="complex">Complex</option>
                        </select>
                      </div>
                      {overpage.importType == "simple" ? (
                        <>
                          <div className="reverseFlex">
                            <label htmlFor="csvImporterQT">Question Type</label>
                            <select
                              id="csvImporterQT"
                              className="borderer"
                              value={overpage.dataType}
                              onChange={(e) => {
                                if (
                                  (e.target.value == "MCQ" ||
                                    e.target.value == "MSQ") &&
                                  overpage.type == "importing"
                                )
                                  overpage.dataType = e.target.value;
                                update({});
                              }}
                            >
                              <option value="MCQ">Multiple Choice</option>
                              <option value="MSQ">Multiple Select</option>
                            </select>
                          </div>
                          <div className="reverseFlex">
                            <label htmlFor="csvImporterON">
                              Options Per Question
                            </label>
                            <input
                              id="csvImporterON"
                              value={overpage.optPerQues || 0}
                              type="number"
                              min={1}
                              className="borderer"
                              onChange={(e) => {
                                if (overpage.type == "importing")
                                  overpage.optPerQues = Math.max(
                                    parseInt(e.target.value),
                                    1
                                  );
                                update({});
                              }}
                            ></input>
                          </div>
                        </>
                      ) : (
                        ""
                      )}
                      <div className="reverseFlex">
                        <label>Import Data</label>
                        <label
                          className="borderer"
                          style={{
                            borderRadius: "50px",
                          }}
                          htmlFor="csvImporterID"
                        >
                          Choose File
                        </label>
                      </div>
                      <input
                        style={{ display: "none" }}
                        id="csvImporterID"
                        type="file"
                        accept=".csv"
                        onInput={(e) => {
                          if (e.currentTarget.files) {
                            const file = e.currentTarget.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.readAsText(file, "UTF-8");
                              reader.onload = function (evt) {
                                if (evt.target && evt.target.result) {
                                  const match = (line: string): string[] =>
                                    [
                                      ...line.matchAll(
                                        new RegExp(
                                          `\\s*(${'"'})?(.*?)\\1\\s*(?:${","}|$)`,
                                          "gs"
                                        )
                                      ),
                                    ]
                                      .map((m) => m[2])
                                      .slice(0, -1);

                                  const lines = String(evt.target.result).split(
                                    "\n"
                                  );
                                  const heads = match(lines.shift() || "");
                                  const data: Record<
                                    string,
                                    string | number | null
                                  >[] = lines.map((line) => {
                                    return match(line).reduce(
                                      (
                                        acc: Record<
                                          string,
                                          string | number | null
                                        >,
                                        cur,
                                        i
                                      ) => {
                                        const val =
                                          cur.length <= 0
                                            ? null
                                            : Number(cur) || cur;
                                        const key = heads[i] ?? `extra_${i}`;
                                        return { ...acc, [key]: val };
                                      },
                                      {}
                                    );
                                  });
                                  if (overpage.type == "importing") {
                                    heads
                                      .filter(
                                        (val) =>
                                          val != "Text" &&
                                          val != "Question Type"
                                      )
                                      .map((category) => {
                                        if (
                                          !categories.current.includes(category)
                                        ) {
                                          categories.current.push(category);
                                        }
                                      });
                                    const group = overpage.group;
                                    group.questions = [];
                                    data.map((val, index) => {
                                      if (overpage.type == "importing") {
                                        if (
                                          overpage.importType == "simple" &&
                                          index % overpage.optPerQues == 0
                                        ) {
                                          group.questions.push({
                                            type: overpage.dataType,
                                            values: [],
                                          });
                                        }
                                        if (
                                          !val["Question Type"] ||
                                          overpage.importType == "simple"
                                        ) {
                                          const option: {
                                            option: string;
                                            categories: Record<string, number>;
                                          } = {
                                            option: String(val.Text),
                                            categories: {},
                                          };
                                          delete val.Text;
                                          delete val["Question Type"];
                                          option.categories = Object.entries(
                                            val
                                          )
                                            .filter(([, val]) => val)
                                            .reduce(
                                              (
                                                res: Record<string, number>,
                                                [key, val]
                                              ) => (
                                                (res[key] = Number(val)), res
                                              ),
                                              {}
                                            );
                                          group.questions[
                                            group.questions.length - 1
                                          ].values.push(option);
                                        } else if (
                                          overpage.importType == "complex"
                                        ) {
                                          const translator: Record<
                                            string,
                                            "MCQ" | "MSQ" | "TXT" | "DIS"
                                          > = {
                                            "Multiple Choice": "MCQ",
                                            "Multiple Select": "MSQ",
                                            "Text Input": "TXT",
                                            "Text Display": "DIS",
                                          };
                                          group.questions.push({
                                            type: translator[
                                              val["Question Type"]
                                            ],
                                            name: String(val.Text),
                                            values: [],
                                          });
                                        }
                                      }
                                    });
                                  }
                                  setOverpage(undefined);
                                }
                              };
                              reader.onerror = function () {
                                console.log("error");
                              };
                            }
                          }
                        }}
                      ></input>
                    </div>
                    <div>
                      {overpage.importType == "complex"
                        ? `The first two column headers should be "Question Type and "Text", and the rest should be your categories. If a row has a Question Type, it will create a new question with the specified type and text. If not, it will create an option with the specified text and categories for the question above.`
                        : `The first column header should be "Text", and the rest should be your categories. Each row will create an option with the specified text and categories.`}
                    </div>
                    <div style={{ fontWeight: "bold" }}>Example: </div>
                    <table style={{ border: "solid", width: "100%" }}>
                      <tbody>
                        <tr>
                          {overpage.importType == "complex" ? (
                            <th>Question Type</th>
                          ) : (
                            ""
                          )}
                          <th>Text</th>
                          <th>Category 1</th>
                          <th>Category 2</th>
                          <th>Category 3</th>
                        </tr>
                        {overpage.importType == "complex" ? (
                          <>
                            <tr style={{ background: "lightcoral" }}>
                              <td>Multiple Choice</td>
                              <td>What&apos;s your favourite topping</td>
                              <td></td>
                              <td></td>
                              <td></td>
                            </tr>
                            <tr style={{ background: "lightcoral" }}>
                              <td></td>
                              <td>Cheese</td>
                              <td>1</td>
                              <td></td>
                              <td>2</td>
                            </tr>
                            <tr style={{ background: "lightcoral" }}>
                              <td></td>
                              <td>Pineapple</td>
                              <td></td>
                              <td>2</td>
                              <td></td>
                            </tr>
                            <tr style={{ background: "lightgreen" }}>
                              <td>Multiple Select</td>
                              <td>What foods do you like</td>
                              <td></td>
                              <td></td>
                              <td></td>
                            </tr>
                            <tr style={{ background: "lightgreen" }}>
                              <td></td>
                              <td>Pizza</td>
                              <td>1</td>
                              <td></td>
                              <td>2</td>
                            </tr>
                            <tr style={{ background: "lightgreen" }}>
                              <td></td>
                              <td>Sandwiches</td>
                              <td></td>
                              <td>2</td>
                              <td></td>
                            </tr>
                            <tr style={{ background: "lightgreen" }}>
                              <td></td>
                              <td>Salads</td>
                              <td></td>
                              <td>2</td>
                              <td></td>
                            </tr>
                            <tr style={{ background: "lightblue" }}>
                              <td>Text Input</td>
                              <td>What&apos;s your favourite restaurant</td>
                              <td></td>
                              <td></td>
                              <td></td>
                            </tr>
                          </>
                        ) : (
                          <>
                            {new Array(6)
                              .fill(undefined)
                              .map((a, index) => "Option " + (index + 1))
                              .map((text, i) => (
                                <tr
                                  key={i}
                                  style={{
                                    background: [
                                      "lightcoral",
                                      "lightcoral",
                                      "lightgreen",
                                      "lightgreen",
                                      "lightblue",
                                      "lightblue",
                                    ][i],
                                  }}
                                >
                                  <td>{text}</td>
                                  <td>{i % 3 || ""}</td>
                                  <td>{(i + 1) % 3 || ""}</td>
                                  <td>{(i + 2) % 3 || ""}</td>
                                </tr>
                              ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </>
                ) : overpage.type == "deleting" ? (
                  <>
                    <div style={{ textAlign: "center" }}>
                      Are You Sure You Want To Delete This Survey?
                      <br />
                      Type {survey.current?.ID} Below To Confirm
                      <br />
                      <br />
                      <input
                        name="deleter"
                        placeholder={survey.current?.ID || ""}
                        type="text"
                        className="borderer"
                      />
                      <br />
                      <br />
                      <button
                        className="borderer"
                        style={{ width: "200px" }}
                        onClick={async () => {
                          if (
                            survey.current &&
                            document
                              .getElementsByTagName("input")
                              .namedItem("deleter")?.value ==
                              survey.current.ID &&
                            user.current
                          ) {
                            delete user.current.surveys[survey.current.ID];
                            addDoc({
                              collection: "users",
                              doc: username.current,
                              data: JSON.parse(JSON.stringify(user.current)),
                            });
                            await delDoc(
                              { collection: "rules", doc: survey.current.ID },
                              { collection: "results", doc: survey.current.ID }
                            );
                            const url = new URL(window.location.href);
                            const searchParams = new URLSearchParams(
                              url.search
                            );
                            searchParams.delete("survey");
                            url.search = searchParams.toString();
                            window.history.replaceState({}, "", url.toString());
                            survey.current = undefined;
                            setMode({});
                            setOverpage(undefined);
                          } else
                            alert(
                              `Type ${survey.current?.ID} In The Box To Confirm`
                            );
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : overpage.type == "publishing" ? (
                  <>
                    <div style={{ textAlign: "center" }}>
                      Publishing the survey may mess with some of the responses,
                      causing issues. It&apos;s recommended to download and
                      clear results before publishing.
                    </div>
                    <div
                      className="topbar"
                      style={{ border: "none", width: "50%", margin: "auto" }}
                    >
                      <div>
                        <button
                          className="borderer"
                          onClick={async () => {
                            try {
                              const url = new URL(window.location.origin);
                              const searchParams = new URLSearchParams(
                                url.search
                              );
                              searchParams.set(
                                "survey",
                                survey.current?.ID || ""
                              );
                              url.search = searchParams.toString();
                              await navigator.clipboard.writeText(
                                url.toString()
                              );
                              console.log("Text copied to clipboard");
                            } catch (err) {
                              console.error("Failed to copy text: ", err);
                            }
                          }}
                        >
                          Copy Link
                        </button>
                        <button
                          className="borderer"
                          onClick={async () => {
                            if (survey.current)
                              try {
                                await navigator.clipboard.writeText(
                                  survey.current.ID
                                );
                                console.log("Text copied to clipboard");
                              } catch (err) {
                                console.error("Failed to copy text: ", err);
                              }
                          }}
                        >
                          Copy Code
                        </button>
                      </div>
                      <div>
                        <button
                          className="borderer"
                          onClick={async () => {
                            results.current = await getDoc(
                              "results",
                              survey.current?.ID || ""
                            );
                            if (results.current)
                              downloadCSV(
                                `"${Object.keys(questionResults.current)
                                  .map((val) => val.replaceAll('"', '""'))
                                  .join('","')}"\n"${Object.values(
                                  results.current
                                )
                                  .map((val) =>
                                    Object.values(val)
                                      .map((val) => val.replaceAll('"', '""'))
                                      .join('","')
                                  )
                                  .join(`"\n"`)}"`
                              );
                          }}
                        >
                          Download Results
                        </button>
                        <button
                          className="borderer"
                          onClick={() => {
                            results.current = {};
                            addDoc({
                              collection: "results",
                              doc: survey.current?.ID || "",
                              data: {},
                            });
                          }}
                        >
                          Clear Results
                        </button>
                      </div>
                      <div>
                        <button
                          className="borderer"
                          onClick={() => {
                            if (survey.current && user.current) {
                              const newCategories: Record<string, number> = {};
                              categories.current.map(
                                (cat) => (newCategories[cat] = 0)
                              );
                              survey.current.questions.map((group) =>
                                group.questions.map((question) => {
                                  if (question.type != "TXT")
                                    question.values.map((option) =>
                                      Object.entries(option.categories).map(
                                        ([key, val]) =>
                                          (newCategories[key] += val)
                                      )
                                    );
                                })
                              );
                              survey.current.categories = newCategories;
                              user.current.surveys[survey.current.ID] =
                                survey.current;
                              addDoc(
                                {
                                  collection: "users",
                                  doc: username.current,
                                  data: JSON.parse(
                                    JSON.stringify(user.current)
                                  ),
                                },
                                {
                                  collection: "rules",
                                  doc: survey.current.ID,
                                  data: JSON.parse(
                                    JSON.stringify(survey.current)
                                  ),
                                },
                                {
                                  collection: "results",
                                  doc: survey.current.ID,
                                  data: {},
                                }
                              );
                              alert("Published");
                              setOverpage(undefined);
                            }
                          }}
                        >
                          Publish
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <></>
                )}
              </div>
            </>
          ) : (
            ""
          )}
        </div>
      </>
    );
}
