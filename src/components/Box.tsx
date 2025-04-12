import { A } from "@solidjs/router";
import Download from "./Icons/Download";
import { createEffect, createSignal, onMount } from "solid-js";
import {
  addQuestionsToFirstDB,
  getAnswers,
  getQuestions,
} from "../helpers/indexeddb";
import toast from "solid-toast";

export default function Box(props: {
  subject?: string;
  info: string;
  link: string;
  children?: any;
}) {
  const [qLen, setQLen] = createSignal(0);
  const [aLen, setALen] = createSignal(0);
  const [downloadStatus, setDownloadStatus] = createSignal<"pending" | "">("");

  createEffect(async () => {
    await getQuestions(props.subject).then((res) => {
      setQLen(res?.length || 0);
    });
    await getAnswers(props.subject).then((res) => {
      setALen(res.filter((item) => item.answer).length);
      
    });
  });

  return (
    <A
      href={`/${props.link}`}
      class="special-box mb-5 flex h-24 w-full flex-row-reverse items-center justify-between rounded-md py-2 pr-4 pl-2"
    >
      <div
        onClick={() => {}}
        class="flex h-full flex-1 flex-col justify-around"
      >
        <p dir="rtl" class="w-full text-lg font-bold">
          {props.info}
        </p>
        {props.children}
      </div>

      <button
        disabled={downloadStatus() == "pending"}
        on:click={(e) => {
          e.preventDefault();
          if (props.subject) {
            toast.promise(
              addQuestionsToFirstDB(props.subject).then(async () => {
                await getQuestions(props.subject).then((res) => {
                  setQLen(res?.length || 0);
                });
                await getAnswers(props.subject).then((res) => {
                  setALen(res.map((item) => item.answer).length);
                });
              }),
              {
                loading: () => {
                  setDownloadStatus("pending");
                  return <span>downloading...</span>;
                },
                success: () => {
                  setDownloadStatus("");
                  return <span>downloaded</span>;
                },

                error: (e) => {
                  return <span>{`${e}`}</span>;
                },
              },
              {},
            );
          }
        }}
        class="hover:bg-main flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-1 transition-colors duration-300"
      >
        <Download />
      </button>

      <div class="mr-2 flex h-full w-20 items-center justify-center">
        <div
          style={{
            background: `conic-gradient(var(--color-main) ${aLen() / qLen()}turn, var(--color-main-light) 0deg)`,
          }}
          class="bg-main-light flex size-16 items-center justify-center rounded-full"
        >
          <div class="progress bg-darker-light-2 dark:bg-lighter-dark-2 flex items-center justify-center rounded-full">
            <span class="block font-bold diagonal-fractions">
              {aLen()}/{qLen()}
            </span>
          </div>
        </div>
      </div>
    </A>
  );
}
