import { useNavigate } from "@solidjs/router";
import Header from "~/components/ui/Header";
import Layout from "~/components/ui/Layout";

export default function Dashboard() {
  const navigate = useNavigate();

  // if (0) return navigate("/login")

  return (
    <div class="h-screen dark:bg-black">
      <Layout>
        <div class="p-3 bg-slate-300">
          <button
            class="-rotate-90 "
            onClick={() => {
              navigate("/", { replace: true });
            }}
          ></button>
        </div>
        <div>
          <form action="">
            <div>
              <label for="question">kfvkk</label>
              <input id="question" type="text" />
            </div>
            <div>
              <label for=""></label>
              <input type="text" />
            </div>
            <div>
              <label for=""></label>
              <input type="text" />
            </div>
            <div>
              <label for=""></label>
              <input type="text" />
            </div>
            <div>
              <label for=""></label>
              <input type="text" />
            </div>
            <div>
              <label for=""></label>
              <input type="text" />
            </div>
            <div>
              <label for=""></label>
              <input type="text" />
            </div>
          </form>
        </div>
      </Layout>
    </div>
  );
}
