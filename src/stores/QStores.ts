import { createStore } from "solid-js/store";

export type QStoreType = {
  $id?: string;
  subject: string;
  season_id: number | null;
  year_id: number | null;
  question: string;
  explanation: string;
  options: string[];       
  correctIndex: number[];
  user_id: string;
  [key: string]: any;
};

const initialState: QStoreType = {
  subject:      "",
  season_id:    null,
  year_id:      null,
  question:     "",
  explanation:  "",
  options:      ["", "", "", ""],
  correctIndex: [],
  user_id:      "",
};

const [QStore, setQStore] = createStore<QStoreType>(initialState);

export { QStore, setQStore };
