import React from 'react';
import { Card, CardContent } from '../../../../styles/shadcn/ui/card';
import { XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../styles/shadcn/ui/tabs";
import { useQualityMetrics } from '../dataFetching/useQualityMetrics';

export interface QualityIssuesProps {
    startDate: Date;
    endDate: Date;
    className?: string;  // Added className prop
}

export function QualityIssues({ startDate, endDate, className = '' }: QualityIssuesProps) {
    const { metrics, loading } = useQualityMetrics(startDate, endDate);

    if (loading) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="flex justify-center items-center h-[300px]">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    const totalIssues = metrics.totalRejects + metrics.totalReworks;

    return (
        <Card className={className}>
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">Quality Issues</h3>
                        <span className="text-sm text-gray-500">({totalIssues})</span>
                    </div>
                    <XCircle className="h-4 w-4 text-gray-500" />
                </div>

                <Tabs defaultValue="rejects" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="rejects">
                            Rejects ({metrics.totalRejects})
                        </TabsTrigger>
                        <TabsTrigger value="reworks">
                            Reworks ({metrics.totalReworks})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="rejects">
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-500 mb-2 px-2">
                                <div>Reason</div>
                                <div className="text-right">Count</div>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto pr-2">
                                {metrics.rejects.length > 0 ? (
                                    metrics.rejects.map((reject, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-2 gap-4 py-2 border-b last:border-0 hover:bg-gray-50"
                                        >
                                            <div className="truncate">{reject.reason}</div>
                                            <div className="text-right font-medium">{reject.count}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-4">
                                        No rejects recorded
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="reworks">
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-500 mb-2 px-2">
                                <div>Reason</div>
                                <div className="text-right">Count</div>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto pr-2">
                                {metrics.reworks.length > 0 ? (
                                    metrics.reworks.map((rework, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-2 gap-4 py-2 border-b last:border-0 hover:bg-gray-50"
                                        >
                                            <div className="truncate">{rework.reason}</div>
                                            <div className="text-right font-medium">{rework.count}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-4">
                                        No reworks recorded
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        Total Cost: R {metrics.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
export default QualityIssues;