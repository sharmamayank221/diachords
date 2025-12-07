import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  adapter: SupabaseAdapter({
    url: process.env.STORAGE_SUPABASE_URL as string,
    secret: process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY as string,
  }),
});
