"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function EvidenceDrawer({ evidence }: { evidence: string[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary" size="sm">View evidence</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Source Evidence</DialogTitle></DialogHeader>
        <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-soft)]">{evidence.map((item) => <li key={item}>{item}</li>)}</ul>
      </DialogContent>
    </Dialog>
  );
}

