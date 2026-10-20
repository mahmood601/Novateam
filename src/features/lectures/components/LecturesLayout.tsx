import { JSX } from "solid-js";
import type { BreadcrumbItem } from "./LectureBreadcrumb";
import LectureProgressBar from "./LectureProgressBar";

interface Props {
  breadcrumb: BreadcrumbItem[];
  children: JSX.Element;
  // Optional TOC (renders its own mobile bar + desktop column)
  toc?: JSX.Element;
}

export default function LecturesLayout(props: Props) {
  return (
    <div class="lecture-view pt-15">
      <LectureProgressBar />
      {/* Mobile TOC bar is sticky above the scroller; desktop TOC is a side column */}
      {props.toc}
      <main class="lecture-content" dir="rtl">
        {props.children}
      </main>
    </div>
  );
}
