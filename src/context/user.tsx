import { supabase } from "../services/supabase";
import { setAccount } from "../stores/account";
import {
  Accessor,
  createContext,
  createSignal,
  onMount,
  Setter,
  useContext,
} from "solid-js";
import { ensureUserExists, getUserRole } from "../services/user";

type User = {
  id: string;
  email: string;
  name: string;
  role: "student" | "admin";
};

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

export function UserProvider(props: any) {
  const [user, setUser] = createSignal<User | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  const login = async (provider: string) => {
    await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${location.origin}/profile`,
        scopes: "email profile openid",
      },
    });
  };

  const logout = async () => {
    localStorage.removeItem("user");
    setUser(null);
    await supabase.auth.signOut();
  };

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;

      // Fallback: offline
      if (!authUser || !navigator.onLine) {
        const cached = localStorage.getItem("user");
        if (cached) {
          setUser(JSON.parse(cached));
          return;
        }
        setUser(null);
        return;
      }

      const name =
        authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "";

      // ensure if user in users
      await ensureUserExists({ userId: authUser.id, name });

      //get role from users table (not from app_metadata)
      const role = await getUserRole(authUser.id);

      const userInfo: User = {
        id: authUser.id,
        email: authUser.email ?? "",
        name,
        role,
      };


      localStorage.setItem("user", JSON.stringify(userInfo));
      setUser(userInfo);
    } catch (err) {
      console.error("Auth error:", err);
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    fetchUser();

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });
  });

  return (
    <UserContext.Provider
      value={{ user, setUser, isLoading, fetchUser, login, logout }}
    >
      {props.children}
    </UserContext.Provider>
  );
}
