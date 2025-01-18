import { JSX } from "solid-js";
import Header from "./Header";
import "./UI.css"

export default function Layout(props: { children: JSX.Element }) {

  return (
    <>
      <Header />
      {props.children}
    </>
  )

}

