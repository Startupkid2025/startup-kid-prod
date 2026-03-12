import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * SearchableSelect - Dropdown component with built-in search functionality
 * 
 * @param {Object} props
 * @param {Array} props.options - Array of {value: string, label: string} objects
 * @param {string} props.value - Currently selected value
 * @param {function} props.onValueChange - Callback when value changes
 * @param {string} props.placeholder - Placeholder text when no value selected
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {string} props.emptyText - Text to show when no results found
 * @param {boolean} props.disabled - Whether the select is disabled
 * @param {string} props.className - Additional classes for the trigger button
 */
export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "בחר...",
  searchPlaceholder = "חפש...",
  emptyText = "לא נמצאו תוצאות",
  disabled = false,
  className,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // Debounce search for performance (250ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter options based on debounced search query
  const filteredOptions = React.useMemo(() => {
    if (!debouncedQuery) return options;
    
    const query = debouncedQuery.toLowerCase();
    return options.filter((option) => {
      const label = option.label?.toLowerCase() || "";
      const value = option.value?.toLowerCase() || "";
      return label.includes(query) || value.includes(query);
    });
  }, [options, debouncedQuery]);

  // Find selected option label
  const selectedLabel = React.useMemo(() => {
    const selected = options.find((option) => option.value === value);
    return selected?.label || placeholder;
  }, [options, value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-right",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate flex-1 text-right">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false} dir="rtl">
          <div className="flex items-center border-b px-3" dir="rtl">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-right"
              dir="rtl"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="text-right"
                  dir="auto"
                >
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 text-right" dir="auto">
                    {option.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}