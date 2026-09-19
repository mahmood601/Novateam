import { JSX } from "solid-js";
import LectureBreadcrumb, { type BreadcrumbItem } from "./LectureBreadcrumb";

interface Props {
  breadcrumb: BreadcrumbItem[];
  children: JSX.Element;
}

export default function LecturesLayout(props: Props) {
  return (
    <div class="lecture-view pt-15">
      <div class="lecture-breadcrumb-bar">
        <LectureBreadcrumb items={props.breadcrumb} />
      </div>

      <main class="lecture-content" dir="rtl">
        {props.children}
      </main>
    </div>
  );
}