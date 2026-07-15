"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function WorkspaceSwitcher() {
  return <Button variant="secondary" size="sm">Workspace</Button>;
}

export function AppTopbar() {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[color:var(--color-background)]/95 px-6 py-3 backdrop-blur">
      <div className="flex w-full max-w-md items-center gap-3">
        <WorkspaceSwitcher />
        <Input placeholder="Search policies, scenarios, sources" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button><Avatar><AvatarFallback>OL</AvatarFallback></Avatar></button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

