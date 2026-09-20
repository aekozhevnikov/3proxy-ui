"use client";

import DashboardHeader from "@/src/app/admin/dashboard/DashboardHeader";
import SystemStatusCard from "@/src/app/admin/dashboard/SystemStatusCard";
import UserSummaryCard from "@/src/app/admin/dashboard/UserSummaryCard";
import TrafficOverviewCard from "@/src/app/admin/dashboard/TrafficOverviewCard";
import SystemInfoCard from "@/src/app/admin/dashboard/SystemInfoCard";
import useDashboardData from "@/src/app/admin/dashboard/useDashboardData";

export default function DashboardPage() {
    const { data, loading, refreshing, error, refresh } = useDashboardData();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                    onClick={refresh}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 flex flex-col gap-8 mb-6">
            <DashboardHeader refreshing={refreshing} onRefresh={refresh} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                <SystemStatusCard systemStatus={data.systemStatus} />
                <UserSummaryCard userSummary={data.userSummary} />
                <TrafficOverviewCard trafficStats={data.trafficStats} />
                <SystemInfoCard systemStatus={data.systemStatus} />
            </div>
        </div>
    );
}
