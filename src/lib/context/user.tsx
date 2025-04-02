import { redirect } from "@solidjs/router";
import { account } from "../appwrite/appwrite";
import {
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider(props) {
  const [user, setUser] = createSignal(null);

  const login = async (provider) => {
    const origin = location.origin;
    await account.createOAuth2Session(
      provider,
      `${origin}/profile`,
      `${origin}/login`,
      [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ],
    );
  };

  async function logout() {
    localStorage.removeItem("user")
    setUser(null);
    await account.deleteSession("current");
  }

  async function fetchUser() {
    try {
      let loggedIn = JSON.parse(localStorage.getItem("user")) || await account.get();

      const user = { email: loggedIn.email, name: loggedIn.name, labels: loggedIn.labels };

      if (loggedIn) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      setUser(user);
    } catch (error) {
      console.log(error);

    }
  }

  createEffect(() => {
    fetchUser();
  });

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {props.children}
    </UserContext.Provider>
  );
}
