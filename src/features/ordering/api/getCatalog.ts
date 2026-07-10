import { supabase } from '../lib/supabase';
import { Category, MenuItem } from '../lib/types';

export interface MenuCatalog {
    categories: Category[];
    menuItems: MenuItem[];
}

export async function getLiveCatalog(): Promise<MenuCatalog> {
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

    if (catError) {
        console.error("Failed to fetch categories:", catError);
        return { categories: [], menuItems: [] };
    }

    const { data: menuItems, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);

    if (itemsError) {
        console.error("Failed to fetch menu items:", itemsError);
        return { categories: categories || [], menuItems: [] };
    }

    return {
        categories: categories || [],
        menuItems: menuItems || []
    };
}
