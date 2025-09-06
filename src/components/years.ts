import { YearData, YearKey } from "../types/years";

const years: Record<YearKey, YearData> = {
  // This file should be updated every year and season
  second: {
    name: "السنة الثانية",
    subjects: [
      "anatomy-2",
      "physiology",
      "clinical-chemistry",
      "proper-histology",
      "embryology",
      "md-4",
      "communication-skills",
    ],
  },
  third: {
    name: "السنة الثالثة",
    subjects: [],
  },
  fourth: {
    name: "السنة الرابعة",
    subjects: [],
  },
  fifth: {
    name: "السنة الخامسة",
    subjects: [],
  },
};

export default years;
