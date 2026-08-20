// This is a mock actions file used ONLY during Tauri static export build
// It prevents "use server";;; compilation errors and server-only API import issues (e.g. next/cache, next/headers) in client bundles.

export async function verifyStaff() { return { success: false, user: null }; }
export async function loginStaff() { return { success: false, redirectUrl: '' }; }
export async function logoutStaff() { return { success: true }; }

export async function fetchStaffNotifications() { return { success: true, data: [] }; }
export async function sendStaffNotification() { return { success: true }; }
export async function markNotificationAsRead() { return { success: true }; }
export async function markAllNotificationsAsRead() { return { success: true }; }
export async function deleteNotification() { return { success: true }; }
export async function clearAllNotifications() { return { success: true }; }

export async function fetchRestaurantSettings() { return { data: null }; }
export async function saveKdsConfig() { return { success: true }; }
export async function simulateOnlineOrder() { return { success: true }; }
export async function fetchActivityLog() { return []; }
export async function applyOrderItemDiscount() { return { success: true }; }
export async function deleteAllMenuItems() { return { success: true }; }
export async function updateMenuItem() { return { success: true }; }
export async function deleteMenuItem() { return { success: true }; }
export async function updateMenuItemAvailability() { return { success: true }; }
export async function deleteAllOrders() { return { success: true }; }
export async function deleteOrder() { return { success: true }; }
export async function createTakeawayOrder() { return { success: true }; }
export async function createTable() { return { success: true }; }
export async function createCustomTable() { return { success: true }; }
export async function renameTable() { return { success: true }; }
export async function deleteTable() { return { success: true }; }
export async function fetchAdminTablesLiveData() { return { success: true, tables: [] }; }

export async function advanceOrderStatus() { return { success: true }; }
export async function markKitchenOrderReady() { return { success: true }; }
export async function startKitchenOrder() { return { success: true }; }
export async function toggleOrderItemDone() { return { success: true }; }

export async function fetchAdminDashboardData() { return { success: true, stats: {} }; }

export async function acceptAndConfirmOrder() { return { success: true }; }
export async function cancelOrder() { return { success: true }; }
export async function addItemsToOrder() { return { success: true }; }
export async function updateOrderItemQty() { return { success: true }; }
export async function deleteOrderItem() { return { success: true }; }
export async function fetchWaiterDashboardData() { return { success: true }; }

export async function updateStaffSelf() { return { success: true }; }
export async function resetStaffPassword() { return { success: true }; }
export async function addCustomRole() { return { success: true }; }
export async function updateRolePermissions() { return { success: true }; }
export async function deleteCustomRole() { return { success: true }; }
export async function addStaffUser() { return { success: true }; }
export async function editStaffUser() { return { success: true }; }
export async function deactivateStaffUser() { return { success: true }; }

export async function getDashboardPreferences() { return { success: true, preferences: {} }; }
export async function saveDashboardPreferences() { return { success: true }; }

export async function validateAndApplyCoupon() { return { success: true }; }
export async function fetchAllCoupons() { return []; }
export async function createCoupon() { return { success: true }; }
export async function toggleCouponActive() { return { success: true }; }
export async function deleteCoupon() { return { success: true }; }

export async function getCustomerLoyaltyHistory() { return []; }

export async function submitCustomerOrder() { return { success: true }; }

export async function settleBillWithPayment() { return { success: true }; }
export async function settleBillWithSplitPayment() { return { success: true }; }
export async function openRegisterSession() { return { success: true }; }
export async function closeRegisterSession() { return { success: true }; }
export async function getActiveRegisterSession() { return { success: true, session: null }; }
export async function addPettyExpense() { return { success: true }; }
export async function getSessionExpenses() { return { success: true, expenses: [] }; }
export async function getTodayPaymentBreakdown() { return { cash: 0, card: 0, upi: 0 }; }
export async function transferTableOrder() { return { success: true }; }
export async function fetchBillingDashboardData() { return { success: true }; }

// Waiter actions
export async function markOrderServed() { return { success: true }; }
export async function sendTableToCashier() { return { success: true }; }
export async function saveRestaurantSettings() { return { success: true }; }
export async function fetchStationMappings() { return { success: true }; }
export async function saveStationMappings() { return { success: true }; }
