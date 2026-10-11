import { Outlet } from 'react-router-dom'
import SideMenu from '@/components/side-menu'
import SideMenuDrawer from '@/components/side-menu-drawer'
import { useTheme } from "@/hooks/useTheme"
import { useState } from 'react'

export default function Layout() {
    useTheme() // init .dark
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <SideMenuDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SideMenu />
      <div className="flex-1 flex flex-col min-w-0 ml-0 lg:ml-64">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            3proxy UI
          </h1>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}