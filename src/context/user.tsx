import { supabase } from "../services/supabase";
import {
  Accessor,
  createContext,
  createSignal,
  onMount,
  Setter,
  useContext,
} from "solid-js";
import {
  ensureUserExists,
  updateUserProfile,
} from "../services/user";
import { json } from "@solidjs/router";

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
  updateProfile: (updates: {
    name?: string;
    year?: string;
  }) => Promise<boolean>;
};

const UserContext = createContext<UserContextType>();

export function useUser() {
  return useContext(UserContext) as UserContextType;
}

export function UserProvider(props: any) {
  const cached = localStorage.getItem("user")
  const [user, setUser] = createSignal<User | null>(cached? JSON.parse(cached) : null);
  const [isLoading, setIsLoading] = createSignal(false);

  const updateProfile = async (updates: {
    name?: string;
    year?: string;
  }): Promise<boolean> => {
    if (!user()) return false;

    const success = await updateUserProfile(user()!.id, updates);
    if (!success) return false;

    const updated = { ...user()!, ...updates };
    if (updated) {

      if (updates.year) localStorage.setItem("year", updates.year);
    }
    return true;
  };

  const login = async (provider: string) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${location.origin}/profile`,
        scopes: "email profile openid",
        skipBrowserRedirect: true, // ← لا تحوّل الـ tab الحالي
      },
    });

    if (error || !data.url) return;

    // افتح Google في popup منفصل — لا يُلوّث الـ history
    const popup = window.open(
      data.url,
      "oauth_popup",
      "width=500,height=600,scrollbars=yes,resizable=yes",
    );

    // استمع لإغلاق الـ popup (بعد إتمام تسجيل الدخول)
    const timer = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(timer);
        await fetchUser(); // ← أعد جلب الـ session بعد الإغلاق
        return;
      }

      // تحقق من الـ session — إذا كان المستخدم قد سجّل دخول، أغلق الـ popup تلقائياً
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          popup?.close(); // أغلق الـ popup فوراً
          clearInterval(timer);
          await fetchUser(); // أعد جلب البيانات
        }
      } catch {
        // ignore
      }
    }, 500);
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

      const { data: userData } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", authUser.id)
        .single();

      const userInfo: User = {
        id: authUser.id,
        email: authUser.email ?? "",
        name: userData?.name ?? "",
        role: userData?.role === "admin" ? "admin" : "student",
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

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') return;

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
      value={{
        user,
        setUser,
        isLoading,
        fetchUser,
        login,
        logout,
        updateProfile,
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
}
