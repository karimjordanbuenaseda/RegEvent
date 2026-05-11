import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthContextType {
  token: string | null
  setToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem('access_token'),
  )

  function setToken(t: string) {
    localStorage.setItem('access_token', t)
    setTokenState(t)
  }

  function logout() {
    localStorage.removeItem('access_token')
    setTokenState(null)
  }

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
