import { useRouter } from "next/router";
import { useState } from "react";

import { createClient } from "@/utils/supabase/component";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function logIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error(error);
    }
    router.push("/");
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error(error);
    }
    router.push("/");
  }

  return (
    <main>
      <form className="flex flex-col space-y-4 w-[60%] mx-auto mt-20">
        <label htmlFor="email" className="text-white">
          Email:
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password" className="text-white">
          Password:
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={logIn}
          className="text-black bg-[#1BD79E]"
        >
          Log in
        </button>
        <button type="button" onClick={signUp} className="bg-white text-[#1BD79E]">
          Sign up
        </button>
      </form>
    </main>
  );
}
