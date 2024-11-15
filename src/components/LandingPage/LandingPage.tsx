import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PlayCircle, LayoutDashboard, BarChart } from 'lucide-react';
import { cn } from "../../lib/utils";

interface CardProps {
    title: string;
    Icon: any;
    desc: string;
    onClick: () => void;
    gradient: string;
}

const Card: FC<CardProps> = ({ title, Icon, desc, onClick, gradient }) => (
    <div
        onClick={onClick}
        className={cn(
            "group relative p-6 rounded-lg",
            "bg-white",  // Explicit white background
            "border border-border",
            "transition-all duration-200",
            "hover:shadow-xl hover:-translate-y-1",
            "cursor-pointer"
        )}
    >
        <div className="space-y-4">
            <div className={cn(
                "inline-flex items-center justify-center",
                "rounded-lg p-4",
                gradient,
                "transition-colors duration-200"
            )}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold tracking-tight text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
            </div>
        </div>
    </div>
);

const LandingPage: FC = () => {
    const navigate = useNavigate();

    const cards = [
        {
            title: "Admin",
            Icon: Users,
            desc: "Manage users, settings, and configurations",
            path: '/admin',
            gradient: "bg-gradient-to-br from-blue-500 to-blue-600"
        },
        {
            title: "Start Line",
            Icon: PlayCircle,
            desc: "Initiate and monitor active production lines",
            path: '/active-line',
            gradient: "bg-gradient-to-br from-purple-500 to-purple-600"
        },
        {
            title: "Production Boards",
            Icon: LayoutDashboard,
            desc: "View live production performance and status",
            path: '/production',
            gradient: "bg-gradient-to-br from-emerald-500 to-emerald-600"
        },
        {
            title: "Analytics",
            Icon: BarChart,
            desc: "Access detailed reports and data insights",
            path: '/analytics',
            gradient: "bg-gradient-to-br from-rose-500 to-rose-600"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Banner */}
            <div className={cn(
                "w-full py-24",
                "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900",
            )}>
                <div className="container px-4 mx-auto">
                    <div className="text-center">
                        <h1 className={cn(
                            "text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl",
                            "text-white mb-6"
                        )}>
                            PulseView
                        </h1>
                    </div>
                </div>
            </div>

            {/* Mission Statement */}
            <div className="bg-white border-b border-gray-200 py-16">
                <div className="container px-4 mx-auto">
                    <p className="text-xl text-gray-600 max-w-[800px] mx-auto text-center italic">
                        Empowering you through real-time visibility and analytics to achieve operational excellence
                    </p>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="container px-4 mx-auto py-20">
                <div className={cn(
                    "grid grid-cols-1 gap-8",
                    "md:grid-cols-2",
                    "lg:grid-cols-4"
                )}>
                    {cards.map((card, i) => (
                        <Card
                            key={i}
                            {...card}
                            onClick={() => navigate(card.path)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;