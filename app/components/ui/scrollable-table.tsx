import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/app/components/ui/table";

interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableTable({ children, className }: ScrollableTableProps) {
  return (
    <div className={`overflow-x-auto w-full -mx-4 sm:mx-0 ${className || ''}`} style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="rounded-md border min-w-[600px] mx-4 sm:mx-0">
        <Table>{children}</Table>
      </div>
    </div>
  );
}

export { TableBody, TableCell, TableHead, TableHeader, TableRow }; 