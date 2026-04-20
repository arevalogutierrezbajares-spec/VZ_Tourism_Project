'use client';

import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface ExportBooking {
  created_at: string;
  confirmation_code: string;
  guest_name: string;
  listing_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  guest_count: number;
  subtotal_usd: number;
  commission_usd: number;
  net_provider_usd: number;
  total_usd: number;
  status: string;
  payment_method: string;
}

interface RevenueExportProps {
  bookings: ExportBooking[];
  month: string; // e.g. "April 2026"
}

export function RevenueExport({ bookings, month }: RevenueExportProps) {
  function exportCSV() {
    const headers = [
      'Date', 'Confirmation', 'Guest', 'Listing', 'Check In', 'Check Out',
      'Nights', 'Guests', 'Subtotal USD', 'Commission USD', 'Net Provider USD',
      'Status', 'Payment Method',
    ];
    const rows = bookings.map((b) => [
      b.created_at.split('T')[0],
      b.confirmation_code,
      b.guest_name,
      b.listing_name,
      b.check_in,
      b.check_out,
      b.nights,
      b.guest_count,
      b.subtotal_usd.toFixed(2),
      b.commission_usd.toFixed(2),
      b.net_provider_usd.toFixed(2),
      b.status,
      b.payment_method,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }

  function exportPDF() {
    const totalRevenue = bookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((s, b) => s + b.net_provider_usd, 0);
    const totalCommission = bookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((s, b) => s + b.commission_usd, 0);
    const totalGross = bookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((s, b) => s + b.total_usd, 0);

    const rows = bookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .map(
        (b) => `
        <tr>
          <td>${b.created_at.split('T')[0]}</td>
          <td>${b.confirmation_code}</td>
          <td>${b.guest_name}</td>
          <td>${b.listing_name}</td>
          <td>$${b.total_usd.toFixed(2)}</td>
          <td>$${b.commission_usd.toFixed(2)}</td>
          <td>$${b.net_provider_usd.toFixed(2)}</td>
          <td>${b.status}</td>
          <td>${b.payment_method}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Financial Report — ${month}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
    .summary { display: flex; gap: 32px; margin-bottom: 28px; }
    .metric { background: #f4f4f5; border-radius: 8px; padding: 16px 24px; }
    .metric-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f4f4f5; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Financial Report</h1>
  <p class="subtitle">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &mdash; VZ Tourism Platform</p>
  <div class="summary">
    <div class="metric">
      <div class="metric-label">Gross Revenue</div>
      <div class="metric-value">$${totalGross.toFixed(2)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Platform Commission</div>
      <div class="metric-value" style="color:#ef4444">−$${totalCommission.toFixed(2)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Net Revenue</div>
      <div class="metric-value" style="color:#16a34a">$${totalRevenue.toFixed(2)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Code</th><th>Guest</th><th>Listing</th>
        <th>Gross</th><th>Commission</th><th>Net</th><th>Status</th><th>Method</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
    toast.success('PDF report opened for printing');
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportCSV}>
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportPDF}>
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
}
