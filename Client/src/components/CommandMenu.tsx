import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    LayoutDashboard,
    Package,
    Refrigerator,
    Users,
    FileText,
    LogOut,
    Moon,
    Sun,
    Laptop
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { getItemsApi } from "@/services/api";
import { Item } from "@/types";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState<Item[]>([]);
    const navigate = useNavigate();
    const { setTheme } = useTheme();
    const { logout } = useAuth();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    React.useEffect(() => {
        if (open && items.length === 0) {
            getItemsApi().then(setItems).catch(console.error);
        }
    }, [open, items.length]);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Navigation">
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/items"))}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>Inventory</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/fridge"))}>
                        <Refrigerator className="mr-2 h-4 w-4" />
                        <span>Fridge</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/users"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Staff</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/history"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>History</span>
                    </CommandItem>
                </CommandGroup>

                {items.length > 0 && (
                    <CommandGroup heading="Inventory Items">
                        {items.slice(0, 10).map((item) => (
                            <CommandItem
                                key={item.id}
                                onSelect={() => runCommand(() => navigate("/admin/items"))}
                            >
                                <Package className="mr-2 h-4 w-4 opacity-50" />
                                <span>{item.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">₹{item.price}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light Mode</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark Mode</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                        <Laptop className="mr-2 h-4 w-4" />
                        <span>System Theme</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => { logout(); navigate("/login"); })}>
                        <LogOut className="mr-2 h-4 w-4 text-red-500" />
                        <span className="text-red-500">Logout</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
