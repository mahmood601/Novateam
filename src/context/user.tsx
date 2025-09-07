import { setAccount } from "../stores/account";
import { account } from "../services/appwrite";
import {
  Accessor,
  createContext,
  createSignal,
  onMount,
  Setter,
  useContext,
} from "solid-js";
import { ensureUserExists } from "../services/user";

type UserContextType = {
  user: Accessor<User | null>;
  setUser: Setter<User | null>;
  isLoading: Accessor<boolean>;
  fetchUser: () => Promise<void>;
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType>();

export function useUser() {
  return useContext(UserContext) as UserContextType;
}

export function UserProvider(props) {
  const [user, setUser] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(true);

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
    localStorage.removeItem("user");
    setUser(null);
    await account.deleteSession("current");
  }

  async function fetchUser() {
    setIsLoading(true);
    try {
      let loggedIn;
      try {
        loggedIn = await account.get();
      } catch (networkError) {
        console.warn("Network issue, using fallback user:", networkError);
        loggedIn = JSON.parse(localStorage.getItem("user"));
      }

      if (!loggedIn) throw new Error("No user data");

      const userInfo = {
        id: loggedIn.$id,
        email: loggedIn.email,
        name: loggedIn.name,
        labels: loggedIn.labels,
      };
      ensureUserExists({name: userInfo.name, userId: userInfo.id, year: localStorage.getItem("year") });

      if (!userInfo.labels.includes("admin")) {
        setAccount("devMode", false);
      }

      localStorage.setItem("user", JSON.stringify(userInfo));

      setUser(userInfo);
    } catch (error) {
      console.log("Auth error:", error);
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  onMount(() => {
    fetchUser();
  });

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, login, logout }}>
      {props.children}
    </UserContext.Provider>
  );
}
