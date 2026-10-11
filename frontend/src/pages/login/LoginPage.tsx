import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from '@/components/session-provider'
import { Moon, Sun } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading: sessionLoading } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Login failed')
      }
      await login()
      navigate('/admin/users') // или /users — исправьте маршрут
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img alt="3proxy" className="h-32 w-32 mx-auto mb-4" loading="eager" src="/favicon.svg" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">3proxy UI</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to manage proxy users</p>
        </div>
        <form
          className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg relative"
          onSubmit={handleSubmit(onSubmit)}
        >
          <button
            aria-label="Toggle theme"
            className="absolute top-4 right-4 px-3 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            type="button"
          >
            <Moon className="h-5 w-5 text-blue-600 dark:hidden" />
            <Sun className="h-5 w-5 text-amber-500 hidden dark:block" />
          </button>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-full">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
            <input
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white min-h-[44px]"
              id="username"
              placeholder="Enter username"
              type="text"
              {...register('username')}
              disabled={isLoading || sessionLoading}
            />
            {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white min-h-[44px]"
              id="password"
              placeholder="Enter password"
              type="password"
              {...register('password')}
              disabled={isLoading || sessionLoading}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
          </div>
          <button
            className="w-full px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-full transition-colors flex items-center justify-center gap-2"
            disabled={isLoading || sessionLoading}
            type="submit"
          >
            {isLoading || sessionLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" /></svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
