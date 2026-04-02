import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  onExportCSV: () => void;
  label?: string;
}

export function exportToCSV(headers: string[], rows: string[][], filename: string) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(';'), ...rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButton({ onExportCSV, label = 'Exporter' }: ExportButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-2">
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
