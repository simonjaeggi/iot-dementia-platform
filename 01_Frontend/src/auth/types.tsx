export type User = { id: string; email: string }
export type AuthContextValue = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, accessCode: string, name: string) => Promise<void>
  logout: () => Promise<void>
}