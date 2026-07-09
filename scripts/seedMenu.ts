import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
(global as any).WebSocket = WebSocket;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in environment");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const REAL_MENU_DATA = [
    {
        category: "Soup",
        items: [
            { name: "Cream of Tomato", price: 145 },
            { name: "Cream of Mushroom", price: 145 },
            { name: "Veg Clear Soup", price: 145 },
            { name: "Sweet Corn Veg Soup", price: 155 },
            { name: "Hot'n'Sour Veg Soup", price: 150 },
            { name: "Baby Corn Garlic Soup", price: 145 },
            { name: "Veg Manchow Soup", price: 155 },
            { name: "Cream Of Chicken", price: 165 },
            { name: "Chicken Rasam", price: 175 },
            { name: "Sweet Corn Chicken Soup", price: 165 },
            { name: "Hot'n' Sour Chicken Soup", price: 175 },
            { name: "Chicken Manchow Soup", price: 175 },
            { name: "Mutton Rasam Soup", price: 195 },
            { name: "Hot'n' Sour Mutton Soup", price: 210 },
            { name: "Lung Fung Mutton Soup", price: 210 },
        ]
    },
    {
        category: "Sandwiches",
        items: [
            { name: "Panner Tikka Sandwich", price: 130 },
            { name: "Veg Cheese Sandwich", price: 120 },
            { name: "Veg Burger", price: 105 },
            { name: "Chicken Club Sandwich", price: 170 },
            { name: "Chicken Tikka Sandwich", price: 150 },
            { name: "Chicken Burger", price: 135 },
        ]
    },
    {
        category: "Starters",
        items: [
            { name: "Crispy Potato", price: 185 },
            { name: "Gobi 65", price: 200 },
            { name: "Paneer 65 / Mushroom 65", price: 210 },
            { name: "Gobi Manchurian", price: 210 },
            { name: "Paneer Manchurian", price: 210 },
            { name: "Mushroom Manchurian", price: 210 },
            { name: "Chilli Gobi", price: 200 },
            { name: "Chilli Paneer", price: 210 },
            { name: "Chilli Mushroom", price: 210 },
            { name: "Veg Spring Roll", price: 210 },
            { name: "Baby Corn Chilli", price: 210 },
            { name: "Baby Corn Pepper Fry", price: 210 },
            { name: "Finger Chips", price: 175 },
            { name: "Mushroom Pepper Fry", price: 210 },
            { name: "Paneer Pepper Fry", price: 210 },
            { name: "Paneer Burji", price: 210 },
            { name: "Dragon Paneer", price: 210 },
            { name: "Hot Pepper", price: 210 },
            { name: "Chicken lollipop with Miyonise", price: 260 },
            { name: "Chicken Karuveppilai Fry (BL)", price: 225 },
            { name: "Chicken 65 (BL)", price: 235 },
            { name: "Fried Chicken Leg", price: 185 },
            { name: "Pepper Chicken Dry (BL)", price: 225 },
            { name: "Chicken Sukka", price: 225 },
            { name: "Coriander Chicken Dry (BL)", price: 235 },
            { name: "Dragon Chicken Dry (BL)", price: 245 },
        ]
    },
    {
        category: "Shawarma",
        items: [
            { name: "Roll Shawarma", price: 140 },
            { name: "Pepper Shawarma", price: 150 },
            { name: "Masala Shawarma", price: 165 },
            { name: "Plate Shawarma", price: 215 },
            { name: "Taj Special Roll Shawarma", price: 185 },
            { name: "Bowl Shawarma", price: 215 },
            { name: "Cheese Shawarma", price: 165 },
            { name: "Spicy Mexican Roll", price: 145 },
            { name: "Double Cheese & Pepper Plates", price: 235 },
            { name: "Loaded Shawarma Fries", price: 255 },
            { name: "Peri Peri Shawarma", price: 155 },
        ]
    },
    {
        category: "Tandoori",
        items: [
            { name: "Paneer Tikka", price: 305 },
            { name: "Afghani Paneer Tikka", price: 305 },
            { name: "Malai Chicken Tikka", price: 300 },
            { name: "Chicken Kabab", price: 300 },
            { name: "Chicken Sheek Kabab", price: 300 },
            { name: "Mutton Sheek Kabab", price: 400 },
            { name: "Chicken Tikka", price: 300 },
            { name: "Tangri Kabab", price: 300 },
            { name: "Fish Tikka", price: 320 },
            { name: "Beef Sheek Kabab", price: 275 },
            { name: "Non-Veg MixPlater", price: 1380 },
            { name: "Hariyali Tikka", price: 300 },
            { name: "Hariyali Kabab", price: 300 },
        ]
    },
    {
        category: "Briyani",
        items: [
            { name: "Plain Briyani", price: 180 },
            { name: "Vegetable Biriyani", price: 180 },
            { name: "Paneer Briyani", price: 180 },
            { name: "Mushroom Briyani", price: 185 },
            { name: "Egg Briyani", price: 190 },
            { name: "Chicken Briyani", price: 220 },
            { name: "Beef Briyani", price: 190 },
            { name: "Fish Briyani", price: 255 },
            { name: "Prawn Briyani", price: 285 },
        ]
    },
    {
        category: "Rice & Noodles",
        items: [
            { name: "Ghee Rice", price: 150 },
            { name: "Jeera Rice", price: 180 },
            { name: "Gobi Rice", price: 180 },
            { name: "Vegetable Fried Rice / Noodles", price: 190 },
            { name: "Paneer Fried Rice / Noodles", price: 200 },
            { name: "Schezwan Veg Fried Rice/Noodles", price: 195 },
            { name: "Mushroom Fried Rice / Noodles", price: 200 },
            { name: "Singapore Veg Fried Rice / Noodles", price: 200 },
            { name: "Taj Spl Veg Fried Rice / Noodles", price: 200 },
            { name: "Shanghai Veg Fried Rice / Noodles", price: 200 },
            { name: "American Veg Chop Suey", price: 245 },
            { name: "Egg Fried Rice / Noodles", price: 200 },
            { name: "Chicken Fried Rice / Noodles", price: 220 },
            { name: "Prawn Fried Rice / Noodles", price: 255 },
            { name: "Schezwan Chicken Fried Rice / Noodles", price: 225 },
            { name: "Shanghai Chicken Fried Rice / Noodles", price: 240 },
            { name: "Singapore Chicken Fried Rice / Noodles", price: 240 },
            { name: "Taj Mixed Fried Rice / Noodles", price: 280 },
            { name: "Beef Fried Rice / Noodles", price: 220 },
            { name: "American Chop Suey Chicken", price: 315 },
        ]
    },
    {
        category: "Sea Food",
        items: [
            { name: "Fish 65", price: 230 },
            { name: "Fish finger with miyonise", price: 265 },
            { name: "Masala Fried Fish", price: 245 },
            { name: "Chilli Fish", price: 235 },
            { name: "Garlic Fish", price: 245 },
            { name: "Ginger Fish", price: 245 },
            { name: "Dragon Fish", price: 250 },
            { name: "Pepper Fish", price: 255 },
            { name: "Andra Fish Curry", price: 255 },
            { name: "Madras Fish Curry", price: 265 },
            { name: "Fish Chettinad", price: 270 },
            { name: "Fish Manchurian", price: 270 },
            { name: "Puli Melagu Fish Curry", price: 315 },
            { name: "Malabar Fish Curry", price: 315 },
            { name: "Prawn Pepper Fry", price: 315 },
            { name: "Prawn Masala", price: 315 },
            { name: "Chilli Prawn", price: 325 },
            { name: "Ginger Prawn", price: 325 },
            { name: "Prawn 65", price: 325 },
            { name: "Prawn Manchurian", price: 335 },
        ]
    },
    {
        category: "Drinks",
        items: [
            { name: "Fresh Lime Soda", price: 55 },
            { name: "Fresh lime Water", price: 40 },
            { name: "Jul Jeera Soda", price: 60 },
            { name: "Mint Lime Water", price: 50 },
            { name: "Cold Coffee", price: 130 },
            { name: "Cold Coffee With Ice", price: 160 },
            { name: "Mint Lime Soda", price: 55 },
            { name: "Blue Curacao", price: 85 },
            { name: "Vergin Mojito", price: 85 },
            { name: "Black Current", price: 90 },
            { name: "Rose Milk", price: 85 },
            { name: "Falooda", price: 150 },
            { name: "Fruit Juice", price: 105 },
            { name: "Lassi", price: 90 },
        ]
    },
    {
        category: "Ice Cream",
        items: [
            { name: "Vanilla Ice Cream", price: 80 },
            { name: "Strawberry Ice Cream", price: 80 },
            { name: "Spl Ice Cream", price: 140 },
            { name: "Butter Scotch Ice Cream", price: 95 },
            { name: "Pista Ice Cream", price: 100 },
            { name: "Chocolate Ice Cream", price: 90 },
        ]
    },
    {
        category: "Milk Shake",
        items: [
            { name: "Apple Milkshake", price: 120 },
            { name: "Vanilla Milkshake", price: 120 },
            { name: "Strawberry Milkshakes", price: 120 },
            { name: "Butter Scotch Milkshake", price: 120 },
            { name: "Pista Milkshake", price: 120 },
            { name: "Chocolate Milkshake", price: 120 },
            { name: "Masala Butter Milk", price: 70 },
        ]
    },
    {
        category: "Dessert",
        items: [
            { name: "Gulab Jamun", price: 50 },
            { name: "Gulab Jamun with Ice Cream", price: 90 },
            { name: "Brownie with Ice-Cream", price: 109 },
            { name: "Brownie with Hot Choco Sauce", price: 70 },
        ]
    }
];

async function seed() {
    console.log("Starting Real Menu Seeding...");

    // 1. Delete existing items to clean slate
    console.log("Wiping existing `menu_items` and `categories`...");
    await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (const catData of REAL_MENU_DATA) {
        console.log(`Inserting category: ${catData.category}`);
        const { data: catRecord, error: catError } = await supabase
            .from('categories')
            .insert({ name: catData.category })
            .select()
            .single();

        if (catError) {
            console.error(`Error inserting category ${catData.category}:`, catError);
            continue;
        }

        const itemsToInsert = catData.items.map(item => ({
            category_id: catRecord.id,
            name: item.name,
            price: item.price,
            is_available: true
        }));

        const { error: itemsError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error(`Error inserting items for ${catData.category}:`, itemsError);
        } else {
            console.log(`Successfully mapped ${itemsToInsert.length} items to ${catData.category}`);
        }
    }

    console.log("Real Menu Seeding Complete!");
}

seed().catch(console.error);
