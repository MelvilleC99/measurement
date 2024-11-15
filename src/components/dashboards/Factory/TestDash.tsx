// src/components/dashboards/Factory/TestDash.tsx

import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../styles/shadcn/ui/select";
import { Progress } from "../../../styles/shadcn/ui/progress";
import { Activity, AlertTriangle, DollarSign, Users, XCircle } from 'lucide-react';
import { useTest } from './dataFetching/useTest'; // Ensure this path is correct
import { useDowntimeData } from './dataFetching/useDowntimeData'; // Ensure this hook exists
import { useQualityMetrics } from './dataFetching/useQualityMetrics'; // Ensure this hook exists
import { QualityIssues } from './components/QualityIssues';
import { DowntimeIssues } from './components/DowntimeIssues';
import { ProductionLine } from './dataFetching/useTest'; // Adjust based on where ProductionLine is defined
import { Card, CardContent } from "../../../styles/shadcn/ui/card";

function TestDash() {
    const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'janToMar'>('today');

    // Use the useTest hook to fetch production data from CSV
    const { productionData, loading: productionLoading, error } = useTest(timePeriod);

    // Calculate startDate and endDate based on timePeriod for other hooks
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
            case 'janToMar':
                start.setMonth(0); // January
                start.setDate(1);
                end.setMonth(2); // March
                end.setDate(31);
                break;
        }

        return { startDate: start, endDate: end };
    }, [timePeriod]);

    // Use other hooks to fetch downtime and quality metrics
    const { downtimeSummary, loading: downtimeLoading } = useDowntimeData(startDate, endDate);
    const { metrics: qualityMetrics, loading: qualityLoading } = useQualityMetrics(startDate, endDate);

    const isLoading = productionLoading || downtimeLoading || qualityLoading;

    const overallEfficiency = useMemo(() => {
        if (productionData.length === 0) return 0;
        return productionData.reduce((sum: number, line: ProductionLine) => sum + line.efficiency, 0) / productionData.length;
    }, [productionData]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    const totalQualityIssues = qualityMetrics.totalRejects + qualityMetrics.totalReworks;

    return (
        <div className="space-y-6 p-6">
            {/* Header with Title and Period Selector */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Factory Dashboard (Test)</h1>
                <Select
                    value={timePeriod}
                    onValueChange={(value) => setTimePeriod(value as 'today' | 'week' | 'month' | 'quarter' | 'janToMar')}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="janToMar">Jan to Mar</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-5 gap-4">
                <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Overall Efficiency</span>
                        <Activity className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold mb-2">{overallEfficiency.toFixed(1)}%</div>
                    <Progress value={overallEfficiency} />
                </Card>

                <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Total Downtime</span>
                        <AlertTriangle className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">
                        {Math.round(downtimeSummary.totalDuration)} min
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Budget Impact</span>
                        <DollarSign className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">
                        R {qualityMetrics.totalCost.toLocaleString()}
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Attendance Issues</span>
                        <Users className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">12</div>
                </Card>

                <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Quality Issues</span>
                        <XCircle className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{totalQualityIssues}</div>
                    <div className="text-sm text-gray-500">
                        R {qualityMetrics.totalCost.toLocaleString()}
                    </div>
                </Card>
            </div>

            {/* Factory Performance */}
            <Card>
                <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-6">Factory Performance</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 pb-2">
                            <div>Production Line</div>
                            <div>Efficiency</div>
                        </div>
                        {productionData.map((line: ProductionLine) => (
                            <div key={line.id} className="grid grid-cols-2 gap-4 items-center">
                                <div className="font-medium">{line.name}</div>
                                <div className="flex items-center gap-2">
                                    <Progress value={line.efficiency} className="w-[60px]" />
                                    <span>{line.efficiency.toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Issues Grid */}
            <div className="grid grid-cols-3 gap-6">
                <QualityIssues startDate={startDate} endDate={endDate} />
                <DowntimeIssues startDate={startDate} endDate={endDate} />
                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-4">Attendance Issues</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 text-sm text-gray-500">
                                <div>Employee</div>
                                <div>Status</div>
                            </div>
                            <div className="grid grid-cols-2">
                                <div>John Doe</div>
                                <div>Late</div>
                            </div>
                            <div className="grid grid-cols-2">
                                <div>Jane Smith</div>
                                <div>Absent</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default TestDash;

