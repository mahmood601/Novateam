import { supabase } from "../services/supabase";
import {
  Accessor,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  Setter,
  useContext,
} from "solid-js";
import { ensureUserExists, updateUserProfile } from "../services/user";
import { parseRole, type Role } from "../lib/roles";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type FetchUserOpts = { silent?: boolean };

type UserContextType = {
  user: Accessor<User | null>;
  setUser: Setter<User | null>;
  isLoading: Accessor<boolean>;
  fetchUser: (opts?: FetchUserOpts) => Promise<void>;
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

// ─── Cached user (the offline identity) ──────────────────────────────────────
// Rule of this file: the cache is only ever DELETED on a real sign-out
// (logout() or the SIGNED_OUT auth event). A network failure must never
// delete it, because it is the only identity we have while offline.
const USER_CACHE_KEY = "user";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    // corrupted JSON or storage blocked → behave as "no cache" instead of crashing
    return null;
  }
}

function writeCachedUser(user: User) {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // storage full / blocked — not fatal
  }
}

function clearCachedUser() {
  try {
    localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function UserProvider(props: any) {
  const [user, setUser] = createSignal<User | null>(readCachedUser());
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
    clearCachedUser();
    setUser(null);
    await supabase.auth.signOut();
  };

  const fetchUser = async (opts?: FetchUserOpts) => {
    const silent = opts?.silent || !!user();
    if (!silent) setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      const cached = readCachedUser();

      // A cache is only trustworthy if it belongs to the account that is
      // actually signed in (guards against switching accounts on one device).
      const cacheIsUsable = !!cached && (!authUser || cached.id === authUser.id);

      // ── Offline / no session → fall back to the cache ──
      if (!authUser || !navigator.onLine) {
        setUser(cacheIsUsable ? cached : null);
        return;
      }

      // ── Online with a session → refresh the profile ──
      const name =
        authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "";

      // Best effort: failing to upsert the row must not log anyone out.
      try {
        await ensureUserExists({ userId: authUser.id, name });
      } catch (e) {
        console.warn("ensureUserExists failed (non-fatal):", e);
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", authUser.id)
        .single();

      // navigator.onLine can be true while the network is useless (weak signal,
      // captive portal). If the profile didn't load, keep what we had instead of
      // overwriting it with blanks (which silently demoted admins to "student").
      if (error || !userData) {
        if (cacheIsUsable) {
          setUser(cached);
        } else {
          // First-ever login and profile unreachable: let them in as a student,
          // but DON'T persist this guess. The next successful fetch fixes it.
          setUser({
            id: authUser.id,
            email: authUser.email ?? "",
            name,
            role: "student",
          });
        }
        return;
      }

      const userInfo: User = {
        id: authUser.id,
        email: authUser.email ?? "",
        name: userData.name ?? "",
        role: parseRole(userData.role),
      };

      writeCachedUser(userInfo);
      setUser(userInfo);
    } catch (err) {
      console.error("Auth error:", err);
      // Unexpected failure (almost always network). Do NOT clear the cache.
      setUser(readCachedUser());
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    fetchUser({ silent: !!user() });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // The only moment we're allowed to forget the user.
        clearCachedUser();
        setUser(null);
        return;
      }

      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

      if (session?.user) {
        // supabase-js docs: don't call other supabase methods synchronously
        // inside this callback (can deadlock) — defer to the next tick.
        setTimeout(() => fetchUser({ silent: true }), 0);
      }
    });

    onCleanup(() => data.subscription.unsubscribe());
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