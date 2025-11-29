"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Transaction {
  date: string;
  type: string;
  party: string;
  amount: number;
}

interface RecentTransactionsCardProps {
  title: string;
  viewAllLink: string;
  viewAllText: string;
  transactions: Transaction[];
  labels: {
    date: string;
    type: string;
    party: string;
    amount: string;
  };
}

export function RecentTransactionsCard({
  title,
  viewAllLink,
  viewAllText,
  transactions,
  labels,
}: RecentTransactionsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Link
          href={viewAllLink}
          className="text-primary hover:underline text-sm font-medium"
        >
          {viewAllText} →
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.date}</TableHead>
              <TableHead>{labels.type}</TableHead>
              <TableHead>{labels.party}</TableHead>
              <TableHead className="text-right">{labels.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx, index) => (
              <TableRow key={index}>
                <TableCell>{tx.date}</TableCell>
                <TableCell>{tx.type}</TableCell>
                <TableCell>{tx.party}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    tx.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {tx.amount >= 0 ? "+" : ""}Rs.{" "}
                  {Math.abs(tx.amount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
