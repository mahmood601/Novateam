import { onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../../services/supabase"; 

export default function AuthCallback() {
  const navigate = useNavigate();

  onMount(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error(error);
      navigate("/login");
      return;
    }

    if (data?.session) {
      navigate("/profile", {replace: true});
    } else {
      navigate("/login");
    }
  });

  return <p>جاري تسجيل الدخول...</p>;
}