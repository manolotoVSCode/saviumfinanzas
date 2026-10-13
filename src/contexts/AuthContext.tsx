import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Lectora de otra cuenta (tabla lectores): la web solo deja consultar. */
  soloLectura: boolean;
  /** Dueño de los datos que se muestran: el titular si es lectora, si no el propio usuario. */
  datosId: string | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: {
    nombre: string;
    apellidos: string;
    divisa_preferida: string;
  }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // undefined = aún sin consultar; null = no es lectora de nadie.
  const [titularId, setTitularId] = useState<string | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ¿Soy lectora de alguien? Mismo criterio que la app del iPhone (Repositorio.accesos).
  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setTitularId(undefined); return; }
    let cancelado = false;
    setTitularId(undefined);
    supabase
      .from('lectores')
      .select('propietario_id')
      .eq('lector_id', userId)
      .limit(1)
      .then(({ data, error }) => {
        if (cancelado) return;
        // Ante un error no se puede saber: se trata como lectora (lo prudente) hasta recargar.
        if (error) { console.error('Error comprobando acceso de lectura:', error); setTitularId(userId); return; }
        setTitularId(data?.[0]?.propietario_id ?? null);
      });
    return () => { cancelado = true; };
  }, [userId]);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Note: Supabase handles session persistence automatically
    // The rememberMe parameter is kept for UI purposes
    return { error };
  };

  const signUp = async (email: string, password: string, userData?: {
    nombre: string;
    apellidos: string;
    divisa_preferida: string;
  }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setSession(null);
      setUser(null);
      queryClient.clear();
      
      // Then sign out from Supabase. Solo este navegador: el alcance por defecto (global)
      // revoca también la sesión de la app del iPhone.
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, clear local state
      setSession(null);
      setUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading: loading || (!!user && titularId === undefined),
    soloLectura: !!user && titularId !== null,
    datosId: titularId ?? user?.id ?? null,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};