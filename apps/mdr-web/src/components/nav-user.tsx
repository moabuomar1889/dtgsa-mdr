"use client"

import Link from "next/link"
import {
  BellIcon,
  ChevronDownIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  Settings2Icon,
} from "lucide-react"
import { signOutAction } from "@/server/actions/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-[7px] px-1 py-0.5 text-left"
          data-h
        >
          <Avatar className="size-[23px]">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-accent-bg text-accent-txt text-[9.5px] font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 leading-[1.15] lg:block">
            <span className="text-text block truncate text-[11.5px] font-medium">
              {user.name}
            </span>
            <span className="text-dim block truncate text-[9.5px]">
              Document Control
            </span>
          </span>
          <ChevronDownIcon className="text-dim hidden size-3 lg:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-60"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left">
            <Avatar className="size-7">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-accent-bg text-accent-txt text-[9.5px]">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-[11.5px] font-medium">
                {user.name}
              </span>
              <span className="text-dim truncate text-[10px]">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <CircleUserRoundIcon />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings2Icon />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/notifications">
              <BellIcon />
              Notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOutAction} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOutIcon />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
