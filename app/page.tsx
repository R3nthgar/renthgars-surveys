"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useRef, useState, useEffect } from "react";
import { Survey, surveyClass } from "./components/survey";
import { getData } from "./components/dataModifier";
export default function Home() {
  const [started, start] = useState(false);
  const survey = useRef<surveyClass | undefined>(undefined);
  const surveyID = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!started) {
      const tempFunct = async () => {
        surveyID.current =
          new URLSearchParams(window.location.search).get("survey") ||
          undefined;
        if (surveyID.current) {
          const docs = await getData("rules", surveyID.current);
          if (docs && !survey.current) {
            survey.current = {
              ...docs,
              startScreen: docs.startScreen || "",
              ID: docs.ID || "",
              name: docs.name || "",
              finishScreen: docs.finishScreen || "",
              categories: docs.categories || {},
              questions: docs.questions || [],
            };
          }
        }
        start(true);
      };
      tempFunct();
    }
  }, [started]);
  if (started)
    return (
      <>
        {!survey.current ? (
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
            {surveyID.current ? "Survey Not Found" : "Enter Your Code Below"}
          </div>
        ) : (
          <></>
        )}
        {!survey.current ? (
          <>
            {surveyID.current ? (
              <div id="textContainer" style={{ textAlign: "center" }}>
                That Survey Doesn&apos;t Exist
              </div>
            ) : (
              ""
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "none" }}></div>
              <input
                type="text"
                placeholder="Survey Code"
                className="borderer"
                style={{ width: "300px", margin: "25px" }}
                onChange={(e) => {
                  const parentElement = e.target.parentElement;
                  if (parentElement) {
                    parentElement.children[0].innerHTML = e.target.value;
                  }
                }}
              ></input>
              <br></br>
              <button
                className="borderer"
                style={{ width: "300px" }}
                onClick={(e) => {
                  const parentElement = e.currentTarget.parentElement;
                  if (parentElement) {
                    const url = new URL(window.location.href);
                    const searchParams = new URLSearchParams(url.search);
                    searchParams.set(
                      "survey",
                      parentElement.children[0].innerHTML
                    );
                    url.search = searchParams.toString();
                    window.history.replaceState({}, "", url.toString());
                    start(false);
                  }
                }}
              >
                Enter
              </button>
            </div>
          </>
        ) : (
          <Survey survey={survey.current} recordData={true} />
        )}
      </>
    );
}
