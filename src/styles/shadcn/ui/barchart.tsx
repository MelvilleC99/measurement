"use client"

import { ReactNode } from "react"
import { TooltipProps } from "recharts"

export interface BarChartConfig {
    [key: string]: {
        label: string
        color: string
    }
}

interface BarTooltipProps extends TooltipProps<any, any> {
    hideLabel?: boolean;
}

interface BarChartContainerProps {
    children: ReactNode;
    config: BarChartConfig;
}

export function BarChartContainer({ children, config }: BarChartContainerProps) {
    return (
        <div className="h-[200px] w-full">
            {children}
        </div>
    );
}

export function BarTooltip({ active, payload }: BarTooltipProps) {
    if (!active || !payload) return null;

    return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
            <div className="flex flex-col">
                <span className="font-medium">{payload[0]?.payload.line}</span>
                <span className="text-muted-foreground">
          {payload[0]?.value}% efficiency
        </span>
            </div>
        </div>
    );
}

export default {
    BarChartContainer,
    BarTooltip
};