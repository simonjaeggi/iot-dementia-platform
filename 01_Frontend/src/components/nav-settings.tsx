"use client"

import * as React from "react"
import { IconChevronRight, IconSettings } from "@tabler/icons-react"
import { NavLink, useLocation } from "react-router-dom"

import { SETTINGS_PAGE_SECTION_IDS } from "@/app/settings/settings.config"
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

export function NavSettings({
  className,
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const location = useLocation()
  const isSettingsPath = location.pathname === "/settings"
  const [isOpen, setIsOpen] = React.useState(isSettingsPath)

  React.useEffect(() => {
    if (isSettingsPath) {
      setIsOpen(true)
    }
  }, [isSettingsPath])

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={isSettingsPath}
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
                {[
                  {
                    title: "Notifications",
                    id: SETTINGS_PAGE_SECTION_IDS.notifications,
                  },
                  {
                    title: "Location Beacons",
                    id: SETTINGS_PAGE_SECTION_IDS.locationBeacons,
                  },
                  {
                    title: "User & Roles",
                    id: SETTINGS_PAGE_SECTION_IDS.userRoles,
                  },
                  {
                    title: "Access Codes",
                    id: SETTINGS_PAGE_SECTION_IDS.accessCodes,
                  },
                  {
                    title: "Patient Information",
                    id: SETTINGS_PAGE_SECTION_IDS.patientInformation,
                  },
                ].map((item) => {
                  const hash = `#${item.id}`
                  const isActive = isSettingsPath && location.hash === hash

                  return (
                    <SidebarMenuSubItem key={item.id}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive}
                        size="sm"
                      >
                        <a href={`/settings${hash}`}>
                          <span>{item.title}</span>
                        </a>
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
