export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'thunder' | 'fog';

export interface WeatherSuggestion {
    description: string;
    message: string;
    categories: string[];
}

export function getWeatherFoodSuggestion(
    temp: number,
    condition: WeatherCondition,
    isDay: number
): WeatherSuggestion {

    // Rainy
    if (condition === 'rain' || condition === 'thunder') {
        return {
            description: "Rainy in Ooty",
            message: "Perfect day for something warm and comforting",
            categories: ["Soup & Starters", "Shawarma & Tandoori"]
        };
    }

    // Foggy or Cold
    if (condition === 'fog' || temp < 15) {
        const desc = temp < 15 ? "Chilly in Ooty" : "Foggy in Ooty";
        return {
            description: desc,
            message: "Warm up with something hearty",
            categories: ["Soup & Starters", "Shawarma & Tandoori", "Biryani & Mandi"]
        };
    }

    // Hot/Sunny
    if (temp > 25 && condition === 'clear') {
        return {
            description: isDay ? "Sunny in Ooty" : "Warm evening in Ooty",
            message: "Cool off with something refreshing",
            categories: ["Drinks & Milkshakes", "Rice & Noodles"]
        };
    }

    // Mild/Pleasant (Fallback)
    return {
        description: "Pleasant in Ooty",
        message: "Great weather for a full meal",
        categories: ["Biryani & Mandi", "Veg & Chicken Gravy", "Signatures"]
    };
}
