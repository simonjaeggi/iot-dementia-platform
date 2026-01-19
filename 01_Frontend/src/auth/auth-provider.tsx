import React, { createContext, useEffect, useState } from "react"

type AuthContextValue = {
  user: null | { id: string; email: string }
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Example: load session/token from localStorage and validate (or call /me)
    try {
      const raw = localStorage.getItem("user")
      setUser(raw ? JSON.parse(raw) : null)
    } catch {
      localStorage.removeItem("user")
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  async function login(email: string, password: string) {
    // TODO: call your API, receive token + user
    const fakeUser = { id: "1", email }
    localStorage.setItem("user", JSON.stringify(fakeUser))
    setUser(fakeUser)
  }

  function logout() {
    localStorage.removeItem("user")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
