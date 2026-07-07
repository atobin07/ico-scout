"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import Link from "next/link";
import { type Opportunity } from "@/lib/types";
import { ScoreBadge } from "@/components/score-badge";
import { StatusDropdown } from "@/components/status-dropdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatValue(min: number | null, max: number | null): string {
  const v = max ?? min;
  if (!v) return "TBD";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function DeadlineCell({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-[#484f58]">—</span>;
  try {
    const dt = parseISO(deadline);
    const days = differenceInDays(dt, new Date());
    const color = days < 0 ? "#f85149" : days < 7 ? "#d29922" : days < 21 ? "#4a90e2" : "#8b949e";
    const label = days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d`;
    return <span style={{ color }} className="font-mono text-xs font-medium">{label}</span>;
  } catch {
    return <span className="text-[#484f58]">—</span>;
  }
}

const SOURCE_COLORS: Record<string, string> = {
  sam_gov: "#4a90e2",
  rss: "#3fb950",
};

export function OpportunityTable({
  data,
  compact = false,
}: {
  data: Opportunity[];
  compact?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tableData, setTableData] = useState(data);

  const columns = useMemo<ColumnDef<Opportunity>[]>(
    () => [
      {
        accessorKey: "composite_score",
        header: "Score",
        size: 80,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <ScoreBadge score={row.original.composite_score} />
            <ScoreBadge score={row.original.fit_score} label="fit" size="sm" />
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Opportunity",
        cell: ({ row }) => (
          <Link
            href={`/opportunities/${row.original.id}`}
            className="text-[#e6edf3] hover:text-[#4a90e2] transition-colors line-clamp-1"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.title ?? "Untitled"}
          </Link>
        ),
      },
      {
        accessorKey: "agency_or_company",
        header: "Agency",
        size: 180,
        cell: ({ getValue }) => (
          <span className="text-[#8b949e] text-xs line-clamp-1">{getValue() as string || "—"}</span>
        ),
      },
      {
        accessorKey: "estimated_value_max",
        header: "Value",
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-[#8b949e]">
            {formatValue(row.original.estimated_value_min, row.original.estimated_value_max)}
          </span>
        ),
      },
      {
        accessorKey: "response_deadline",
        header: "Deadline",
        size: 80,
        cell: ({ getValue }) => <DeadlineCell deadline={getValue() as string | null} />,
      },
      {
        accessorKey: "source",
        header: "Source",
        size: 80,
        cell: ({ getValue }) => {
          const src = getValue() as string;
          return (
            <Badge variant="source" style={{ color: SOURCE_COLORS[src] ?? "#8b949e" }}>
              {src.replace("_", ".")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => (
          <StatusDropdown
            opportunityId={row.original.id}
            currentStatus={row.original.status}
            onStatusChange={(newStatus) => {
              setTableData((prev) =>
                prev.map((o) => (o.id === row.original.id ? { ...o, status: newStatus } : o))
              );
            }}
          />
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[#30363d]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    "px-3 py-2 text-left text-[11px] font-medium text-[#8b949e] uppercase tracking-wide whitespace-nowrap",
                    header.column.getCanSort() && "cursor-pointer select-none hover:text-[#e6edf3]"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" && " ↑"}
                  {header.column.getIsSorted() === "desc" && " ↓"}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-[#8b949e]">
                No opportunities. New scans running…
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
