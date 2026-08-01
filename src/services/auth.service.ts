import { supabase } from "@/integrations/supabase/client";

export const authService = {
  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
  },

  requestPasswordReset(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
  },

  updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },

  signOut() {
    return supabase.auth.signOut();
  },

  getSession() {
    return supabase.auth.getSession();
  },
};
