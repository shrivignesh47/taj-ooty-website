/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Users, TrendingUp, Menu } from 'lucide-react';

interface Props {
  orders: any[];
  menu: any[];
  staff: any[];
  customers: any[];
}

export function AdminExport({ orders, menu, staff, customers }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadFile = (workbook: XLSX.WorkBook, filename: string) => {
    XLSX.writeFile(workbook, filename);
  };

  const exportOrders = () => {
    setExporting('orders');
    const orderData = orders.map(order => {
      const items = order.order_items?.map((i: any) => `${i.menu_items?.name} x${i.qty}`).join(', ');
      const total = order.order_items?.reduce((sum: number, i: any) => sum + (i.price_at_order * i.qty), 0) ?? 0;
      return {
        'Order ID': order.id,
        'Date': new Date(order.created_at).toLocaleString(),
        'Table': order.restaurant_tables?.table_no ?? 'Walk-in',
        'Customer Name': order.customer_name,
        'Customer Phone': order.customer_phone,
        'Items': items,
        'Total': total,
        'Status': order.status,
        'Waiter': order.staff_users?.name ?? '—',
        'Billed At': order.billed_at ? new Date(order.billed_at).toLocaleString() : '—'
      };
    });
    const ws = XLSX.utils.json_to_sheet(orderData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    downloadFile(wb, "taj-ooty-orders.xlsx");
    setExporting(null);
  };

  const exportMenu = () => {
    setExporting('menu');
    const menuData = menu.map(item => ({
      'Category': item.categories?.name || 'Uncategorized',
      'Item Name': item.name,
      'Price': item.price,
      'Available': item.is_available === false ? 'No' : 'Yes'
    }));
    const ws = XLSX.utils.json_to_sheet(menuData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu');
    downloadFile(wb, "taj-ooty-menu.xlsx");
    setExporting(null);
  };

  const exportStaff = () => {
    setExporting('staff');
    const staffData = staff.map(member => ({
      'Name': member.name,
      'Phone': member.phone,
      'Role': member.roles?.name,
      'Status': member.is_active ? 'Active' : 'Inactive',
      'Created At': new Date(member.created_at).toLocaleString(),
      'Last Login': member.last_login ? new Date(member.last_login).toLocaleString() : '—'
    }));
    const ws = XLSX.utils.json_to_sheet(staffData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    downloadFile(wb, "taj-ooty-staff.xlsx");
    setExporting(null);
  };

  const exportCustomers = () => {
    setExporting('customers');
    const customerData = customers.map(customer => ({
      'Phone': customer.phone,
      'Name': customer.name,
      'Total Visits': customer.visits,
      'Total Spent': customer.totalSpent,
      'Last Visit': new Date(customer.lastVisit).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(customerData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    downloadFile(wb, "taj-ooty-customers.xlsx");
    setExporting(null);
  };

  const exportRevenue = () => {
    setExporting('revenue');
    const monthlyData = orders.reduce((acc: Record<string, { totalOrders: number, totalRevenue: number }>, order) => {
      const date = new Date(order.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = { totalOrders: 0, totalRevenue: 0 };
      acc[key].totalOrders += 1;
      const orderTotal = order.order_items?.reduce((sum: number, i: any) => sum + (i.price_at_order * i.qty), 0) ?? 0;
      if (['billed', 'served'].includes(order.status)) acc[key].totalRevenue += orderTotal;
      return acc;
    }, {});

    const revenueData = Object.entries(monthlyData).map(([month, data]) => ({
      'Month': month,
      'Total Orders': data.totalOrders,
      'Total Revenue': data.totalRevenue,
      'Average Order Value': data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders).toFixed(2) : 0
    }));
    const ws = XLSX.utils.json_to_sheet(revenueData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
    downloadFile(wb, "taj-ooty-revenue.xlsx");
    setExporting(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ExportCard
          title="Orders"
          description="Export all orders with details"
          icon={<FileSpreadsheet className="w-6 h-6" />}
          onExport={exportOrders}
          isExporting={exporting === 'orders'}
        />
        <ExportCard
          title="Menu"
          description="Export full menu with categories and availability"
          icon={<Menu className="w-6 h-6" />}
          onExport={exportMenu}
          isExporting={exporting === 'menu'}
        />
        <ExportCard
          title="Staff"
          description="Export staff list and details"
          icon={<Users className="w-6 h-6" />}
          onExport={exportStaff}
          isExporting={exporting === 'staff'}
        />
        <ExportCard
          title="Customers"
          description="Export customer CRM data and spending"
          icon={<Users className="w-6 h-6" />}
          onExport={exportCustomers}
          isExporting={exporting === 'customers'}
        />
        <ExportCard
          title="Revenue Summary"
          description="Export monthly revenue and order counts"
          icon={<TrendingUp className="w-6 h-6" />}
          onExport={exportRevenue}
          isExporting={exporting === 'revenue'}
        />
      </div>
    </div>
  );
}

function ExportCard({ title, description, icon, onExport, isExporting }: any) {
  return (
    <div className="bg-white border border-[#C9974A]/20 p-5 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[#4E1414]">{icon}</div>
          <div>
            <h3 className="font-black text-[#4E1414]">{title}</h3>
            <p className="text-[#241B15]/60 text-sm">{description}</p>
          </div>
        </div>
      </div>
      <button
        onClick={onExport}
        disabled={isExporting}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-[#4E1414] text-[#F6EEDF] py-3 rounded-xl font-bold hover:bg-[#350C0C] transition-colors disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
}
