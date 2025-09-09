import { createStore } from "solid-js/store";
import { Question } from "../utils/indexeddb";

export const qStoreObj: Question = {
  $id: "",
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
  user_id: "",
};

 const [QStore, setQStore] = createStore<Question[]>([]);

 export{QStore, setQStore}