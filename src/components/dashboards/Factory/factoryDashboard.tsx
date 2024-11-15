// FactoryDashboard.tsx

import React, { useMemo } from 'react';
import { Card, CardContent } from "../../../styles/shadcn/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../styles/shadcn/ui/select";
import { useProductionData, ProductionEfficiencyData } from './dataFetching/useProductionData';
import { useDowntimeData } from './dataFetching/useDowntimeData';
import { useQualityMetrics } from './dataFetching/useQualityMetrics';
import { QualityIssues } from './components/QualityIssues';
import { DowntimeIssues } from './components/DowntimeIssues';
import ProductionEfficiencyChart from './components/ProductionEfficiencyChart'; // Import the updated chart component

function FactoryDashboard() {
    const [timePeriod, setTimePeriod] = React.useState<'today' | 'week' | 'month' | 'quarter'>('today');

    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();

        switch(timePeriod) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                start.setDate(end.getDate() - 7);
                break;
            case 'month':
                start.setMonth(end.getMonth() - 1);
                break;
            case 'quarter':
                start.setMonth(end.getMonth() - 3);
                break;
        }

        return { startDate: start, endDate: end };
    }, [timePeriod]);

    // Destructure only existing properties without 'error'
    const { productionData, loading: productionLoading } = useProductionData(timePeriod);
    const { downtimeSummary, loading: downtimeLoading } = useDowntimeData(startDate, endDate);
    const { metrics: qualityMetrics, loading: qualityLoading } = useQualityMetrics(startDate, endDate);

    const isLoading = productionLoading || downtimeLoading || qualityLoading;

    // Optional: Log data for debugging
    console.log('Production Data:', productionData);
    console.log('Downtime Summary:', downtimeSummary);
    console.log('Quality Metrics:', qualityMetrics);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    const totalQualityIssues = qualityMetrics.totalRejects + qualityMetrics.totalReworks;

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header with Heading and Period Selector */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Factory Analytics</h1>
                <Select
                    value={timePeriod}
                    onValueChange={(value) => setTimePeriod(value as 'today' | 'week' | 'month' | 'quarter')}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Metrics */}
            <Card className="bg-white">
                <CardContent className="p-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 p-3">
                            <span className="text-sm font-medium text-gray-600">Overall Efficiency</span>
                            <div className="text-2xl font-bold mt-1.5">
                                {productionData.length > 0
                                    ? (productionData.reduce((sum, line) => sum + line.efficiency, 0) / productionData.length).toFixed(1)
                                    : '0.0'}%
                            </div>
                        </div>

                        <div className="flex-1 p-3">
                            <span className="text-sm font-medium text-gray-600">Total Downtime</span>
                            <div className="text-2xl font-bold mt-1.5">
                                {Math.round(downtimeSummary.totalDuration)}m
                            </div>
                        </div>

                        <div className="flex-1 p-3">
                            <span className="text-sm font-medium text-gray-600">Budget Impact</span>
                            <div className="text-2xl font-bold mt-1.5">
                                R {qualityMetrics.totalCost.toLocaleString()}
                            </div>
                        </div>

                        <div className="flex-1 p-3">
                            <span className="text-sm font-medium text-gray-600">Attendance Issues</span>
                            <div className="text-2xl font-bold mt-1.5">12</div>
                        </div>

                        <div className="flex-1 p-3">
                            <span className="text-sm font-medium text-gray-600">Quality Issues</span>
                            <div className="text-2xl font-bold mt-1.5">{totalQualityIssues}</div>
                            <div className="text-sm text-gray-500">
                                R {qualityMetrics.totalCost.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Production Efficiency Chart */}
            <div className="w-full lg:w-1/2">
                <ProductionEfficiencyChart
                    data={productionData}
                    className="bg-white p-4 rounded shadow"
                />
            </div>

            {/* Issues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <QualityIssues
                    startDate={startDate}
                    endDate={endDate}
                    className="bg-white rounded shadow"
                />
                <DowntimeIssues
                    startDate={startDate}
                    endDate={endDate}
                    className="bg-white rounded shadow"
                />
                <Card className="bg-white rounded shadow">
                    <CardContent className="p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-6">Attendance Issues</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-500">
                                <div>Employee</div>
                                <div>Status</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
                                <div className="text-gray-900">John Doe</div>
                                <div className="text-amber-600">Late</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
                                <div className="text-gray-900">Jane Smith</div>
                                <div className="text-red-600">Absent</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div> )
}

export default FactoryDashboard;
