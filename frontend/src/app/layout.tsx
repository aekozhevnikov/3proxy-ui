import "@/styles/globals.css";

import { Outlet } from "react-router-dom";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import SideMenuDrawer from "@/components/side-menu-drawer";

export default function RootLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground antialiased">
            <div className="flex">
                <div className="hidden lg:block w-[316px] shrink-0">
                    <SideMenu />
                </div>

                <div className="relative flex flex-col flex-1 min-h-screen">
                    <SideMenuDrawer />

                    <main className="flex-1 mt-8 lg:mt-0 pt-8 px-2 overflow-x-hidden overflow-y-auto">
                        <Outlet />
                    </main>

                    <Footer />
                </div>
            </div>
        </div>
    );
}
