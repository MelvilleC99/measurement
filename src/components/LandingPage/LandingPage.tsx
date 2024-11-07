import { FC, useEffect } from 'react';
import { Users, PlayCircle, LayoutDashboard, BarChart } from 'lucide-react';

interface CardData {
    title: string;
    Icon: any;
    desc: string;
    hue: number;
    saturation: string;
    lightness: string;
}

interface ThemeColors {
    primaryHue: number;
    primarySaturation: string;
    primaryLightness: string;
    pageBackgroundStart: string;
    pageBackgroundEnd: string;
    companyNameGlowColor: string;
    companyNameGradient: {
        start: string;
        middle: string;
        end: string;
    };
    cardBorderColor: string;
    patternOpacity: number;
    cardShadow: string;
    cardHoverShadow: string;
}

interface LandingPageProps {
    theme?: ThemeColors;
    isDarkMode?: boolean;
}

const defaultTheme: ThemeColors = {
    primaryHue: 224.3,
    primarySaturation: "76.3%",
    primaryLightness: "48%",
    pageBackgroundStart: "hsl(0, 0%, 98%)",
    pageBackgroundEnd: "hsl(0, 0%, 96%)",
    companyNameGlowColor: "rgba(255, 255, 255, 0.2)",
    companyNameGradient: {
        start: "white",
        middle: "hsl(224.3, 80%, 90%)",
        end: "white"
    },
    cardBorderColor: "rgba(255, 255, 255, 0.1)",
    patternOpacity: 0.1,
    cardShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    cardHoverShadow: "0 8px 12px rgba(0, 0, 0, 0.15)"
};

const LandingPage: FC<LandingPageProps> = ({ theme = defaultTheme, isDarkMode = false }) => {
    // Apply theme to CSS variables
    const applyTheme = () => {
        document.documentElement.style.setProperty('--primary-hue', theme.primaryHue.toString());
        document.documentElement.style.setProperty('--primary-saturation', theme.primarySaturation);
        document.documentElement.style.setProperty('--primary-lightness', theme.primaryLightness);
        document.documentElement.style.setProperty('--page-bg-start', theme.pageBackgroundStart);
        document.documentElement.style.setProperty('--page-bg-end', theme.pageBackgroundEnd);
        document.documentElement.style.setProperty('--company-name-glow', theme.companyNameGlowColor);
        document.documentElement.style.setProperty('--pattern-opacity', theme.patternOpacity.toString());
        document.documentElement.style.setProperty('--card-border-color', theme.cardBorderColor);
        document.documentElement.style.setProperty('--card-shadow', theme.cardShadow);
        document.documentElement.style.setProperty('--card-hover-shadow', theme.cardHoverShadow);
    };

    // Apply theme when component mounts
    useEffect(() => {
        applyTheme();
    }, [theme, isDarkMode]);

    const cards: CardData[] = [
        {
            title: "Admin",
            Icon: Users,
            desc: "Manage users, settings, and configurations",
            hue: 265,
            saturation: "84%",
            lightness: "55%"
        },
        {
            title: "Start Line",
            Icon: PlayCircle,
            desc: "Initiate and monitor active production lines",
            hue: 224,
            saturation: "84%",
            lightness: "55%"
        },
        {
            title: "Production Boards",
            Icon: LayoutDashboard,
            desc: "View live production performance and status",
            hue: 152,
            saturation: "84%",
            lightness: "55%"
        },
        {
            title: "Analytics",
            Icon: BarChart,
            desc: "Access detailed reports and data insights",
            hue: 346,
            saturation: "84%",
            lightness: "55%"
        }
    ];

    return (
        <div className={`page-background min-h-screen ${isDarkMode ? 'dark' : ''}`}>
            {/* Header Section */}
            <div className="relative">
                {/* Main gradient background */}
                <div className="absolute inset-0 gradient-bg" />

                {/* Pattern overlays */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 opacity-10 diagonal-lines" />
                    <div className="absolute inset-0 opacity-10 dot-pattern" />
                </div>

                {/* Content */}
                <div className="relative px-8 py-16 md:py-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center">
                            {/* Animated elements */}
                            <div className="inline-block mb-6 animate-float">
                                <div className="w-16 h-1 bg-white/50 rounded-full mb-2" />
                                <div className="w-12 h-1 bg-white/30 rounded-full ml-4" />
                            </div>

                            {/* Title */}
                            <div className="relative mb-4 inline-block">
                                <span className="company-name-glow" />
                                <h1 className="relative text-5xl md:text-7xl font-bold tracking-wider company-name">
                                    VISIBLE
                                </h1>
                            </div>

                            {/* Subtitle */}
                            <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-white/90">
                                Empowering you through real-time visibility and analytics to achieve operational excellence
                            </p>
                        </div>
                    </div>
                </div>

                {/* Wave divider */}
                <div className="absolute bottom-0 left-0 right-0 h-24 wave-divider" />
            </div>

            {/* Cards Section */}
            <div className="px-8 py-16 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-wrap justify-center gap-6">
                        {cards.map((card, index) => (
                            <div
                                key={index}
                                className="flex-1 min-w-[280px] max-w-[320px] rounded-xl overflow-hidden card"
                            >
                                <div
                                    className="h-full p-6 relative"
                                    style={{
                                        background: `linear-gradient(135deg, 
                      hsl(${card.hue},${card.saturation},70%) 0%,
                      hsl(${card.hue},${card.saturation},40%) 100%)`
                                    }}
                                >
                                    <div className="absolute inset-0 diagonal-lines" />

                                    <div className="relative flex flex-col items-center space-y-4">
                                        <div className="p-4 rounded-full bg-white/90 shadow-lg">
                                            <card.Icon
                                                size={32}
                                                style={{ color: `hsl(${card.hue},${card.saturation},${card.lightness})` }}
                                            />
                                        </div>
                                        <h3 className="text-2xl font-semibold text-white">{card.title}</h3>
                                        <p className="text-white/80 text-center">
                                            {card.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;