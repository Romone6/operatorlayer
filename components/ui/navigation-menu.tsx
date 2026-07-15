import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cn } from "@/lib/utils";

export const NavigationMenu = NavigationMenuPrimitive.Root;
export const NavigationMenuList = NavigationMenuPrimitive.List;
export const NavigationMenuItem = NavigationMenuPrimitive.Item;
export const NavigationMenuTrigger = NavigationMenuPrimitive.Trigger;
export const NavigationMenuContent = NavigationMenuPrimitive.Content;

export function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.NavigationMenuLinkProps) {
  return <NavigationMenuPrimitive.Link className={cn("block select-none rounded-lg px-3 py-2 text-sm", className)} {...props} />;
}

