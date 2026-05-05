"use client"

import * as React from "react"
import { IconChevronRight, IconSettings } from "@tabler/icons-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const SETTINGS_NAV_ITEMS = [
  { title: "Notifications", path: "/settings/notifications" },
  { title: "Location Beacons", path: "/settings/location-beacons" },
  { title: "Users & Roles", path: "/settings/users" },
  { title: "Access Codes", path: "/settings/access-codes" },
  { title: "Patient Information", path: "/settings/patient" },
]

export function NavSettings({
  className,
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const location = useLocation()
  const isOnSettings = location.pathname.startsWith("/settings")
  const [isOpen, setIsOpen] = React.useState(isOnSettings)

  React.useEffect(() => {
    if (isOnSettings) {
      setIsOpen(true)
    }
  }, [isOnSettings])

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={location.pathname === "/settings"}
            >
              <NavLink to="/settings">
                <IconSettings />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
            <SidebarMenuAction
              showOnHover
              aria-label={isOpen ? "Collapse settings sections" : "Expand settings sections"}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsOpen((open) => !open)
              }}
            >
              <IconChevronRight
                className={cn("transition-transform", isOpen && "rotate-90")}
              />
            </SidebarMenuAction>
            {isOpen ? (
              <SidebarMenuSub>
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const isActive = location.pathname === item.path

                  return (
                    <SidebarMenuSubItem key={item.path}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive}
                        size="sm"
                      >
                        <NavLink to={item.path}>
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
