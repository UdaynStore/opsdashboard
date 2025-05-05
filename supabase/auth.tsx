import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type UserRole = "admin" | "manager" | "team_member";

type UserProfile = {
  name: string;
  team_id: string | null;
  is_active: boolean;
  roles: UserRole[];
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  roles: UserRole[];
  isAdmin: boolean;
  isManager: boolean;
  isTeamMember: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      const userRoles = rolesData.map((role) => role.roles.name as UserRole);

      setProfile({
        name: profileData.name,
        team_id: profileData.team_id,
        is_active: profileData.is_active,
        roles: userRoles,
      });

      setRoles(userRoles);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setProfile(null);
      setRoles([]);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchUserProfile(currentUser.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      setLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchUserProfile(currentUser.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;

    // After signup, create a user profile with team_member role by default
    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: data.user.id,
          name: fullName,
          is_active: true,
        });

      if (profileError) throw profileError;

      // Get team_member role id
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "team_member")
        .single();

      if (roleError) throw roleError;

      // Assign team_member role
      const { error: assignRoleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: data.user.id,
          role_id: roleData.id,
          assigned_at: new Date().toISOString(),
        });

      if (assignRoleError) throw assignRoleError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");
  const isTeamMember = roles.includes("team_member");

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        roles,
        isAdmin,
        isManager,
        isTeamMember,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
