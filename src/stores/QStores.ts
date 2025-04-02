import { createStore } from "solid-js/store";

export interface QuestionsT {
  subject: string;
  year: string;
  season: string;
  question: string;
  explanation?: string;
  firstOption: string;
  secondOption: string;
  thirdOption?: string;
  fourthOption?: string;
  fifthOption?: string;
  correctIndex:  number[];
  
}

export const qStoreObj: QuestionsT = {
  subject: "",
  year: "",
  season: "",
  question: "",
  explanation: "",
  firstOption: "",
  secondOption: "",
  thirdOption: "",
  fourthOption: "",
  fifthOption: "",
  correctIndex: [],
};

export const [QStore, setQStore] = createStore<QuestionsT>(qStoreObj);
