import React from 'react';
import { Card, CardContent } from "../../../../styles/shadcn/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../styles/shadcn/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDowntimeData } from '../dataFetching/useDowntimeData';
import {
    calculateStyleChangeoverStats,
    calculateDowntimeSummary,
    calculateMachineDowntimeStats,
    calculateSupplyDowntimeStats,
    minutesToHours,
    StyleChangeoverWithTrends,
    DowntimeSummary,
    DowntimeData,
    TrendData,
    MachineDowntimeStats,
    SupplyDowntimeStats,
    ReasonBreakdown
} from './utils';

interface DowntimeIssuesProps {
    startDate: Date;
    endDate: Date;
    className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
const CARD_HEIGHT = "h-28";

const TrendIndicator: React.FC<{ trend: TrendData }> = ({ trend }) => (
    <span className={`font-medium ${trend.trend > 0 ? 'text-red-500' : trend.trend < 0 ? 'text-green-500' : 'text-gray-500'}`}>
        {trend.trend > 0 ? '+' : ''}{Math.abs(trend.trend).toFixed(1)}% {trend.trend > 0 ? '↑' : '↓'}
    </span>
);

const ReasonTable: React.FC<{ reasons: ReasonBreakdown[] }> = ({ reasons }) => (
    <div className="mt-4">
        <table className="w-full">
            <thead>
            <tr className="text-sm text-gray-500">
                <th className="text-left py-2">Reason</th>
                <th className="text-right py-2">Time Lost</th>
                <th className="text-right py-2">Trend</th>
            </tr>
            </thead>
            <tbody>
            {reasons.map((reason, index) => (
                <tr key={index} className="border-t border-gray-100">
                    <td className="py-2">{reason.reason}</td>
                    <td className="text-right">{minutesToHours(reason.timeLost)}h</td>
                    <td className="text-right">
                        <TrendIndicator trend={reason.trend} />
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>
);

const getPeriodDescription = (startDate: Date, endDate: Date): string => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return '7 days';
    if (days <= 31) return 'month';
    return 'period';
};

export function DowntimeIssues({ startDate, endDate, className = '' }: DowntimeIssuesProps) {
    const { downtimeSummary, loading, previousPeriodSummary } = useDowntimeData(startDate, endDate);

    if (loading) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="flex justify-center items-center h-[300px]">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    const periodDesc = getPeriodDescription(startDate, endDate);

    const currentPeriod: DowntimeData = {
        machineDowntimes: downtimeSummary.machineDowntimes,
        supplyDowntimes: downtimeSummary.supplyDowntimes,
        styleChangeovers: downtimeSummary.styleChangeovers
    };

    const previousPeriod: DowntimeData | undefined = previousPeriodSummary ? {
        machineDowntimes: previousPeriodSummary.machineDowntimes,
        supplyDowntimes: previousPeriodSummary.supplyDowntimes,
        styleChangeovers: previousPeriodSummary.styleChangeovers
    } : undefined;

    const summary = calculateDowntimeSummary(currentPeriod, previousPeriod);
    const changeoverStats = calculateStyleChangeoverStats(
        downtimeSummary.styleChangeovers,
        previousPeriodSummary?.styleChangeovers || []
    );
    const machineStats = calculateMachineDowntimeStats(
        downtimeSummary.machineDowntimes,
        previousPeriodSummary?.machineDowntimes || []
    );
    const supplyStats = calculateSupplyDowntimeStats(
        downtimeSummary.supplyDowntimes,
        previousPeriodSummary?.supplyDowntimes || []
    );

    return (
        <Card className={className}>
            <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Downtime Issues</h3>

                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="changeover">Style Changeover</TabsTrigger>
                        <TabsTrigger value="machine">Machine</TabsTrigger>
                        <TabsTrigger value="supply">Supply</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary">
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Total Downtime</span>
                                        <div className="text-2xl font-bold">
                                            {minutesToHours(summary.totalDowntime)}h
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">vs prev {periodDesc}</span>
                                        <div className="text-2xl font-bold">
                                            <TrendIndicator trend={summary.trends.total} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={summary.distribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {summary.distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${minutesToHours(Number(value))}h`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex justify-between px-4 mt-2">
                                    <span>Machine: {minutesToHours(summary.machineTotal)}h</span>
                                    <span>Supply: {minutesToHours(summary.supplyTotal)}h</span>
                                    <span>Changeover: {minutesToHours(summary.changeoverTotal)}h</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="changeover">
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Total Changeovers</span>
                                        <div className="text-2xl font-bold">
                                            {changeoverStats.totalChangeovers}
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">vs prev {periodDesc}</span>
                                        <div className="text-2xl font-bold">
                                            <TrendIndicator trend={changeoverStats.trends.overall} />
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Average Time</span>
                                        <div className="text-2xl font-bold">
                                            {minutesToHours(changeoverStats.averageTime)}h
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-3 gap-8 mb-4 text-sm text-gray-500">
                                    <div>Step</div>
                                    <div>Average Time</div>
                                    <div>Trend</div>
                                </div>

                                <div className="space-y-2">
                                    {[
                                        {
                                            label: 'Machine Setup',
                                            value: changeoverStats.machineSetupAvg,
                                            trend: changeoverStats.trends.machineSetup
                                        },
                                        {
                                            label: 'People Allocated',
                                            value: changeoverStats.peopleAllocatedAvg,
                                            trend: changeoverStats.trends.peopleAllocated
                                        },
                                        {
                                            label: 'First of Line',
                                            value: changeoverStats.firstOfLineAvg,
                                            trend: changeoverStats.trends.firstOfLine
                                        },
                                        {
                                            label: 'QC Approved',
                                            value: changeoverStats.qcApprovedAvg,
                                            trend: changeoverStats.trends.qcApproved
                                        }
                                    ].map((step) => (
                                        <div key={step.label} className="grid grid-cols-3 gap-8 items-center py-2 hover:bg-white rounded">
                                            <span className="whitespace-nowrap">{step.label}</span>
                                            <span className="font-medium">{minutesToHours(step.value)}h</span>
                                            <TrendIndicator trend={step.trend} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Total Time Lost</span>
                                    <span className="text-xl font-bold">
                                        {minutesToHours(changeoverStats.totalTime)}h
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="machine">
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Total Time</span>
                                        <div className="text-2xl font-bold">
                                            {minutesToHours(machineStats.totalTime)}h
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Average Time</span>
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {minutesToHours(machineStats.averageTime)}h
                                            </div>
                                            <TrendIndicator trend={machineStats.trends.average} />
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Average Repair</span>
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {minutesToHours(machineStats.averageRepair)}h
                                            </div>
                                            <TrendIndicator trend={machineStats.trends.repair} />
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Average Response</span>
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {minutesToHours(machineStats.averageResponse)}h
                                            </div>
                                            <TrendIndicator trend={machineStats.trends.response} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Top 5 Reasons</h4>
                                <ReasonTable reasons={machineStats.topReasons} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="supply">
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Total Time</span>
                                        <div className="text-2xl font-bold">
                                            {minutesToHours(supplyStats.totalTime)}h
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">vs prev {periodDesc}</span>
                                        <div className="text-2xl font-bold">
                                            <TrendIndicator trend={supplyStats.trends.total} />
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 p-4 rounded-lg ${CARD_HEIGHT}`}>
                                    <div className="flex flex-col h-full justify-between">
                                        <span className="text-sm text-gray-500">Average Time</span>
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {minutesToHours(supplyStats.averageTime)}h
                                            </div>
                                            <TrendIndicator trend={supplyStats.trends.average} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Top 5 Reasons</h4>
                                <ReasonTable reasons={supplyStats.topReasons} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default DowntimeIssues;