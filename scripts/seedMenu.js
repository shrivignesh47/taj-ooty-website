"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var ws_1 = __importDefault(require("ws"));
global.WebSocket = ws_1.default;
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in environment");
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
var REAL_MENU_DATA = [
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
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var _loop_1, REAL_MENU_DATA_1, REAL_MENU_DATA_1_1, catData, e_1_1;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Starting Real Menu Seeding...");
                    // 1. Delete existing items to clean slate
                    console.log("Wiping existing `menu_items` and `categories`...");
                    return [4 /*yield*/, supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 2:
                    _b.sent();
                    _loop_1 = function (catData) {
                        var _c, catRecord, catError, itemsToInsert, itemsError;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    console.log("Inserting category: ".concat(catData.category));
                                    return [4 /*yield*/, supabase
                                            .from('categories')
                                            .insert({ name: catData.category })
                                            .select()
                                            .single()];
                                case 1:
                                    _c = _d.sent(), catRecord = _c.data, catError = _c.error;
                                    if (catError) {
                                        console.error("Error inserting category ".concat(catData.category, ":"), catError);
                                        return [2 /*return*/, "continue"];
                                    }
                                    itemsToInsert = catData.items.map(function (item) { return ({
                                        category_id: catRecord.id,
                                        name: item.name,
                                        price: item.price,
                                        is_available: true
                                    }); });
                                    return [4 /*yield*/, supabase
                                            .from('menu_items')
                                            .insert(itemsToInsert)];
                                case 2:
                                    itemsError = (_d.sent()).error;
                                    if (itemsError) {
                                        console.error("Error inserting items for ".concat(catData.category, ":"), itemsError);
                                    }
                                    else {
                                        console.log("Successfully mapped ".concat(itemsToInsert.length, " items to ").concat(catData.category));
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 8, 9, 10]);
                    REAL_MENU_DATA_1 = __values(REAL_MENU_DATA), REAL_MENU_DATA_1_1 = REAL_MENU_DATA_1.next();
                    _b.label = 4;
                case 4:
                    if (!!REAL_MENU_DATA_1_1.done) return [3 /*break*/, 7];
                    catData = REAL_MENU_DATA_1_1.value;
                    return [5 /*yield**/, _loop_1(catData)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    REAL_MENU_DATA_1_1 = REAL_MENU_DATA_1.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (REAL_MENU_DATA_1_1 && !REAL_MENU_DATA_1_1.done && (_a = REAL_MENU_DATA_1.return)) _a.call(REAL_MENU_DATA_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 10:
                    console.log("Real Menu Seeding Complete!");
                    return [2 /*return*/];
            }
        });
    });
}
seed().catch(console.error);
